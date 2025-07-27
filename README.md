# 🌱 dompile

A modern, lightweight static site generator that brings the power of server-side includes, markdown processing, and live development to your workflow. Build maintainable static sites with component-based architecture—no more copying and pasting headers, footers, and navigation across multiple pages!

## ✨ Perfect for Frontend Developers

- **Zero Learning Curve**: Uses familiar Apache SSI syntax (`<!--#include file="header.html" -->`) or intuitive `<slot>`, `<template>`, and `<include>` elements.
- **Modern Tooling**: Built with ESM modules, works on Node.js, Deno, and Bun
- **Live Development**: Built-in dev server with live reload via Server-Sent Events
- **Multi-Format Support**: HTML, Markdown with frontmatter, and static assets
- **SEO Optimized**: Automatic sitemap generation and head injection
- **Framework-Free**: Pure HTML and CSS output—no build complexity or JavaScript frameworks required
- **Minimal Dependencies**: Just 3 dependencies (chokidar, markdown-it, gray-matter)

## 🚀 Quick Start

```bash
# Install globally
npm install -g dompile/cli

# Simple usage with defaults (src → dist)
dompile build                    # Build from src/ to dist/
dompile serve                    # Serve with live reload on port 3000

# Or use with npx
npx dompile/cli build
npx dompile/cli serve

# Advanced usage with custom options
dompile build --pretty-urls --base-url https://mysite.com
dompile serve --port 8080
```

## 📁 Project Structure

```
my-site/
├── src/                     # Source directory (default)
│   ├── .components/        # Reusable components and includes (default: src/.components)
│   │   ├── header.html
│   │   ├── footer.html
│   │   ├── head.html       # Auto-injected into all pages
│   │   └── button.html
│   ├── .layouts/           # Layout templates (default: src/.layouts)
│   │   └── base.html
│   ├── css/
│   │   └── style.css
│   └── images/
│   |    └── logo.png
│   ├── index.html
│   ├── about.md        # Markdown with frontmatter
│   └── contact.html
├── dist/                   # Output directory (default)
│   ├── sitemap.xml        # Auto-generated
│   └── ...
└── package.json
```

## 🔧 How It Works

### HTML Includes

Use Apache SSI syntax to include partials:

```html
<!-- index.html -->
<html>
  <head>
    <!--.components/head.html automatically injected here -->
    <title>My Site</title>
  </head>
  <body>
    <!--#include virtual="/.components/header.html" -->
    <main>
      <h1>Welcome!</h1>
    </main>
    <!--#include virtual="/.components/footer.html" -->
  </body>
</html>
```

### Markdown with Frontmatter

Create rich content with YAML frontmatter:

```markdown
---
title: "About Us"
description: "Learn more about our company"
date: 2025-01-01
layout: "page"
---

# About Us

This markdown content will be wrapped in your layout template and processed with includes.

<!--#include virtual="/.components/contact-form.html" -->
```

### Layout System

Create layout templates with variable substitution:

```html
<!-- layout.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }} - My Site</title>
    <meta name="description" content="{{ description }}" />
  </head>
  <body>
    <!--#include virtual="/.components/header.html" -->
    <main>
      <slot></slot>
    </main>
    <!--#include virtual="/.components/footer.html" -->
  </body>
</html>
```

### Automatic Head Injection

Place common meta tags, CSS, and scripts in `head.html` and they'll be automatically injected into every page's `<head>` section.

### Live Development Server

Built-in development server with live reload:

```bash
# Start dev server with live reload
dompile serve

# Server features:
# - Live reload via Server-Sent Events
# - Incremental builds (only rebuild changed files)
# - Asset tracking (only copy referenced assets)
# - Dependency tracking (rebuild dependent pages when partials change)
```

## 📖 Commands & Options

### Commands

- **`dompile build [options]`** - Build your static site
- **`dompile serve [options]`** - Start development server with live reload
- **`dompile watch [options]`** - Watch files and rebuild on changes (legacy)

### Options

- `--source, -s`: Source directory (default: `src`)
- `--output, -o`: Output directory (default: `dist`)
- `--layouts`: Layouts directory (default: `.layouts`, relative to source)
- `--components`: Components directory (default: `.components`, relative to source)
- `--head`: Custom head include file path
- `--port, -p`: Development server port (default: `3000`)
- `--host`: Development server host (default: `localhost`)
- `--pretty-urls`: Generate pretty URLs (about.md → about/index.html)
- `--base-url`: Base URL for sitemap.xml (default: `https://example.com`)
- `--help, -h`: Show help message
- `--version, -v`: Show version

## 🎯 Key Features

### ⚡ Incremental Builds

- Only rebuilds files that have changed or are affected by changes
- Smart dependency tracking for includes and partials
- Fast rebuilds even for large sites

### 📄 Markdown Support

- Full markdown processing with markdown-it
- YAML frontmatter for metadata
- Automatic table of contents generation
- Anchor links for all headings
- Layout system with template variables
- Include processing within markdown

### 🎨 Asset Management

- Smart asset copying - only copies referenced assets
- Automatic asset discovery from HTML/CSS references
- Maintains directory structure in output
- Supports images, CSS, JS, fonts, and other media

### 🔍 SEO Features

- Automatic XML sitemap generation
- SEO metadata (priority, changefreq, lastmod)
- Head injection for global meta tags and analytics
- Pretty URL support for better SEO
- Frontmatter integration for custom metadata

### 🛠️ Developer Experience

- Live reload with Server-Sent Events
- Comprehensive error messages with file context
- Dependency tracking and change impact analysis
- Built-in development server
- Docker support with multi-stage builds

## 🐳 Docker Support

### Quick Start with Docker

```bash
# Build and serve with Docker
docker run --rm -p 8080:80 -v $(pwd)/src:/site itlackey/dompile

# Development with live reload
docker run --rm -p 3000:3000 -v $(pwd)/src:/site itlackey/dompile \
  dompile serve --source /site --output /var/www/html --port 3000 --host 0.0.0.0
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  dompile:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./src:/site
    environment:
      - NODE_ENV=production
```

## 📊 Performance

- **Fast builds**: Typical sites build in under 50ms
- **Incremental rebuilds**: Only processes changed files
- **Memory efficient**: Streaming operations, no full-site loading
- **Smart asset tracking**: Only copies referenced assets
- **Optimized file watching**: Debounced with selective rebuilding

## 🔒 Security

- **Path traversal prevention**: All file operations validated against source boundaries
- **Input validation**: CLI arguments and file paths sanitized
- **Static output**: No client-side template execution vulnerabilities
- **Secure serving**: Development server restricted to output directory

## 🧪 Testing

dompile has comprehensive test coverage:

- **72 tests passing** across unit and integration suites
- **Security tests**: Path traversal and validation
- **CLI tests**: All commands and options
- **Build process tests**: Complete workflows
- **Error handling tests**: Graceful degradation

## 🔗 Cross-Platform Support

- **Node.js** 14+ (native ESM support)
- **Bun**: `bun run dompile/cli serve` (faster execution)
- **Deno**: `deno run --allow-read --allow-write --allow-net npm:dompile/cli`

## 🗺️ Roadmap

### ✅ Completed (v0.4)

- Apache SSI includes with dependency tracking
- Markdown processing with frontmatter and layouts
- Live reload development server
- Incremental builds with asset tracking
- Automatic sitemap generation
- Pretty URL support
- Docker containerization
- **DOM Mode**: Modern `<template>` and `<slot>` syntax

### In Progress (v0.5)

- Remove the need for build subcommand
- Fix issues with default layout
- Simplify and clean up code base

### 🔮 Future (v0.6+)

- Canonical URL generation and link rewriting
- Enhanced SEO features (Open Graph, JSON-LD)
- Dead link detection
- **Component System**: Reusable components with data binding
- **Template Inheritance**: Layout chaining and composition

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/dompile/cli
cd cli
npm install
npm test
npm run build
```

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

_Built with ❤️ for frontend developers who love simple, powerful tools._
