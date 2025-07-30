/**
 * Bun runtime utilities
 * Provides capability checks for Bun-specific features
 */

export const runtime = {
  isBun: true, // This codebase now requires Bun
  
  get name() {
    return 'bun';
  },
  
  get version() {
    return Bun.version;
  },

  hasFeature(feature) {
    switch (feature) {
      case 'htmlRewriter':
        return typeof HTMLRewriter !== 'undefined';
      case 'bunServe':
        return typeof Bun.serve !== 'undefined';
      case 'bunHash':
        return typeof Bun.hash !== 'undefined';
      case 'fsWatch':
        return true; // Bun supports fs.watch
      default:
        return false;
    }
  }
};

export function ensureBunFeature(feature) {
  if (!runtime.hasFeature(feature)) {
    throw new Error(`${feature} is not available in this Bun runtime`);
  }
}

export function getOptimalImplementation(feature) {
  switch (feature) {
    case 'htmlProcessing':
      return 'HTMLRewriter';
    case 'fileWatching':
      return 'fs.watch';
    case 'httpServer':
      return 'Bun.serve';
    case 'hashing':
      return 'Bun.hash';
    default:
      return 'unknown';
  }
}

export default runtime;
