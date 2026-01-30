#!/usr/bin/env node
/**
 * After-pack hook for electron-builder
 * Copies bundled Node.js outside ASAR and fixes permissions
 */

const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src, { withFileTypes: true });
  for (const file of files) {
    const srcPath = path.join(src, file.name);
    const destPath = path.join(dest, file.name);
    
    if (file.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      // Preserve execute permissions
      const stats = fs.statSync(srcPath);
      fs.chmodSync(destPath, stats.mode);
    }
  }
}

exports.default = async function(context) {
  const { appOutDir, electronPlatformName } = context;
  
  console.log('📦 After-pack hook running...');
  console.log(`   Platform: ${electronPlatformName}`);
  console.log(`   Output: ${appOutDir}`);
  
  // Keep Node.js in resources for AppImage (don't move it)
  // AppImage mounts as read-only, so we just need to fix permissions
  const resourcesPath = path.join(appOutDir, 'resources');
  const nodeInResources = path.join(resourcesPath, 'node');
  
  console.log('\n📍 Setting up bundled Node.js...');
  console.log(`   Checking: ${nodeInResources}`);
  
  if (fs.existsSync(nodeInResources)) {
    console.log(`   ✓ Found Node.js in resources`);
    
    // Fix permissions (important for AppImage)
    if (electronPlatformName !== 'win32') {
      try {
        const nodeExe = path.join(nodeInResources, 'bin', 'node');
        if (fs.existsSync(nodeExe)) {
          fs.chmodSync(nodeExe, 0o755);
          console.log(`   ✓ Set node executable permissions`);
        }
        
        const npmExe = path.join(nodeInResources, 'bin', 'npm');
        const npxExe = path.join(nodeInResources, 'bin', 'npx');
        if (fs.existsSync(npmExe)) {
          fs.chmodSync(npmExe, 0o755);
        }
        if (fs.existsSync(npxExe)) {
          fs.chmodSync(npxExe, 0o755);
        }
      } catch (error) {
        console.error(`   ✗ Failed to set permissions: ${error.message}`);
      }
    }
  } else {
    console.log('   ⚠️  Node.js not found in resources');
    console.log(`   Will use system node`);
  }
  
  // Fix backend executable permissions
  console.log('\n📍 Checking backend executable...');
  const backendBinPath = path.join(resourcesPath, 'backend-bin');
  
  if (fs.existsSync(backendBinPath)) {
    const execName = electronPlatformName === 'win32' ? 'backend.exe' : 'backend';
    const execPath = path.join(backendBinPath, execName);
    
    if (fs.existsSync(execPath)) {
      console.log(`   ✓ Found backend executable`);
      
      // Make executable on Unix-like systems
      if (electronPlatformName !== 'win32') {
        try {
          fs.chmodSync(execPath, 0o755);
          console.log(`   ✓ Set backend executable permissions`);
        } catch (error) {
          console.error(`   ✗ Failed to set permissions: ${error.message}`);
        }
      }
      
      const stats = fs.statSync(execPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ℹ Backend size: ${sizeMB} MB`);
    } else {
      console.log('   ⚠️  Backend executable not found - will use Python source');
    }
  } else {
    console.log('   ⚠️  Backend-bin directory not found - will use Python source');
  }
  
  console.log('\n✓ After-pack complete\n');
};


