/**
 * Bun File Watcher for Unify CLI
 * Uses Bun's native fs.watch for high-performance file monitoring
 */

import fs from 'fs/promises';
import path from 'path';
import { runtime, ensureBunFeature } from '../utils/runtime-detector.js';
import { logger } from '../utils/logger.js';
import { build, incrementalBuild, initializeModificationCache } from './file-processor.js';

export class BunFileWatcher {
  constructor() {
    if (runtime.isBun) {
      ensureBunFeature('fsWatch');
    }
    
    this.watchers = new Map();
    this.isWatching = false;
    this.dependencyTracker = null;
    this.assetTracker = null;
    this.buildQueue = new Set();
    this.buildTimeout = null;
    this.eventCallbacks = new Map(); // For cross-runtime compatibility
  }

  /**
   * Register event callbacks for cross-runtime compatibility
   * Mimics chokidar's event API
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
   * Start watching files with Bun's native fs.watch
   * @param {Object} options - Watch configuration options
   */
  async startWatching(options = {}) {
    const config = {
      source: 'src',
      output: 'dist',
      includes: 'includes',
      head: null,
      clean: true,
      debounceMs: 100, // Debounce file change events
      ...options,
      perfection: false // Watch mode should not use perfection flag
    };

    if (!runtime.isBun) {
      // Fallback to chokidar for Node.js
      logger.info('Bun not available, falling back to chokidar file watcher');
      const { watch } = await import('./file-watcher.js');
      return watch(config);
    }

    logger.info('Starting Bun file watcher...');

    try {
      // Initial build
      const result = await build(config);
      this.dependencyTracker = result.dependencyTracker;
      this.assetTracker = result.assetTracker;
      
      // Initialize modification cache for incremental builds
      await initializeModificationCache(config.source);
      
      logger.success('Initial build completed');

      // Start watching with Bun's fs.watch
      await this.setupBunWatcher(config);
      
      this.isWatching = true;
      logger.info(`Watching ${config.source} for changes...`);
      
      return this;
    } catch (error) {
      logger.error('Failed to start Bun file watcher:', error.message);
      throw error;
    }
  }

  /**
   * Set up Bun's native fs.watch for the source directory
   */
  async setupBunWatcher(config) {
    const sourcePath = path.resolve(config.source);
    
    try {
      // Watch the entire source directory recursively with Bun's fs.watch
      const watcher = fs.watch(sourcePath, { 
        recursive: true,
        // Bun-specific options for better performance
        persistent: true,
        encoding: 'utf8'
      });
      
      this.watchers.set(sourcePath, watcher);
      logger.debug(`Started Bun fs.watch on: ${sourcePath}`);

      // Process file change events asynchronously
      this.processWatchEvents(watcher, config);
      
    } catch (error) {
      logger.error(`Failed to watch directory ${sourcePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Process watch events from Bun's fs.watch iterator
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
            this.setupBunWatcher(config);
          }
        }, 1000);
      }
    }
  }

  /**
   * Handle file change events from Bun's fs.watch
   */
  async handleFileChange(event, config) {
    const { eventType, filename } = event;
    
    if (!filename) return;
    
    const fullPath = path.resolve(config.source, filename);
    
    // Filter out unwanted files and events
    if (this.shouldIgnoreFile(filename) || this.shouldIgnoreEvent(eventType, filename)) {
      return;
    }

    // Map Bun events to standard events for compatibility
    const mappedEvent = this.mapEventType(eventType, filename);
    
    logger.debug(`File ${mappedEvent} (${eventType}): ${filename}`);
    
    // Emit event for compatibility with chokidar API
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
   * Map Bun fs.watch event types to standardized event types
   * This provides cross-runtime compatibility with chokidar events
   */
  mapEventType(bunEventType, filename) {
    const eventMap = {
      'change': 'change',
      'rename': 'add', // File was created or moved
      'delete': 'unlink'
    };
    
    // Detect if it's actually a file deletion vs creation
    if (bunEventType === 'rename') {
      // This is a heuristic - in a real implementation you might
      // want to check if the file exists to determine add vs unlink
      return filename.includes('.tmp') ? 'unlink' : 'add';
    }
    
    return eventMap[bunEventType] || 'change';
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
      queuedBuilds: this.buildQueue.size,
      runtime: runtime.isBun ? 'Bun' : 'Node.js'
    };
  }
}

/**
 * Factory function for creating and starting a file watcher
 * Uses BunFileWatcher when available, fallback to chokidar
 */
export async function createFileWatcher(options = {}) {
  if (runtime.isBun) {
    const watcher = new BunFileWatcher();
    await watcher.startWatching(options);
    return watcher;
  } else {
    // Fallback to existing chokidar implementation
    const { watch } = await import('./file-watcher.js');
    return watch(options);
  }
}
