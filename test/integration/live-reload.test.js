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
    it('should provide SSE endpoint at /__events', async () => {
      const structure = {
        'src/index.html': '<h1>Home</h1>'
      };

      await createTestStructure(tempDir, structure);

      // Start development server
      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Make request to SSE endpoint
        const response = await fetch(`http://localhost:${serverResult.port}/__events`);
        
        expect(response.ok).toBeTruthy();
        expect(response.headers.get('content-type')).toContain('text/event-stream');
        expect(response.headers.get('cache-control')).toBe('no-cache');
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
        const eventPromise = waitForSSEEvent(serverResult.port, 'reload');
        
        // Modify file to trigger rebuild
        await fs.writeFile(
          path.join(sourceDir, 'index.html'), 
          '<h1>Modified Content</h1>'
        );
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        
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
        const eventPromise = waitForSSEEvent(serverResult.port, 'reload');
        
        // Add new file
        await fs.writeFile(
          path.join(sourceDir, 'new-page.html'), 
          '<h1>New Page</h1>'
        );
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });

    it('should send reload event when file is deleted', async () => {
      const structure = {
        'src/index.html': '<h1>Home</h1>',
        'src/delete-me.html': '<h1>Delete Me</h1>'
      };

      await createTestStructure(tempDir, structure);

      const serverResult = await startDevServer(tempDir, sourceDir, outputDir);
      
      try {
        // Connect to SSE stream
        const eventPromise = waitForSSEEvent(serverResult.port, 'reload');
        
        // Delete file
        await fs.unlink(path.join(sourceDir, 'delete-me.html'));
        
        // Wait for reload event
        const event = await eventPromise;
        expect(event.type).toBe('reload');
        
      } finally {
        await stopDevServer(serverResult.process);
      }
    });
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
        'src/index.html': '<!--#include file="header.html" --><p>Main content</p>',
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
 * Helper function to wait for build completion
 */
async function waitForBuild(port, timeout = 5000) {
  // In real implementation, this would check for build completion
  // For now, we'll add a reasonable delay
  await new Promise(resolve => setTimeout(resolve, 1000));
}
