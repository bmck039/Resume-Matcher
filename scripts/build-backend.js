#!/usr/bin/env node
/**
 * Build backend executables for all platforms using PyInstaller
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();
const backendDir = path.join(__dirname, '../apps/backend');
const distDir = path.join(__dirname, '../dist-backend');

console.log(`🔨 Building backend for ${platform}...\n`);

// Check if PyInstaller is installed
try {
  execSync('pyinstaller --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ PyInstaller not found. Install with: pip install pyinstaller');
  process.exit(1);
}

// Check if requirements are installed
console.log('📦 Checking Python dependencies...');
try {
  execSync('pip show fastapi uvicorn litellm tinydb markitdown', { stdio: 'pipe' });
  console.log('✓ Dependencies found\n');
} catch (error) {
  console.log('⚠️  Some dependencies missing. Installing...');
  execSync('pip install -r apps/backend/requirements.txt', { stdio: 'inherit' });
}

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build with PyInstaller
console.log('🏗️  Building with PyInstaller...\n');

const specFile = path.join(__dirname, '../backend.spec');
const outputName = platform === 'win32' ? 'backend.exe' : 'backend';

try {
  execSync(`pyinstaller "${specFile}" --distpath "${distDir}" --workpath "${path.join(distDir, 'build')}" --noconfirm`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  const builtExecutable = path.join(distDir, outputName);
  
  if (fs.existsSync(builtExecutable)) {
    const stats = fs.statSync(builtExecutable);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Backend built successfully!`);
    console.log(`📦 Executable: ${builtExecutable}`);
    console.log(`📊 Size: ${sizeMB} MB\n`);
  } else {
    throw new Error('Executable not found after build');
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
