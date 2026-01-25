#!/usr/bin/env node
/**
 * Generate app icons in all required sizes from SVG
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  // All platforms
  common: [16, 32, 64, 128, 256, 512, 1024],
  // Windows specific
  windows: [256],
  // macOS specific  
  mac: [16, 32, 64, 128, 256, 512, 1024],
  // Linux specific
  linux: [16, 32, 48, 64, 128, 256, 512, 1024]
};

const inputSvg = path.join(__dirname, '../assets/icon.svg');
const outputDir = path.join(__dirname, '../assets/icons');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating app icons from SVG...\n');
  
  const allSizes = new Set([...sizes.common, ...sizes.linux]);
  
  for (const size of allSizes) {
    const outputPath = path.join(outputDir, `icon_${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 240, g: 240, b: 232, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${size}x${size} icon`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message);
    }
  }
  
  // Copy largest as default icon.png for Linux
  const defaultIcon = path.join(__dirname, '../assets/icon.png');
  await sharp(inputSvg)
    .resize(512, 512)
    .png()
    .toFile(defaultIcon);
  
  console.log('\n✓ Generated default icon.png (512x512)');
  
  // Generate .ico for Windows
  console.log('\n📦 For Windows .ico, use online converter or imagemagick:');
  console.log('   convert icon_16x16.png icon_32x32.png icon_64x64.png icon_256x256.png icon.ico');
  
  // Generate .icns for macOS  
  console.log('\n📦 For macOS .icns, use iconutil:');
  console.log('   mkdir icon.iconset');
  console.log('   cp icon_16x16.png icon.iconset/icon_16x16.png');
  console.log('   cp icon_32x32.png icon.iconset/icon_16x16@2x.png');
  console.log('   cp icon_32x32.png icon.iconset/icon_32x32.png');
  console.log('   cp icon_64x64.png icon.iconset/icon_32x32@2x.png');
  console.log('   iconutil -c icns icon.iconset');
  
  console.log('\n✅ Icon generation complete!\n');
}

generateIcons().catch(console.error);
