#!/usr/bin/env node
/**
 * Create Windows .ico file from PNG icons
 * Uses png-to-ico package for cross-platform support
 */

const { existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const iconsDir = join(__dirname, '../assets/icons');
const outputIco = join(iconsDir, 'icon.ico');

console.log('🎨 Creating Windows .ico file...\n');

// Check if ImageMagick is available
try {
  execSync('which convert', { stdio: 'pipe' });
  console.log('✓ ImageMagick found, using convert...\n');
  
  const sizes = [16, 32, 48, 64, 256];
  const pngFiles = sizes.map(size => `icon_${size}x${size}.png`).join(' ');
  
  const cmd = `cd "${iconsDir}" && convert ${pngFiles} icon.ico`;
  execSync(cmd, { stdio: 'inherit' });
  
  const fs = require('fs');
  const stats = fs.statSync(outputIco);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`✅ Created ${outputIco}`);
  console.log(`📊 Size: ${sizeKB} KB\n`);
  process.exit(0);
} catch (error) {
  console.log('⚠️  ImageMagick not found, will use PNG fallback');
  console.log('   electron-builder will generate .ico from PNG automatically\n');
  
  console.log('To create .ico manually:');
  console.log('1. Install ImageMagick: sudo apt install imagemagick');
  console.log('2. Or use online converter: https://convertio.co/png-ico/\n');
  process.exit(0);
}
