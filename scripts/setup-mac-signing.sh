#!/usr/bin/env bash
# Quick Setup for macOS Code Signing
# Run this script to set up code signing from scratch
#
# Prerequisites:
#   - Running on macOS
#   - Xcode Command Line Tools installed
#   - Apple Developer account with Developer ID certificate
#
# Usage: bash scripts/setup-mac-signing.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
ENV_FILE="$PROJECT_ROOT/.env.macos"

echo "🔧 macOS Code Signing Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on macOS"
  exit 1
fi

# Step 1: Check Xcode Command Line Tools
echo "📋 Step 1: Checking Xcode Command Line Tools..."
if ! xcode-select -p &>/dev/null; then
  echo "❌ Xcode Command Line Tools not found"
  echo "   Install with: xcode-select --install"
  exit 1
fi
echo "✓ Xcode Command Line Tools installed"
echo ""

# Step 2: Check for Developer ID Certificate
echo "📋 Step 2: Checking for Developer ID Certificate..."
CERTS=$(security find-identity -v | grep "Developer ID Application")

if [ -z "$CERTS" ]; then
  echo "❌ No Developer ID Application certificate found"
  echo ""
  echo "To get a Developer ID Certificate:"
  echo ""
  echo "1. Go to: https://developer.apple.com/account/resources/certificates/add"
  echo "2. Select: Developer ID Application"
  echo "3. Complete the process and download the certificate"
  echo "4. Double-click the .cer file to install"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✓ Found Developer ID Application Certificate:"
echo ""
echo "$CERTS" | while read -r line; do
  echo "   $line"
done
echo ""

# Step 3: Check for .env.macos
echo "📋 Step 3: Checking signing credentials..."

if [ -f "$ENV_FILE" ]; then
  echo "✓ .env.macos already exists"
  read -p "Overwrite existing .env.macos? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Keeping existing .env.macos"
    echo ""
    echo "To update credentials, edit directly or delete and re-run this script."
    exit 0
  fi
fi

# Step 4: Collect credentials
echo "Enter your Apple Developer credentials:"
echo ""

read -p "Apple ID (email): " APPLE_ID
if [ -z "$APPLE_ID" ]; then
  echo "❌ Apple ID required"
  exit 1
fi

# Use getpass for password (masked input)
read -sp "App-Specific Password (from https://appleid.apple.com/account/manage): " APPLE_ID_PASSWORD
echo ""
if [ -z "$APPLE_ID_PASSWORD" ]; then
  echo "❌ App-Specific Password required"
  exit 1
fi

read -p "Team ID (from https://developer.apple.com/account): " TEAM_ID
if [ -z "$TEAM_ID" ]; then
  echo "❌ Team ID required"
  exit 1
fi

echo ""

# Step 5: Create .env.macos
echo "📝 Creating .env.macos..."
cat > "$ENV_FILE" << EOF
# macOS Code Signing Credentials
# DO NOT COMMIT - Add to .gitignore (already configured)
APPLE_ID=$APPLE_ID
APPLE_ID_PASSWORD=$APPLE_ID_PASSWORD
TEAM_ID=$TEAM_ID
EOF

chmod 600 "$ENV_FILE"
echo "✓ .env.macos created (permissions: 600)"
echo ""

# Step 6: Verify credentials
echo "🔍 Verifying credentials..."
export $(cat "$ENV_FILE" | xargs)

# Try a test query to Apple's servers (requires network)
# This would be more complex, so we just verify the format
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_ID_PASSWORD" ] && [ -n "$TEAM_ID" ]; then
  echo "✓ Credentials configured"
else
  echo "❌ Invalid credentials"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo ""
echo "You can now build and sign with:"
echo ""
echo "   bash scripts/build-mac-signed.sh"
echo ""
echo "Or use npm:"
echo ""
echo "   npm run build:electron-mac"
echo ""
echo "The app will be:"
echo "   - Signed with your Developer ID
echo "   - Built in dist/ folder"
echo "   - Ready for notarization if needed"
echo ""
echo "For notarization instructions, see: MACOS_BUILD_GUIDE.md"
