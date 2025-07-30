/**
 * Development server with live reload support
 * Uses Bun's high-performance HTTP server
 */

import { liveReload } from './live-reload.js';
import { logger } from '../utils/logger.js';
import { runtime } from '../utils/runtime-detector.js';


/**
 * Factory function to create Bun development server
 * @param {Object} options - Server configuration options
 * @returns {Promise<BunDevServer>} Server instance
 */
export async function createDevServer(options = {}) {
  logger.info('Using Bun development server');
  const { BunDevServer } = await import('./bun-dev-server.js');
  const server = new BunDevServer();
  await server.start(options);
  return server;
}

/**
 * Start development server (legacy function for backward compatibility)
 * @param {Object} options - Server configuration options
 * @returns {Promise<BunDevServer>} Server instance
 */
export async function startDevServer(options = {}) {
  return createDevServer(options);
}