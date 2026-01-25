#!/usr/bin/env node
/**
 * Build backend for macOS (can run on macOS only)
 */

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

if (os.platform() !== 'darwin') {
  console.log('⚠️  Cannot build macOS backend on non-macOS platform');
  console.log('   Cross-compilation of Python executables is not supported');
  console.log('   The app will bundle Python source code instead\n');
  process.exit(0);
}

console.log('🔨 Building backend for macOS...\n');

// Run the standard backend build
const buildScript = path.join(__dirname, 'build-backend.js');
try {
  execSync(`node "${buildScript}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Backend build failed');
  process.exit(1);
}
