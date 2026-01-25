#!/usr/bin/env node
/**
 * Build backend for Windows (can run on Windows only)
 */

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

if (os.platform() !== 'win32') {
  console.log('⚠️  Cannot build Windows backend on non-Windows platform');
  console.log('   Cross-compilation of Python executables is not supported');
  console.log('   The app will bundle Python source code instead\n');
  process.exit(0);
}

console.log('🔨 Building backend for Windows...\n');

// Run the standard backend build
const buildScript = path.join(__dirname, 'build-backend.js');
try {
  execSync(`node "${buildScript}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Backend build failed');
  process.exit(1);
}
