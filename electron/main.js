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

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_HOST = "127.0.0.1";

/**
 * Get the path to the bundled Python executable
 */
function getBackendPath() {
  if (isDev) {
    // Development: run Python directly
    return null; // Will use python command
  }
  // Production: use bundled executable
  const exeName =
    process.platform === "win32" ? "backend.exe" : "backend";
  return path.join(process.resourcesPath, "backend", exeName);
}

/**
 * Start the FastAPI backend process
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      let pythonPath;
      let args;

      if (isDev) {
        // Development mode: use python3 from PATH
        pythonPath = "python3";
        args = [
          "-m",
          "uvicorn",
          "app.main:app",
          `--host=${BACKEND_HOST}`,
          `--port=${BACKEND_PORT}`,
          "--reload",
        ];
      } else {
        // Production mode: use bundled executable
        pythonPath = getBackendPath();
        args = [];
      }

      const options = {
        cwd: isDev
          ? path.join(__dirname, "..", "apps", "backend")
          : path.join(process.resourcesPath, "backend"),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          // Configure backend to listen on localhost
          BACKEND_HOST: BACKEND_HOST,
          BACKEND_PORT: BACKEND_PORT,
          // Set data directory to app user data
          DATA_DIR: path.join(app.getPath("userData"), "data"),
          // Allow frontend to communicate from file:// protocol and localhost
          // For development (Next.js dev server) and production (Electron static export)
          CORS_ORIGINS: JSON.stringify(isDev 
            ? ["http://localhost:3000", "http://127.0.0.1:3000"]
            : ["file://", "http://localhost:8000", "http://127.0.0.1:8000"]),
          NODE_ENV: isDev ? "development" : "production",
        },
        stdio: ["ignore", "pipe", "pipe"],
      };

      console.log(
        `[Backend] Starting with: ${pythonPath} ${args.join(" ")}`
      );

      backendProcess = spawn(pythonPath, args, options);

      // Log backend output
      backendProcess.stdout.on("data", (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
      });

      backendProcess.stderr.on("data", (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`);
      });

      backendProcess.on("error", (err) => {
        console.error("[Backend] Failed to start:", err);
        reject(err);
      });

      // Give backend time to start, then check if it's responding (3 seconds for startup)
      setTimeout(() => {
        checkBackendHealth()
          .then(() => {
            console.log("[Backend] Started successfully");
            resolve();
          })
          .catch(() => {
            reject(new Error("Backend failed to start"));
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
  const maxRetries = 15;
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

/**
 * Stop the backend process
 */
function stopBackend() {
  if (backendProcess) {
    console.log("[Backend] Stopping...");
    backendProcess.kill();
    backendProcess = null;
  }
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

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "..", "apps", "frontend", "out", "index.html")}`;

  console.log(`[Window] Loading: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle any uncaught exceptions in renderer
  mainWindow.webContents.on("crashed", () => {
    dialog.showErrorBox(
      "Application Error",
      "The application has crashed. Please restart."
    );
  });
}

/**
 * App event handlers
 */
app.on("ready", async () => {
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
      // In production, start the bundled backend
      await startBackend();
    }
    
    await createWindow();
    createMenu();
  } catch (err) {
    console.error("[App] Failed to start:", err);
    dialog.showErrorBox(
      "Startup Error",
      `Failed to start Resume Matcher: ${err.message}`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopBackend();
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
  stopBackend();
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

// Handle any exceptions
process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught Exception:", error);
  dialog.showErrorBox(
    "Error",
    "An unexpected error occurred: " + error.message
  );
});
