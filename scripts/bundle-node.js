#!/usr/bin/env node
/**
 * Bundle Node.js binary for standalone distribution
 * Downloads the Node.js binary for the current platform and bundles it with the app
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const NODE_VERSION = 'v20.10.0'; // LTS version
const distDir = path.join(__dirname, '../dist-backend');
const nodeBinDir = path.join(distDir, 'node-bin');

// Determine platform and architecture
const platform = os.platform();
const arch = os.arch();

let nodeFileName = '';
let nodeUrl = '';

if (platform === 'win32') {
  nodeFileName = `node-${NODE_VERSION}-win-${arch === 'x64' ? 'x64' : 'ia32'}`;
  nodeUrl = `https://nodejs.org/dist/${NODE_VERSION}/${nodeFileName}.zip`;
} else if (platform === 'darwin') {
  nodeFileName = `node-${NODE_VERSION}-darwin-${arch}`;
  nodeUrl = `https://nodejs.org/dist/${NODE_VERSION}/${nodeFileName}.tar.gz`;
} else if (platform === 'linux') {
  nodeFileName = `node-${NODE_VERSION}-linux-${arch}`;
  nodeUrl = `https://nodejs.org/dist/${NODE_VERSION}/${nodeFileName}.tar.xz`;
} else {
  console.error(`❌ Unsupported platform: ${platform}`);
  process.exit(1);
}

console.log(`📦 Bundling Node.js ${NODE_VERSION} for ${platform}-${arch}`);
console.log(`🔗 Downloading from: ${nodeUrl}`);

// Create directories
if (!fs.existsSync(nodeBinDir)) {
  fs.mkdirSync(nodeBinDir, { recursive: true });
}

const downloadPath = path.join(nodeBinDir, nodeFileName + (platform === 'win32' ? '.zip' : platform === 'darwin' ? '.tar.gz' : '.tar.xz'));

/**
 * Download file with progress tracking
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, { timeout: 60000 }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        fs.unlink(dest, () => {}); // Delete the incomplete file
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const len = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const pct = ((downloaded / len) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(len / 1024 / 1024).toFixed(1)}MB)`);
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('\n');
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the incomplete file
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Extract archive
 */
function extractArchive(source, dest) {
  return new Promise((resolve, reject) => {
    try {
      if (platform === 'win32') {
        // Use native unzip
        execSync(`powershell -Command "Expand-Archive -Path '${source}' -DestinationPath '${dest}' -Force"`, {
          stdio: 'inherit',
        });
      } else if (platform === 'darwin') {
        execSync(`tar -xzf "${source}" -C "${dest}"`, { stdio: 'inherit' });
      } else if (platform === 'linux') {
        execSync(`tar -xJf "${source}" -C "${dest}"`, { stdio: 'inherit' });
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Main process
 */
async function main() {
  try {
    // Check if already downloaded
    if (fs.existsSync(downloadPath)) {
      console.log(`✓ Node.js already downloaded\n`);
    } else {
      console.log('⬇️  Downloading Node.js...');
      await downloadFile(nodeUrl, downloadPath);
      console.log('✓ Downloaded\n');
    }

    console.log('📦 Extracting Node.js...');
    await extractArchive(downloadPath, nodeBinDir);
    console.log('✓ Extracted\n');

    // Move extracted directory to node
    const extractedDir = path.join(nodeBinDir, nodeFileName);
    const nodeFinalPath = path.join(nodeBinDir, 'node');

    if (fs.existsSync(nodeFinalPath)) {
      fs.rmSync(nodeFinalPath, { recursive: true });
    }

    fs.renameSync(extractedDir, nodeFinalPath);

    // Set permissions on Linux/Mac
    if (platform !== 'win32') {
      const nodeExe = path.join(nodeFinalPath, 'bin', 'node');
      if (fs.existsSync(nodeExe)) {
        fs.chmodSync(nodeExe, 0o755);
        console.log('✓ Set executable permissions\n');
      }
    }

    // Clean up archive
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }

    console.log(`✅ Node.js bundled successfully!`);
    console.log(`📦 Location: ${nodeFinalPath}\n`);

  } catch (err) {
    console.error(`\n❌ Failed to bundle Node.js:`, err.message);
    process.exit(1);
  }
}

main();
