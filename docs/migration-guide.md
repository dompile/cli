# Migration Guide: Node.js to Bun

This guide helps you migrate your Unify CLI usage from Node.js to Bun for significant performance improvements.

## Quick Migration

### 1. Install Bun

```bash
# macOS and Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Package managers
npm install -g bun        # via npm
brew install bun          # via Homebrew (macOS)
```

### 2. Verify Installation

```bash
bun --version
# Should output: 1.2.0 or higher
```

### 3. Switch Your Commands

Simply replace `node` or `npm run` with `bun run`:

```bash
# Before (Node.js)
node bin/cli.js build --source src --output dist
npm run build

# After (Bun)
bun run bin/cli.js build --source src --output dist
bun run build
```

That's it! Unify CLI automatically detects Bun and uses native optimizations.

## Performance Benefits

After migration, you'll immediately see:

| Operation | Before (Node.js) | After (Bun) | Improvement |
|-----------|------------------|-------------|-------------|
| **HTML Processing** | jsdom | HTMLRewriter | **3-5x faster** |
| **File Watching** | chokidar | fs.watch | **2x faster startup** |
| **Dev Server** | Node.js http | Bun.serve | **4-6x faster requests** |
| **Build Caching** | Manual hashing | Bun.hash | **10x faster hashing** |
| **Cold Start** | ~2000ms | ~800ms | **2.5x faster** |

## Migration Scenarios

### Scenario 1: Individual Developer

**Current Setup:**

```bash
npm install -g @unify/cli
unify build --source src --output dist
```

**Migrated Setup:**

```bash
bun add -g @unify/cli
bun run unify build --source src --output dist
```

**Benefits:**

- Faster builds during development
- Quicker feedback loops
- Lower memory usage

### Scenario 2: CI/CD Pipeline

**Current Setup:**

```yaml
# .github/workflows/build.yml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    
- name: Install dependencies
  run: npm ci
  
- name: Build site
  run: npm run build
```

**Migrated Setup:**

```yaml
# .github/workflows/build.yml  
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
    
- name: Install dependencies
  run: bun install
  
- name: Build site
  run: bun run build
```

**Benefits:**

- Faster CI/CD pipelines
- Reduced build costs
- More reliable builds

### Scenario 3: Team Development

**Current Setup:**

```json
// package.json
{
  "scripts": {
    "dev": "unify watch --source src --output dist",
    "build": "unify build --source src --output dist",
    "serve": "unify serve --source dist --port 3000"
  }
}
```

**Migrated Setup:**

```json
// package.json
{
  "engines": {
    "bun": ">=1.2.0",
    "node": ">=14.0.0"
  },
  "scripts": {
    "dev": "bun run unify watch --source src --output dist",
    "build": "bun run unify build --source src --output dist", 
    "serve": "bun run unify serve --source dist --port 3000",
    "dev:node": "node bin/cli.js watch --source src --output dist"
  }
}
```

**Team Benefits:**

- Consistent performance across team
- Backward compatibility maintained
- Optional Node.js fallback

## Advanced Migration Options

### Option 1: Gradual Migration

Keep both runtimes available during transition:

```json
{
  "scripts": {
    "build": "bun run unify build",
    "build:node": "node bin/cli.js build",
    "test:cross": "npm run test:node && bun test"
  }
}
```

### Option 2: Environment-Based Selection

Use different runtimes for different environments:

```bash
# Development (Bun for speed)
if command -v bun >/dev/null 2>&1; then
  bun run unify watch
else
  node bin/cli.js watch
fi

# Production (Node.js for stability)
node bin/cli.js build --minify
```

### Option 3: Docker Migration

**Before:**

```dockerfile
FROM node:18-alpine
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
```

**After:**

```dockerfile
FROM oven/bun:1-alpine
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
RUN bun run build
```

## Compatibility Matrix

| Feature | Node.js | Bun | Status |
|---------|---------|-----|--------|
| HTML Processing | ✅ jsdom | ✅ HTMLRewriter | **Better on Bun** |
| File Watching | ✅ chokidar | ✅ fs.watch | **Better on Bun** |
| HTTP Server | ✅ Node.js http | ✅ Bun.serve | **Better on Bun** |
| Build Caching | ✅ Manual | ✅ Bun.hash | **Better on Bun** |
| Markdown Processing | ✅ markdown-it | ✅ markdown-it | **Same** |
| Frontmatter | ✅ gray-matter | ✅ gray-matter | **Same** |
| Cross-Platform | ✅ All platforms | ✅ All platforms | **Same** |
| Executables | ❌ No | ✅ Native | **Bun only** |

## Troubleshooting Migration

### Issue: "bun: command not found"

**Solution:**

```bash
# Restart your terminal or reload shell config
source ~/.bashrc  # or ~/.zshrc

# Verify PATH includes Bun
echo $PATH | grep -o "[^:]*bun[^:]*"
```

### Issue: Different behavior between runtimes

**Solution:**

Unify CLI maintains API compatibility between runtimes. If you notice differences:

1. Check the verbose output to see which features are being used:

   ```bash
   bun run unify build --verbose
   ```

2. Force Node.js compatibility mode if needed:

   ```bash
   node bin/cli.js build  # Bypasses Bun detection
   ```

3. File an issue with both outputs for comparison

### Issue: Performance not as expected

**Solution:**

1. Verify you're actually using Bun:

   ```bash
   bun run unify build --verbose
   # Should show "Using Bun HTMLRewriter", "Using Bun fs.watch", etc.
   ```

2. Run the performance benchmark:

   ```bash
   bun run test:performance
   ```

3. Check that optional dependencies are properly configured:

   ```bash
   bun install  # Reinstall to ensure proper dependency resolution
   ```

## Rollback Plan

If you need to rollback to Node.js:

1. **Remove Bun** (optional):

   ```bash
   rm -rf ~/.bun  # Remove Bun installation
   ```

2. **Update scripts** to use Node.js:

   ```json
   {
     "scripts": {
       "build": "node bin/cli.js build",
       "dev": "node bin/cli.js watch",
       "serve": "node bin/cli.js serve"
     }
   }
   ```

3. **Reinstall Node.js dependencies**:

   ```bash
   npm install  # Ensure chokidar and jsdom are available
   ```

The CLI will automatically detect Node.js and use the traditional implementations.

## Next Steps

After successful migration:

1. **Update Documentation**: Update your project's README and build instructions
2. **Team Training**: Share the performance benefits with your team
3. **CI/CD Updates**: Update your deployment pipelines to use Bun
4. **Monitoring**: Monitor build times and performance improvements
5. **Feedback**: Share your experience and any issues you encounter

## Getting Help

- **Documentation**: Check [docs/bun-support.md](bun-support.md) for detailed Bun integration info
- **Issues**: Report migration problems on [GitHub Issues](https://github.com/dompile/cli/issues)
- **Performance**: Run `bun run test:performance` to verify improvements
- **Community**: Join discussions about Bun optimization and best practices
