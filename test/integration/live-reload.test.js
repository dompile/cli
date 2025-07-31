/**
 * Tests for live reload functionality
 * Verifies Server-Sent Events (SSE) and file watching in serve command
 */

import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Live Reload Functionality', () => {
  let tempDir;
  let sourceDir;
  let outputDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Server-Sent Events (SSE)', () => {
    it('should provide SSE endpoint at /__live-reload', async () => {
      const structure = {
        'src/index.html': '<h1>Home</h1>'
      };

      await createTestStructure(tempDir, structure);

      // Start development server
      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Make request to SSE endpoint
        const response = await fetch(`http://localhost:${serverResult.port}/__live-reload`);
        
        expect(response.ok).toBeTruthy();
        expect(response.headers.get('content-type')).toContain('text/event-stream');
        expect(response.headers.get('cache-control')).toContain('no-cache');
        expect(response.headers.get('connection')).toBe('keep-alive');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should send reload event when file changes', async () => {
      const structure = {
        'src/index.html': '<h1>Original Content</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Connect to SSE stream
        const eventPromise = waitForSSEReloadEvent(serverResult.port);
        
        // Small delay to ensure SSE connection is established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Modify file to trigger rebuild
        await fs.writeFile(
          path.join(sourceDir, 'index.html'), 
          '<h1>Modified Content</h1>'
        );
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        expect(event.timestamp).toBeDefined();
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should send reload event when new file is added', async () => {
      const structure = {
        'src/index.html': '<h1>Home</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Connect to SSE stream
        const eventPromise = waitForSSEReloadEvent(serverResult.port);
        
        // Small delay to ensure SSE connection is established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Add new file
        await fs.writeFile(
          path.join(sourceDir, 'new-page.html'), 
          '<h1>New Page</h1>'
        );
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        expect(event.timestamp).toBeDefined();
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should send reload event when include file changes', async () => {
      const structure = {
        'src/index.html': '<!--#include virtual="/includes/header.html" --><p>Main content</p>',
        'src/includes/header.html': '<h1>Original Header</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        console.log(`Server started on port ${serverResult.port}, connecting to SSE...`);
        
        // Connect to SSE stream and wait for reload event with longer timeout
        const eventPromise = waitForSSEReloadEvent(serverResult.port, 15000);
        
        // Small delay to ensure SSE connection is established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Modifying include file...');
        
        // Modify include file to trigger rebuild and reload
        await fs.writeFile(
          path.join(sourceDir, 'includes', 'header.html'), 
          '<h1>Updated Header via Include</h1>'
        );
        
        console.log('Waiting for reload event...');
        
        // Wait for reload event to be sent
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        expect(event.timestamp).toBeDefined();
        
        console.log('Reload event received, verifying build output...');
        
        // Verify the build was also updated
        await waitForBuild(serverResult.port);
        const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Updated Header via Include');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    }, 20000); // Increase test timeout to 20 seconds

    it('should send reload event when nested include file changes', async () => {
      const structure = {
        'src/index.html': '<!--#include virtual="/includes/header.html" --><p>Main content</p>',
        'src/includes/header.html': '<nav><!--#include virtual="/includes/nav.html" --></nav>',
        'src/includes/nav.html': '<ul><li>Original Nav</li></ul>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Connect to SSE stream and wait for reload event
        const eventPromise = waitForSSEReloadEvent(serverResult.port, 15000);
        
        // Small delay to ensure SSE connection is established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Modify nested include file
        await fs.writeFile(
          path.join(sourceDir, 'includes', 'nav.html'), 
          '<ul><li>Updated Nav Item</li><li>Another Item</li></ul>'
        );
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        
        // Verify the build includes the nested change
        await waitForBuild(serverResult.port);
        const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Updated Nav Item');
        expect(content).toContain('Another Item');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    }, 20000);
  });

  describe('File Watching', () => {
    it('should rebuild when HTML file changes', async () => {
      const structure = {
        'src/index.html': '<h1>Original</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Check initial content
        let content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Original');
        
        // Modify file
        await fs.writeFile(
          path.join(sourceDir, 'index.html'), 
          '<h1>Modified</h1>'
        );
        
        // Wait for rebuild
        await waitForBuild(serverResult.port);
        
        // Check updated content
        content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Modified');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should rebuild when Markdown file changes', async () => {
      const structure = {
        'src/page.md': '# Original Title\n\nOriginal content'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Check initial content
        let content = await fs.readFile(path.join(outputDir, 'page.html'), 'utf-8');
        expect(content).toContain('Original Title');
        
        // Modify markdown file
        await fs.writeFile(
          path.join(sourceDir, 'page.md'), 
          '# Updated Title\n\nUpdated content'
        );
        
        // Wait for rebuild
        await waitForBuild(serverResult.port);
        
        // Check updated content
        content = await fs.readFile(path.join(outputDir, 'page.html'), 'utf-8');
        expect(content).toContain('Updated Title');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should rebuild when include file changes', async () => {
      const structure = {
        'src/index.html': '<!--#include virtual="/includes/header.html" --><p>Main content</p>',
        'src/includes/header.html': '<h1>Original Header</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Check initial content
        let content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Original Header');
        
        // Modify include file
        await fs.writeFile(
          path.join(sourceDir, 'includes', 'header.html'), 
          '<h1>Updated Header</h1>'
        );
        
        // Wait for rebuild
        await waitForBuild(serverResult.port);
        
        // Check updated content
        content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Updated Header');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should rebuild when layout file changes', async () => {
      const structure = {
        'src/page.html': '<div data-layout="main.html"><h1>Content</h1></div>',
        'src/.layouts/main.html': '<!DOCTYPE html><html><body>Original Layout: <slot></slot></body></html>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Check initial content
        let content = await fs.readFile(path.join(outputDir, 'page.html'), 'utf-8');
        expect(content).toContain('Original Layout');
        
        // Modify layout file
        await fs.writeFile(
          path.join(sourceDir, '.layouts', 'main.html'), 
          '<!DOCTYPE html><html><body>Updated Layout: <slot></slot></body></html>'
        );
        
        // Wait for rebuild
        await waitForBuild(serverResult.port);
        
        // Check updated content
        content = await fs.readFile(path.join(outputDir, 'page.html'), 'utf-8');
        expect(content).toContain('Updated Layout');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });
  });

  describe('Performance and Stability', () => {
    it('should handle rapid file changes without missing rebuilds', async () => {
      const structure = {
        'src/index.html': '<h1>Version 0</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Make rapid changes
        for (let i = 1; i <= 5; i++) {
          await fs.writeFile(
            path.join(sourceDir, 'index.html'), 
            `<h1>Version ${i}</h1>`
          );
          
          // Small delay to allow processing
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Wait for final build
        await waitForBuild(serverResult.port);
        
        // Check final content
        const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
        expect(content).toContain('Version 5');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should not rebuild for temporary/backup files', async () => {
      const structure = {
        'src/index.html': '<h1>Content</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Wait for initial build
        await waitForBuild(serverResult.port);
        
        // Create temporary files that shouldn't trigger rebuilds
        await fs.writeFile(path.join(sourceDir, 'temp.tmp'), 'temp');
        await fs.writeFile(path.join(sourceDir, '.hidden'), 'hidden');
        await fs.writeFile(path.join(sourceDir, 'backup~'), 'backup');
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify no unnecessary rebuilds occurred by checking timestamp
        const stats = await fs.stat(path.join(outputDir, 'index.html'));
        const buildTime = stats.mtime;
        
        // Wait more and check again
        await new Promise(resolve => setTimeout(resolve, 500));
        const newStats = await fs.stat(path.join(outputDir, 'index.html'));
        
        // File should not have been rebuilt
        expect(newStats.mtime.getTime()).toBe(buildTime.getTime());
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });
  });
});

/**
 * Helper function to start development server
 */
async function startDevServer(workingDir, sourceDir, outputDir, timeout = 10000) {
  const { runCLI } = await import('../test-utils.js');
  
  // Find available port
  const port = await findAvailablePort(3000);
  
  // Start server in background
  const cliPath = new URL('../../bin/cli.js', import.meta.url).pathname;
  const process = Bun.spawn([
    '/home/founder3/.bun/bin/bun', 
    cliPath, 
    'serve',
    '--source', sourceDir,
    '--output', outputDir,
    '--port', port.toString()
  ], {
    cwd: workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  // Wait for server to be ready
  await waitForServer(port, timeout);
  
  return { process, port };
}

/**
 * Helper function to stop development server
 */
async function stopDevServer(process) {
  process.kill();
  await process.exited;
}

/**
 * Helper function to find available port
 */
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      const server = Bun.serve({
        port,
        fetch() {
          return new Response();
        }
      });
      server.stop();
      return port;
    } catch {
      continue;
    }
  }
  throw new Error('No available port found');
}

/**
 * Helper function to wait for server to be ready
 */
async function waitForServer(port, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Server not ready within ${timeout}ms`);
}

/**
 * Helper function to wait for SSE event
 */
async function waitForSSEEvent(port, eventType, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`SSE event '${eventType}' not received within ${timeout}ms`));
    }, timeout);
    
    // Note: In real implementation, this would use EventSource
    // For now, we'll simulate the event structure
    const mockEvent = {
      type: eventType,
      data: JSON.stringify({ timestamp: Date.now() })
    };
    
    clearTimeout(timer);
    resolve(mockEvent);
  });
}

/**
 * Helper function to wait for SSE reload event (real implementation)
 */
async function waitForSSEReloadEvent(port, timeout = 10000) {
  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`SSE reload event not received within ${timeout}ms`));
    }, timeout);
    
    try {
      // Connect to the live reload SSE endpoint
      const response = await fetch(`http://localhost:${port}/__live-reload`, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`SSE endpoint returned ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
              
              if (data.type === 'reload') {
                clearTimeout(timer);
                controller.abort();
                resolve({
                  type: 'reload',
                  timestamp: data.timestamp
                });
                return;
              }
            } catch (e) {
              // Invalid JSON, continue reading
            }
          }
        }
      }
      
      // If we get here, the stream ended without a reload event
      clearTimeout(timer);
      reject(new Error('SSE stream ended without reload event'));
      
    } catch (error) {
      clearTimeout(timer);
      if (error.name !== 'AbortError') {
        reject(error);
      }
    }
  });
}

/**
 * Helper function to wait for build completion
 */
async function waitForBuild(port, timeout = 5000) {
  // In real implementation, this would check for build completion
  // For now, we'll add a reasonable delay
  await new Promise(resolve => setTimeout(resolve, 1000));
}
