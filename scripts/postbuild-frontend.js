#!/usr/bin/env node
/**
 * Post-build script for frontend
 * Copies node_modules to the Next.js standalone build directory
 * so the standalone server can find dependencies at runtime
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = path.join(__dirname, '../apps/frontend');
const standaloneDir = path.join(frontendDir, '.next/standalone');
const nodeModulesDir = path.join(frontendDir, 'node_modules');

// Find the actual frontend directory in the standalone structure
// It's nested under the full workspace path
function findFrontendDir(baseDir, depth = 0) {
  if (depth > 10) return null;
  
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'frontend' && entry.isDirectory()) {
        // Check if this is the right frontend dir (has server.js)
        if (fs.existsSync(path.join(baseDir, entry.name, 'server.js'))) {
          return path.join(baseDir, entry.name);
        }
      }
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const found = findFrontendDir(path.join(baseDir, entry.name), depth + 1);
        if (found) return found;
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

console.log('📋 Post-build frontend script...\n');

if (!fs.existsSync(standaloneDir)) {
  console.log('⚠️  Standalone directory not found at', standaloneDir);
  process.exit(0);
}

console.log('🔍 Looking for frontend directory in standalone...');
const frontendStandaloneDir = findFrontendDir(standaloneDir);

if (!frontendStandaloneDir) {
  console.log('⚠️  Could not find frontend directory in standalone structure');
  process.exit(0);
}

console.log(`✓ Found frontend directory: ${path.relative(standaloneDir, frontendStandaloneDir)}`);

const targetNodeModulesDir = path.join(frontendStandaloneDir, 'node_modules');
const sourceNextDir = path.join(frontendDir, '.next');
const targetNextDir = path.join(frontendStandaloneDir, '.next');

// Copy node_modules
if (!fs.existsSync(targetNodeModulesDir)) {
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('⚠️  Source node_modules not found at', nodeModulesDir);
  } else {
    console.log(`📦 Copying node_modules (${Math.round(getSize(nodeModulesDir) / 1024 / 1024)}MB)...`);
    try {
      // Use cp -r for better performance with large directories
      if (process.platform === 'win32') {
        execSync(`xcopy "${nodeModulesDir}" "${targetNodeModulesDir}" /E /I /Y`, { stdio: 'inherit' });
      } else {
        execSync(`cp -r "${nodeModulesDir}" "${targetNodeModulesDir}"`, { stdio: 'inherit' });
      }
      console.log('✓ node_modules copied successfully');
    } catch (error) {
      console.error('❌ Failed to copy node_modules:', error.message);
      process.exit(1);
    }
  }
} else {
  console.log('✓ node_modules already exists in standalone, skipping copy');
}

// Copy .next/static (needed for CSS and JS bundles)
console.log('\n📦 Copying .next/static for styling...');
const sourceStaticDir = path.join(sourceNextDir, 'static');
const targetStaticDir = path.join(targetNextDir, 'static');

if (fs.existsSync(targetStaticDir)) {
  console.log('✓ .next/static already exists in standalone, skipping copy');
} else if (!fs.existsSync(sourceStaticDir)) {
  console.log('⚠️  Source .next/static not found at', sourceStaticDir);
} else {
  try {
    console.log(`📦 Copying .next/static (${Math.round(getSize(sourceStaticDir) / 1024 / 1024)}MB)...`);
    if (process.platform === 'win32') {
      execSync(`xcopy "${sourceStaticDir}" "${targetStaticDir}" /E /I /Y`, { stdio: 'inherit' });
    } else {
      execSync(`cp -r "${sourceStaticDir}" "${targetStaticDir}"`, { stdio: 'inherit' });
    }
    console.log('✓ .next/static copied successfully');
  } catch (error) {
    console.error('❌ Failed to copy .next/static:', error.message);
    process.exit(1);
  }
}

function getSize(dir) {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}
