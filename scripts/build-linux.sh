#!/bin/bash
# Updated build script for Resume Matcher Electron app on Linux
# Now includes backend bundling and icon generation

set -e

echo "🔨 Building Resume Matcher Electron App for Linux..."
echo ""

# Get the script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required"; exit 1; }

echo "✓ Node.js and npm found"
echo "✓ Python found"
echo ""

# Validate cached Electron archive. Corrupt cache can cause missing executable
# in dist/linux-unpacked and trigger ENOENT rename failures.
if command -v unzip >/dev/null 2>&1; then
  ELECTRON_VERSION="$(node -p "require('./node_modules/electron/package.json').version" 2>/dev/null || true)"
  if [ -n "$ELECTRON_VERSION" ]; then
    ELECTRON_CACHE_ZIP="$HOME/.cache/electron/electron-v${ELECTRON_VERSION}-linux-x64.zip"
    if [ -f "$ELECTRON_CACHE_ZIP" ]; then
      echo "📦 Validating cached Electron archive..."
      if unzip -tqq "$ELECTRON_CACHE_ZIP" >/dev/null 2>&1; then
        echo "✓ Electron cache is healthy"
      else
        echo "⚠️  Corrupted Electron cache detected"
        echo "🧹 Removing: $ELECTRON_CACHE_ZIP"
        rm -f "$ELECTRON_CACHE_ZIP"
      fi
      echo ""
    fi
  fi
fi

# Remove stale unpacked output from previous failed runs
rm -rf dist/linux-unpacked

# Generate icons if they don't exist
if [ ! -f "assets/icon.png" ]; then
  echo "🎨 Generating app icons..."
  npm run generate:icons || echo "⚠️  Icon generation skipped"
  echo ""
fi

# Build everything (frontend + backend)
echo "📦 Building application..."
npm run build:electron-linux

echo ""
echo "✅ Build complete!"
echo "📂 Installers are in: ./dist/"
echo ""
echo "Built files:"
ls -lh dist/*.{AppImage,deb} 2>/dev/null || echo "No installers found"
