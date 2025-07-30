/**
 * File watching system for unify
 * Uses native fs.watch for high-performance file monitoring
 */

import fs from 'fs/promises';
import path from 'path';
import { build, incrementalBuild, initializeModificationCache } from './file-processor.js';
import { logger } from '../utils/logger.js';

export class FileWatcher {
  constructor() {
    this.watchers = new Map();
    this.isWatching = false;
    this.dependencyTracker = null;
    this.assetTracker = null;
    this.buildQueue = new Set();
    this.buildTimeout = null;
    this.eventCallbacks = new Map();
  }

  /**
   * Register event callbacks
   */
  on(eventType, callback) {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType).push(callback);
    return this;
  }

  /**
   * Emit events to registered callbacks
   */
  emit(eventType, ...args) {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        logger.error(`Error in ${eventType} callback:`, error.message);
      }
    });
  }

  /**
   * Start watching files with native fs.watch
   * @param {Object} options - Watch configuration options
   */
  async startWatching(options = {}) {
    const config = {
      source: 'src',
      output: 'dist',
      includes: 'includes',
      head: null,
      clean: true,
      debounceMs: 100,
      ...options,
      perfection: false // Watch mode should not use perfection flag
    };

    logger.info('Starting file watcher...');

    try {
      // Initial build
      const result = await build(config);
      this.dependencyTracker = result.dependencyTracker;
      this.assetTracker = result.assetTracker;
      
      // Initialize modification cache for incremental builds
      await initializeModificationCache(config.source);
      
      logger.success('Initial build completed');

      // Start watching with fs.watch
      await this.setupWatcher(config);
      
      this.isWatching = true;
      logger.info(`Watching ${config.source} for changes...`);
      
      return this;
    } catch (error) {
      logger.error('Failed to start file watcher:', error.message);
      throw error;
    }
  }

  /**
   * Set up native fs.watch for the source directory
   */
  async setupWatcher(config) {
    const sourcePath = path.resolve(config.source);
    
    try {
      // Watch the entire source directory recursively
      const watcher = fs.watch(sourcePath, { 
        recursive: true,
        persistent: true,
        encoding: 'utf8'
      });
      
      this.watchers.set(sourcePath, watcher);
      logger.debug(`Started fs.watch on: ${sourcePath}`);

      // Process file change events asynchronously
      this.processWatchEvents(watcher, config);
      
    } catch (error) {
      logger.error(`Failed to watch directory ${sourcePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Process watch events from fs.watch iterator
   */
  async processWatchEvents(watcher, config) {
    try {
      for await (const event of watcher) {
        if (!this.isWatching) {
          break;
        }
        
        await this.handleFileChange(event, config);
      }
    } catch (error) {
      if (this.isWatching) {
        logger.error('Error processing watch events:', error.message);
        // Attempt to restart watcher
        setTimeout(() => {
          if (this.isWatching) {
            logger.info('Attempting to restart file watcher...');
            this.setupWatcher(config);
          }
        }, 1000);
      }
    }
  }

  /**
   * Handle file change events from fs.watch
   */
  async handleFileChange(event, config) {
    const { eventType, filename } = event;
    
    if (!filename) return;
    
    const fullPath = path.resolve(config.source, filename);
    
    // Filter out unwanted files and events
    if (this.shouldIgnoreFile(filename) || this.shouldIgnoreEvent(eventType, filename)) {
      return;
    }

    // Map events to standard events for compatibility
    const mappedEvent = this.mapEventType(eventType, filename);
    
    logger.debug(`File ${mappedEvent} (${eventType}): ${filename}`);
    
    // Emit event for compatibility
    this.emit(mappedEvent, fullPath);
    this.emit('all', mappedEvent, fullPath);
    
    // Add to build queue and debounce
    this.buildQueue.add(fullPath);
    
    if (this.buildTimeout) {
      clearTimeout(this.buildTimeout);
    }
    
    this.buildTimeout = setTimeout(async () => {
      await this.processBuildQueue(config);
    }, config.debounceMs);
  }

  /**
   * Map fs.watch event types to standardized event types
   */
  mapEventType(eventType, filename) {
    const eventMap = {
      'change': 'change',
      'rename': 'add', // File was created or moved
      'delete': 'unlink'
    };
    
    // Detect if it's actually a file deletion vs creation
    if (eventType === 'rename') {
      return filename.includes('.tmp') ? 'unlink' : 'add';
    }
    
    return eventMap[eventType] || 'change';
  }

  /**
   * Check if an event should be ignored
   */
  shouldIgnoreEvent(eventType, filename) {
    // Ignore certain event types that don't require rebuilds
    const ignoredEventTypes = ['access', 'attrib'];
    if (ignoredEventTypes.includes(eventType)) {
      return true;
    }
    
    // Ignore temporary files from editors
    if (filename.includes('.tmp') || filename.includes('~') || filename.startsWith('.#')) {
      return true;
    }
    
    return false;
  }

  /**
   * Process queued file changes
   */
  async processBuildQueue(config) {
    if (this.buildQueue.size === 0) return;
    
    const changedFiles = Array.from(this.buildQueue);
    this.buildQueue.clear();
    
    logger.info(`Processing ${changedFiles.length} changed file(s)...`);
    
    try {
      // Use incremental build for better performance
      await incrementalBuild(config, this.dependencyTracker, this.assetTracker);
      logger.success('Incremental build completed');
    } catch (error) {
      logger.error('Incremental build failed:', error.message);
      
      // Fallback to full rebuild
      try {
        logger.info('Attempting full rebuild...');
        const result = await build(config);
        this.dependencyTracker = result.dependencyTracker;
        this.assetTracker = result.assetTracker;
        logger.success('Full rebuild completed');
      } catch (rebuildError) {
        logger.error('Full rebuild also failed:', rebuildError.message);
      }
    }
  }

  /**
   * Check if a file should be ignored by the watcher
   */
  shouldIgnoreFile(filename) {
    const ignoredPatterns = [
      /node_modules/,
      /\.git/,
      /\.DS_Store/,
      /\.temp/,
      /\.tmp/,
      /\.log$/,
      /\.lock$/,
      /~$/
    ];
    
    return ignoredPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Stop watching files
   */
  async stopWatching() {
    this.isWatching = false;
    
    if (this.buildTimeout) {
      clearTimeout(this.buildTimeout);
      this.buildTimeout = null;
    }
    
    // Close all watchers
    for (const [path, watcher] of this.watchers) {
      try {
        await watcher.close?.();
        logger.debug(`Stopped watching: ${path}`);
      } catch (error) {
        logger.warn(`Error closing watcher for ${path}:`, error.message);
      }
    }
    
    this.watchers.clear();
    this.buildQueue.clear();
    
    logger.info('File watcher stopped');
  }

  /**
   * Get watcher statistics
   */
  getStats() {
    return {
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchers.keys()),
      queuedBuilds: this.buildQueue.size
    };
  }
}

/**
 * Factory function for creating and starting a file watcher
 */
export async function createFileWatcher(options = {}) {
  const watcher = new FileWatcher();
  await watcher.startWatching(options);
  return watcher;
}

/**
 * Start watching files and rebuild on changes
 * @param {Object} options - Watch configuration options
 * @param {string} [options.source='src'] - Source directory path
 * @param {string} [options.output='dist'] - Output directory path  
 * @param {string} [options.includes='includes'] - Include directory name
 * @param {string} [options.head=null] - Custom head file path
 * @param {boolean} [options.clean=true] - Whether to clean output directory before build
 */
export async function watch(options = {}) {
  logger.info('Using native file watcher');
  return await createFileWatcher(options);
}

