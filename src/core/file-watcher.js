/**
 * File watching system for unify
 * Uses Bun's high-performance file watcher
 */

import { build, incrementalBuild, initializeModificationCache } from './file-processor.js';
import { logger } from '../utils/logger.js';

/**
 * Start watching files and rebuild on changes
 * Uses Bun's native file watcher for optimal performance
 * @param {Object} options - Watch configuration options
 * @param {string} [options.source='src'] - Source directory path
 * @param {string} [options.output='dist'] - Output directory path  
 * @param {string} [options.includes='includes'] - Include directory name
 * @param {string} [options.head=null] - Custom head file path
 * @param {boolean} [options.clean=true] - Whether to clean output directory before build
 */
export async function watch(options = {}) {
  logger.info('Using Bun native file watcher');
  const { createFileWatcher } = await import('./bun-file-watcher.js');
  return await createFileWatcher(options);
}

