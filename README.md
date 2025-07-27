# dompile - an SSG for a more peaceful future

![dompile banner](example/src/imgs/green-banner-800.png)

A modern,  lightweight static site generator that brings the power of server-side includes, markdown processing, and live development to your workflow. Build maintainable static sites with component-based architecture-no more copying and pasting headers, footers, and navigation across multiple pages!

## ✨ Perfect for Frontend Developers

- **Zero Learning Curve**: Uses familiar Apache SSI syntax (`<!--#include file="header.html" -->`) or intuitive `<slot>`, `<template>`, and `<include>` elements.
- **Modern Tooling**: Built with ESM modules, works on Node.js, Deno, and Bun
- **Live Development**: Built-in dev server with live reload via Server-Sent Events
- **Multi-Format Support**: HTML, Markdown with frontmatter, and static assets
- **SEO Optimized**: Automatic sitemap generation
- **Framework-Free**: Pure HTML and CSS output-no build complexity or JavaScript frameworks required
- **Minimal Dependencies**: Just 3 dependencies (chokidar, markdown-it, gray-matter)

## 🚀 Quick Start

```bash
# Install globally
npm install -g dompile/cli

# Simple usage with defaults (src => dist)
dompile build                    # Build from src/ to dist/
dompile serve                    # Serve with live reload on port 3000

# Or use with npx
npx dompile/cli build
npx dompile/cli serve

# Advanced usage with custom options
dompile build --pretty-urls --base-url https://mysite.com
dompile serve --port 8080
```

## 📁 Quick Example

```html
<!-- src/index.html -->
<!--#include virtual="/.components/header.html" -->
<main>
  <h1>Welcome!</h1>
  <p>Build maintainable sites with includes and components.</p>
</main>
<!--#include virtual="/.components/footer.html" -->
```

See the [Getting Started Guide](docs/getting-started.md) for a complete tutorial.

## 📚 Documentation

- **[Getting Started](docs/getting-started.md)** - Your first dompile site
- **[CLI Reference](docs/cli-reference.md)** - Complete command documentation
- **[Docker Usage](docs/docker-usage.md)** - Container deployment guide
- **[Template Elements](docs/template-elements-in-markdown.md)** - Advanced templating
- **[Architecture](docs/ARCHITECTURE.md)** - Technical deep dive

## ⚡ Core Commands

```bash
# Build your site (default command)
dompile
dompile build

# Development server with live reload
dompile serve

# Get help
dompile --help
```

See [CLI Reference](docs/cli-reference.md) for all options.

## 🎯 Why dompile?

- **Simple**: Familiar HTML and Apache SSI syntax
- **Fast**: Incremental builds and smart dependency tracking  
- **Modern**: ESM modules, live reload, Docker support
- **Flexible**: Works with HTML, Markdown, and modern templating
- **Portable**: Runs on Node.js, Deno, and Bun
- Dependency tracking and change impact analysis
- Built-in development server
- Docker support with multi-stage builds

## 🔒 Security

- **Path traversal prevention**: All file operations validated against source boundaries
- **Input validation**: CLI arguments and file paths sanitized
- **Static output**: No client-side template execution vulnerabilities
- **Secure serving**: Development server restricted to output directory

## 🧪 Testing

dompile has comprehensive test coverage:

- **Security tests**: Path traversal and validation
- **CLI tests**: All commands and options
- **Build process tests**: Complete workflows
- **Error handling tests**: Graceful degradation

## 🔗 Cross-Platform Support

- **Node.js** 14+ (native ESM support)
- **Bun**: `bun run dompile/cli serve` (faster execution)
- **Deno**: `deno run --allow-read --allow-write --allow-net npm:dompile/cli`

## 🗺️ Roadmap

See our [detailed roadmap](ROADMAP.md) for completed features, current development, and future plans.

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/dompile/cli
cd cli
npm install
npm test
npm run example
```

---

_Built with ❤️ for frontend developers who love simple, powerful tools._
