/**
 * Development server with live reload support
 * Uses Bun.serve for high-performance HTTP serving
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export class DevServer {
  constructor() {
    this.server = null;
    this.isRunning = false;
    this.config = null;
    this.sseClients = new Set();
  }

  /**
   * Start the development server
   * @param {Object} options - Server configuration options
   */
  async start(options = {}) {
    const config = {
      port: 3000,
      hostname: 'localhost',
      outputDir: 'dist',
      fallback: 'index.html',
      cors: true,
      liveReload: true,
      openBrowser: false,
      ...options
    };

    this.config = config;

    try {
      logger.info(`Starting development server on http://${config.hostname}:${config.port}`);
      
      this.server = Bun.serve({
        port: config.port,
        hostname: config.hostname,
        fetch: this.handleRequest.bind(this),
        error: this.handleError.bind(this),
        development: true,
        reusePort: true
      });

      this.isRunning = true;
      logger.success(`Development server running at http://${config.hostname}:${config.port}`);
      
      // Open browser if requested
      if (config.openBrowser) {
        await this.openBrowser(`http://${config.hostname}:${config.port}`);
      }

      return this;
    } catch (error) {
      logger.error('Failed to start development server:', error.message);
      throw error;
    }
  }

  /**
   * Handle HTTP requests with native Bun routing
   */
  async handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Handle Server-Sent Events for live reload
      if (pathname === '/__live-reload') {
        return this.handleLiveReloadSSE(request);
      }

      // Handle API routes (if any)
      if (pathname.startsWith('/api/')) {
        return this.handleApiRoute(request, pathname);
      }

      // Serve static files
      return await this.serveStaticFile(pathname);
      
    } catch (error) {
      logger.error(`Request error for ${pathname}:`, error.message);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * Serve static files from the output directory
   */
  async serveStaticFile(pathname) {
    const { outputDir, fallback, cors } = this.config;
    
    // Normalize path and prevent directory traversal
    let filePath = pathname === '/' ? '/index.html' : pathname;
    if (filePath.endsWith('/')) {
      filePath += 'index.html';
    }
    
    const fullPath = path.join(outputDir, filePath);
    
    // Security check: ensure path is within output directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // Try to serve the requested file
      const file = Bun.file(resolvedPath);
      
      if (await file.exists()) {
        const headers = this.getFileHeaders(resolvedPath, cors);
        
        // Inject live reload script for HTML files
        if (this.config.liveReload && resolvedPath.endsWith('.html')) {
          const content = await file.text();
          const withLiveReload = this.injectLiveReloadScript(content);
          return new Response(withLiveReload, { headers });
        }
        
        return new Response(file, { headers });
      }
      
      // Fallback to fallback file (usually index.html for SPAs)
      if (fallback) {
        const fallbackPath = path.join(outputDir, fallback);
        const fallbackFile = Bun.file(fallbackPath);
        
        if (await fallbackFile.exists()) {
          const headers = this.getFileHeaders(fallbackPath, cors);
          
          if (this.config.liveReload && fallbackPath.endsWith('.html')) {
            const content = await fallbackFile.text();
            const withLiveReload = this.injectLiveReloadScript(content);
            return new Response(withLiveReload, { headers });
          }
          
          return new Response(fallbackFile, { headers });
        }
      }
      
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      logger.error(`Error serving ${resolvedPath}:`, error.message);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * Get appropriate headers for file type
   */
  getFileHeaders(filePath, cors = false) {
    const headers = new Headers();
    
    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    headers.set('Content-Type', mimeType);
    
    // CORS headers if enabled
    if (cors) {
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    // Cache control for development
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return headers;
  }

  /**
   * Handle Server-Sent Events for live reload
   */
  handleLiveReloadSSE(request) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    
    // Add client to SSE clients set
    const client = { writer, request };
    this.sseClients.add(client);
    
    // Send initial connection message
    writer.write(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    
    // Handle client disconnect
    request.signal?.addEventListener('abort', () => {
      this.sseClients.delete(client);
      writer.close();
    });
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  /**
   * Handle API routes (extensible for future API needs)
   */
  async handleApiRoute(request, pathname) {
    const method = request.method;
    
    // Basic API info endpoint
    if (pathname === '/api/info' && method === 'GET') {
      return new Response(JSON.stringify({
        server: 'Unify Dev Server',
        version: process.version || 'unknown',
        config: {
          port: this.config.port,
          outputDir: this.config.outputDir,
          liveReload: this.config.liveReload
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('API endpoint not found', { status: 404 });
  }

  /**
   * Inject live reload script into HTML content
   */
  injectLiveReloadScript(htmlContent) {
    const liveReloadScript = `
<script>
(function() {
  const eventSource = new EventSource('/__live-reload');
  eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('Live reload: Reloading page...');
      window.location.reload();
    }
  };
  eventSource.onerror = function() {
    console.log('Live reload: Connection lost, retrying...');
    setTimeout(() => window.location.reload(), 1000);
  };
})();
</script>`;
    
    // Inject before closing body tag, or at the end if no body tag
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${liveReloadScript}\n</body>`);
    } else {
      return htmlContent + liveReloadScript;
    }
  }

  /**
   * Broadcast reload event to all connected SSE clients
   */
  broadcastReload() {
    if (!this.config.liveReload) return;
    
    const message = JSON.stringify({ type: 'reload', timestamp: Date.now() });
    const data = new TextEncoder().encode(`data: ${message}\n\n`);
    
    for (const client of this.sseClients) {
      try {
        client.writer.write(data);
      } catch (error) {
        // Remove disconnected clients
        this.sseClients.delete(client);
      }
    }
    
    logger.debug(`Live reload broadcasted to ${this.sseClients.size} clients`);
  }

  /**
   * Handle server errors
   */
  handleError(error) {
    logger.error('Server error:', error.message);
    return new Response('Server Error', { status: 500 });
  }

  /**
   * Open browser to the server URL
   */
  async openBrowser(url) {
    try {
      const { spawn } = await import('child_process');
      const platform = process.platform;
      
      let command;
      if (platform === 'darwin') {
        command = 'open';
      } else if (platform === 'win32') {
        command = 'start';
      } else {
        command = 'xdg-open';
      }
      
      spawn(command, [url], { detached: true, stdio: 'ignore' });
      logger.info(`Opened browser to ${url}`);
    } catch (error) {
      logger.warn('Could not open browser:', error.message);
    }
  }

  /**
   * Stop the development server
   */
  async stop() {
    if (!this.isRunning) return;
    
    try {
      // Close all SSE connections
      for (const client of this.sseClients) {
        try {
          client.writer.close();
        } catch (error) {
          // Ignore close errors
        }
      }
      this.sseClients.clear();
      
      // Stop the server
      if (this.server) {
        this.server.stop();
      }
      
      this.isRunning = false;
      logger.info('Development server stopped');
    } catch (error) {
      logger.error('Error stopping server:', error.message);
    }
  }

  /**
   * Get server status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      connectedClients: this.sseClients.size
    };
  }
}

/**
 * Factory function to create development server
 * @param {Object} options - Server configuration options
 * @returns {Promise<DevServer>} Server instance
 */
export async function createDevServer(options = {}) {
  logger.info('Using development server');
  const server = new DevServer();
  await server.start(options);
  return server;
}

/**
 * Start development server (legacy function for backward compatibility)
 * @param {Object} options - Server configuration options
 * @returns {Promise<DevServer>} Server instance
 */
export async function startDevServer(options = {}) {
  return createDevServer(options);
}