# Documentation TODOs

This document tracks discrepancies between the current implementation and documentation that need to be resolved.

## Analysis Status
- **Date:** July 28, 2025
- **Current Implementation Version:** 0.5.2
- **Documents Analyzed:** 15 markdown files
- **Methodology:** Compared documentation against semantic search of current codebase

## High Priority Issues (Core Functionality Discrepancies)

### 1. CLI Reference Documentation (cli-reference.md)
**Status:** ✅ COMPLETED

**Issues Found:**
- Default directories (`src`, `dist`, `.layouts`, `.components`) already correct
- Port default (3000) already correct
- Host default (`localhost`) already correct  
- Base URL default (`https://example.com`) already correct
- Flags and options all match args-parser.js implementation

**Action Required:**
- ✅ COMPLETED: CLI reference documentation is accurate and up-to-date
- ✅ COMPLETED: All flags, defaults, and examples match implementation

### 2. Include Syntax Documentation (include-syntax.md)
**Status:** ❌ CONFLICTING INFORMATION

**Issues Found:**
- Shows both `<include src="...">` and `<!--#include virtual="..." -->` without clear preference
- Doesn't clearly distinguish between DOM mode and SSI mode includes
- Missing documentation for DOM mode `<include>` element processing with token replacement
- Example paths inconsistent (some show `.components`, others show `components`)

**Action Required:**
- Clarify that SSI comments (`<!--#include -->`) are primary syntax
- Document DOM mode `<include>` elements as secondary/experimental
- Standardize all path examples to use `.components` and `.layouts`

### 3. Layout System Documentation (layouts-slots-templates.md)
**Status:** ❌ MAJOR INCONSISTENCIES

**Issues Found:**
- Uses `<template extends="...">` syntax that's not implemented
- Mixes variable substitution (`{{ variable }}`) with slot system inconsistently
- Shows both `.layouts/` and `layouts/` directory references
- Layout selection precedence doesn't match actual implementation
- Missing clear documentation of `data-layout` attribute usage

**Action Required:**
- Remove or clearly mark `<template extends>` as experimental/future
- Focus documentation on `data-layout` attribute approach
- Standardize all directory references to `.layouts`
- Document actual layout resolution logic from dom-processor.js

## Medium Priority Issues (Feature Completeness)

### 4. Token Replacement Documentation (token-replacement.md)
**Status:** ✅ COMPLETED

**Issues Found:**
- Documents complex conditional logic (`{{#if}}`, `{{#each}}`) that's not implemented
- Shows built-in variables (`{{ content }}`, `{{ title }}`) that may not work
- Advanced string operations and filters not supported
- Security features and HTML escaping may not be implemented

**Action Required:**
- ✅ COMPLETED: Simplified to show only implemented token replacement
- ✅ COMPLETED: Focus on simple `{{ variable }}` replacement from frontmatter
- ✅ COMPLETED: Remove advanced templating features not in current implementation
- ✅ COMPLETED: Updated integration examples to match actual capabilities

### 5. DOM Mode Details (dom-mode-details.md)
**Status:** ❌ NEEDS UPDATES

**Issues Found:**
- Layout detection logic description doesn't match dom-processor.js implementation
- Token replacement system described is more complex than implemented
- Processing flow may not reflect current unified-html-processor.js

**Action Required:**
- Update layout detection to match current `detectLayout()` function
- Simplify token replacement to match current capabilities
- Update processing flow diagram

### 6. Complete Templating Guide (complete-templating-guide.md)
**Status:** ❌ FEATURE MISMATCH

**Issues Found:**
- Claims comprehensive templating system with advanced features
- Shows template inheritance that's not implemented
- Advanced slot patterns may not work as documented
- Include system examples use inconsistent directory names

**Action Required:**
- Align with actual slot system implementation
- Remove or mark experimental features
- Standardize directory naming throughout

## Low Priority Issues (Polish & Consistency)

### 7. Templating Quick Start (templating-quick-start.md)
**Status:** ❌ NEEDS CONSISTENCY

**Issues Found:**
- Directory structure examples inconsistent
- May show features not implemented
- Quick start examples should be tested against current build

**Action Required:**
- Test all examples against current implementation
- Standardize directory structure references
- Simplify to core implemented features

### 8. Getting Started Guide (getting-started.md)
**Status:** ✅ COMPLETED

**Issues Found:**
- Installation commands may be outdated
- CLI examples need verification against current implementation
- Directory structure examples need to match current defaults

**Action Required:**
- ✅ COMPLETED: Installation commands are correct (@dompile/cli)
- ✅ COMPLETED: CLI examples use correct commands (dompile build, dompile serve)
- ✅ COMPLETED: Directory structure matches current defaults (src/, .layouts/, .components/, dist/)
- ✅ COMPLETED: Include syntax documentation is accurate

### 9. Template Elements in Markdown (template-elements-in-markdown.md)
**Status:** ❌ ADVANCED FEATURES

**Issues Found:**
- Shows advanced markdown templating that may not be supported
- Template inheritance in markdown may not work
- Complex slot usage may not be implemented

**Action Required:**
- Test markdown templating examples
- Simplify to working features
- Remove unsupported advanced patterns

## Current Implementation Facts (Verified)

### CLI Arguments (from args-parser.js)
```javascript
{
  source: "src",
  output: "dist", 
  layouts: ".layouts",
  components: ".components",
  port: 3000,
  host: "localhost",
  prettyUrls: false,
  baseUrl: "https://example.com",
  clean: false,
  sitemap: true
}
```

### Supported Short Flags
- `-s` (source), `-o` (output), `-l` (layouts), `-c` (components)
- `-p` (port), `-h` (help), `-v` (version)

### Include Syntax Support
- **Primary:** `<!--#include virtual="/path" -->` (SSI comments)
- **Secondary:** `<include src="/path" />` (DOM mode elements)

### Layout System
- Uses `data-layout` attribute on root elements
- Default layout: `.layouts/default.html`
- Slot replacement with `<slot name="...">` and `<template data-slot="...">`

### Token Replacement
- Basic data attribute replacement: `data-token="field"` → value from `data-field`
- Limited to component includes, not full template system

## Correction Plan

### Phase 1: CLI and Core Syntax (High Priority)
1. ✅ Fix cli-reference.md with correct defaults and flags
2. ✅ Update getting-started.md CLI examples
3. ✅ Standardize include syntax documentation

### Phase 2: Template System Alignment (Medium Priority)  
4. Simplify layouts-slots-templates.md to implemented features
5. ✅ Update token-replacement.md to current capabilities
6. Fix DOM mode documentation

### Phase 3: Example Consistency (Low Priority)
7. Test and fix all examples
8. Standardize directory naming
9. Remove experimental features

## Testing Requirements

Each corrected document should have examples tested against:
- `node bin/cli.js build` with various flags
- Actual slot replacement and include processing
- Real directory structures and file resolution

## Completion Tracking

- [ ] Phase 1: CLI Documentation Fixed
- [ ] Phase 2: Template System Aligned  
- [ ] Phase 3: Examples Tested & Consistent
- [ ] All documentation verified against implementation
