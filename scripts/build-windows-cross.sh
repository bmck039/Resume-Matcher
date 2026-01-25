#!/bin/bash
# Cross-platform build script for Windows from Linux
# Uses Wine if available for better compatibility

set -e

echo "🔨 Building Resume Matcher for Windows (from Linux)..."
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

# Check for Wine (optional, for better Windows builds)
if command -v wine >/dev/null 2>&1; then
  echo "✓ Wine found (enhanced Windows compatibility)"
else
  echo "ℹ️  Wine not found (optional, but recommended for Windows builds)"
  echo "   Install with: sudo apt install wine64"
fi
echo ""

# Generate icons if they don't exist
if [ ! -f "assets/icon.png" ]; then
  echo "🎨 Generating app icons..."
  npm run generate:icons || echo "⚠️  Icon generation skipped"
  echo ""
fi

# Create .ico if it doesn't exist
if [ ! -f "assets/icons/icon.ico" ]; then
  echo "🎨 Creating Windows .ico icon..."
  node scripts/create-ico.js || echo "⚠️  .ico creation skipped, will use PNG fallback"
  echo ""
fi

# Note about backend building
echo "ℹ️  Windows backend cross-compilation from Linux is complex"
echo "   The app will bundle Python source code instead"
echo "   For native Windows backend, build on Windows with PyInstaller"
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build:frontend

# Build Electron app for Windows
echo "📦 Building Electron app for Windows..."
npm run build:electron-windows

echo ""
echo "✅ Build complete!"
echo "📂 Installers are in: ./dist/"
echo ""
echo "Built files:"
ls -lh dist/*.exe 2>/dev/null || echo "No Windows installers found"
