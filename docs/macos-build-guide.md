# Building and Signing Resume Matcher on macOS

This guide covers building, code signing, and distributing Resume Matcher on macOS. You'll go from zero to a notarized DMG installer in about 30 minutes.

## Prerequisites

You'll need:
- macOS 10.13 or later
- Xcode Command Line Tools: `xcode-select --install`
- Node.js 18+ and Python 3.12+
- An Apple Developer Program account ($99/year) for code signing
- PyInstaller: `pip install pyinstaller`

If you just want to build for testing without code signing, skip the Apple Developer account requirement.

## What Gets Built

When you run the build scripts, you get:
- `Resume Matcher-*.dmg` - Installer for distribution (signed)
- `Resume Matcher-*.zip` - Portable version (signed)
- A fully code-signed app that macOS trusts
- Optional: A notarized DMG that works offline without warnings

## Setting Up Code Signing (One Time)

On your Mac, run:

```bash
bash scripts/setup-mac-signing.sh
```

This script will:
1. Check that you have Xcode Command Line Tools installed
2. Verify your Developer ID certificate is in the keychain
3. Prompt you for three pieces of information:
   - **Apple ID**: Your developer email
   - **App-Specific Password**: Create one at https://appleid.apple.com/account/manage (Security section)
   - **Team ID**: Find this at https://developer.apple.com/account (Membership section)

The script saves your credentials to `.env.macos` with secure permissions. This file is git-ignored and never committed.

If you don't have a Developer ID certificate yet, generate one at https://developer.apple.com/account/resources/certificates/ (select "Developer ID Application").

## Building and Signing

To build, sign, and create the DMG:

```bash
bash scripts/build-mac-signed.sh
```

This does:
1. Generates app icons from the SVG source
2. Bundles the Python backend with PyInstaller
3. Builds the frontend with Next.js
4. Signs everything with your Developer ID certificate
5. Creates both DMG and ZIP packages

You'll find the signed DMG and ZIP in `dist/`.

**For testing without signing** (faster, no certificate needed):

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:electron-mac
```

This creates an unsigned ZIP you can test locally.

## Notarizing for Distribution (Optional)

If you're distributing to users, notarization is recommended. It submits your app to Apple for scanning and prevents the "damaged app" warning.

To notarize:

```bash
bash scripts/notarize-mac.sh
```

This:
1. Submits the DMG to Apple (5-15 minutes)
2. Embeds the approval ticket in the DMG
3. Verifies everything worked

Users won't see any warnings when they open it.

## Manual Build Commands

If you prefer to run things step by step:

```bash
# Load credentials
export $(cat .env.macos | xargs)

# Generate icons if needed
npm run generate:icons
npm run create:icns

# Build the backend
node scripts/build-backend.js

# Build the frontend
npm run build:frontend

# Build the Electron app with signing
npm run build:electron-mac
```

## Troubleshooting

### "Developer ID Application certificate not found"

Your certificate isn't in the keychain. Check what you have:

```bash
security find-identity -v | grep "Developer ID"
```

If empty, generate one at https://developer.apple.com/account/resources/certificates/ and double-click to import.

### "code signature invalid"

Try re-signing the app:

```bash
codesign -s "Developer ID Application: Your Name" \
  --force \
  --options runtime \
  --entitlements electron/entitlements.mac.plist \
  dist/Resume\ Matcher-*.app
```

Replace "Your Name" with your actual name from the keychain.

### Verify your signature

```bash
codesign -vvv dist/Resume\ Matcher-*.dmg
```

Should show "valid on disk" and "satisfies its Designated Requirement".

### App-specific password is invalid

Generate a new one at https://appleid.apple.com/account/manage (Security section) and update `.env.macos`.

### Build failed during backend compilation

Run the backend builder manually:

```bash
node scripts/build-backend.js
```

Check that PyInstaller is installed: `python3 -m PyInstaller --version`

## What's Happening Under the Hood

When you run the build script:

1. **Icon generation**: SVG → PNG files (16-1024px) → .icns format for macOS
2. **Backend bundling**: Python code → standalone executable using PyInstaller (Linux only; other platforms bundle Python)
3. **Frontend build**: TypeScript/React → optimized HTML/CSS/JS with Next.js
4. **Electron packaging**: All the above → DMG using electron-builder
5. **Code signing**: Everything gets signed with your Developer ID certificate
6. **Notarization** (optional): DMG submitted to Apple, approval ticket embedded

The credentials from `.env.macos` are loaded into environment variables during the build and used by electron-builder for signing.

## Distribution

After building and optionally notarizing:

1. Upload the DMG to GitHub Releases, your website, or a distribution server
2. Users download and launch like any Mac app
3. If notarized, they won't see any security warnings

For automated updates, consider adding [Sparkle](https://sparkle-project.org/).

## Security

The build system includes:
- **Code signing**: Proves the app is from you
- **Hardened runtime**: Prevents code injection attacks
- **Entitlements**: Controls what the app can access
- **Notarization**: Apple scans for malware

Credentials are stored locally in `.env.macos` with 600 permissions (user-only readable) and are git-ignored.

## npm Scripts

For convenience:

```bash
npm run setup:mac-signing    # Run setup script
npm run build:mac-signed     # Build and sign
npm run notarize:mac         # Notarize the DMG
npm run build:backend        # Build backend only
npm run generate:icons       # Generate app icons
npm run create:icns          # Create macOS icon
```

## Time Estimates

- Setup: 10 minutes (one time)
- Build: 10 minutes
- Notarization: 5-15 minutes (Apple's processing time)
- Total per release: 20-30 minutes

## If Something's Still Broken

Check the build logs:

```bash
cat ~/.config/electron-builder/cache/electron-builder-*.log
```

Run with debug output:

```bash
DEBUG=* bash scripts/build-mac-signed.sh
```

Check what's in your keychain:

```bash
security find-identity -v
```

## That's It

You now have everything needed to build, sign, and distribute a production-ready macOS app. The process is automated, credentials are secure, and notarization handles the trust story for your users.

Questions? The troubleshooting section covers most issues. For more details, check the CODE_SIGNING_GUIDE.md for cross-platform context.
