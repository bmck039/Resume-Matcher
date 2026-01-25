# App Icon Setup

## Overview

The app icon follows the **Swiss International Style** design system with:
- Canvas background (#F0F0E8)
- Bold geometric shapes with hard edges
- Hyper Blue accent (#1D4ED8)
- Document stack representation with matching star symbol

## Files

- `icon.svg` - Source SVG icon (1024x1024)
- `icon.png` - Default Linux icon (512x512)
- `icons/` - Generated icons for all platforms

## Generating Icons

### Automatic Generation

```bash
npm run generate:icons
```

This creates PNG icons in all required sizes (16, 32, 64, 128, 256, 512, 1024).

### Platform-Specific Icons

#### Windows (.ico)

Using ImageMagick:
```bash
cd assets/icons
convert icon_16x16.png icon_32x32.png icon_64x64.png icon_256x256.png icon.ico
```

Or use an online converter: https://convertio.co/png-ico/

#### macOS (.icns)

```bash
cd assets/icons

# Create iconset directory
mkdir icon.iconset

# Copy icons with required naming
cp icon_16x16.png icon.iconset/icon_16x16.png
cp icon_32x32.png icon.iconset/icon_16x16@2x.png
cp icon_32x32.png icon.iconset/icon_32x32.png
cp icon_64x64.png icon.iconset/icon_32x32@2x.png
cp icon_128x128.png icon.iconset/icon_128x128.png
cp icon_256x256.png icon.iconset/icon_128x128@2x.png
cp icon_256x256.png icon.iconset/icon_256x256.png
cp icon_512x512.png icon.iconset/icon_256x256@2x.png
cp icon_512x512.png icon.iconset/icon_512x512.png
cp icon_1024x1024.png icon.iconset/icon_512x512@2x.png

# Generate .icns
iconutil -c icns icon.iconset

# Clean up
rm -rf icon.iconset
```

#### Linux

The default `icon.png` (512x512) is automatically used. For better results, electron-builder will use all sizes from the `icons/` directory.

## Design Guidelines

The icon maintains consistency with the app's Swiss International Style:

1. **Grid-based composition** - Precise alignment
2. **Hard edges** - No rounded corners
3. **High contrast** - Black borders on light background
4. **Geometric shapes** - Document rectangles, bold star
5. **Minimal color** - Canvas, Ink, and Hyper Blue only

## Customization

To customize the icon, edit `assets/icon.svg` and regenerate:

```bash
npm run generate:icons
```

Key elements to maintain:
- Canvas background (#F0F0E8)
- Black borders (stroke-width: 8px for 1024px canvas)
- Hyper Blue accent (#1D4ED8)
- Sans-serif typography, bold, uppercase, letter-spaced
