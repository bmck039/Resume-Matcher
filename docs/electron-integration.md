# Electron Integration Guide

This document describes the Electron integration for Resume Matcher, enabling distribution as a native desktop application for Windows, macOS, and Linux.

## Project Structure

```
Resume-Matcher/
├── electron/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # IPC bridge between frontend and backend
│   └── entitlements.mac.plist    # macOS code signing entitlements
├── electron-builder.json          # Electron builder configuration
├── backend.spec                   # PyInstaller spec for bundling Python backend
├── scripts/
│   ├── build-windows.bat         # Windows build script
│   ├── build-mac.sh              # macOS build script
│   ├── build-linux.sh            # Linux build script
│   └── dev-electron.sh           # Development launcher
├── package.json                   # Root npm scripts
├── apps/
│   ├── backend/                  # FastAPI backend
│   └── frontend/                 # Next.js frontend (static export)
└── dist/                         # Output directory for installers
```

## Architecture

### How It Works

1. **Electron Main Process** (`electron/main.js`)
   - Manages application lifecycle and window creation
   - Launches the FastAPI backend process in the background
   - Handles file dialogs, system integration, and IPC communication

2. **Frontend** (Next.js → Static Export)
   - Built as a static site using `next export`
   - Loaded into Electron window via `file://` protocol
   - Communicates with backend via HTTP to `http://localhost:8000`

3. **Backend** (FastAPI)
   - Started by Electron main process on startup
   - Runs as subprocess listening on `http://localhost:8000`
   - Data stored in `{app.getPath('userData')}/data/`
   - Can be bundled with PyInstaller for distribution

4. **IPC Communication** (Electron ↔ Frontend)
   - File dialogs: resume upload, PDF export
   - System integration: open links, get app version
   - All APIs exposed via `window.electronAPI`

## Development

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Python** 3.13+ ([download](https://www.python.org/))
- **npm** 9+ (comes with Node.js)

### Setup

```bash
# Install all dependencies
npm run install

# Or separately:
npm install
npm install --prefix apps/backend
npm install --prefix apps/frontend
```

### Running in Development

**Option 1: Full development mode** (both backend and frontend from source)

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend dev server
npm run dev:frontend

# Terminal 3: Launch Electron
npm run electron:dev
```

**Option 2: Automated script** (starts both servers)

```bash
# macOS/Linux
bash scripts/dev-electron.sh

# Windows (requires Git Bash or WSL)
bash scripts/dev-electron.sh
```

### Development Tips

- **Hot reload**: Frontend changes auto-reload in Electron (Next.js dev server)
- **Backend changes**: Restart Electron to pick up backend code changes
- **DevTools**: Use `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) to open developer tools
- **Logs**: Check console for backend and Electron logs

## Building

### Prerequisites for Building

- **Windows**: Visual Studio Build Tools 2022 or Python build tools
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: Build essential tools (`sudo apt-get install build-essential`)

For bundling Python backend:

```bash
pip install pyinstaller
```

### Build Commands

**Build for current platform:**

```bash
npm run build
```

**Build for all platforms** (requires all toolchains):

```bash
npm run build:electron-all
```

**Build for specific platform:**

```bash
# Windows
npm run build:electron-windows

# macOS
npm run build:electron-mac

# Linux
npm run build:electron-linux
```

**Using platform-specific scripts:**

```bash
# Windows (from Command Prompt or PowerShell)
scripts\build-windows.bat

# macOS/Linux (from terminal)
bash scripts/build-mac.sh
bash scripts/build-linux.sh
```

### Output

Installers are created in the `dist/` directory:

- **Windows**: `.exe` (installer) and portable `.exe`
- **macOS**: `.dmg` (installer) and `.zip`
- **Linux**: `.AppImage` and `.deb` packages

## Configuration

### Electron Builder (`electron-builder.json`)

Controls the build process and installer creation:

```json
{
  "appId": "com.resumematcher.app",
  "productName": "Resume Matcher",
  "directories": {
    "buildResources": "assets",
    "output": "dist"
  },
  "win": { /* Windows build config */ },
  "mac": { /* macOS build config */ },
  "linux": { /* Linux build config */ }
}
```

**Customization options:**
- `appId`: Unique identifier (for auto-updates and system integration)
- `productName`: Display name
- `icon`: Application icon paths
- `files`: What to include in the package

### Next.js (`apps/frontend/next.config.ts`)

The `NEXT_BUILD_ELECTRON` environment variable triggers static export:

```typescript
const isElectron = process.env.NEXT_BUILD_ELECTRON === 'true';
const nextConfig = {
  ...(isElectron && { output: 'export' }),
};
```

### Backend Configuration

Backend runs with these environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `PYTHONUNBUFFERED` | `1` | Real-time logging |
| `DATA_DIR` | `{userData}/data` | Resume/job storage |
| `CORS_ORIGINS` | `http://localhost:3000,app://app` | Allow frontend communication |
| `BACKEND_HOST` | `127.0.0.1` | Local-only binding |
| `BACKEND_PORT` | `8000` | Default port |

## IPC API Reference

Frontend can call these APIs via `window.electronAPI`:

### File Dialogs

```typescript
// Open file picker (for resume upload)
const { filePaths, canceled } = await window.electronAPI.openFile({
  filters: [
    { name: 'Documents', extensions: ['pdf', 'docx'] },
  ]
});

// Save file (for PDF export)
const { filePath, canceled } = await window.electronAPI.saveFile({
  defaultPath: 'resume.pdf',
  filters: [{ name: 'PDF', extensions: ['pdf'] }]
});
```

### App Info

```typescript
// Get app version
const version = await window.electronAPI.getVersion();

// Get backend URL
const backendUrl = await window.electronAPI.getBackendUrl();

// Get app data directory
const dataPath = await window.electronAPI.getAppDataPath();
```

### System Integration

```typescript
// Open external link
await window.electronAPI.openExternal('https://example.com');
```

## Troubleshooting

### Build Issues

**"Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules apps/*/node_modules
npm run install
```

**Python errors on Windows**
- Ensure Python 3.13+ is installed
- Add Python to PATH: `python --version`

**Playwright dependency issues**
```bash
# Install system dependencies
npx playwright install
```

### Runtime Issues

**Backend fails to start**
```
Check if port 8000 is available: lsof -i :8000
Kill process if needed: kill -9 <PID>
```

**Frontend blank/not loading**
- Check DevTools console (Ctrl+Shift+I)
- Verify backend is running: curl http://localhost:8000/api/v1/health
- Check `NEXT_PUBLIC_API_URL` environment variable

**On macOS: App cannot be opened**
- Right-click app → Open (bypass Gatekeeper on first run)
- Code signing may be needed for distribution

## Advanced Topics

### Code Signing (macOS/Windows)

For distribution, apps should be code-signed:

```json
{
  "mac": {
    "certificateFile": "path/to/cert.p12",
    "certificatePassword": "your-password"
  }
}
```

See [electron-builder signing docs](https://www.electron.build/code-signing).

### Auto-Updates

To enable auto-updates:

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

Requires hosting release files on GitHub or other update server.

### Bundling Python Backend

To avoid requiring Python installation:

```bash
# Build executable
pyinstaller backend.spec --onefile

# Copy to resources
cp dist/backend electron/resources/
```

Update `electron/main.js` to use the bundled executable.

## Performance Tips

1. **Frontend**: Use Next.js Image optimization and lazy loading
2. **Backend**: Cache API responses where possible
3. **Startup**: Lazy-initialize PDF renderer (only on first use)
4. **Bundling**: Exclude unnecessary files to reduce installer size

## Security Considerations

1. **Context Isolation**: Enabled in preload.js
2. **Sandbox**: Renderer process sandboxed
3. **IPC Validation**: Main process validates all IPC calls
4. **CORS**: Configured to allow only localhost

See `electron/main.js` for security configuration.

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)
- [PyInstaller](https://www.pyinstaller.org/)

## Support

For issues or questions:
- GitHub Issues: [Resume-Matcher Issues](https://github.com/srbhr/Resume-Matcher/issues)
- Discord: [Join our server](https://dsc.gg/resume-matcher)
