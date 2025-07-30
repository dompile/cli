/**
 * Build constants for Unify CLI
 * Auto-generated during build process
 */

export const BUILD_INFO = {
  "version": "0.6.0",
  "buildTime": "2025-07-30T14:58:03.760Z",
  "gitCommit": "453a8e2",
  "runtime": "bun",
  "nodeVersion": "v24.3.0"
};

export const RUNTIME_FEATURES = {
  bun: {
    htmlRewriter: true,
    fsWatch: true,
    serve: true,
    hash: true,
    compile: true
  },
  node: {
    htmlRewriter: false,
    fsWatch: true,
    serve: true,
    hash: false,
    compile: false
  }
};

export function getRuntimeFeatures(runtime = 'node') {
  return RUNTIME_FEATURES[runtime] || RUNTIME_FEATURES.node;
}

export function getBuildInfo() {
  return BUILD_INFO;
}

export function getVersionInfo() {
  return {
    version: BUILD_INFO.version,
    buildTime: BUILD_INFO.buildTime,
    gitCommit: BUILD_INFO.gitCommit,
    runtime: BUILD_INFO.runtime
  };
}

export function logRuntimeInfo() {
  const info = getVersionInfo();
  console.log(`unify v${info.version}`);
  console.log(`Runtime: ${info.runtime} (${BUILD_INFO.nodeVersion})`);
  console.log(`Build: ${info.gitCommit} (${info.buildTime})`);
}
