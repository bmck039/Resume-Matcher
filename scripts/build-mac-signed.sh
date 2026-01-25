#!/bin/bash
# macOS Build with Code Signing Support
# Usage: bash scripts/build-mac-signed.sh
# 
# Prerequisites:
#   1. Create .env.macos file with:
#      APPLE_ID=your-email@example.com
#      APPLE_ID_PASSWORD=app-specific-password
#      TEAM_ID=XXXXXXXXXX
#   2. Developer ID Certificate installed in keychain
#   3. Run: xcode-select --install

set -e

echo "🔨 Building Resume Matcher for macOS with Code Signing..."
echo ""

# Get the script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on macOS"
  exit 1
fi

echo "📋 Checking prerequisites..."

# Check Xcode Command Line Tools
if ! xcode-select -p &>/dev/null; then
  echo "❌ Xcode Command Line Tools not found"
  echo "   Run: xcode-select --install"
  exit 1
fi
echo "✓ Xcode Command Line Tools found"

# Check Node.js
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
echo "✓ Node.js found"

# Check npm
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
echo "✓ npm found"

# Check Python
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required"; exit 1; }
echo "✓ Python 3 found"

# Check PyInstaller
python3 -c "import PyInstaller" 2>/dev/null || { 
  echo "❌ PyInstaller not found"
  echo "   Run: pip install pyinstaller"
  exit 1
}
echo "✓ PyInstaller found"

echo ""

# Check for .env.macos
if [ -f ".env.macos" ]; then
  echo "📝 Loading signing credentials from .env.macos..."
  export $(cat .env.macos | xargs)
  echo "✓ Environment variables loaded"
  
  if [ -z "$APPLE_ID" ]; then
    echo "⚠️  APPLE_ID not set in .env.macos"
  else
    echo "   APPLE_ID: $APPLE_ID"
  fi
  
  if [ -z "$TEAM_ID" ]; then
    echo "⚠️  TEAM_ID not set in .env.macos"
  else
    echo "   TEAM_ID: $TEAM_ID"
  fi
else
  echo "⚠️  .env.macos not found - building unsigned"
  echo "   To enable signing, create .env.macos with:"
  echo "   APPLE_ID=your-email@example.com"
  echo "   APPLE_ID_PASSWORD=app-specific-password"
  echo "   TEAM_ID=XXXXXXXXXX"
fi

echo ""

# Check for Developer ID Certificate
echo "🔍 Checking for Developer ID Certificate..."
IDENTITIES=$(security find-identity -v | grep "Developer ID Application")

if [ -z "$IDENTITIES" ]; then
  echo "⚠️  No Developer ID Application certificate found"
  echo "   Install from: https://developer.apple.com/account/resources/certificates/add"
  echo "   Building unsigned DMG..."
  unsigned=true
else
  echo "✓ Developer ID Certificate found:"
  echo "$IDENTITIES" | head -1 | sed 's/^/   /'
  unsigned=false
  
  # Extract identity for signing
  IDENTITY=$(echo "$IDENTITIES" | head -1 | grep -oE '"[^"]*"' | head -1 | tr -d '"')
  echo "   Using: $IDENTITY"
fi

echo ""

# Generate icons if needed
if [ ! -f "assets/icon.png" ]; then
  echo "🎨 Generating app icons..."
  npm run generate:icons || echo "⚠️  Icon generation skipped"
  echo ""
fi

# Create .icns if needed
if [ ! -f "assets/icons/icon.icns" ]; then
  echo "🎨 Creating macOS .icns icon..."
  npm run create:icns || echo "⚠️  .icns creation skipped, will use PNG fallback"
  echo ""
fi

# Build backend for macOS
echo "🔨 Building macOS backend executable..."
node scripts/build-backend.js || echo "⚠️  Backend build skipped"
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build:frontend
echo ""

# Build Electron app with signing
echo "📦 Building Electron app..."

if [ "$unsigned" = true ]; then
  echo "   Building unsigned (no Developer ID certificate)"
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:electron-mac
else
  echo "   Building with code signing"
  export CSC_IDENTITY_AUTO_DISCOVERY=true
  export CSC_KEYCHAIN=login
  npm run build:electron-mac
fi

echo ""
echo "✅ Build complete!"
echo "📂 Output: ./dist/"
echo ""
echo "Built files:"
ls -lh dist/*.dmg dist/*.zip 2>/dev/null | awk '{print "   " $9, "(" $5 ")"}'

echo ""

# Show notarization instructions if signed
if [ "$unsigned" = false ] && [ ! -z "$APPLE_ID" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📢 NEXT: Notarize the DMG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Submit for notarization:"
  echo ""
  echo "   xcrun notarytool submit dist/Resume\ Matcher-*.dmg \\"
  echo "     --apple-id $APPLE_ID \\"
  echo "     --password \$APPLE_ID_PASSWORD \\"
  echo "     --team-id $TEAM_ID \\"
  echo "     --wait"
  echo ""
  echo "2. Staple notarization to DMG:"
  echo ""
  echo "   xcrun stapler staple dist/Resume\ Matcher-*.dmg"
  echo ""
  echo "3. Verify:"
  echo ""
  echo "   xcrun stapler validate dist/Resume\ Matcher-*.dmg"
  echo ""
  echo "See MACOS_BUILD_GUIDE.md for detailed instructions."
fi
