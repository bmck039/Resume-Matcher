#!/usr/bin/env node
/**
 * Pre-build script for Electron
 * 1. Bundles Node.js binary for standalone distribution
 * 2. Builds frontend
 * 3. Builds backend with PyInstaller
 * 4. Copies backend executable to resources
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();

console.log('🚀 Pre-build script starting...\n');

// Step 1: Bundle Node.js (optional - can be skipped if already bundled)
console.log('📦 Bundling Node.js binary...');
try {
  const distBackendDir = path.join(__dirname, '../dist-backend');
  const nodeBinDir = path.join(distBackendDir, 'node-bin');
  
  // Only bundle if not already present
  if (!fs.existsSync(nodeBinDir) || fs.readdirSync(nodeBinDir).length === 0) {
    execSync('node scripts/bundle-node.js', { stdio: 'inherit' });
    console.log('✓ Node.js bundled\n');
  } else {
    console.log('✓ Node.js already bundled\n');
  }
} catch (error) {
  console.warn('⚠️  Node.js bundling failed - app will require system node');
  console.warn('   This is optional for development but recommended for standalone distribution\n');
}

// Step 2: Build frontend
console.log('📦 Building frontend...');
try {
  execSync('npm run build:frontend', { stdio: 'inherit' });
  console.log('✓ Frontend built\n');
  
  // Copy node_modules to standalone directory
  console.log('📦 Setting up standalone dependencies...');
  execSync('node scripts/postbuild-frontend.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Frontend build or setup failed');
  process.exit(1);
}

// Step 3: Build backend
console.log('🔨 Building backend executable...');
try {
  execSync('node scripts/build-backend.js', { stdio: 'inherit' });
  console.log('✓ Backend built\n');
} catch (error) {
  console.error('⚠️  Backend build failed - continuing with source code bundle');
  console.log('   Note: Python must be installed on target systems\n');
}

console.log('✅ Pre-build complete!\n');
