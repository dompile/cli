# Dompile Static Site Generator - Complete Application Specification

## Overview

Dompile is a modern, lightweight static site generator designed for frontend developers who want to build maintainable static sites with component-based architecture. It uses familiar Apache SSI syntax and modern HTML templating to eliminate the need to copy and paste headers, footers, and navigation across multiple pages.

## Target Users

- Frontend developers familiar with HTML, CSS, and basic web development
- Content creators who need a simple static site generator
- Developers who want framework-free, pure HTML/CSS output
- Teams needing component-based architecture without JavaScript frameworks

## Core Functionality

### Primary Purpose
Transform source HTML/Markdown files with includes, components, and layouts into a complete static website ready for deployment.

### Key Features
- Apache SSI-style includes (`<!--#include file="header.html" -->`)
- Modern DOM templating with `<template>`, `<slot>`, and `<include>` elements
- Markdown processing with YAML frontmatter
- Layout system with variable substitution (`{{ title }}`, `{{ content }}`)
- Live development server with auto-reload
- Automatic sitemap.xml generation
- Incremental builds with smart dependency tracking
- Asset tracking and copying
- Security-first design with path traversal prevention

## Command Line Interface

### Application Name
`dompile`

### Main Commands

#### 1. `build` (Default Command)
Builds the static site from source files to output directory.

**Syntax:**
```bash
dompile [build] [options]
dompile            # Defaults to build command
```

**Workflow:**
1. Validates source and output directories
2. Scans source directory for all files (HTML, Markdown, assets)
3. Processes includes and dependencies
4. Applies layouts to Markdown files
5. Processes DOM templating elements
6. Copies referenced assets to output
7. Generates sitemap.xml (if enabled)
8. Reports build summary

**Expected Output:**
- Complete static website in output directory
- Sitemap.xml file at root
- All referenced assets copied with directory structure preserved
- Success message with file count and build time
- Exit code 0 on success, 1 on recoverable errors, 2 on fatal errors

#### 2. `serve`
Starts development server with live reload functionality.

**Syntax:**
```bash
dompile serve [options]
```

**Workflow:**
1. Performs initial build
2. Starts HTTP server on specified port/host
3. Enables live reload via Server-Sent Events
4. Starts file watcher for source directory
5. Rebuilds incrementally on file changes
6. Notifies browser of changes via SSE
7. Runs until manually stopped (Ctrl+C)

**Expected Output:**
- HTTP server serving built files
- Live reload endpoint at `/__events`
- Console messages for server status, file changes, and rebuild events
- Browser auto-refresh on source file changes

#### 3. `watch` (Legacy)
Watches files and rebuilds on changes without serving.

**Syntax:**
```bash
dompile watch [options]
```

**Workflow:**
1. Performs initial build
2. Starts file watcher for source directory
3. Rebuilds incrementally on file changes
4. Logs change events and rebuild status
5. Runs until manually stopped

**Expected Output:**
- Initial build output
- Continuous logging of file changes and rebuild events
- Updated files in output directory on changes

### Command Line Options

#### Directory Options

**`--source, -s <directory>`**
- **Purpose:** Specify source directory containing site files
- **Default:** `src`
- **Validation:** Must be existing directory
- **Used by:** All commands

**`--output, -o <directory>`**
- **Purpose:** Specify output directory for generated files
- **Default:** `dist`
- **Behavior:** Created if doesn't exist
- **Used by:** All commands

**`--layouts, -l <directory>`**
- **Purpose:** Specify layouts directory (relative to source)
- **Default:** `.layouts`
- **Used by:** All commands
- **Note:** Must be relative to source directory

**`--components, -c <directory>`**
- **Purpose:** Specify components directory (relative to source)
- **Default:** `.components`
- **Used by:** All commands
- **Note:** Must be relative to source directory

#### Server Options

**`--port, -p <number>`**
- **Purpose:** Development server port
- **Default:** `3000`
- **Validation:** Integer between 1-65535
- **Used by:** `serve` command only

**`--host <hostname>`**
- **Purpose:** Development server host
- **Default:** `localhost`
- **Used by:** `serve` command only
- **Examples:** `0.0.0.0` for external access

#### Build Options

**`--pretty-urls`**
- **Purpose:** Generate pretty URLs (about.md → about/index.html)
- **Default:** `false`
- **Used by:** `build` and `serve` commands
- **Effect:** Creates directory structure for clean URLs

**`--base-url <url>`**
- **Purpose:** Base URL for sitemap.xml generation
- **Default:** `https://example.com`
- **Used by:** `build` and `serve` commands
- **Format:** Full URL with protocol

**`--clean`**
- **Purpose:** Clean output directory before build
- **Default:** `false`
- **Used by:** `build` and `serve` commands

**`--no-sitemap`**
- **Purpose:** Disable sitemap.xml generation
- **Default:** `false` (sitemap enabled by default)
- **Used by:** `build` and `serve` commands

#### Global Options

**`--help, -h`**
- **Purpose:** Display help information
- **Behavior:** Shows usage, commands, options, and examples
- **Exit:** Code 0 after displaying help

**`--version, -v`**
- **Purpose:** Display version number
- **Format:** `dompile v{version}`
- **Exit:** Code 0 after displaying version

## File Processing Rules

### File Types Handled

#### HTML Files (`.html`)
- **Processing:** Include resolution, DOM templating, asset tracking
- **Output:** Processed HTML with includes resolved
- **Partials:** Files starting with `_` or in `.components/` directory are treated as partials (not directly copied to output)

#### Markdown Files (`.md`)
- **Processing:** YAML frontmatter extraction, Markdown to HTML conversion, layout application, include resolution
- **Output:** HTML files with same name
- **Layout Support:** Automatic layout application based on frontmatter

#### Static Assets
- **Types:** CSS, JS, images, fonts, etc.
- **Processing:** Asset tracking, referenced assets only
- **Output:** Copied to output directory maintaining relative paths

### Include System

#### Apache SSI-Style Comments (Primary)

**Virtual Includes:**
```html
<!--#include virtual="/path/from/source/root.html" -->
```
- Path relative to source directory root
- Leading `/` optional but recommended
- Case-sensitive

**File Includes:**
```html
<!--#include file="relative/path/from/current/file.html" -->
```
- Path relative to current file's directory
- Supports `../` for parent directories

#### DOM Elements (Advanced)

**Include Element:**
```html
<include src="/components/header.html"></include>
```

**Template and Slot System:**
```html
<template extends="layout.html">
  <slot name="content">Page content here</slot>
</template>
```

### Layout System

#### Layout Files
- Located in layouts directory (default: `.layouts/`)
- Standard HTML files with variable placeholders
- Variables: `{{ variable_name }}`
- Special variables: `{{ content }}` for main content

#### Variable Substitution
- Frontmatter variables: `{{ title }}`, `{{ description }}`
- Content variable: `{{ content }}` (processed markdown/HTML)
- Date variables: `{{ year }}`, `{{ date }}`

#### Layout Application
- Automatic for Markdown files with `layout` frontmatter
- Manual for HTML files using DOM templating

### Dependency Tracking
- Bidirectional mapping: pages ↔ includes
- Change impact analysis for incremental builds
- Circular dependency detection (10-level depth limit)
- Smart rebuilding of affected files only

## Error Handling and Exit Codes

### Exit Codes
- **0:** Success
- **1:** Recoverable errors (missing includes, validation warnings)
- **2:** Fatal errors (invalid arguments, file system errors)

### Error Types

#### Validation Errors
- Invalid CLI arguments
- Port out of range (1-65535)
- Unknown commands or options
- **Behavior:** Display error with suggestions, exit code 1

#### File System Errors
- Source directory doesn't exist
- Permission denied
- Path traversal attempts
- **Behavior:** Display error with context, exit code 2

#### Build Errors
- Circular dependencies
- Include file not found
- Layout processing failures
- **Behavior:** Warning messages, graceful degradation where possible

#### Security Errors
- Path traversal attempts (`../../../etc/passwd`)
- Access outside source boundaries
- **Behavior:** Immediate failure, exit code 2

### Error Output Format
```
❌ Error: {error message}

Suggestions:
  • {suggestion 1}
  • {suggestion 2}
  • {suggestion 3}
```

### Debug Mode
- Activated via `DEBUG` environment variable
- Shows stack traces for all errors
- Detailed file processing logs

## Output and Logging

### Standard Output

#### Build Command
```
dompile v{version}

Building static site...
✅ Processed 15 files
✅ Generated sitemap.xml with 8 pages
✅ Copied 12 assets
Build completed successfully! (1.2s)
```

#### Serve Command
```
dompile v{version}

Building static site...
✅ Build completed successfully!
🚀 Development server started
📁 Serving: /path/to/output
🌐 Local: http://localhost:3000
🔄 Live reload: enabled
```

#### Watch Command
```
dompile v{version}

Starting file watcher...
✅ Initial build completed
👀 Watching for changes...
📝 Changed: src/index.html
🔄 Rebuilding...
✅ Rebuild completed (0.3s)
```

### Logging Levels
- **Info (ℹ️):** General status messages
- **Success (✅):** Successful operations
- **Warning (⚠️):** Non-fatal issues
- **Error (❌):** Fatal problems

## Security Requirements

### Path Validation
- All file operations must be within source directory boundaries
- Path traversal prevention for all user inputs
- Validation function: `isPathWithinDirectory()`

### Input Sanitization
- CLI arguments validated against expected patterns
- File paths normalized before processing
- No injection vulnerabilities in template processing

### Output Security
- Static HTML/CSS/JS output only
- No client-side template execution
- No server-side code generation

### Development Server Security
- Serves only files from output directory
- MIME type validation
- Request path validation
- No directory traversal in URLs

## Performance Requirements

### Build Performance
- Incremental builds for changed files only
- Smart dependency tracking to minimize rebuilds
- Asset copying only for referenced files
- Streaming file operations (no full-site memory loading)

### Development Server
- File change debouncing (100ms)
- Selective rebuild based on dependency analysis
- Efficient live reload via Server-Sent Events
- Memory-efficient file watching

### Scalability
- Handle projects with 1000+ pages
- Efficient processing of large asset collections
- Minimal memory footprint during builds

## Compatibility Requirements

### Node.js Support
- Minimum version: Node.js 14.0.0
- ESM modules only
- Built-in test runner support

### Cross-Platform
- Windows, macOS, Linux support
- Path handling respects OS conventions
- Line ending normalization

### Runtime Support
- Node.js (primary)
- Deno compatibility
- Bun compatibility

## Configuration

### Default Behavior
- No configuration files required
- Convention over configuration
- Sensible defaults for all options

### Directory Structure Conventions
```
project/
├── src/                    # Source files (--source)
│   ├── .components/        # Reusable components (--components)
│   ├── .layouts/           # Page layouts (--layouts)
│   ├── index.html          # Page files
│   ├── about.md            # Markdown content
│   └── assets/             # Static assets
└── dist/                   # Output directory (--output)
```

### File Naming Conventions
- Partials: Start with `_` or located in `.components/`
- Layouts: Located in `.layouts/` directory
- Components: Located in `.components/` directory
- Pages: All other `.html` and `.md` files

## Integration Points

### Package Managers
- npm global installation: `npm install -g @dompile/cli`
- npx usage: `npx @dompile/cli`
- Package registry: `@dompile/cli`

### Development Tools
- VS Code extension support
- Docker container support
- CI/CD pipeline integration

### Deployment
- Static hosting (Netlify, Vercel, GitHub Pages)
- CDN deployment
- Traditional web servers

## Areas Requiring Clarification

### 1. Component Data Binding
**Question:** How should data be passed to components when using DOM elements?
```html
<include src="/components/card.html" data-title="Title" data-content="Content">
```
**Missing Information:**
- Data attribute processing mechanism
- Variable substitution within components
- Scoping of component variables

### 2. Asset Processing Pipeline
**Question:** Should CSS/JS assets within components be processed or concatenated?
**Missing Information:**
- CSS scoping mechanisms
- JavaScript module handling
- Asset optimization features
- Component style isolation

### 3. Template Inheritance Hierarchy
**Question:** How deep can template inheritance go?
**Missing Information:**
- Maximum inheritance depth
- Slot override behavior in nested templates
- Performance implications of deep inheritance

### 4. Live Reload Granularity
**Question:** What level of granularity should live reload support?
**Missing Information:**
- CSS-only reloads vs full page refresh
- Component-level updates
- Asset change handling

### 5. Error Recovery Strategies
**Question:** How should the system handle partial build failures?
**Missing Information:**
- Continue building other files when one fails?
- Rollback strategies for failed builds
- Cached build state management

### 6. Markdown Extensions
**Question:** What Markdown features and extensions should be supported?
**Missing Information:**
- Table support
- Code syntax highlighting
- Math expressions
- Custom Markdown plugins

### 7. Sitemap Customization
**Question:** How much control should users have over sitemap generation?
**Missing Information:**
- Custom URL priorities per page
- Excluded pages configuration
- Multiple sitemap support for large sites

### 8. Production Optimization
**Question:** Should the tool include production optimization features?
**Missing Information:**
- HTML/CSS minification
- Image optimization
- Asset fingerprinting for cache busting
- Bundle analysis and optimization

### 9. Internationalization Support
**Question:** How should multi-language sites be handled?
**Missing Information:**
- Directory structure for i18n
- Language-specific layouts
- URL structure for localized content

### 10. Plugin System Architecture
**Question:** Is a plugin system needed for extensibility?
**Missing Information:**
- Plugin API design
- Hook points in the build process
- Third-party plugin discovery and loading

## Success Criteria

### Functional Requirements
- ✅ All three commands (build, serve, watch) work correctly
- ✅ Include system processes Apache SSI and DOM elements
- ✅ Markdown processing with frontmatter and layouts
- ✅ Live reload functionality in development server
- ✅ Sitemap generation for SEO
- ✅ Security validation prevents path traversal
- ✅ Error handling with helpful messages

### Performance Requirements
- ✅ Incremental builds complete in <1 second for single file changes
- ✅ Initial builds complete in <5 seconds for typical sites (<100 pages)
- ✅ Memory usage remains <100MB for typical projects
- ✅ File watching responds to changes within 200ms

### Usability Requirements
- ✅ Zero configuration required for basic usage
- ✅ Clear error messages with actionable suggestions
- ✅ Intuitive CLI with helpful defaults
- ✅ Comprehensive help documentation

### Reliability Requirements
- ✅ Graceful handling of missing includes
- ✅ Robust error recovery during builds
- ✅ Cross-platform compatibility
- ✅ Backwards compatibility for existing projects