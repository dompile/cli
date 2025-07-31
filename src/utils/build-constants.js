/**
 * Build constants for Unify CLI
 * Auto-generated during build process
 */

export const BUILD_INFO = {
  "version": "0.6.0",
  "buildTime": "2025-07-30T14:58:03.760Z",
  "gitCommit": "453a8e2",
  "runtime": "bun"
};

export const RUNTIME_FEATURES = {
  htmlRewriter: true,
  fsWatch: true,
  serve: true,
  hash: true,
  compile: true
};

export function getRuntimeFeatures() {
  return RUNTIME_FEATURES;
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
  console.log(`🪲 Runtime: ${info.runtime} (${Bun.version})`);
  console.log(`Build: ${info.gitCommit} (${info.buildTime})`);
}
