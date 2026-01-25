#!/bin/bash
# Updated build script for Resume Matcher Electron app on macOS
# Supports cross-platform building from Linux

set -e

echo "🔨 Building Resume Matcher Electron App for macOS..."
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

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "✓ Running on macOS"
  CROSS_BUILD=false
else
  echo "⚠️  Cross-compiling for macOS from Linux"
  echo "   Note: DMG creation may have limitations"
  CROSS_BUILD=true
fi
echo ""

# Generate icons if they don't exist
if [ ! -f "assets/icon.png" ]; then
  echo "🎨 Generating app icons..."
  npm run generate:icons || echo "⚠️  Icon generation skipped"
  echo ""
fi

# Create .icns if on macOS and not exists
if [ "$CROSS_BUILD" = false ] && [ ! -f "assets/icons/icon.icns" ]; then
  echo "🎨 Creating macOS .icns icon..."
  node scripts/create-icns.js || echo "⚠️  .icns creation skipped, will use PNG fallback"
  echo ""
fi

if [ "$CROSS_BUILD" = true ]; then
  echo "ℹ️  Building without .icns (using PNG fallback)"
  echo ""
fi

# Build backend for macOS if on macOS, or skip if cross-building
if [ "$CROSS_BUILD" = false ]; then
  echo "🔨 Building macOS backend..."
  node scripts/build-backend-mac.js || echo "⚠️  Backend build skipped"
  echo ""
else
  echo "⚠️  Skipping backend build (cross-platform limitation)"
  echo "   The app will bundle Python source code instead"
  echo ""
fi

# Build everything (frontend + electron app)
echo "📦 Building frontend..."
npm run build:frontend

echo "📦 Building Electron app..."
npm run build:electron-mac

echo ""
echo "✅ Build complete!"
echo "📂 Installers are in: ./dist/"
echo ""
echo "Built files:"
ls -lh dist/*.{dmg,zip} 2>/dev/null || echo "No installers found"
