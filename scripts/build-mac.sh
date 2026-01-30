#!/bin/bash
# Updated build script for Resume Matcher Electron app on macOS
# Now includes backend bundling and icon generation (matches Linux workflow)

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
echo ""

# Generate icons if they don't exist
if [ ! -f "assets/icon.png" ]; then
  echo "🎨 Generating app icons..."
  npm run generate:icons || echo "⚠️  Icon generation skipped"
  echo ""
fi

# Build everything (frontend + backend)
echo "📦 Building application..."
npm run build:electron-mac

echo ""
echo "✅ Build complete!"
echo "📂 Installers are in: ./dist/"
echo ""
echo "Built files:"
ls -lh dist/*.{dmg,zip} 2>/dev/null || echo "No installers found"
