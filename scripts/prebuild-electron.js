#!/usr/bin/env node
/**
 * Pre-build script for Electron
 * 1. Builds frontend
 * 2. Builds backend with PyInstaller
 * 3. Copies backend executable to resources
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();

console.log('🚀 Pre-build script starting...\n');

// Step 1: Build frontend
console.log('📦 Building frontend...');
try {
  execSync('npm run build:frontend', { stdio: 'inherit' });
  console.log('✓ Frontend built\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 2: Build backend
console.log('🔨 Building backend executable...');
try {
  execSync('node scripts/build-backend.js', { stdio: 'inherit' });
  console.log('✓ Backend built\n');
} catch (error) {
  console.error('⚠️  Backend build failed - continuing with source code bundle');
  console.log('   Note: Python must be installed on target systems\n');
}

console.log('✅ Pre-build complete!\n');
