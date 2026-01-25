#!/usr/bin/env node
/**
 * After-pack hook for electron-builder
 * Ensures backend executable has correct permissions
 */

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, electronPlatformName } = context;
  
  console.log('📦 After-pack hook running...');
  console.log(`   Platform: ${electronPlatformName}`);
  console.log(`   Output: ${appOutDir}`);
  
  // Find backend executable
  const resourcesPath = path.join(appOutDir, 'resources');
  const backendBinPath = path.join(resourcesPath, 'backend-bin');
  
  if (fs.existsSync(backendBinPath)) {
    const execName = electronPlatformName === 'win32' ? 'backend.exe' : 'backend';
    const execPath = path.join(backendBinPath, execName);
    
    if (fs.existsSync(execPath)) {
      console.log(`   ✓ Found backend executable: ${execPath}`);
      
      // Make executable on Unix-like systems
      if (electronPlatformName !== 'win32') {
        try {
          fs.chmodSync(execPath, 0o755);
          console.log('   ✓ Set executable permissions');
        } catch (error) {
          console.error('   ✗ Failed to set permissions:', error.message);
        }
      }
      
      const stats = fs.statSync(execPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ℹ Backend size: ${sizeMB} MB`);
    } else {
      console.log('   ⚠️  Backend executable not found - using source code fallback');
    }
  } else {
    console.log('   ⚠️  Backend bundle not found - using source code fallback');
  }
  
  console.log('✓ After-pack complete\n');
};
