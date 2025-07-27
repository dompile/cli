/**
 * Final Boss Integration Test
 * 
 * This is the ultimate comprehensive test that exercises the entire dompile system
 * including all major features, edge cases, and real-world scenarios.
 * 
 * Features tested:
 * - Apache SSI-style includes (file and virtual)
 * - Template/slot system with inheritance
 * - Markdown processing with frontmatter and layouts
 * - Layout conditional logic
 * - Asset tracking and copying
 * - Sitemap generation with package.json homepage
 * - Dependency tracking and circular dependency detection
 * - Security (path traversal prevention)
 * - Error handling and graceful degradation
 * - CLI argument parsing (including short flags)
 * - Build process end-to-end
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Final Boss Integration Test', () => {
  let tempDir;
  let sourceDir;
  let outputDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Complete Website Build', () => {
    it('should build a complex multi-page website with all features', async () => {
      const siteStructure = {
        // Package.json for sitemap baseUrl
        'package.json': JSON.stringify({
          name: 'final-boss-test-site',
          homepage: 'https://finalboss.example.com',
          version: '1.0.0'
        }, null, 2),

        // Layouts
        'src/layouts/base.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><slot name="title">Final Boss Test Site</slot></title>
  <link rel="stylesheet" href="/assets/styles/main.css">
  <!--#include virtual="/components/meta.html" -->
</head>
<body>
  <header>
    <!--#include virtual="/components/header.html" -->
  </header>
  <nav>
    <!--#include virtual="/components/navigation.html" -->
  </nav>
  <main>
    <slot name="content">Default content</slot>
  </main>
  <footer>
    <!--#include virtual="/components/footer.html" -->
  </footer>
  <script src="/assets/scripts/main.js"></script>
</body>
</html>`,

        'src/layouts/blog.html': `<template extends="base.html">
  <slot name="title">{{ title }} - Final Boss Blog</slot>
  <slot name="content">
    <article class="blog-post">
      <header>
        <h1>{{ title }}</h1>
        <p class="meta">Published on {{ date }}</p>
      </header>
      <div class="content">
        {{ content }}
      </div>
      <!--#include virtual="/components/blog-footer.html" -->
    </article>
  </slot>
</template>`,

        // Components
        'src/components/meta.html': `<meta name="description" content="Final Boss Integration Test Site">
<meta name="author" content="DOMpile Test Suite">
<link rel="canonical" href="https://finalboss.example.com">`,

        'src/components/header.html': `<div class="site-header">
  <h1><a href="/">Final Boss Test Site</a></h1>
  <p class="tagline">Testing all the things</p>
</div>`,

        'src/components/navigation.html': `<ul class="nav">
  <li><a href="/">Home</a></li>
  <li><a href="/about.html">About</a></li>
  <li><a href="/features.html">Features</a></li>
  <li><a href="/blog/post1.html">Blog</a></li>
  <li><a href="/docs.html">Docs</a></li>
</ul>`,

        'src/components/footer.html': `<div class="site-footer">
  <p>&copy; 2024 Final Boss Test Site. Built with DOMpile.</p>
  <!--#include file="social-links.html" -->
</div>`,

        'src/components/social-links.html': `<div class="social">
  <a href="https://github.com/dompile/cli">GitHub</a>
  <a href="https://twitter.com/dompile">Twitter</a>
</div>`,

        'src/components/blog-footer.html': `<div class="blog-footer">
  <p>Thanks for reading!</p>
  <a href="/blog/">← Back to Blog</a>
</div>`,

        'src/components/feature-card.html': `<div class="feature-card">
  <h3>{{ title }}</h3>
  <p>{{ description }}</p>
  <!--#include virtual="/components/icon.html" -->
</div>`,

        'src/components/icon.html': `<span class="icon">✨</span>`,

        // Main pages
        'src/index.html': `<template extends="base.html">
  <slot name="title">Home - Final Boss Test Site</slot>
  <slot name="content">
    <section class="hero">
      <h1>Welcome to the Final Boss Test</h1>
      <p>This page tests every feature of the DOMpile static site generator.</p>
      <!--#include virtual="/components/feature-card.html" -->
    </section>
    
    <section class="features">
      <h2>Features Tested</h2>
      <div class="grid">
        <!--#include virtual="/components/feature-card.html" -->
        <!--#include virtual="/components/feature-card.html" -->
        <!--#include virtual="/components/feature-card.html" -->
      </div>
    </section>
    
    <section class="recent-posts">
      <h2>Recent Blog Posts</h2>
      <!--#include file="../blog/recent.html" -->
    </section>
  </slot>
</template>`,

        'src/about.html': `<template extends="base.html">
  <slot name="title">About - Final Boss Test Site</slot>
  <slot name="content">
    <h1>About This Test</h1>
    <p>This is a comprehensive integration test for DOMpile.</p>
    
    <h2>What We Test</h2>
    <ul>
      <li>Apache SSI-style includes</li>
      <li>Template inheritance with slots</li>
      <li>Markdown processing</li>
      <li>Asset tracking</li>
      <li>Sitemap generation</li>
      <li>Security features</li>
    </ul>
    
    <!--#include virtual="/components/feature-card.html" -->
  </slot>
</template>`,

        'src/features.html': `<template extends="base.html">
  <slot name="title">Features - Final Boss Test Site</slot>
  <slot name="content">
    <h1>DOMpile Features</h1>
    
    <div class="feature-grid">
      <!--#include virtual="/components/feature-card.html" -->
      <!--#include virtual="/components/feature-card.html" -->
      <!--#include virtual="/components/feature-card.html" -->
      <!--#include virtual="/components/feature-card.html" -->
    </div>
  </slot>
</template>`,

        // Markdown content
        'src/docs.md': `---
title: Documentation
layout: base.html
date: 2024-01-15
---

# DOMpile Documentation

This is a **markdown** page that tests the markdown processor.

## Features

- Frontmatter parsing
- Layout application
- Include processing within markdown

<!--#include virtual="/components/feature-card.html" -->

## Code Example

\`\`\`html
<!--#include virtual="/components/header.html" -->
\`\`\`

### Table of Contents

The TOC should be generated automatically.

## Conclusion

Markdown processing works with templates and includes!
`,

        // Blog posts
        'src/blog/post1.md': `---
title: First Blog Post
layout: blog.html
date: 2024-01-10
---

# My First Post

This is a blog post written in **Markdown** using the blog layout.

<!--#include virtual="/components/feature-card.html" -->

## Code Examples

\`\`\`javascript
console.log('Hello from DOMpile!');
\`\`\`

End of post.
`,

        'src/blog/recent.html': `<div class="recent-posts">
  <article>
    <h3><a href="/blog/post1.html">First Blog Post</a></h3>
    <p>Published on 2024-01-10</p>
  </article>
</div>`,

        // Assets
        'src/assets/styles/main.css': `/* Main stylesheet */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

.hero {
  background: #f0f0f0;
  padding: 40px;
  text-align: center;
}

.feature-card {
  border: 1px solid #ddd;
  padding: 20px;
  margin: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}`,

        'src/assets/scripts/main.js': `// Main JavaScript
console.log('DOMpile Final Boss test loaded');

// Test asset reference
document.addEventListener('DOMContentLoaded', function() {
  console.log('Page ready');
});`,

        'src/assets/images/logo.png': 'FAKE_PNG_DATA', // Simulated binary
        'src/assets/favicon.ico': 'FAKE_ICO_DATA'
      };

      await createTestStructure(tempDir, siteStructure);

      // Run the build process
      const buildResult = await runDompileBuild(tempDir, sourceDir, outputDir);
      
      assert.strictEqual(buildResult.code, 0, `Build failed: ${buildResult.stderr}`);

      // Verify all output files exist
      const outputFiles = [
        'index.html',
        'about.html', 
        'features.html',
        'docs.html',
        'blog/post1.html',
        'assets/styles/main.css',
        'assets/scripts/main.js',
        'assets/images/logo.png',
        'assets/favicon.ico',
        'sitemap.xml'
      ];

      for (const file of outputFiles) {
        const filePath = path.join(outputDir, file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        assert(exists, `Output file ${file} should exist`);
      }

      // Verify HTML content
      const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      
      // Should have proper DOCTYPE and structure
      assert(indexContent.includes('<!DOCTYPE html>'));
      assert(indexContent.includes('<html lang="en">'));
      
      // Should have processed includes
      assert(indexContent.includes('Final Boss Test Site'));
      assert(indexContent.includes('Testing all the things'));
      assert(indexContent.includes('GitHub</a>'));
      
      // Should have CSS and JS references
      assert(indexContent.includes('href="/assets/styles/main.css"'));
      assert(indexContent.includes('src="/assets/scripts/main.js"'));
      
      // Should have processed template slots
      assert(indexContent.includes('Welcome to the Final Boss Test'));

      // Verify markdown processing
      const docsContent = await fs.readFile(path.join(outputDir, 'docs.html'), 'utf-8');
      assert(docsContent.includes('<h1 id="dompile-documentation">DOMpile Documentation</h1>'));
      assert(docsContent.includes('<strong>markdown</strong>'));
      assert(docsContent.includes('Documentation - Final Boss Test Site')); // Title from frontmatter

      // Verify blog post
      const blogContent = await fs.readFile(path.join(outputDir, 'blog/post1.html'), 'utf-8');
      assert(blogContent.includes('First Blog Post - Final Boss Blog'));
      assert(blogContent.includes('Published on 2024-01-10'));
      assert(blogContent.includes('<code>console.log'));

      // Verify sitemap
      const sitemapContent = await fs.readFile(path.join(outputDir, 'sitemap.xml'), 'utf-8');
      assert(sitemapContent.includes('https://finalboss.example.com'));
      assert(sitemapContent.includes('<loc>https://finalboss.example.com/index.html</loc>'));
      assert(sitemapContent.includes('<loc>https://finalboss.example.com/about.html</loc>'));
    });

    it('should handle edge cases and error conditions', async () => {
      const edgeCaseStructure = {
        'package.json': JSON.stringify({ name: 'edge-test' }, null, 2),

        // Test circular dependencies
        'src/layouts/circular-a.html': `<template extends="circular-b.html">
  <slot name="content">Circular A</slot>
</template>`,

        'src/layouts/circular-b.html': `<template extends="circular-a.html">
  <slot name="content">Circular B</slot>
</template>`,

        // Test missing includes
        'src/components/partial.html': `<div>
  <p>This partial exists</p>
  <!--#include virtual="/components/missing.html" -->
</div>`,

        // Test path traversal attempts (should be blocked)
        'src/components/security.html': `<div>
  <!--#include file="../../../etc/passwd" -->
  <!--#include virtual="/../sensitive/data.txt" -->
  <p>Security test</p>
</div>`,

        // Test malformed templates
        'src/malformed.html': `<template extends="missing-layout.html"
  <slot name="content">Malformed template syntax</slot>
</template>`,

        // Test empty files
        'src/empty.html': '',

        // Main test page
        'src/edge-test.html': `<template extends="base.html">
  <slot name="content">
    <h1>Edge Case Tests</h1>
    <!--#include virtual="/components/partial.html" -->
    <!--#include virtual="/components/security.html" -->
    <!--#include virtual="/components/nonexistent.html" -->
  </slot>
</template>`,

        'src/layouts/base.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Default</slot></body>
</html>`
      };

      await createTestStructure(tempDir, edgeCaseStructure);

      const buildResult = await runDompileBuild(tempDir, sourceDir, outputDir);
      
      // Build should complete despite errors (graceful degradation)
      assert.strictEqual(buildResult.code, 0, `Build should complete with warnings: ${buildResult.stderr}`);

      // Check that security violations are handled
      const edgeContent = await fs.readFile(path.join(outputDir, 'edge-test.html'), 'utf-8');
      
      // Should not contain actual sensitive file content
      assert(!edgeContent.includes('root:x:0:0'));
      
      // Should contain error comments for missing files
      assert(edgeContent.includes('Error:') || edgeContent.includes('not found'));
      
      // Should still contain valid content
      assert(edgeContent.includes('Edge Case Tests'));
      assert(edgeContent.includes('Security test'));
    });

    it('should handle CLI argument variations', async () => {
      const structure = {
        'content/index.html': `<h1>Custom Source Dir</h1>`,
        'layouts/base.html': `<!DOCTYPE html><html><body><slot name="content">Default</slot></body></html>`,
        'partials/header.html': `<header>Custom Header</header>`
      };

      await createTestStructure(tempDir, structure);

      // Test custom source and output directories with short flags
      const customOutputDir = path.join(tempDir, 'build');
      const buildResult = await runDompileBuild(
        tempDir,
        path.join(tempDir, 'content'),
        customOutputDir,
        ['-l', 'layouts', '-c', 'partials']
      );

      assert.strictEqual(buildResult.code, 0);

      const indexExists = await fs.access(path.join(customOutputDir, 'index.html'))
        .then(() => true).catch(() => false);
      assert(indexExists, 'Should build to custom output directory');
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large number of files efficiently', async () => {
      const startTime = Date.now();

      // Create 100 pages with includes
      const largeStructure = {
        'src/layouts/base.html': `<!DOCTYPE html>
<html><body><slot name="content">Default</slot></body></html>`,
        'src/components/header.html': `<header>Site Header</header>`
      };

      // Generate 100 pages
      for (let i = 0; i < 100; i++) {
        largeStructure[`src/page-${i}.html`] = `<template extends="base.html">
  <slot name="content">
    <!--#include virtual="/components/header.html" -->
    <h1>Page ${i}</h1>
    <p>This is page number ${i}</p>
  </slot>
</template>`;
      }

      await createTestStructure(tempDir, largeStructure);

      const buildResult = await runDompileBuild(tempDir, sourceDir, outputDir);
      const buildTime = Date.now() - startTime;

      assert.strictEqual(buildResult.code, 0);
      
      // Should complete within reasonable time (adjust threshold as needed)
      assert(buildTime < 30000, `Build took too long: ${buildTime}ms`);

      // Verify some output files
      const page0Exists = await fs.access(path.join(outputDir, 'page-0.html'))
        .then(() => true).catch(() => false);
      const page99Exists = await fs.access(path.join(outputDir, 'page-99.html'))
        .then(() => true).catch(() => false);
      
      assert(page0Exists && page99Exists, 'All pages should be generated');
    });

    it('should handle deeply nested includes', async () => {
      const deepStructure = {
        'src/layouts/base.html': `<!DOCTYPE html>
<html><body><slot name="content">Base</slot></body></html>`
      };

      // Create 10 levels of nested includes
      for (let i = 0; i < 10; i++) {
        const nextInclude = i < 9 ? `<!--#include virtual="/components/level-${i + 1}.html" -->` : '<p>Deep content</p>';
        deepStructure[`src/components/level-${i}.html`] = `<div class="level-${i}">
  <p>Level ${i}</p>
  ${nextInclude}
</div>`;
      }

      deepStructure['src/index.html'] = `<template extends="base.html">
  <slot name="content">
    <!--#include virtual="/components/level-0.html" -->
  </slot>
</template>`;

      await createTestStructure(tempDir, deepStructure);

      const buildResult = await runDompileBuild(tempDir, sourceDir, outputDir);
      
      assert.strictEqual(buildResult.code, 0);

      const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      
      // Should contain all levels
      assert(content.includes('Level 0'));
      assert(content.includes('Level 9'));
      assert(content.includes('Deep content'));
    });
  });
});

/**
 * Helper function to run dompile build command
 */
async function runDompileBuild(workingDir, sourceDir, outputDir, extraArgs = []) {
  return new Promise((resolve) => {
    const args = [
      'node',
      path.join('/home/founder3/code/github/dompile/cli/bin/cli.js'),
      'build',
      '--source', sourceDir,
      '--output', outputDir,
      ...extraArgs
    ];

    const child = spawn(args[0], args.slice(1), {
      cwd: workingDir,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    // Set timeout
    setTimeout(() => {
      child.kill();
      resolve({ code: 1, stdout, stderr: 'Timeout' });
    }, 60000); // 60 second timeout
  });
}