# Building Resume Matcher Desktop App - Quick Start

## What You Get

A native desktop application for Windows, macOS, and Linux that runs Resume Matcher locally:
- Single executable/installer per platform
- No Docker required
- Offline-capable (after initial setup)
- System file dialogs for uploads/exports
- Native notifications and system integration

## Prerequisites

1. **Node.js 18+**: [Download](https://nodejs.org/)
2. **Python 3.13+**: [Download](https://www.python.org/)
3. **npm** (comes with Node.js)

Verify installation:
```bash
node --version      # Should be 18+
python --version    # Should be 3.13+
npm --version       # Should be 9+
```

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd /path/to/Resume-Matcher
npm run install
```

### 2. Run in Development

**All in one (auto-starts frontend and backend):**
```bash
bash scripts/dev-electron.sh
```

**Or manually in separate terminals:**
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend

# Terminal 3
npm run electron:dev
```

The Electron app should launch automatically!

## Building

### Before Building

Ensure build tools are installed:

**Windows:**
- Visual Studio Build Tools or Python build tools
- From Command Prompt/PowerShell

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential
```

### Build for Your Platform

**Windows:**
```cmd
scripts\build-windows.bat
```
Creates: `Resume Matcher-1.0.0.exe` and portable executable

**macOS:**
```bash
bash scripts/build-mac.sh
```
Creates: `Resume Matcher-1.0.0.dmg` and `.zip`

**Linux:**
```bash
bash scripts/build-linux.sh
```
Creates: `.AppImage` and `.deb` packages

### Build Output

Installers are in `dist/`:
```
dist/
├── Resume Matcher-1.0.0.exe           # Windows installer
├── Resume Matcher-1.0.0-portable.exe  # Windows portable
├── Resume Matcher-1.0.0.dmg           # macOS installer
├── Resume Matcher-1.0.0.zip           # macOS zip
├── Resume Matcher-1.0.0.AppImage      # Linux AppImage
└── resume-matcher_1.0.0_amd64.deb     # Linux deb package
```

## File Storage

Data is stored in platform-specific user directories:

- **Windows**: `%APPDATA%\Resume Matcher\data`
- **macOS**: `~/Library/Application Support/Resume Matcher/data`
- **Linux**: `~/.config/Resume Matcher/data`

## Troubleshooting

### Port 8000 Already in Use

```bash
# macOS/Linux: Find process
lsof -i :8000

# Windows: Find process
netstat -ano | findstr :8000

# Kill it
kill -9 <PID>
```

### Build Fails

```bash
# Clear and reinstall
rm -rf node_modules dist apps/*/node_modules
npm run install
```

### Python Not Found on Build

```bash
# Check Python installation
python --version

# Windows: Add Python to PATH manually
# Then restart your terminal
```

### Playwright Issues

```bash
npx playwright install
```

## Full Documentation

See `docs/electron-integration.md` for:
- Architecture details
- Configuration options
- Advanced building (cross-platform builds)
- Code signing and distribution
- Auto-updates setup

## Need Help?

- [Discord Community](https://dsc.gg/resume-matcher)
- [GitHub Issues](https://github.com/srbhr/Resume-Matcher/issues)
- [Full Integration Guide](./electron-integration.md)
