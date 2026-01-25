#!/usr/bin/env bash
# Post-installation verification script
# Checks that all Electron integration files are in place

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🔍 Verifying Electron Integration Setup..."
echo ""

MISSING=0

# Check files
check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1"
  else
    echo "❌ $1 - MISSING"
    MISSING=$((MISSING + 1))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo "✅ $1/"
  else
    echo "❌ $1/ - MISSING"
    MISSING=$((MISSING + 1))
  fi
}

echo "📁 Checking directory structure..."
check_dir "electron"
check_dir "scripts"
check_dir "docs"

echo ""
echo "📄 Checking core files..."
check_file "electron/main.js"
check_file "electron/preload.js"
check_file "electron/entitlements.mac.plist"
check_file "electron-builder.json"
check_file "backend.spec"
check_file "package.json"

echo ""
echo "📜 Checking scripts..."
check_file "scripts/build-windows.bat"
check_file "scripts/build-mac.sh"
check_file "scripts/build-linux.sh"
check_file "scripts/dev-electron.sh"

echo ""
echo "📚 Checking documentation..."
check_file "SETUP.md"
check_file "docs/ELECTRON_QUICKSTART.md"
check_file "docs/electron-integration.md"

echo ""
echo "💻 Checking frontend integration..."
check_file "apps/frontend/lib/types/electron.ts"
check_file "apps/frontend/hooks/use-electron-api.ts"
check_file "apps/frontend/components/electron-example.tsx"

echo ""
echo "⚙️  Checking configuration..."
check_file "apps/frontend/next.config.ts"

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ All files verified successfully!"
  echo ""
  echo "🚀 Next steps:"
  echo "  1. Install dependencies: npm run install"
  echo "  2. Run development: bash scripts/dev-electron.sh"
  echo "  3. Read docs/ELECTRON_QUICKSTART.md for more info"
else
  echo "❌ $MISSING files are missing"
  exit 1
fi
