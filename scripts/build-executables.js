#!/usr/bin/env node

/**
 * Cross-Platform Executable Builder for Unify CLI
 * Creates standalone executables for Linux, macOS, and Windows
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const BIN_ENTRY = path.join(PROJECT_ROOT, 'bin', 'cli.js');

// Target platforms for executable builds
const TARGETS = [
  {
    platform: 'linux',
    arch: 'x64',
    extension: '',
    bunTarget: 'bun-linux-x64'
  },
  {
    platform: 'darwin',
    arch: 'x64', 
    extension: '',
    bunTarget: 'bun-darwin-x64'
  },
  {
    platform: 'darwin',
    arch: 'arm64',
    extension: '',
    bunTarget: 'bun-darwin-arm64'
  },
  {
    platform: 'win32',
    arch: 'x64',
    extension: '.exe',
    bunTarget: 'bun-windows-x64'
  }
];

/**
 * Detect runtime environment
 */
function detectRuntime() {
  try {
    // Check if Bun is available
    execSync('bun --version', { stdio: 'ignore' });
    return 'bun';
  } catch {
    return 'node';
  }
}

/**
 * Build executable using Bun
 */
async function buildWithBun(target) {
  const outputName = `unify-${target.platform}-${target.arch}${target.extension}`;
  const outputPath = path.join(DIST_DIR, outputName);
  
  console.log(`🔨 Building ${outputName} with Bun...`);
  
  try {
    const command = [
      'bun', 'build',
      BIN_ENTRY,
      '--compile',
      '--target', target.bunTarget,
      '--outfile', outputPath,
      '--minify'
    ].join(' ');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: PROJECT_ROOT 
    });
    
    console.log(`✅ Built ${outputName}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Failed to build ${outputName}:`, error.message);
    throw error;
  }
}

/**
 * Build executable using pkg (Node.js fallback)
 */
async function buildWithPkg(target) {
  const outputName = `unify-${target.platform}-${target.arch}${target.extension}`;
  const outputPath = path.join(DIST_DIR, outputName);
  
  console.log(`🔨 Building ${outputName} with pkg...`);
  
  try {
    // Check if pkg is available
    try {
      execSync('npx pkg --version', { stdio: 'ignore' });
    } catch {
      console.log('📦 Installing pkg...');
      execSync('npm install -g pkg', { stdio: 'inherit' });
    }
    
    const pkgTarget = `node18-${target.platform}-${target.arch}`;
    const command = [
      'npx', 'pkg',
      BIN_ENTRY,
      '--target', pkgTarget,
      '--output', outputPath,
      '--compress', 'GZip'
    ].join(' ');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: PROJECT_ROOT 
    });
    
    console.log(`✅ Built ${outputName}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Failed to build ${outputName}:`, error.message);
    throw error;
  }
}

/**
 * Create build constants file
 */
async function createBuildConstants() {
  const constantsPath = path.join(PROJECT_ROOT, 'src', 'utils', 'build-constants.js');
  
  // Read package.json for version info
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  
  const buildInfo = {
    version: packageJson.version,
    buildTime: new Date().toISOString(),
    gitCommit: await getGitCommit(),
    runtime: detectRuntime(),
    nodeVersion: process.version
  };
  
  const constantsContent = `/**
 * Build constants for Unify CLI
 * Auto-generated during build process
 */

export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};

export const RUNTIME_FEATURES = {
  bun: {
    htmlRewriter: true,
    fsWatch: true,
    serve: true,
    hash: true,
    compile: true
  },
  node: {
    htmlRewriter: false,
    fsWatch: true,
    serve: true,
    hash: false,
    compile: false
  }
};

export function getRuntimeFeatures(runtime = 'node') {
  return RUNTIME_FEATURES[runtime] || RUNTIME_FEATURES.node;
}

export function getBuildInfo() {
  return BUILD_INFO;
}
`;
  
  await fs.writeFile(constantsPath, constantsContent);
  console.log('📝 Created build constants');
}

/**
 * Get current git commit hash
 */
async function getGitCommit() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { 
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return commit;
  } catch {
    return 'unknown';
  }
}

/**
 * Validate executable
 */
async function validateExecutable(executablePath) {
  try {
    const result = execSync(`${executablePath} --version`, { 
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    
    console.log(`✅ Executable validation passed: ${result.trim()}`);
    return true;
  } catch (error) {
    console.error(`❌ Executable validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Get file size in human readable format
 */
function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Main build function
 */
async function main() {
  const runtime = detectRuntime();
  console.log(`🚀 Starting executable build with ${runtime.toUpperCase()}`);
  console.log(`📁 Project root: ${PROJECT_ROOT}`);
  
  // Create dist directory
  await fs.mkdir(DIST_DIR, { recursive: true });
  
  // Create build constants
  await createBuildConstants();
  
  const results = [];
  const errors = [];
  
  for (const target of TARGETS) {
    try {
      let executablePath;
      
      if (runtime === 'bun') {
        executablePath = await buildWithBun(target);
      } else {
        executablePath = await buildWithPkg(target);
      }
      
      // Get file size
      const stats = await fs.stat(executablePath);
      const size = formatFileSize(stats.size);
      
      // Validate executable (skip Windows validation on non-Windows)
      let isValid = true;
      if (target.platform !== 'win32' || process.platform === 'win32') {
        isValid = await validateExecutable(executablePath);
      }
      
      results.push({
        target: `${target.platform}-${target.arch}`,
        path: executablePath,
        size,
        valid: isValid
      });
      
    } catch (error) {
      errors.push({
        target: `${target.platform}-${target.arch}`,
        error: error.message
      });
    }
  }
  
  // Build summary
  console.log('\n📊 Build Summary:');
  console.log('================');
  
  if (results.length > 0) {
    console.log('\n✅ Successfully built:');
    results.forEach(result => {
      const status = result.valid ? '✅' : '⚠️';
      console.log(`  ${status} ${result.target} (${result.size})`);
      console.log(`     ${result.path}`);
    });
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Failed builds:');
    errors.forEach(error => {
      console.log(`  ❌ ${error.target}: ${error.error}`);
    });
  }
  
  console.log(`\n🎯 Total: ${results.length} successful, ${errors.length} failed`);
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}

export { main as buildExecutables, createBuildConstants };
