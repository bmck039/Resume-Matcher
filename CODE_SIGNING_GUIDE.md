# Cross-Platform Build & Code Signing Guide

## Current Build Status from Linux

✅ = Works  
⚠️ = Works with limitations  
❌ = Requires native platform

| Platform | Build | Sign | Backend | Notes |
|----------|-------|------|---------|-------|
| **Linux** | ✅ Full | ✅ Optional | ✅ Native | AppImage + deb, standalone |
| **Windows** | ✅ Full | ❌ Windows only | ⚠️ Source | EXE + NSIS installer |
| **macOS** | ✅ ZIP | ❌ macOS only | ⚠️ Source | ZIP (DMG requires macOS) |

## Quick Start

```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm python3 python3-pip imagemagick wine64
pip install pyinstaller

# Build for all platforms from Linux
npm run build:all-from-linux
```

**Output:**
```
dist/
├── Resume Matcher-1.0.0-x86_64.AppImage        # Linux - Ready to distribute
├── resume-matcher-desktop_1.0.0_amd64.deb     # Linux - Ready to distribute
├── Resume Matcher 1.0.0.exe                    # Windows - Unsigned
├── Resume Matcher Setup 1.0.0.exe              # Windows - Unsigned (NSIS)
└── Resume Matcher-1.0.0-mac.zip                # macOS - Unsigned
```

---

## Signing Requirements by Platform

### Linux (AppImage & deb)

**Optional** - Linux packages can be distributed unsigned. Users can verify with GPG if provided.

**To sign (optional):**
```bash
# Sign with GPG
gpg --detach-sign dist/Resume\ Matcher-*.AppImage

# Users verify with:
gpg --verify dist/Resume\ Matcher-*.AppImage.sig
```

### Windows (.exe)

**Required for:**
- SmartScreen bypass
- Trusted installation experience
- Windows update deployment

**What you need:**
1. **Code Signing Certificate** ($100-300/year)
   - DigiCert Code Signing
   - Sectigo (formerly Comodo)
   - GlobalSign
   - Entrust/DataCard

2. **Certificate file**: `.pfx` or `.p12` (PKCS#12)

3. **Timestamp server URL** (included with certificate)

**How to obtain:**

1. **DigiCert** (recommended):
   ```
   Go to: https://www.digicert.com/code-signing/
   Select: Individual Code Signing
   Cost: $228/year
   ```

2. **Sectigo**:
   ```
   Go to: https://sectigo.com/ssl-certificates/code-signing
   Cost: $99/year
   ```

**How to sign:**

Option A - Sign on Windows:

```bash
# Install certificate
# 1. Double-click .pfx file
# 2. Import into "Current User > Personal > Certificates"

# In package.json, add:
"build:electron-windows": "npm run prebuild && electron-builder --config electron-builder.json --win"

# Update electron-builder.json:
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "YOUR_PASSWORD",
    "signingHashAlgorithms": ["sha256"],
    "certificateSha1": "SHA1_HASH"  // optional
  }
}

# Build
npm run build:electron-windows
```

Option B - Build on Linux, sign on Windows:

```bash
# On Linux:
npm run build:electron-windows

# Copy to Windows machine, then:
# Install certificate (double-click .pfx)

# Sign with signtool
signtool.exe sign /f certificate.pfx /p PASSWORD ^
  /t http://timestamp.digicert.com /td sha256 ^
  "dist\Resume Matcher*.exe"

# Verify signature
signtool.exe verify /pa "dist\Resume Matcher*.exe"
```

Option C - Use DigiCert One (automatic signing):

```bash
# Install DigiCert One client
# Add to electron-builder.json:
{
  "win": {
    "signingHashAlgorithms": ["sha256"],
    "sign": "./scripts/sign-windows.js"  // custom signing script
  }
}

# Create scripts/sign-windows.js:
const { execSync } = require('child_process');
module.exports = async (configuration) => {
  const { path } = configuration;
  console.log(`Signing ${path}...`);
  execSync(`C:\\Program Files\\DigiCert\\DigiCert One\\smctl.exe sign \
    --keypair-alias YOUR_ALIAS \
    --input-file "${path}" \
    --output-file "${path}"`);
};
```

### macOS (.app & .dmg)

**Required for distribution** through:
- Mac App Store
- Direct distribution to users
- Gatekeeper acceptance

**What you need:**
1. **Apple Developer Account** ($99/year)
   - https://developer.apple.com/programs/

2. **Mac hardware** (Intel or Apple Silicon)
   - Cannot be built on Linux or Windows
   - Requires Xcode Command Line Tools

3. **Developer ID Certificate** (from Apple)

4. **Team ID** (from Apple Developer account)

**How to set up:**

1. **Enroll in Apple Developer Program**
   ```
   https://developer.apple.com/programs/
   Cost: $99/year
   ```

2. **Generate certificates** (on Mac):
   ```bash
   # Install Xcode Command Line Tools
   xcode-select --install
   
   # Go to: https://developer.apple.com/account/resources/certificates/add
   # Create "Developer ID Application" certificate
   # Download .cer file, double-click to import
   ```

3. **Find signing identity**:
   ```bash
   security find-identity -v
   # Output: "Developer ID Application: Your Name (TEAM_ID)"
   ```

4. **Update electron-builder.json**:
   ```json
   {
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)",
       "hardenedRuntime": true,
       "gatekeeperAssess": false,
       "entitlements": "electron/entitlements.mac.plist",
       "entitlementsInherit": "electron/entitlements.mac.plist"
     },
     "dmg": {
       "sign": false  // DMG itself doesn't need signing, just the .app inside
     }
   }
   ```

5. **Build on macOS**:
   ```bash
   npm install
   npm run build:electron-mac
   ```

6. **Notarize with Apple** (required for Gatekeeper):
   ```bash
   # Generate app-specific password:
   # https://appleid.apple.com > Security > App-specific passwords
   
   # Notarize
   xcrun notarytool submit dist/Resume\ Matcher-*.dmg \
     --apple-id your-email@example.com \
     --password app-specific-password \
     --team-id TEAM_ID \
     --wait
   
   # Staple notarization to DMG
   xcrun stapler staple dist/Resume\ Matcher-*.dmg
   ```

---

## Complete Signing Workflow

### For Production Release

**Step 1: Build unsigned on Linux**
```bash
npm run build:all-from-linux

# Outputs:
# - dist/Resume Matcher-1.0.0-x86_64.AppImage (✅ ready)
# - dist/resume-matcher-desktop_1.0.0_amd64.deb (✅ ready)
# - dist/Resume Matcher 1.0.0.exe (⏳ needs Windows signing)
# - dist/Resume Matcher-1.0.0-mac.zip (⏳ needs macOS signing)
```

**Step 2: Sign Windows on Windows**
```bash
# On Windows machine:
# 1. Install certificate (.pfx)
# 2. Copy unsigned .exe from Linux

signtool.exe sign /f certificate.pfx /p PASSWORD \
  /t http://timestamp.digicert.com /td sha256 \
  "Resume Matcher*.exe"

# Copy signed .exe back to dist/
```

**Step 3: Build and sign macOS on macOS**
```bash
# On macOS machine:
git clone <repo>
npm install
npm run build:electron-mac

# Notarize
xcrun notarytool submit dist/Resume\ Matcher-*.dmg \
  --apple-id your-email@example.com \
  --password app-specific-password \
  --team-id TEAM_ID \
  --wait

xcrun stapler staple dist/Resume\ Matcher-*.dmg
```

**Step 4: Distribute**
```
✅ Linux: dist/Resume Matcher-1.0.0-x86_64.AppImage
✅ Linux: dist/resume-matcher-desktop_1.0.0_amd64.deb
✅ Windows: dist/Resume Matcher 1.0.0.exe (signed)
✅ Windows: dist/Resume Matcher Setup 1.0.0.exe (signed)
✅ macOS: dist/Resume Matcher-1.0.0-mac.zip (signed & notarized)
```

---

## Cost Summary

| Platform | Certificate | Cost | Duration | Renewal |
|----------|-------------|------|----------|---------|
| Linux | GPG (optional) | Free | Forever | N/A |
| Windows | Code Signing | $99-300 | 1 year | Annual |
| macOS | Apple Developer | $99 | 1 year | Annual |

**Total annual cost for all platforms: ~$200-400**

---

## Troubleshooting

### Windows

**"signtool.exe not found"**
```bash
# Install Windows SDK or Visual Studio with C++ tools
# Or add to PATH: C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64
```

**"Invalid password"**
```bash
# Verify .pfx password is correct
# Try viewing certificate: 
certutil -dump certificate.pfx
```

**"The certificate chain was not validated"**
```bash
# Certificate may have expired
# Generate new one from your CA
```

### macOS

**"No identity found"**
```bash
security find-identity -v
# If empty, import certificate:
security import certificate.p12 -k ~/Library/Keychains/login.keychain
```

**"Notarization failed"**
```bash
# Check logs:
xcrun notarytool log <submission-id> --apple-id your-email
```

**"Need to build on macOS"**
- DMG creation requires macOS tools
- Use ZIP format for cross-platform
- Or clone repo on actual Mac hardware

---

## References

- [Electron Code Signing](https://www.electron.build/code-signing)
- [Windows Code Signing Certificates](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/get-a-code-signing-certificate)
- [macOS Code Signing Overview](https://developer.apple.com/support/code-signing/)
- [App Notarization](https://developer.apple.com/documentation/security/notarizing_your_app_before_distribution)
- [DigiCert Code Signing](https://www.digicert.com/code-signing/)
- [Sectigo Code Signing](https://sectigo.com/ssl-certificates/code-signing)
