# Remove Node.js Support - Migration Plan

This document outlines the steps needed to remove Node.js support from the unify CLI and make it Bun-only.

## Analysis Summary

After analyzing the codebase, here are the Node.js specific components that need to be removed or updated:

### 1. Package.json Changes
- Remove `"node": ">=14.0.0"` from engines
- Remove Node.js specific scripts (`test:node`, `test:cross`)
- Update main test script to use `bun test` instead of custom test runner
- Remove `test-runner.js` dependency
- Update build scripts to use Bun for cross-platform executables

### 2. Test Infrastructure Changes
- **Remove**: `test/test-runner.js` (Node.js based cross-runtime test runner)
- **Remove**: All `node --test` references in documentation
- **Update**: All test files to use Bun's test syntax instead of Node.js built-in test runner
- **Update**: Test imports to use Bun's test functions (`test`, `describe`, `expect`)

### 3. Core Code Changes
- **Keep**: Bun-specific files (`src/core/bun-*`, `src/server/bun-*`)
- **Remove**: Node.js fallback implementations in `src/server/dev-server.js`, `src/core/file-watcher.js`
- **Update**: `src/utils/runtime-detector.js` to only detect Bun
- **Simplify**: Remove dual-runtime logic throughout codebase

### 4. Build Scripts
- **Update**: `scripts/build-executables.js` to use Bun build only
- **Remove**: Node.js specific executable build commands

### 5. Documentation Updates
- **Update**: README.md to remove Node.js references
- **Update**: CLAUDE.md files to reflect Bun-only setup
- **Update**: All test running instructions to use `bun test`

## Step-by-Step Migration Plan

### Step 1: Update package.json
- [ ] Remove Node.js engine requirement
- [ ] Update test scripts to use Bun only
- [ ] Remove Node.js specific build commands
- [ ] Update scripts to use Bun consistently

### Step 2: Remove Cross-Runtime Test Infrastructure
- [ ] Delete `test/test-runner.js`
- [ ] Update all test files to use Bun test syntax
- [ ] Remove Node.js test imports (`import { test, describe } from 'node:test'`)
- [ ] Add Bun test imports (`import { test, describe, expect } from 'bun:test'`)

### Step 3: Simplify Core Code
- [ ] Remove Node.js fallbacks from `dev-server.js`
- [ ] Remove Node.js fallbacks from `file-watcher.js`
- [ ] Update `runtime-detector.js` to be Bun-only
- [ ] Remove dual-runtime logic from unified processors

### Step 4: Update Build Scripts
- [ ] Simplify `scripts/build-executables.js` for Bun-only
- [ ] Remove Node.js executable build targets

### Step 5: Refactoring
- [ ] Review the code and find all places the code can now be simplified due to not targeting both Node and Bun
- [ ] Refactor all areas of the code that can be simplified so that it follows bun best practices
- [ ] Rename all files, classes, functions, and variables to remove the "bun" specifier. Ensure all code follows sane naming conventions.
- [ ] Ensure code is simple to understand and maintain

### Step 6: Update Documentation
- [ ] Update README.md installation instructions
- [ ] Update CLAUDE.md files
- [ ] Update test running instructions
- [ ] Update contribution guidelines

### Step 7: Final Testing
- [ ] Run `bun test` to ensure all tests pass
- [ ] Test CLI functionality with `bun run bin/cli.js`
- [ ] Test executable builds
- [ ] Verify live reload functionality

## Files to Modify

### Delete Entirely
- `test/test-runner.js`

### Major Updates Required
- `package.json` - Remove Node.js support, update scripts
- `src/server/dev-server.js` - Remove Node.js fallbacks
- `src/core/file-watcher.js` - Remove Node.js fallbacks  
- `src/utils/runtime-detector.js` - Simplify to Bun-only
- `scripts/build-executables.js` - Bun-only builds
- All test files (23 files) - Convert to Bun test syntax

### Documentation Updates
- `README.md`
- `CLAUDE.md` (root)
- `cli/CLAUDE.md`
- `CONTRIBUTING.md`
- `docs/*.md` files

## Expected Benefits

1. **Simpler codebase** - Remove dual-runtime complexity
2. **Better performance** - Leverage Bun's native speed
3. **Consistent tooling** - Single runtime for development and production
4. **Reduced maintenance** - No need to test on multiple runtimes
5. **Smaller bundle** - Remove Node.js compatibility code

## Risks and Considerations

1. **Breaking change** - Users on Node.js will need to install Bun
2. **CI/CD updates** - Any automated testing needs Bun setup
3. **Documentation synchronization** - Ensure all docs reflect changes
4. **Third-party integrations** - Verify compatibility with existing tools

## Testing Strategy

After each major step:
1. Run `bun test` to verify functionality
2. Test CLI commands manually
3. Verify live reload in development mode
4. Test executable compilation
5. Check performance benchmarks

---

This migration will result in a cleaner, faster, and more maintainable codebase focused entirely on Bun's capabilities.