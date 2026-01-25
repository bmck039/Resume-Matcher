#!/bin/bash
# macOS App Notarization Script
# Submits the built DMG for Apple notarization and staples the ticket
#
# Prerequisites:
#   - .env.macos file with APPLE_ID, APPLE_ID_PASSWORD, TEAM_ID
#   - Already built with: bash scripts/build-mac-signed.sh
#
# Usage: bash scripts/notarize-mac.sh

set -e

echo "📤 macOS App Notarization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on macOS"
  exit 1
fi

# Check for .env.macos
if [ ! -f ".env.macos" ]; then
  echo "❌ .env.macos not found"
  echo "   Run: bash scripts/setup-mac-signing.sh"
  exit 1
fi

# Load credentials
export $(cat .env.macos | xargs)

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_ID_PASSWORD" ] || [ -z "$TEAM_ID" ]; then
  echo "❌ Missing credentials in .env.macos"
  echo "   APPLE_ID: $APPLE_ID"
  echo "   APPLE_ID_PASSWORD: $([ -z "$APPLE_ID_PASSWORD" ] && echo '(missing)' || echo '(set)')"
  echo "   TEAM_ID: $TEAM_ID"
  exit 1
fi

# Find the most recent DMG
DMG=$(ls -t dist/Resume\ Matcher-*.dmg 2>/dev/null | head -1)

if [ -z "$DMG" ]; then
  echo "❌ No DMG found in dist/"
  echo "   Build first with: bash scripts/build-mac-signed.sh"
  exit 1
fi

echo "📦 File: $(basename $DMG)"
echo "📏 Size: $(ls -lh "$DMG" | awk '{print $5}')"
echo ""

# Step 1: Submit for notarization
echo "📤 Submitting for notarization..."
echo "   This may take a few minutes..."
echo ""

RESULT=$(xcrun notarytool submit "$DMG" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_ID_PASSWORD" \
  --team-id "$TEAM_ID" \
  --wait 2>&1)

echo "$RESULT"
echo ""

# Check if submission succeeded
if echo "$RESULT" | grep -q "Accepted"; then
  echo "✅ Notarization accepted"
else
  echo "❌ Notarization failed or timed out"
  echo ""
  echo "To check status later:"
  echo "   xcrun notarytool history --apple-id $APPLE_ID"
  exit 1
fi

# Step 2: Staple notarization ticket
echo ""
echo "📌 Stapling notarization ticket..."

if xcrun stapler staple "$DMG" > /dev/null 2>&1; then
  echo "✅ Staple successful"
else
  echo "❌ Staple failed"
  exit 1
fi

# Step 3: Verify
echo ""
echo "🔍 Verifying stapled ticket..."

if xcrun stapler validate "$DMG" > /dev/null 2>&1; then
  echo "✅ Validation successful"
else
  echo "⚠️  Validation warning (but staple completed)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Notarization Complete!"
echo ""
echo "📦 App is ready for distribution:"
echo "   $(basename $DMG)"
echo ""
echo "The notarization ticket is embedded in the DMG and works offline."
echo ""
echo "Next steps:"
echo "1. Test locally: hdiutil attach \"$DMG\""
echo "2. Launch the app and verify it launches without warning"
echo "3. Create a GitHub release or upload to your distribution server"
echo ""
