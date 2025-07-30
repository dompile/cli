#!/usr/bin/env node

/**
 * Performance Benchmark for Unify CLI
 * Compares Bun vs Node.js performance across different operations
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BENCHMARK_DIR = path.join(PROJECT_ROOT, 'test', 'performance');

/**
 * Benchmark configuration
 */
const BENCHMARKS = {
  'html-processing': {
    name: 'HTML Processing (HTMLRewriter vs jsdom)',
    description: 'Processing HTML files with includes',
    iterations: 100
  },
  'file-watching': {
    name: 'File Watching Setup (fs.watch vs chokidar)',
    description: 'Time to start file watcher',
    iterations: 10
  },
  'dev-server': {
    name: 'Dev Server (Bun.serve vs Node.js http)',
    description: 'HTTP request handling',
    iterations: 1000
  },
  'build-caching': {
    name: 'Build Caching (Bun.hash vs manual)',
    description: 'File hashing performance',
    iterations: 500
  },
  'cold-start': {
    name: 'Cold Start Time',
    description: 'CLI startup time',
    iterations: 20
  }
};

/**
 * Detect available runtimes
 */
function detectRuntimes() {
  const runtimes = [];
  
  try {
    execSync('node --version', { stdio: 'ignore' });
    runtimes.push('node');
  } catch {
    console.warn('⚠️  Node.js not available');
  }
  
  try {
    execSync('bun --version', { stdio: 'ignore' });
    runtimes.push('bun');
  } catch {
    console.warn('⚠️  Bun not available');
  }
  
  return runtimes;
}

/**
 * Create benchmark test files
 */
async function setupBenchmarkFiles() {
  await fs.mkdir(BENCHMARK_DIR, { recursive: true });
  
  // Create test HTML files with includes
  const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <!--#include file="header.html" -->
</head>
<body>
  <!--#include file="nav.html" -->
  <main>
    <h1>Performance Test</h1>
    <p>This is a test page for benchmarking.</p>
    <!--#include file="content.html" -->
  </main>
  <!--#include file="footer.html" -->
</body>
</html>`;
  
  const headerHtml = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  const navHtml = '<nav><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></nav>';
  const contentHtml = '<section><p>This is included content for testing performance.</p></section>';
  const footerHtml = '<footer><p>&copy; 2025 Performance Test</p></footer>';
  
  await fs.writeFile(path.join(BENCHMARK_DIR, 'test.html'), testHtml);
  await fs.writeFile(path.join(BENCHMARK_DIR, 'header.html'), headerHtml);
  await fs.writeFile(path.join(BENCHMARK_DIR, 'nav.html'), navHtml);
  await fs.writeFile(path.join(BENCHMARK_DIR, 'content.html'), contentHtml);
  await fs.writeFile(path.join(BENCHMARK_DIR, 'footer.html'), footerHtml);
  
  console.log('📁 Benchmark files created');
}

/**
 * Run HTML processing benchmark
 */
async function benchmarkHtmlProcessing(runtime, iterations) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    
    try {
      if (runtime === 'bun') {
        // Test Bun HTMLRewriter processing
        execSync(`bun run -e "
          import { BunHtmlProcessor } from '../src/core/bun-html-processor.js';
          import fs from 'fs/promises';
          const processor = new BunHtmlProcessor();
          const html = await fs.readFile('${path.join(BENCHMARK_DIR, 'test.html')}', 'utf-8');
          await processor.processIncludes(html, '${path.join(BENCHMARK_DIR, 'test.html')}', '${BENCHMARK_DIR}');
        "`, { cwd: PROJECT_ROOT, stdio: 'ignore' });
      } else {
        // Test Node.js jsdom processing
        execSync(`node -e "
          import { processHtmlUnified } from '../src/core/unified-html-processor.js';
          import fs from 'fs/promises';
          const html = await fs.readFile('${path.join(BENCHMARK_DIR, 'test.html')}', 'utf-8');
          await processHtmlUnified(html, '${path.join(BENCHMARK_DIR, 'test.html')}', '${BENCHMARK_DIR}', null);
        "`, { cwd: PROJECT_ROOT, stdio: 'ignore' });
      }
      
      const end = process.hrtime.bigint();
      results.push(Number(end - start) / 1_000_000); // Convert to milliseconds
    } catch (error) {
      // Skip failed iterations
    }
  }
  
  return results;
}

/**
 * Run cold start benchmark
 */
async function benchmarkColdStart(runtime, iterations) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    
    try {
      if (runtime === 'bun') {
        execSync('bun run bin/cli.js --version', { 
          cwd: PROJECT_ROOT, 
          stdio: 'ignore',
          timeout: 10000
        });
      } else {
        execSync('node bin/cli.js --version', { 
          cwd: PROJECT_ROOT, 
          stdio: 'ignore',
          timeout: 10000
        });
      }
      
      const end = process.hrtime.bigint();
      results.push(Number(end - start) / 1_000_000);
    } catch (error) {
      // Skip failed iterations
    }
  }
  
  return results;
}

/**
 * Run file watching benchmark
 */
async function benchmarkFileWatching(runtime, iterations) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    
    try {
      if (runtime === 'bun') {
        // Test Bun fs.watch setup
        execSync(`bun run -e "
          import { BunFileWatcher } from '../src/core/bun-file-watcher.js';
          const watcher = new BunFileWatcher();
          // Just test instantiation, not actual watching
        "`, { cwd: PROJECT_ROOT, stdio: 'ignore', timeout: 5000 });
      } else {
        // Test chokidar setup
        execSync(`node -e "
          import chokidar from 'chokidar';
          const watcher = chokidar.watch('${BENCHMARK_DIR}', { ignoreInitial: true });
          watcher.close();
        "`, { cwd: PROJECT_ROOT, stdio: 'ignore', timeout: 5000 });
      }
      
      const end = process.hrtime.bigint();
      results.push(Number(end - start) / 1_000_000);
    } catch (error) {
      // Skip failed iterations
    }
  }
  
  return results;
}

/**
 * Calculate statistics from results
 */
function calculateStats(results) {
  if (results.length === 0) return null;
  
  const sorted = results.sort((a, b) => a - b);
  const sum = results.reduce((a, b) => a + b, 0);
  
  return {
    count: results.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / results.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
}

/**
 * Format number with appropriate precision
 */
function formatNumber(num, unit = 'ms') {
  if (num < 1) {
    return `${(num * 1000).toFixed(1)}μs`;
  } else if (num < 1000) {
    return `${num.toFixed(1)}${unit}`;
  } else {
    return `${(num / 1000).toFixed(2)}s`;
  }
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('🏁 Starting Performance Benchmarks');
  console.log('==================================');
  
  const runtimes = detectRuntimes();
  if (runtimes.length === 0) {
    console.error('❌ No runtimes available for benchmarking');
    process.exit(1);
  }
  
  console.log(`Available runtimes: ${runtimes.join(', ')}`);
  
  // Setup benchmark files
  await setupBenchmarkFiles();
  
  const results = {};
  
  // Run HTML processing benchmark
  console.log('\n📊 Running HTML Processing Benchmark...');
  for (const runtime of runtimes) {
    console.log(`  Testing ${runtime}...`);
    const times = await benchmarkHtmlProcessing(runtime, BENCHMARKS['html-processing'].iterations);
    results[`html-processing-${runtime}`] = calculateStats(times);
  }
  
  // Run cold start benchmark
  console.log('\n📊 Running Cold Start Benchmark...');
  for (const runtime of runtimes) {
    console.log(`  Testing ${runtime}...`);
    const times = await benchmarkColdStart(runtime, BENCHMARKS['cold-start'].iterations);
    results[`cold-start-${runtime}`] = calculateStats(times);
  }
  
  // Run file watching benchmark
  console.log('\n📊 Running File Watching Benchmark...');
  for (const runtime of runtimes) {
    console.log(`  Testing ${runtime}...`);
    const times = await benchmarkFileWatching(runtime, BENCHMARKS['file-watching'].iterations);
    results[`file-watching-${runtime}`] = calculateStats(times);
  }
  
  // Display results
  console.log('\n📈 Benchmark Results');
  console.log('===================');
  
  const benchmarkTypes = ['html-processing', 'cold-start', 'file-watching'];
  
  for (const benchmarkType of benchmarkTypes) {
    console.log(`\n${BENCHMARKS[benchmarkType].name}:`);
    console.log(`${BENCHMARKS[benchmarkType].description}`);
    
    const nodeResults = results[`${benchmarkType}-node`];
    const bunResults = results[`${benchmarkType}-bun`];
    
    if (nodeResults) {
      console.log(`  Node.js: ${formatNumber(nodeResults.mean)} avg (${formatNumber(nodeResults.min)}-${formatNumber(nodeResults.max)})`);
    }
    
    if (bunResults) {
      console.log(`  Bun:     ${formatNumber(bunResults.mean)} avg (${formatNumber(bunResults.min)}-${formatNumber(bunResults.max)})`);
    }
    
    if (nodeResults && bunResults) {
      const improvement = ((nodeResults.mean - bunResults.mean) / nodeResults.mean * 100);
      if (improvement > 0) {
        console.log(`  💨 Bun is ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`  📊 Node.js is ${Math.abs(improvement).toFixed(1)}% faster`);
      }
    }
  }
  
  // Overall summary
  if (results['html-processing-node'] && results['html-processing-bun']) {
    const htmlImprovement = ((results['html-processing-node'].mean - results['html-processing-bun'].mean) / results['html-processing-node'].mean * 100);
    const startupImprovement = results['cold-start-node'] && results['cold-start-bun'] ? 
      ((results['cold-start-node'].mean - results['cold-start-bun'].mean) / results['cold-start-node'].mean * 100) : 0;
    
    console.log('\n🎯 Summary');
    console.log('==========');
    console.log(`HTML Processing: ${htmlImprovement > 0 ? htmlImprovement.toFixed(1) + '% faster' : Math.abs(htmlImprovement).toFixed(1) + '% slower'} with Bun`);
    if (startupImprovement) {
      console.log(`Cold Start: ${startupImprovement > 0 ? startupImprovement.toFixed(1) + '% faster' : Math.abs(startupImprovement).toFixed(1) + '% slower'} with Bun`);
    }
  }
  
  // Cleanup
  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });
}

/**
 * Main function
 */
async function main() {
  try {
    await runBenchmarks();
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBenchmarks };
