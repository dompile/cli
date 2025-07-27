# CLI Reference

Complete reference for all dompile CLI commands and options.

## Commands

### `dompile [command] [options]`

If no command is specified, dompile defaults to `build`.

### `dompile build [options]`

Build your static site from source files.

**Examples:**
```bash
# Basic build
dompile build

# Build with custom directories
dompile build --source content --output public

# Build with pretty URLs and custom base URL
dompile build --pretty-urls --base-url https://mysite.com

# Build with custom component and layout directories
dompile build --components partials --layouts templates
```

### `dompile serve [options]`

Start development server with live reload.

**Examples:**
```bash
# Start dev server on default port 3000
dompile serve

# Custom port and host
dompile serve --port 8080 --host 0.0.0.0

# Serve from custom directories
dompile serve --source content --output tmp
```

### `dompile watch [options]`

Watch files and rebuild on changes (legacy command, use `serve` instead).

**Examples:**
```bash
# Watch and rebuild
dompile watch

# Watch with custom directories
dompile watch --source src --output dist
```

## Global Options

### Directory Options

#### `--source, -s <directory>`
Source directory containing your site files.
- **Default:** `src`
- **Example:** `--source content`

#### `--output, -o <directory>`
Output directory for generated static files.
- **Default:** `dist`
- **Example:** `--output public`

#### `--layouts, -l <directory>`
Layouts directory (relative to source).
- **Default:** `.layouts`
- **Example:** `--layouts templates`

#### `--components, -c <directory>`
Components directory (relative to source).
- **Default:** `.components`
- **Example:** `--components partials`

### Server Options

#### `--port, -p <number>`
Development server port.
- **Default:** `3000`
- **Range:** `1-65535`
- **Example:** `--port 8080`

#### `--host <hostname>`
Development server host.
- **Default:** `localhost`
- **Example:** `--host 0.0.0.0`

### Build Options

#### `--pretty-urls`
Generate pretty URLs (about.md → about/index.html).
- **Default:** `false`
- **Example:** `--pretty-urls`

#### `--base-url <url>`
Base URL for sitemap.xml generation.
- **Default:** `https://example.com` (or from package.json homepage)
- **Example:** `--base-url https://mysite.com`

### Help and Version

#### `--help, -h`
Show help message with all available options.

#### `--version, -v`
Show version number.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Build error with suggestions |
| `2` | Unexpected error |

## Environment Variables

### `LOG_LEVEL`
Control logging verbosity.
- **Values:** `error`, `warn`, `info`, `debug`
- **Default:** `info`
- **Example:** `LOG_LEVEL=debug dompile build`

### `DEBUG`
Enable debug mode with stack traces.
- **Values:** Any truthy value
- **Example:** `DEBUG=1 dompile build`

### `NODE_ENV`
Environment mode (affects some default behaviors).
- **Values:** `development`, `production`
- **Example:** `NODE_ENV=production dompile build`

## Configuration Precedence

dompile resolves configuration in this order (highest to lowest priority):

1. **CLI arguments** - Command line flags
2. **Environment variables** - `DOMPILE_*` prefixed vars
3. **Package.json** - `homepage` field for base URL
4. **Defaults** - Built-in default values

## Advanced Usage

### CI/CD Pipeline

```bash
# Production build in CI
NODE_ENV=production dompile build \
  --source content \
  --output dist \
  --pretty-urls \
  --base-url https://mysite.com
```

### Development Workflow

```bash
# Development with file watching
dompile serve --port 3000 --host 0.0.0.0

# In another terminal, run tests
npm test

# Deploy built files
rsync -av dist/ user@server:/var/www/html/
```

### Docker Integration

```bash
# Build with Docker
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  dompile:cli build --pretty-urls

# Serve with Docker
docker run --rm \
  -p 3000:3000 \
  -v $(pwd):/workspace \
  -w /workspace \
  dompile:cli serve --host 0.0.0.0
```

## Error Handling

### Common Errors

**Source directory not found:**
```
Error: Source directory not found: src
Suggestions:
  • Create the source directory: mkdir src
  • Specify a different source: --source content
  • Check your current working directory
```

**Include file not found:**
```
Error: Include file not found: header.html
  in: src/index.html:5
Suggestions:
  • Create the include file: src/.components/header.html
  • Check the include path and spelling
  • Use virtual path: <!--#include virtual="/.components/header.html" -->
```

**Port already in use:**
```
Error: Port 3000 is already in use
Suggestions:
  • Use a different port: --port 8080
  • Stop the process using port 3000
  • Check for other development servers
```

### Debug Mode

Enable detailed error reporting:

```bash
DEBUG=1 dompile build
```

This will show:
- Full stack traces
- File operation details
- Dependency resolution steps
- Performance timing information

## Performance Tips

### Large Sites

For sites with many files:

```bash
# Use specific output directory to avoid conflicts
dompile build --output /tmp/site-build

# Parallelize with multiple processes (if needed)
dompile build & dompile build --source src2 --output dist2 &
```

### Development Speed

Optimize development workflow:

```bash
# Use minimal logging for faster builds
LOG_LEVEL=warn dompile serve

# Serve from faster storage if available
dompile serve --output /tmp/dev-output
```

## Integration Examples

### npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build": "dompile build --pretty-urls",
    "dev": "dompile serve",
    "preview": "dompile build && python -m http.server -d dist 8080"
  }
}
```

### Makefile

```makefile
.PHONY: build serve clean

build:
	dompile build --pretty-urls --base-url $(BASE_URL)

serve:
	dompile serve --port 3000

clean:
	rm -rf dist

deploy: build
	rsync -av dist/ $(DEPLOY_TARGET)
```

### GitHub Actions

```yaml
- name: Build site
  run: |
    dompile build \
      --pretty-urls \
      --base-url https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}
```