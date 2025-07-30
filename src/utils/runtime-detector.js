/**
 * Runtime detection utility
 * Determines if running on Bun or Node.js and provides capability checks
 */

export const runtime = {
  isBun: typeof Bun !== 'undefined',
  isNode: typeof process !== 'undefined' && process.versions?.node,
  
  get name() {
    return this.isBun ? 'bun' : 'node';
  },
  
  get version() {
    return this.isBun ? Bun.version : process.version;
  },

  hasFeature(feature) {
    switch (feature) {
      case 'htmlRewriter':
        return this.isBun && typeof HTMLRewriter !== 'undefined';
      case 'bunServe':
        return this.isBun && typeof Bun.serve !== 'undefined';
      case 'bunHash':
        return this.isBun && typeof Bun.hash !== 'undefined';
      case 'fsWatch':
        return this.isBun || this.isNode; // Both support fs.watch
      case 'jsdom':
        return this.isNode; // JSDOM primarily for Node.js
      case 'chokidar':
        return this.isNode; // Chokidar primarily for Node.js
      default:
        return false;
    }
  }
};

export function ensureBunFeature(feature) {
  if (!runtime.hasFeature(feature)) {
    throw new Error(`${feature} requires Bun runtime`);
  }
}

export function getOptimalImplementation(feature) {
  switch (feature) {
    case 'htmlProcessing':
      return runtime.isBun ? 'HTMLRewriter' : 'jsdom';
    case 'fileWatching':
      return runtime.isBun ? 'fs.watch' : 'chokidar';
    case 'httpServer':
      return runtime.isBun ? 'Bun.serve' : 'node:http';
    case 'hashing':
      return runtime.isBun ? 'Bun.hash' : 'crypto';
    default:
      return 'unknown';
  }
}

export default runtime;
