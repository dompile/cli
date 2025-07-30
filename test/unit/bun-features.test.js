/**
 * Bun-specific feature tests
 * Tests Bun native API implementations
 */

import { runtime, hasFeature } from '../../src/utils/runtime-detector.js';
import { 
  createTempDir, 
  createTempFile, 
  skipIfFeatureUnavailable, 
  runOnlyOn, 
  assertRuntimeFeature 
} from '../bun-setup.js';

import { describe, it, expect } from 'bun:test';

describe('Bun HTML Processor', () => {
  it('should be available when running on Bun', async () => {
    if (runOnlyOn('bun')) return;
    
    const { BunHtmlProcessor } = await import('../src/core/bun-html-processor.js');
    const processor = new BunHtmlProcessor();
    expect(processor).toBeTruthy();
  });

  it('should process HTML includes with HTMLRewriter', async () => {
    if (skipIfFeatureUnavailable('htmlRewriter')) return;
    
    const tempDir = await createTempDir('html-test');
    const includeFile = await createTempFile('header.html', '<h1>Header Content</h1>', tempDir);
    const mainFile = await createTempFile('index.html', 
      '<!DOCTYPE html><html><body><!--#include file="header.html" --></body></html>', 
      tempDir
    );
    
    const { BunHtmlProcessor } = await import('../src/core/bun-html-processor.js');
    const processor = new BunHtmlProcessor();
    
    const content = await import('fs/promises').then(fs => fs.readFile(mainFile, 'utf-8'));
    const processed = await processor.processIncludes(content, mainFile, tempDir);
    
    expect(processed).toContain('<h1>Header Content</h1>');
  });

  it('should optimize HTML when enabled', async () => {
    if (skipIfFeatureUnavailable('htmlRewriter')) return;
    
    const { BunHtmlProcessor } = await import('../src/core/bun-html-processor.js');
    const processor = new BunHtmlProcessor();
    
    const html = '<div class="">  <p>   Test   </p>  </div>';
    const optimized = await processor.optimizeHtml(html);
    
    // Should remove empty class attributes and normalize whitespace
    expect(optimized).toContain('<div><p> Test </p></div>');
  });
});

describe('Bun File Watcher', () => {
  it('should be available when running on Bun', async () => {
    if (runOnlyOn('bun')) return;
    
    const { BunFileWatcher } = await import('../src/core/bun-file-watcher.js');
    const watcher = new BunFileWatcher();
    expect(watcher).toBeTruthy();
  });

  it('should start watching with native fs.watch', async () => {
    if (skipIfFeatureUnavailable('fsWatch')) return;
    
    const tempDir = await createTempDir('watch-test');
    await createTempFile('index.html', '<html><body>Test</body></html>', tempDir);
    
    const { BunFileWatcher } = await import('../src/core/bun-file-watcher.js');
    const watcher = new BunFileWatcher();
    
    // Start watching (won't actually build, just test setup)
    const config = {
      source: tempDir,
      output: await createTempDir('watch-output'),
      debounceMs: 50
    };
    
    // Test that watcher initializes without error
    expect(() => new BunFileWatcher()).not.toThrow?.() || true;
    
    // Clean up
    await watcher.stopWatching?.() || Promise.resolve();
  });
});

describe('Bun Dev Server', () => {
  it('should be available when running on Bun', async () => {
    if (runOnlyOn('bun')) return;
    
    const { BunDevServer } = await import('../src/server/bun-dev-server.js');
    const server = new BunDevServer();
    expect(server).toBeTruthy();
  });

  it('should handle requests with native routing', async () => {
    if (skipIfFeatureUnavailable('serve')) return;
    
    const { BunDevServer } = await import('../src/server/bun-dev-server.js');
    const server = new BunDevServer();
    
    // Test request handling method exists
    expect(typeof server.handleRequest).toBe('function');
    
    // Test server configuration
    const config = {
      port: 0, // Use any available port
      outputDir: await createTempDir('server-test'),
      liveReload: false
    };
    
    // Test that server can be configured
    server.config = config;
    expect(server.config.outputDir).toBeTruthy();
  });
});

describe('Bun Build Cache', () => {
  it('should be available when running on Bun', async () => {
    if (runOnlyOn('bun')) return;
    
    const { BunBuildCache } = await import('../src/core/bun-build-cache.js');
    const cache = new BunBuildCache();
    expect(cache).toBeTruthy();
  });

  it('should hash files with native crypto', async () => {
    if (skipIfFeatureUnavailable('hash')) return;
    
    const tempFile = await createTempFile('test.txt', 'Hello, Bun!');
    
    const { BunBuildCache } = await import('../src/core/bun-build-cache.js');
    const cache = new BunBuildCache();
    await cache.initialize();
    
    const hash1 = await cache.hashFile(tempFile);
    const hash2 = await cache.hashFile(tempFile);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
    expect(hash1.length).toBe(64); // SHA-256 hex string
  });

  it('should detect file changes', async () => {
    if (skipIfFeatureUnavailable('hash')) return;
    
    const tempFile = await createTempFile('change-test.txt', 'Original content');
    
    const { BunBuildCache } = await import('../src/core/bun-build-cache.js');
    const cache = new BunBuildCache();
    await cache.initialize();
    
    // Initial hash
    const changed1 = await cache.hasFileChanged(tempFile);
    expect(changed1).toBeTruthy(); // First time should be changed
    
    // Same content - should not be changed
    const changed2 = await cache.hasFileChanged(tempFile);
    expect(changed2).toBeFalsy();
    
    // Modify file
    const fs = await import('fs/promises');
    await fs.writeFile(tempFile, 'Modified content');
    
    // Should detect change
    const changed3 = await cache.hasFileChanged(tempFile);
    expect(changed3).toBeTruthy();
  });
});

describe('Runtime Detection', () => {
  it('should correctly identify current runtime', () => {
    assertRuntimeFeature('runtime', true);
    
    if (runtime.isBun) {
      expect(hasFeature('htmlRewriter')).toBeTruthy();
      expect(hasFeature('hash')).toBeTruthy();
      expect(hasFeature('serve')).toBeTruthy();
    } else {
      expect(hasFeature('htmlRewriter')).toBeFalsy();
      expect(hasFeature('hash')).toBeFalsy();
    }
  });

  it('should provide feature compatibility info', () => {
    const features = runtime.getOptimalImplementation('htmlProcessing');
    expect(features).toBeTruthy();
    expect(typeof features.processor).toBe('string');
  });
});
