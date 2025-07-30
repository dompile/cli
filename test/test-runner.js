#!/usr/bin/env node

/**
 * Cross-Runtime Test Runner for Unify CLI
 * Runs tests on both Bun and Node.js with proper configuration
 */

import { execSync, spawn } from 'child_process';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(PROJECT_ROOT, 'test');

/**
 * Detect available runtimes
 */
function detectRuntimes() {
  const runtimes = [];
  
  // Check for Node.js
  try {
    execSync('node --version', { stdio: 'ignore' });
    runtimes.push('node');
  } catch (error) {
    console.warn('⚠️  Node.js not available');
  }
  
  // Check for Bun
  try {
    execSync('bun --version', { stdio: 'ignore' });
    runtimes.push('bun');
  } catch (error) {
    console.warn('⚠️  Bun not available');
  }
  
  return runtimes;
}

/**
 * Find test files
 */
async function findTestFiles(dir = TEST_DIR) {
  const testFiles = [];
  
  async function scanDirectory(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'temp') {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dir);
  return testFiles;
}

/**
 * Run tests on Node.js
 */
async function runNodeTests(testFiles) {
  console.log('🟢 Running tests on Node.js...');
  
  return new Promise((resolve, reject) => {
    const args = ['--test', '--test-reporter', 'spec', ...testFiles];
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_RUNTIME: 'node'
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Node.js tests passed');
        resolve({ success: true, runtime: 'node' });
      } else {
        console.error('❌ Node.js tests failed');
        resolve({ success: false, runtime: 'node', code });
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ Node.js test execution failed:', error.message);
      reject(error);
    });
  });
}

/**
 * Run tests on Bun
 */
async function runBunTests() {
  console.log('🟠 Running tests on Bun...');
  
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['test'], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_RUNTIME: 'bun'
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Bun tests passed');
        resolve({ success: true, runtime: 'bun' });
      } else {
        console.error('❌ Bun tests failed');
        resolve({ success: false, runtime: 'bun', code });
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ Bun test execution failed:', error.message);
      reject(error);
    });
  });
}

/**
 * Run performance comparison
 */
async function runPerformanceTests() {
  console.log('⚡ Running performance comparison...');
  
  const testFile = path.join(TEST_DIR, 'performance', 'benchmark.test.js');
  const results = [];
  
  // Run on Node.js
  try {
    console.log('  📊 Node.js performance...');
    const start = Date.now();
    execSync(`node ${testFile}`, { stdio: 'inherit', cwd: PROJECT_ROOT });
    const duration = Date.now() - start;
    results.push({ runtime: 'node', duration });
  } catch (error) {
    console.warn('  ⚠️  Node.js performance test failed');
  }
  
  // Run on Bun
  try {
    console.log('  📊 Bun performance...');
    const start = Date.now();
    execSync(`bun run ${testFile}`, { stdio: 'inherit', cwd: PROJECT_ROOT });
    const duration = Date.now() - start;
    results.push({ runtime: 'bun', duration });
  } catch (error) {
    console.warn('  ⚠️  Bun performance test failed');
  }
  
  // Show comparison
  if (results.length === 2) {
    const nodeResult = results.find(r => r.runtime === 'node');
    const bunResult = results.find(r => r.runtime === 'bun');
    const improvement = ((nodeResult.duration - bunResult.duration) / nodeResult.duration * 100).toFixed(1);
    
    console.log('\n📈 Performance Results:');
    console.log(`   Node.js: ${nodeResult.duration}ms`);
    console.log(`   Bun:     ${bunResult.duration}ms`);
    console.log(`   Improvement: ${improvement}% faster with Bun`);
  }
  
  return results;
}

/**
 * Main test runner function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    runtime: null,
    performance: false,
    verbose: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--runtime':
        options.runtime = args[++i];
        break;
      case '--performance':
        options.performance = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  console.log('🧪 Cross-Runtime Test Runner');
  console.log('============================');
  
  const availableRuntimes = detectRuntimes();
  console.log(`Available runtimes: ${availableRuntimes.join(', ')}`);
  
  if (availableRuntimes.length === 0) {
    console.error('❌ No runtimes available for testing');
    process.exit(1);
  }
  
  const results = [];
  
  try {
    // Run tests on specified runtime or all available
    const runtimesToTest = options.runtime ? [options.runtime] : availableRuntimes;
    
    for (const runtime of runtimesToTest) {
      if (!availableRuntimes.includes(runtime)) {
        console.warn(`⚠️  Runtime ${runtime} not available, skipping`);
        continue;
      }
      
      let result;
      if (runtime === 'node') {
        const testFiles = await findTestFiles();
        result = await runNodeTests(testFiles);
      } else if (runtime === 'bun') {
        result = await runBunTests();
      }
      
      if (result) {
        results.push(result);
      }
    }
    
    // Run performance tests if requested
    if (options.performance && availableRuntimes.length > 1) {
      await runPerformanceTests();
    }
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed runtimes:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.runtime} (exit code: ${r.code})`);
      });
    }
    
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Cross-Runtime Test Runner for Unify CLI

Usage: node test-runner.js [options]

Options:
  --runtime <name>    Run tests on specific runtime (node|bun)
  --performance       Run performance comparison tests
  --verbose          Enable verbose output
  --help             Show this help message

Examples:
  node test-runner.js                    # Run on all available runtimes
  node test-runner.js --runtime bun      # Run only on Bun
  node test-runner.js --performance      # Include performance tests
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test runner crashed:', error);
    process.exit(1);
  });
}

export { main as runTests };
