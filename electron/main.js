/**
 * Electron main process
 * Manages application lifecycle, window creation, and backend process
 */

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const { spawn } = require("child_process");
const http = require("http");
const os = require("os");
const fs = require("fs");
const net = require("net");

app.disableHardwareAcceleration();

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let isQuitting = false; // Flag to prevent recursive error dialogs during shutdown
let backendBundleFailedFallback = false; // Flag to prevent infinite recursion on bundle failure
const BACKEND_PORT = 8000;
const BACKEND_HOST = "127.0.0.1";
let frontendPort = 3000;
const FRONTEND_HOST = "127.0.0.1";

/**
 * Get the path to the bundled Python executable
 */
function getBackendPath() {
  if (isDev || backendBundleFailedFallback) {
    // Development: run Python directly
    // Or if bundle failed, don't try it again
    return null; // Will use python command
  }
  // Production: use bundled executable
  const exeName =
    process.platform === "win32" ? "backend.exe" : "backend";
  
  // Check backend-bin first (PyInstaller output)
  const backendBinPath = path.join(process.resourcesPath, "backend-bin", exeName);
  
  if (fs.existsSync(backendBinPath)) {
    console.log(`[Backend] Found bundled executable: ${backendBinPath}`);
    // Check if it's executable
    try {
      fs.accessSync(backendBinPath, fs.constants.X_OK);
      console.log(`[Backend] Executable has correct permissions`);
      return backendBinPath;
    } catch (err) {
      console.warn(`[Backend] Executable found but not executable: ${err.message}`);
      // Try to make it executable
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(backendBinPath, 0o755);
          console.log(`[Backend] Fixed executable permissions`);
          return backendBinPath;
        } catch (chmodErr) {
          console.warn(`[Backend] Could not fix permissions, falling back to Python source`);
        }
      }
    }
  } else {
    console.log(`[Backend] No bundled executable found at ${backendBinPath}`);
    console.log(`[Backend] Will try Python source as fallback`);
    return null;
  }
}

/**
 * Start the FastAPI backend process
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      let pythonPath;
      let args;
      let isUsingBundle = false;

      const backendExe = getBackendPath();
      
      // Determine working directory first (always use resources/backend in production)
      const cwd = isDev
        ? path.join(__dirname, "..", "apps", "backend")
        : path.join(process.resourcesPath, "backend");

      // Verify the backend source directory exists
      if (!fs.existsSync(cwd)) {
        reject(new Error(`Backend directory not found: ${cwd}`));
        return;
      }

      if (isDev || !backendExe) {
        // Development mode or no bundled executable: use python3 from PATH
        console.log(`[Backend] Using Python source code`);
        pythonPath = "python3";
        args = [
          "-m",
          "uvicorn",
          "app.main:app",
          `--host=${BACKEND_HOST}`,
          `--port=${BACKEND_PORT}`,
        ];
        if (isDev) {
          args.push("--reload");
        }
      } else {
        // Production mode: use bundled executable
        console.log(`[Backend] Using bundled PyInstaller executable`);
        pythonPath = backendExe;
        args = [];
        isUsingBundle = true;

        if (process.platform === "linux") {
          try {
            const backendCacheDir = path.join(app.getPath("userData"), "backend-bin");
            const cachedBackendPath = path.join(backendCacheDir, path.basename(pythonPath));
            if (!fs.existsSync(backendCacheDir)) {
              fs.mkdirSync(backendCacheDir, { recursive: true });
            }
            const sourceStat = fs.statSync(pythonPath);
            const shouldCopy = !fs.existsSync(cachedBackendPath)
              || fs.statSync(cachedBackendPath).size !== sourceStat.size;

            if (shouldCopy) {
              fs.copyFileSync(pythonPath, cachedBackendPath);
              fs.chmodSync(cachedBackendPath, 0o755);
              console.log(`[Backend] Copied bundled backend to writable path: ${cachedBackendPath}`);
            }

            pythonPath = cachedBackendPath;
          } catch (copyErr) {
            console.warn(`[Backend] Failed to copy backend executable: ${copyErr.message}`);
          }
        }
      }

      const options = {
        cwd: cwd,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          // Add backend directory to PYTHONPATH so imports work
          PYTHONPATH: cwd,
          // Configure backend to listen on localhost
          BACKEND_HOST: BACKEND_HOST,
          BACKEND_PORT: BACKEND_PORT,
          // Set data directory to app user data
          DATA_DIR: path.join(app.getPath("userData"), "data"),
          // Allow frontend to communicate from file:// protocol and localhost
          // For development (Next.js dev server) and production (Electron static export)
          CORS_ORIGINS: JSON.stringify(isDev 
            ? ["http://localhost:3000", "http://127.0.0.1:3000"]
            : [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "file://",
                "null",
              ]),
          NODE_ENV: isDev ? "development" : "production",
          // Flag to indicate backend is being spawned by Electron
          ELECTRON_SPAWN: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      };

      console.log(
        `[Backend] Starting with: ${pythonPath} ${args.join(" ")}`
      );
      console.log(`[Backend] Working directory: ${cwd}`);

      backendProcess = spawn(pythonPath, args, options);

      // Capture all backend output for error reporting
      let backendOutput = '';
      let backendErrors = '';
      let startAttempts = 0;

      // Log backend output
      backendProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();
        backendOutput += output + '\n';
        console.log(`[Backend] ${output}`);
      });

      backendProcess.stderr.on("data", (data) => {
        const error = data.toString().trim();
        backendErrors += error + '\n';
        // Uvicorn writes startup messages to stderr, so also capture in output
        if (error.includes('Uvicorn running') || error.includes('Application startup')) {
          backendOutput += error + '\n';
        }
        console.error(`[Backend Error] ${error}`);
      });

      backendProcess.on("error", (err) => {
        console.error("[Backend] Process spawn error:", err);
        const detail = `Failed to spawn backend: ${err.message}\nCommand: ${pythonPath}\nCwd: ${cwd}`;
        console.error(`[Backend] ${detail}`);
        
        // If bundled executable failed, try falling back to Python source
        if (isUsingBundle && err.code === 'ENOENT') {
          console.log(`[Backend] Bundled executable failed, retrying with Python source...`);
          backendBundleFailedFallback = true;
          startBackend().then(resolve).catch(reject);
          return;
        }
        
        reject(new Error(detail));
      });

      let backendStarted = false;
      
      backendProcess.on("exit", (code, signal) => {
        if (!backendStarted && !isQuitting) {
          console.error(`[Backend] Process exited before successful start (code=${code}, signal=${signal})`);
          console.error(`[Backend] Last output:`, backendOutput || "none");
          console.error(`[Backend] Last errors:`, backendErrors || "none");
        } else if (code !== null && code !== 0 && !isQuitting && backendStarted) {
          console.warn(`[Backend] Process exited unexpectedly with code ${code} after successful start`);
        }
        backendProcess = null;
      });

      // Give backend time to start, then check if it's responding (3 + 20 = 23 seconds total)
      setTimeout(() => {
        checkBackendHealth()
          .then(() => {
            console.log("[Backend] Started successfully");
            backendStarted = true;
            resolve();
          })
          .catch((err) => {
            const errorMsg = `Backend health check failed: ${err.message}\n` +
                           `Backend output: ${backendOutput || 'none'}\n` +
                           `Backend errors: ${backendErrors || 'none'}\n` +
                           `Command: ${pythonPath} ${args.join(' ')}\n` +
                           `Cwd: ${cwd}`;
            console.error(`[Backend] ${errorMsg}`);
            
            // If using bundled exe and it failed, try Python source as fallback
            if (isUsingBundle && !backendOutput && !backendErrors) {
              console.log(`[Backend] Bundled exe didn't produce output, retrying with Python source...`);
              backendBundleFailedFallback = true;
              // Stop the failed backend process before retrying
              stopBackend().then(() => {
                startBackend().then(resolve).catch(reject);
              }).catch(() => {
                // If stopping fails, still try to start with Python
                startBackend().then(resolve).catch(reject);
              });
              return;
            }
            
            reject(new Error(errorMsg));
          });
      }, 3000);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Check if backend is healthy
 */
async function checkBackendHealth() {
  const maxRetries = 15;  // 15 * 500ms = 7.5 seconds total retry time
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(
          `http://${BACKEND_HOST}:${BACKEND_PORT}/api/v1/health`,
          { timeout: 2000 },
          (response) => {
            if (response.statusCode === 200) {
              resolve(true);
            } else {
              reject(new Error(`HTTP ${response.statusCode}`));
            }
          }
        );
        request.on("error", reject);
        request.on("timeout", () => {
          request.destroy();
          reject(new Error("Health check timeout"));
        });
      });
      console.log("[Backend] Health check passed");
      return true;
    } catch (err) {
      // Retry
      console.log(`[Backend] Health check attempt ${i + 1} failed:`, err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Backend health check failed after retries");
}

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(startPort, host, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port, host);
    if (available) {
      return port;
    }
  }
  throw new Error("No available frontend port found");
}

/**
 * Check if frontend is healthy
 */
async function checkFrontendHealth() {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(
          `http://${FRONTEND_HOST}:${frontendPort}/`,
          { timeout: 2000 },
          (response) => {
            if (response.statusCode === 200 || response.statusCode === 304) {
              resolve(true);
            } else {
              reject(new Error(`HTTP ${response.statusCode}`));
            }
          }
        );
        request.on("error", reject);
        request.on("timeout", () => {
          request.destroy();
          reject(new Error("Health check timeout"));
        });
      });
      console.log("[Frontend] Health check passed");
      return true;
    } catch (err) {
      // Retry
      console.log(`[Frontend] Health check attempt ${i + 1} failed:`, err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Frontend health check failed after retries");
}

/**
 * Stop the backend process
 */
function stopBackend() {
  return new Promise((resolve) => {
    if (backendProcess) {
      console.log("[Backend] Stopping...");
      try {
        // Try graceful kill first, then force kill
        if (!backendProcess.killed) {
          backendProcess.kill("SIGTERM");
          // Wait 2 seconds for graceful shutdown
          setTimeout(() => {
            if (backendProcess && !backendProcess.killed) {
              console.log("[Backend] Force killing process...");
              backendProcess.kill("SIGKILL");
            }
            backendProcess = null;
            resolve();
          }, 2000);
        } else {
          backendProcess = null;
          resolve();
        }
      } catch (err) {
        console.error("[Backend] Error stopping process:", err.message);
        backendProcess = null;
        resolve(); // Resolve anyway
      }
    } else {
      resolve();
    }
  });
}

/**
 * Stop the frontend process
 */
function stopFrontend() {
  if (frontendProcess) {
    console.log("[Frontend] Stopping...");
    try {
      // Try graceful kill first, then force kill
      if (!frontendProcess.killed) {
        frontendProcess.kill("SIGTERM");
        // Wait 2 seconds for graceful shutdown
        setTimeout(() => {
          if (frontendProcess && !frontendProcess.killed) {
            console.log("[Frontend] Force killing process...");
            frontendProcess.kill("SIGKILL");
          }
        }, 2000);
      }
    } catch (err) {
      console.error("[Frontend] Error stopping process:", err.message);
    }
    frontendProcess = null;
  }
}
function startFrontend() {
  return new Promise(async (resolve, reject) => {
    if (isDev) {
      // In development, frontend is already running
      resolve();
      return;
    }

    try {
      // In production, we need to run the Next.js standalone server
      // The standalone build output is in apps/frontend/.next/standalone/
      // Next.js standalone creates the directory structure preserving the workspace hierarchy
      
      const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked");
      const standaloneBase = path.join(unpackedPath, "apps", "frontend", ".next", "standalone");
      
      console.log(`[Frontend] Looking for standalone build at: ${standaloneBase}`);
      console.log(`[Frontend] Unpacked path exists: ${fs.existsSync(unpackedPath)}`);
      console.log(`[Frontend] Standalone path exists: ${fs.existsSync(standaloneBase)}`);

      if (!fs.existsSync(standaloneBase)) {
        // List the actual directory structure for debugging
        console.log(`[Frontend] Listing resources directory:`, fs.readdirSync(process.resourcesPath).slice(0, 20));
        if (fs.existsSync(unpackedPath)) {
          console.log(`[Frontend] Listing unpacked directory:`, fs.readdirSync(unpackedPath).slice(0, 20));
          const appsPath = path.join(unpackedPath, "apps");
          if (fs.existsSync(appsPath)) {
            console.log(`[Frontend] Listing apps directory:`, fs.readdirSync(appsPath));
          }
        }
        reject(new Error(`Standalone build not found at ${standaloneBase}`));
        return;
      }

      // List contents of standalone directory
      const standaloneContents = fs.readdirSync(standaloneBase);
      console.log(`[Frontend] Standalone directory contents:`, standaloneContents);

      // The Next.js standalone build preserves the full workspace path
      // So we need to find server.js in the nested structure
      // Typical structure: .next/standalone/home/user/path/to/apps/frontend/server.js
      // Or sometimes: .next/standalone/apps/frontend/server.js
      // Or at root: .next/standalone/server.js
      
      let serverJs = null;
      const possibleServerPaths = [
        // Direct root
        path.join(standaloneBase, "server.js"),
        // In a nested workspace structure (common in monorepos)
        path.join(standaloneBase, "apps", "frontend", "server.js"),
        // Preserved full path (find recursively)
      ];

      // Try direct paths first
      for (const tryPath of possibleServerPaths) {
        if (fs.existsSync(tryPath)) {
          serverJs = tryPath;
          console.log(`[Frontend] Found server.js at: ${tryPath}`);
          break;
        }
      }

      // If not found, search recursively for server.js
      if (!serverJs) {
        console.log(`[Frontend] Searching recursively for server.js...`);
        const searchDir = (dir, depth = 0) => {
          if (depth > 5) return null; // Limit recursion depth
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name === "server.js" && entry.isFile()) {
                return path.join(dir, entry.name);
              }
              if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
                const found = searchDir(path.join(dir, entry.name), depth + 1);
                if (found) return found;
              }
            }
          } catch (e) {
            // Ignore read errors
          }
          return null;
        };
        serverJs = searchDir(standaloneBase);
      }

      if (!serverJs) {
        reject(new Error(`server.js not found in standalone build at ${standaloneBase}`));
        return;
      }

      // Working directory should be where server.js is located (where node_modules is)
      const serverDir = path.dirname(serverJs);
      console.log(`[Frontend] Server directory: ${serverDir}`);
      
      // Use bundled node if available, otherwise fall back to system node
      let nodePath = "node";
      let nodeFound = false;
      
      const resourcesPath = process.resourcesPath;
      const appPath = app.getAppPath();
      
      // Node.js is in extraResources which becomes resources/node in AppImage
      // In AppImage it's at /tmp/.mount_XXX/resources/node/bin/node
      const possibleNodePaths = [
        // Linux AppImage: resources/node/bin/node
        path.join(resourcesPath, "node", "bin", "node"),
        // Windows/Mac: resources/node/node.exe or node
        path.join(resourcesPath, "node", process.platform === "win32" ? "node.exe" : "node"),
        // Fallback: parent directory
        path.join(path.dirname(resourcesPath), "node", "bin", "node"),
        path.join(path.dirname(resourcesPath), "node", process.platform === "win32" ? "node.exe" : "node"),
      ];

      console.log(`[Frontend] Checking for bundled Node.js...`);
      for (const tryPath of possibleNodePaths) {
        console.log(`[Frontend]   Trying: ${tryPath}`);
        if (fs.existsSync(tryPath)) {
          try {
            fs.accessSync(tryPath, fs.constants.X_OK);
            nodePath = tryPath;
            nodeFound = true;
            console.log(`[Frontend] ✓ Using bundled node: ${nodePath}`);
            break;
          } catch (e) {
            console.log(`[Frontend]   Found but not executable: ${e.message}`);
            // On Linux/Mac in AppImage, bundled node might not be executable yet
            // Try to make it executable
            if (process.platform !== "win32") {
              try {
                fs.chmodSync(tryPath, 0o755);
                console.log(`[Frontend]   Fixed permissions and will use: ${tryPath}`);
                nodePath = tryPath;
                nodeFound = true;
                break;
              } catch (chmodErr) {
                console.log(`[Frontend]   Could not fix permissions: ${chmodErr.message}`);
              }
            }
          }
        }
      }

      if (!nodeFound) {
        console.log(`[Frontend] No bundled Node.js found, will use system node`);
        console.log(`[Frontend] Using system node: node`);
      }

      const desiredPort = frontendPort;
      frontendPort = await findAvailablePort(frontendPort, FRONTEND_HOST);
      if (frontendPort !== desiredPort) {
        console.warn(`[Frontend] Port ${desiredPort} in use, using ${frontendPort} instead`);
      }

      const options = {
        cwd: serverDir,
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: frontendPort,
          HOSTNAME: FRONTEND_HOST,
          NEXT_PUBLIC_API_URL: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      };

      console.log(`[Frontend] Starting with: ${nodePath} server.js`);
      console.log(`[Frontend] Working directory: ${serverDir}`);

      frontendProcess = spawn(nodePath, ["server.js"], options);

      frontendProcess.stdout.on("data", (data) => {
        console.log(`[Frontend] ${data.toString().trim()}`);
      });

      frontendProcess.stderr.on("data", (data) => {
        console.error(`[Frontend Error] ${data.toString().trim()}`);
      });

      frontendProcess.on("error", (err) => {
        console.error("[Frontend] Failed to start:", err);
        reject(new Error(`Frontend spawn error: ${err.message}`));
      });

      frontendProcess.on("exit", (code, signal) => {
        if (code !== null && code !== 0 && !isQuitting) {
          console.error(`[Frontend] Process exited with code ${code}`);
        }
      });

      // Wait for frontend to start and verify it's responding
      setTimeout(async () => {
        if (frontendProcess && frontendProcess.exitCode === null) {
          try {
            await checkFrontendHealth();
            console.log("[Frontend] Started and responding successfully");
            resolve();
          } catch (err) {
            console.warn(`[Frontend] Server started but not responding yet: ${err.message}`);
            // Still resolve - window will retry loading
            resolve();
          }
        } else if (!isQuitting) {
          reject(new Error("Frontend process exited during startup"));
        }
      }, 3000);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Start Python HTTP server to serve static frontend files
 */
function startFrontendPythonServer(serveDir) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[Frontend Python] Serve directory: ${serveDir}`);

      // Find the Python script
      const pythonServer = path.join(process.resourcesPath, "app.asar.unpacked", "apps", "backend", "app", "frontend_server.py");
      const altPythonServer = path.join(app.getAppPath(), "apps", "backend", "app", "frontend_server.py");

      let pythonScript = pythonServer;
      if (!fs.existsSync(pythonScript)) {
        pythonScript = altPythonServer;
      }

      if (!fs.existsSync(pythonScript)) {
        reject(new Error(`Python server script not found at ${pythonServer} or ${altPythonServer}`));
        return;
      }

      console.log(`[Frontend Python] Using server script: ${pythonScript}`);

      // Spawn Python server
      const options = {
        cwd: serveDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      };

      frontendProcess = spawn("python3", [pythonScript, serveDir, frontendPort.toString(), FRONTEND_HOST], options);

      frontendProcess.stdout.on("data", (data) => {
        console.log(`[Frontend Python] ${data.toString().trim()}`);
      });

      frontendProcess.stderr.on("data", (data) => {
        console.error(`[Frontend Python Error] ${data.toString().trim()}`);
      });

      frontendProcess.on("error", (err) => {
        console.error("[Frontend Python] Failed to start:", err);
        reject(new Error(`Python server error: ${err.message}`));
      });

      frontendProcess.on("exit", (code, signal) => {
        if (code !== null && code !== 0) {
          console.error(`[Frontend Python] Process exited with code ${code}`);
        }
      });

      // Wait for server to start
      setTimeout(async () => {
        if (frontendProcess && frontendProcess.exitCode === null) {
          // Verify frontend is responding
          try {
            await checkFrontendHealth();
            console.log("[Frontend Python] Started and responding successfully");
            resolve();
          } catch (err) {
            console.warn(`[Frontend Python] Server started but not responding: ${err.message}`);
            resolve(); // Still resolve - might just need more time
          }
        } else {
          reject(new Error("Python server process exited during startup"));
        }
      }, 2000);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Create the main window
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
    },
    icon: isDev
      ? undefined
      : path.join(process.resourcesPath, "icon.png"),
  });

  // Suppress Chrome DevTools protocol errors that are benign in Electron
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // We handle this but don't log every error
  });

  // Suppress console messages that aren't errors
  mainWindow.webContents.on('console-message', (level, message, line, sourceId) => {
    // Only log actual errors, not protocol warnings
    if (level === 3) { // ERROR level
      console.error(`[Renderer] ${message} (${sourceId}:${line})`);
    } else if (process.env.NODE_ENV === 'development' && level <= 1) { // VERBOSE/INFO
      console.log(`[Renderer] ${message}`);
    }
  });

  const startUrl = `http://${FRONTEND_HOST}:${frontendPort}`;

  console.log(`[Window] Loading: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle renderer crashes gracefully
  mainWindow.webContents.on("crashed", () => {
    if (!isQuitting && mainWindow !== null) {
      dialog.showErrorBox(
        "Application Error",
        "The application has crashed. Please restart."
      );
    }
    app.quit();
  });

  // Handle unresponsive renderer
  mainWindow.webContents.on("unresponsive", () => {
    if (!isQuitting && mainWindow !== null) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "warning",
        buttons: ["Close", "Wait"],
        title: "Application Not Responding",
        message: "The application is not responding. Would you like to close it?",
      });
      
      if (choice === 0) {
        mainWindow.destroy();
        app.quit();
      }
    }
  });
}

/**
 * App event handlers
 */
app.on("ready", async () => {
  const startTime = Date.now();
  console.log("[App] Starting up...");
  try {
    // In development, wait for backend to be ready
    // Backend should be started separately with: npm run dev:backend
    // But we'll attempt to connect and wait for it
    if (isDev) {
      console.log("[App] Waiting for backend to be ready...");
      // Wait up to 30 seconds for backend health check
      let attempts = 0;
      const maxAttempts = 60; // 60 * 500ms = 30 seconds
      
      while (attempts < maxAttempts) {
        try {
          const response = await new Promise((resolve, reject) => {
            const request = http.get(
              `http://${BACKEND_HOST}:${BACKEND_PORT}/api/v1/health`,
              { timeout: 2000 },
              (response) => {
                resolve(response.statusCode === 200);
              }
            );
            request.on("error", reject);
            request.on("timeout", () => {
              request.destroy();
              reject(new Error("timeout"));
            });
          });
          
          if (response) {
            console.log("[App] Backend is ready!");
            break;
          }
        } catch (err) {
          attempts++;
          if (attempts % 10 === 0) {
            console.log(`[App] Still waiting for backend (attempt ${attempts}/${maxAttempts})...`);
          }
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      if (attempts >= maxAttempts) {
        console.warn("[App] Backend health check timed out, but proceeding anyway");
      }
    } else {
      // In production, start the bundled backend and frontend
      await startBackend();
      await startFrontend();
    }
    
    await createWindow();
    createMenu();
  } catch (err) {
    console.error("[App] Failed to start:", err);
    if (!isQuitting && mainWindow === null) {
      dialog.showErrorBox(
        "Startup Error",
        `Failed to start Resume Matcher: ${err.message}`
      );
    }
    app.quit();
  }
});

app.on("window-all-closed", () => {
  isQuitting = true;
  stopBackend();
  stopFrontend();
  // Don't quit on macOS - user must explicitly quit
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (mainWindow === null) {
    try {
      await createWindow();
    } catch (err) {
      console.error("[App] Failed to recreate window:", err);
    }
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
  stopFrontend();
});

/**
 * IPC handlers for frontend-backend communication
 */

// File dialog: open file picker for resume upload
ipcMain.handle("dialog:openFile", async (event, options) => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: options.filters || [
      { name: "Documents", extensions: ["pdf", "docx"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "Word", extensions: ["docx"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
});

// File dialog: save file (for PDF export)
ipcMain.handle("dialog:saveFile", async (event, options) => {
  return dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || "resume.pdf",
    filters: options.filters || [
      { name: "PDF", extensions: ["pdf"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
});

// Get app version
ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

// Get backend URL
ipcMain.handle("app:getBackendUrl", () => {
  return `http://${BACKEND_HOST}:${BACKEND_PORT}`;
});

// Open external link
ipcMain.handle("shell:openExternal", async (event, url) => {
  return shell.openExternal(url);
});

// Get app data directory
ipcMain.handle("app:getAppDataPath", () => {
  return app.getPath("userData");
});

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Resume Matcher",
              message: "Resume Matcher",
              detail: `Version ${app.getVersion()}\n\nAI-powered resume tailoring for job descriptions`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle any exceptions - but only show dialog if not quitting
process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught Exception:", error);
  // Only show error dialog if we're not quitting and it's not a benign error
  if (!isQuitting && mainWindow !== null) {
    // Avoid showing dialogs for benign errors that occur during shutdown
    const message = error.message || String(error);
    if (!message.includes("EPIPE") && !message.includes("ERR_HTTP_REQUEST_TIMEOUT")) {
      dialog.showErrorBox(
        "Error",
        "An unexpected error occurred: " + error.message
      );
    }
  }
});
