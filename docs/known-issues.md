# Known Issues

## Failing Tests Analysis (Automated Test Run)

### 1. CLI Flag Issues - ✅ FIXED
- **Test**: `should build with short flags` (cli-commands.test.js:72)
  - **Error**: Exit Code 1 (expected 0)
  - **Type**: CLI argument parsing issue
  - **Analysis**: Bug in DOM processor - layout path security check was using wrong base directory for absolute layout paths
  - **Fix**: Modified `detectLayout` function to use proper security checks based on whether layoutsDir is absolute or relative

- **Test**: `should handle mixed long and short flags` (cli-commands.test.js:441)
  - **Error**: Exit Code 1 (expected 0)
  - **Type**: CLI argument parsing issue
  - **Analysis**: Same issue as above
  - **Fix**: Same fix resolved this issue

### 2. Final Boss Integration Test Issues - ✅ FIXED

- **Test**: `should build a complex multi-page website with all features` (final-boss.test.js:44)
  - **Error**: Should include navigation (assertion failed)
  - **Type**: Build output content issue
  - **Analysis**: Bug in DOM processor - SSI includes in layouts were not being processed
  - **Fix**: ✅ Modified `processIncludesInHTML` function to use SSI include processor first, then handle `<include>` elements

- **Test**: `should handle edge cases and error conditions` (final-boss.test.js:638)
  - **Error**: Build fails with 5 FileSystemError - looking for default.html in .layouts directory
  - **Type**: Layout resolution issue
  - **Analysis**: Bug in DOM and unified processors - missing layouts caused fatal errors instead of graceful degradation
  - **Fix**: ✅ Added graceful degradation for missing layouts in both DOM and unified processors

- **Test**: `should handle large number of files efficiently` (final-boss.test.js:736)
  - **Error**: Exit Code 1 (expected 0)
  - **Type**: Performance/build issue
  - **Analysis**: Same layout resolution issue as above
  - **Fix**: ✅ Same fix resolved this issue

- **Test**: `should handle deeply nested includes` (final-boss.test.js:776)
  - **Error**: Exit Code 1 (expected 0)
  - **Type**: Include processing issue
  - **Analysis**: Same layout resolution issue as above
  - **Fix**: ✅ Same fix resolved this issue

### 3. Performance/Edge Case Issues - ✅ FIXED
- **Test**: `should handle template processing with unusual slot configurations` (performance-edge-cases.test.js:462)
  - **Error**: ENOENT - no such file default.html in layouts directory
  - **Type**: Layout resolution issue
  - **Analysis**: Missing layout files causing build failure
  - **Fix**: ✅ Added graceful degradation for missing layouts in unified-html-processor.js

### 4. Asset Handling Issues - ✅ FIXED
- **Test**: `should handle alternative layout/component directory names` (asset-handling.test.js:378)
  - **Error**: Build failed looking for default.html in wrong location
  - **Type**: Layout path resolution issue
  - **Analysis**: Layout directories were being incorrectly copied to output due to path resolution bug
  - **Fix**: ✅ Fixed path resolution in file-processor.js build() function to resolve relative paths correctly

## Final Status Summary

**✅ ALL ISSUES RESOLVED**
- Total failing tests identified: 8
- Tests successfully fixed: 8/8
- Full test suite status: 188 tests passing, 0 failures
- All fixes implemented and verified

## Legacy Issues (Likely resolved previously)

- The workflow and/or logic for applying default templates is incorrect.
  - Default layout is not applied to partial html pages without specifying data-layout attribute
  - Default layout is not applied to markdown files, likely due to wrapping the markdown content in default html before processing layout logic.
