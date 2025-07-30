# Unify CLI Bun Implementation Checklist

This checklist tracks the implementation of Bun native APIs for the Unify CLI static site generator.

## Core Infrastructure Setup

- [x] **1.1** Update package.json with Bun configuration and scripts
- [x] **1.2** Create bunfig.toml configuration file
- [x] **1.3** Create runtime detection utility (`src/utils/runtime-detector.js`)

## HTML Processing with HTMLRewriter

- [x] **2.1** Create BunHtmlProcessor class (`src/core/bun-html-processor.js`)
- [x] **2.2** Implement HTMLRewriter integration for include processing
- [x] **2.3** Update unified-html-processor.js to use Bun HTMLRewriter
- [x] **2.4** Add HTML optimization with HTMLRewriter

## File Watching with fs.watch

- [x] **3.1** Create BunFileWatcher class (`src/core/bun-file-watcher.js`)
- [x] **3.2** Replace chokidar with Bun's native fs.watch
- [x] **3.3** Update file-watcher.js to use native file watching
- [x] **3.4** Implement event mapping for cross-runtime compatibility

## HTTP Server with Bun.serve

- [x] **4.1** Create BunDevServer class (`src/server/bun-dev-server.js`)
- [x] **4.2** Implement Bun.serve with native routing
- [x] **4.3** Add Server-Sent Events for live reload
- [x] **4.4** Update dev-server.js to use Bun server when available

## Build Caching with Bun.hash

- [x] **5.1** Create BunBuildCache class (`src/core/bun-build-cache.js`)
- [x] **5.2** Implement native hashing for file tracking
- [x] **5.3** Integrate build cache with file processor
- [x] **5.4** Add dependency graph management

## Cross-Platform Executables

- [x] **6.1** Create build scripts (`scripts/build-executables.js`)
- [x] **6.2** Add build constants support to CLI
- [x] **6.3** Configure cross-platform targets
- [x] **6.4** Test executable generation

## Test Suite Adaptation

- [x] **7.1** Create Bun test setup (`test/bun-setup.js`)
- [x] **7.2** Update test files for cross-runtime compatibility
- [x] **7.3** Create runtime-specific test runner
- [x] **7.4** Ensure all tests pass on both runtimes

## Documentation and Migration

- [ ] **8.1** Update bun-support.md with new capabilities
- [ ] **8.2** Update README with Bun installation instructions
- [ ] **8.3** Add performance benchmarks
- [ ] **8.4** Document migration path for users

## Validation and Testing

- [ ] **9.1** Test build command with Bun HTMLRewriter
- [ ] **9.2** Test watch command with native fs.watch
- [ ] **9.3** Test serve command with Bun.serve
- [ ] **9.4** Verify cross-platform executable builds
- [ ] **9.5** Run full test suite on both Node.js and Bun
- [ ] **9.6** Performance comparison tests

## Implementation Progress

### ✅ Completed Items

(Items will be marked as completed during implementation)

### 🔄 Currently Working On

(Track current focus area)

### ❌ Blocked Items

(Items requiring resolution before proceeding)

---

## Quick Commands for Testing

```bash
# Test on Bun
bun test

# Test on Node.js  
npm test

# Build with Bun
bun run build

# Create executable
bun run build:executable

# Test serve functionality
bun run serve
```

## Notes

- Each item should be tested after completion
- Update this checklist as items are completed
- Include validation steps for each major component
