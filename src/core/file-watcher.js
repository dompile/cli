/**
 * File watching system for unify
 * Watches source files and rebuilds on changes
 * Uses Bun's native fs.watch when available, falls back to chokidar
 */

import chokidar from 'chokidar';
import { build, incrementalBuild, initializeModificationCache } from './file-processor.js';
import { logger } from '../utils/logger.js';
import { runtime } from '../utils/runtime-detector.js';

/**
 * Start watching files and rebuild on changes
 * Automatically uses BunFileWatcher when running on Bun
 * @param {Object} options - Watch configuration options
 * @param {string} [options.source='src'] - Source directory path
 * @param {string} [options.output='dist'] - Output directory path  
 * @param {string} [options.includes='includes'] - Include directory name
 * @param {string} [options.head=null] - Custom head file path
 * @param {boolean} [options.clean=true] - Whether to clean output directory before build
 * @param {boolean} [options.forceBun=false] - Force use of Bun watcher even on Node.js (will fail)
 * @param {boolean} [options.forceChokidar=false] - Force use of chokidar even on Bun
 */
export async function watch(options = {}) {
  // Check for forced runtime preference
  if (options.forceChokidar) {
    logger.info('Forcing chokidar file watcher');
    return watchWithChokidar(options);
  }
  
  if (options.forceBun && !runtime.isBun) {
    logger.error('Cannot force Bun watcher when not running on Bun');
    throw new Error('Bun runtime required for BunFileWatcher');
  }

  // Use Bun file watcher if available
  if (runtime.isBun) {
    try {
      logger.info('Using Bun native file watcher');
      const { createFileWatcher } = await import('./bun-file-watcher.js');
      return await createFileWatcher(options);
    } catch (error) {
      logger.warn('BunFileWatcher not available, falling back to chokidar:', error.message);
    }
  }

  // Fallback to chokidar implementation
  logger.info('Using chokidar file watcher');
  return watchWithChokidar(options);
}

/**
 * Original chokidar-based file watching implementation
 * @param {Object} options - Watch configuration options
 */
async function watchWithChokidar(options = {}) {
  const config = {
    source: 'src',
    output: 'dist',
    includes: 'includes',
    head: null,
    clean: true,
    ...options,
    // Watch mode should not use perfection flag (per spec)
    perfection: false
  };

  // Initial build
  logger.info('Starting file watcher...');
  let dependencyTracker, assetTracker;
  try {
    const result = await build(config);
    dependencyTracker = result.dependencyTracker;
    assetTracker = result.assetTracker;
    
    // Initialize modification cache for incremental builds
    await initializeModificationCache(config.source);
    
    logger.success('Initial build completed');
  } catch (error) {
    logger.error('Initial build failed:', error.message);
    process.exit(1);
  }

  // Set up file watcher
  const watcher = chokidar.watch(config.source, {
    ignored: ['**/node_modules/**', '**/.git/**'],
    persistent: true,
    ignoreInitial: true
  });

  let buildInProgress = false;
  let debounceTimer = null;

  const handleFileChange = async (eventType, filePath) => {
    if (buildInProgress) {
      return; // Skip if already building
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce file changes (100ms delay)
    debounceTimer = setTimeout(async () => {
      logger.info(`File ${eventType}: ${filePath}`);
      buildInProgress = true;

      try {
        // Use incremental build for better performance
        const result = await incrementalBuild(config, filePath, dependencyTracker, assetTracker);
        dependencyTracker = result.dependencyTracker;
        assetTracker = result.assetTracker;
        
        logger.success('Incremental rebuild completed');
        
        // Notify live reload clients if callback provided
        if (config.onReload) {
          config.onReload(eventType, filePath);
        }
      } catch (error) {
        logger.error('Incremental rebuild failed:', error.message);
        
        // Fallback to full build if incremental build fails
        try {
          logger.info('Falling back to full rebuild...');
          const result = await build(config);
          dependencyTracker = result.dependencyTracker;
          assetTracker = result.assetTracker;
          await initializeModificationCache(config.source);
          logger.success('Full rebuild completed');
          
          if (config.onReload) {
            config.onReload(eventType, filePath);
          }
        } catch (fullBuildError) {
          logger.error('Full rebuild also failed:', fullBuildError.message);
        }
      } finally {
        buildInProgress = false;
      }
    }, 100);
  };

  watcher
    .on('add', (filePath) => handleFileChange('added', filePath))
    .on('change', (filePath) => handleFileChange('changed', filePath))
    .on('unlink', (filePath) => handleFileChange('removed', filePath))
    .on('addDir', (dirPath) => logger.debug(`Directory added: ${dirPath}`))
    .on('unlinkDir', (dirPath) => logger.debug(`Directory removed: ${dirPath}`))
    .on('error', (error) => logger.error('Watcher error:', error))
    .on('ready', () => {
      logger.info(`Watching for changes in ${config.source}/`);
      logger.info('Press Ctrl+C to stop watching');
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });
}