#!/usr/bin/env node
/**
 * Create macOS .icns file from PNG icons
 * Uses png2icons package for cross-platform support
 */

const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');
const os = require('os');

const iconsDir = join(__dirname, '../assets/icons');
const outputIcns = join(iconsDir, 'icon.icns');

console.log('🎨 Creating macOS .icns file...\n');

// On macOS, prefer native iconutil
if (os.platform() === 'darwin') {
  console.log('✓ Running on macOS, using iconutil...');
  
  const iconsetDir = join(iconsDir, 'icon.iconset');
  
  try {
    // Create iconset directory
    if (!existsSync(iconsetDir)) {
      mkdirSync(iconsetDir, { recursive: true });
    }
    
    // Copy files with macOS naming convention
    const iconMapping = [
      { src: 'icon_16x16.png', dst: 'icon_16x16.png' },
      { src: 'icon_32x32.png', dst: 'icon_16x16@2x.png' },
      { src: 'icon_32x32.png', dst: 'icon_32x32.png' },
      { src: 'icon_64x64.png', dst: 'icon_32x32@2x.png' },
      { src: 'icon_128x128.png', dst: 'icon_128x128.png' },
      { src: 'icon_256x256.png', dst: 'icon_128x128@2x.png' },
      { src: 'icon_256x256.png', dst: 'icon_256x256.png' },
      { src: 'icon_512x512.png', dst: 'icon_256x256@2x.png' },
      { src: 'icon_512x512.png', dst: 'icon_512x512.png' },
      { src: 'icon_1024x1024.png', dst: 'icon_512x512@2x.png' }
    ];
    
    console.log('📋 Preparing iconset...');
    const fs = require('fs');
    iconMapping.forEach(({ src, dst }) => {
      const srcPath = join(iconsDir, src);
      const dstPath = join(iconsetDir, dst);
      if (existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
      }
    });
    
    console.log('🔧 Running iconutil...');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${outputIcns}"`, { stdio: 'inherit' });
    
    // Clean up iconset directory
    execSync(`rm -rf "${iconsetDir}"`);
    
    const stats = require('fs').statSync(outputIcns);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ Created ${outputIcns}`);
    console.log(`📊 Size: ${sizeKB} KB\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ iconutil failed:', error.message);
    console.log('Falling back to png2icons...\n');
  }
}

// Fallback: Use png2icons for cross-platform support
console.log('Using png2icons for cross-platform .icns creation...');

try {
  require.resolve('png2icons');
} catch (error) {
  console.log('📦 Installing png2icons...');
  try {
    execSync('npm install png2icons --no-save', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to install png2icons');
    console.log('\nNote: .icns creation is optional for cross-platform builds');
    console.log('electron-builder will use PNG icons as fallback');
    process.exit(0);
  }
}

const PNG2Icons = require('png2icons');

const iconFile = join(iconsDir, 'icon_1024x1024.png');

if (!existsSync(iconFile)) {
  console.error(`❌ Missing ${iconFile}`);
  console.log('\n💡 Run: npm run generate:icons');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔧 Converting PNG to .icns...');
    const input = require('fs').readFileSync(iconFile);
    const output = PNG2Icons.createICNS(input, PNG2Icons.BICUBIC, 0);
    
    writeFileSync(outputIcns, output);
    
    const stats = require('fs').statSync(outputIcns);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ Created ${outputIcns}`);
    console.log(`📊 Size: ${sizeKB} KB\n`);
  } catch (error) {
    console.error('❌ Failed to create .icns:', error.message);
    console.log('\nNote: .icns creation is optional for cross-platform builds');
    console.log('electron-builder will use PNG icons as fallback');
    process.exit(0);
  }
})();
