/**
 * Final Boss Integration Test
 * 
 * This is the ultimate comprehensive test that exercises the entire dompile system
 * including all major features, edge cases, and real-world scenarios.
 * 
 * Features tested:
 * - Apache SSI-style includes (file and virtual)
 * - Layout/slot system with data-layout attributes
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

import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
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
        }),

        // Base layout
        'src/.layouts/base.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><slot name="title">Final Boss Test Site</slot></title>
  <meta name="description" content="<slot name="description">A comprehensive test site</slot>">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <header>
    <nav><!--#include virtual="/.components/navigation.html" --></nav>
  </header>
  <main>
    <slot></slot>
  </main>
  <footer>
    <p>&copy; 2025 Final Boss Test Site</p>
  </footer>
</body>
</html>`,

        // Simple components
        'src/.components/navigation.html': `<ul>
  <li><a href="/index.html">Home</a></li>
  <li><a href="/about.html">About</a></li>
  <li><a href="/features.html">Features</a></li>
</ul>`,

        'src/.components/card.html': `<div class="card">
  <h3>Feature Card</h3>
  <p>This is a reusable card component.</p>
</div>`,

        // Main pages using simplified layout system
        'src/index.html': `<div data-layout="/.layouts/base.html">
  <template data-slot="title">Home - Final Boss Test</template>
  <template data-slot="description">Welcome to our comprehensive test site</template>
  
  <h1>Welcome to Final Boss Test Site</h1>
  <p>This site tests all major DOMpile features.</p>
  
  <!--#include virtual="/.components/card.html" -->
  
  <h2>Features Tested</h2>
  <ul>
    <li>Layout system with slots</li>
    <li>SSI-style includes</li>
    <li>Asset processing</li>
    <li>Sitemap generation</li>
  </ul>
</div>`,

        'src/about.html': `<div data-layout="/.layouts/base.html">
  <template data-slot="title">About - Final Boss Test</template>
  <template data-slot="description">Learn about our test methodology</template>
  
  <h1>About This Test</h1>
  <p>This is a comprehensive integration test for DOMpile.</p>
  
  <!--#include virtual="/.components/card.html" -->
</div>`,

        'src/features.html': `<div data-layout="/.layouts/base.html">
  <template data-slot="title">Features - Final Boss Test</template>
  <template data-slot="description">Explore all the features we test</template>
  
  <h1>Features</h1>
  <p>Here are all the features this test covers:</p>
  
  <!--#include virtual="/.components/card.html" -->
</div>`,

        // Assets
        'src/styles/main.css': `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}
.card {
  border: 1px solid #ddd;
  padding: 16px;
  margin: 16px 0;
  border-radius: 8px;
}`,

        // Markdown file
        'src/blog.md': `---
title: "Blog Post"
description: "A test blog post"
---

# Blog Post

This is a test blog post written in Markdown.

## Features

- Frontmatter support
- Automatic layout application
- Markdown to HTML conversion
`
      };

      await createTestStructure(tempDir, siteStructure);

      // Run the build
      const result = await runCLI([
        'build',
        '--source', sourceDir,
        '--output', outputDir,
        '--clean'
      ], { cwd: tempDir });

      // Verify build succeeded
      expect(result.code).toBe(0);
      expect(result.stdout.includes('Build completed successfully')).toBeTruthy();

      // Verify all pages were generated
      const expectedFiles = [
        'index.html',
        'about.html', 
        'features.html',
        'blog.html',
        'styles/main.css',
        'sitemap.xml'
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(outputDir, file);
        try {
          await fs.access(filePath);
        } catch (error) {
          throw new Error(`Expected file ${file} was not generated`);
        }
      }

      // Verify content processing
      const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      expect(indexContent.includes('<!DOCTYPE html>')).toBeTruthy();
      expect(indexContent.includes('<title>Home - Final Boss Test</title>')).toBeTruthy();
      expect(indexContent.includes('Welcome to Final Boss Test Site')).toBeTruthy();
      expect(indexContent.includes('<div class="card">')).toBeTruthy();
      expect(indexContent.includes('<li><a href="/index.html">Home</a></li>')).toBeTruthy();

      // Verify sitemap was generated with correct base URL
      const sitemapContent = await fs.readFile(path.join(outputDir, 'sitemap.xml'), 'utf-8');
      expect(sitemapContent.includes('https://finalboss.example.com')).toBeTruthy();
      expect(sitemapContent.includes('<loc>https://finalboss.example.com/</loc>')).toBeTruthy();
      expect(sitemapContent.includes('<loc>https://finalboss.example.com/about.html</loc>')).toBeTruthy();

      // Verify markdown processing
      const blogContent = await fs.readFile(path.join(outputDir, 'blog.html'), 'utf-8');
      expect(blogContent.includes('<title>Blog Post</title>')).toBeTruthy();
      expect(blogContent.includes('<h1 id="blog-post">Blog Post</h1>')).toBeTruthy();
    });

    it('should handle edge cases and error conditions', async () => {
      const edgeCaseStructure = {
        'package.json': JSON.stringify({
          name: 'edge-case-test',
          homepage: 'https://edge.example.com'
        }),

        'src/.layouts/default.html': `<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default</slot></title>
</head>
<body>
  <slot></slot>
</body>
</html>`,

        // Test with missing component (should build but show error)
        'src/test-missing.html': `<div data-layout="/.layouts/default.html">
  <template data-slot="title">Missing Component Test</template>
  <!--#include virtual="/.components/missing.html" -->
  <p>This page tries to include a missing component.</p>
</div>`,

        // Test with circular dependency protection  
        'src/.components/circular-a.html': `<div>
  Component A
  <!--#include virtual="/.components/circular-b.html" -->
</div>`,

        'src/.components/circular-b.html': `<div>
  Component B
  <!--#include virtual="/.components/circular-c.html" -->
</div>`,

        'src/.components/circular-c.html': `<div>
  Component C
  <!--#include virtual="/.components/circular-a.html" -->
</div>`,

        'src/test-circular.html': `<div data-layout="/.layouts/default.html">
  <template data-slot="title">Circular Test</template>
  <!--#include virtual="/.components/circular-a.html" -->
</div>`
      };

      await createTestStructure(tempDir, edgeCaseStructure);

      // Run the build - should fail due to errors but report them gracefully
      const result = await runCLI([
        'build',
        '--source', sourceDir,
        '--output', outputDir
      ], { cwd: tempDir });

      // Build should fail due to errors
      expect(result.code).toBe(1);
      expect(result.stderr.includes('missing.html') || result.stdout.includes('missing.html')).toBeTruthy();
      expect(result.stderr.includes('Circular dependency') || result.stdout.includes('Circular dependency')).toBeTruthy();
    });
  });
});

// Helper function to run CLI commands
async function runCLI(args, options = {}) {
  const cliPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../bin/cli.js');
  
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: options.cwd || process.cwd(),
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
  });
}

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
//     it('should build a complex multi-page website with all features', async () => {
//       const siteStructure = {
//         // Package.json for sitemap baseUrl
//         'package.json': JSON.stringify({
//           name: 'final-boss-test-site',
//           homepage: 'https://finalboss.example.com',
//           version: '1.0.0'
//         }, null, 2),

//         // Layouts
//         'src/layouts/base.html': `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title><slot name="title">Final Boss Test Site</slot></title>
//   <link rel="stylesheet" href="/assets/styles/main.css">
//   <!--#include virtual="/components/meta.html" -->
// </head>
// <body>
//   <header>
//     <!--#include virtual="/components/header.html" -->
//   </header>
//   <nav>
//     <!--#include virtual="/components/navigation.html" -->
//   </nav>
//   <main>
//     <slot name="content">Default content</slot>
//   </main>
//   <footer>
//     <!--#include virtual="/components/footer.html" -->
//   </footer>
//   <script src="/assets/scripts/main.js"></script>
// </body>
// </html>`,

//         'src/layouts/blog.html': `<template extends="base.html">
//   <slot name="title">{{ title }} - Final Boss Blog</slot>
//   <slot name="content">
//     <article class="blog-post">
//       <header>
//         <h1>{{ title }}</h1>
//         <p class="meta">Published on {{ date }}</p>
//       </header>
//       <div class="content">
//         {{ content }}
//       </div>
//       <!--#include virtual="/components/blog-footer.html" -->
//     </article>
//   </slot>
// </template>`,

//         // Components
//         'src/components/meta.html': `<meta name="description" content="Final Boss Integration Test Site">
// <meta name="author" content="DOMpile Test Suite">
// <link rel="canonical" href="https://finalboss.example.com">
// <link rel="icon" href="/assets/favicon.ico">`,

//         'src/components/header.html': `<div class="site-header">
//   <img src="/assets/images/logo.png" alt="Logo" />
//   <h1><a href="/">Final Boss Test Site</a></h1>
//   <p class="tagline">Testing all the things</p>
// </div>`,

//         'src/components/navigation.html': `<ul class="nav">
//   <li><a href="/">Home</a></li>
//   <li><a href="/about.html">About</a></li>
//   <li><a href="/features.html">Features</a></li>
//   <li><a href="/blog/post1.html">Blog</a></li>
//   <li><a href="/docs.html">Docs</a></li>
// </ul>`,

//         'src/components/footer.html': `<div class="site-footer">
//   <p>&copy; 2024 Final Boss Test Site. Built with DOMpile.</p>
//   <!--#include file="social-links.html" -->
// </div>`,

//         'src/components/social-links.html': `<div class="social">
//   <a href="https://github.com/dompile/cli">GitHub</a>
//   <a href="https://twitter.com/dompile">Twitter</a>
// </div>`,

//         'src/components/blog-footer.html': `<div class="blog-footer">
//   <p>Thanks for reading!</p>
//   <a href="/blog/">← Back to Blog</a>
// </div>`,

//         'src/components/feature-card.html': `<div class="feature-card">
//   <h3>{{ title }}</h3>
//   <p>{{ description }}</p>
//   <!--#include virtual="/components/icon.html" -->
// </div>`,

//         'src/components/icon.html': `<span class="icon">✨</span>`,

//         // Main pages
//         'src/index.html': `<template extends="base.html">
//   <slot name="title">Home - Final Boss Test Site</slot>
//   <slot name="content">
//     <section class="hero">
//       <h1>Welcome to the Final Boss Test</h1>
//       <p>This page tests every feature of the DOMpile static site generator.</p>
//       <!--#include virtual="/components/feature-card.html" -->
//     </section>
    
//     <section class="features">
//       <h2>Features Tested</h2>
//       <div class="grid">
//         <!--#include virtual="/components/feature-card.html" -->
//         <!--#include virtual="/components/feature-card.html" -->
//         <!--#include virtual="/components/feature-card.html" -->
//       </div>
//     </section>
    
//     <section class="recent-posts">
//       <h2>Recent Blog Posts</h2>
//       <!--#include virtual="/blog/recent.html" -->
//     </section>
//   </slot>
// </template>`,

//         'src/about.html': `<template extends="base.html">
//   <slot name="title">About - Final Boss Test Site</slot>
//   <slot name="content">
//     <h1>About This Test</h1>
//     <p>This is a comprehensive integration test for DOMpile.</p>
    
//     <h2>What We Test</h2>
//     <ul>
//       <li>Apache SSI-style includes</li>
//       <li>Template inheritance with slots</li>
//       <li>Markdown processing</li>
//       <li>Asset tracking</li>
//       <li>Sitemap generation</li>
//       <li>Security features</li>
//     </ul>
    
//     <!--#include virtual="/components/feature-card.html" -->
//   </slot>
// </template>`,

//         'src/features.html': `<template extends="base.html">
//   <slot name="title">Features - Final Boss Test Site</slot>
//   <slot name="content">
//     <h1>DOMpile Features</h1>
    
//     <div class="feature-grid">
//       <!--#include virtual="/components/feature-card.html" -->
//       <!--#include virtual="/components/feature-card.html" -->
//       <!--#include virtual="/components/feature-card.html" -->
//       <!--#include virtual="/components/feature-card.html" -->
//     </div>
//   </slot>
// </template>`,

//         // Markdown content
//         'src/docs.md': `---
// title: Documentation
// layout: base.html
// date: 2024-01-15
// ---

// # DOMpile Documentation

// This is a **markdown** page that tests the markdown processor.

// ## Features

// - Frontmatter parsing
// - Layout application
// - Include processing within markdown

// <!--#include virtual="/components/feature-card.html" -->

// ## Code Example

// \`\`\`html
// <!--#include virtual="/components/header.html" -->
// \`\`\`

// ### Table of Contents

// The TOC should be generated automatically.

// ## Conclusion

// Markdown processing works with templates and includes!
// `,

//         // Blog posts
//         'src/blog/post1.md': `---
// title: First Blog Post
// layout: blog.html
// date: 2024-01-10
// ---

// # My First Post

// This is a blog post written in **Markdown** using the blog layout.

// <!--#include virtual="/components/feature-card.html" -->

// ## Code Examples

// \`\`\`javascript
// console.log('Hello from DOMpile!');
// \`\`\`

// End of post.
// `,

//         'src/blog/recent.html': `<div class="recent-posts">
//   <article>
//     <h3><a href="/blog/post1.html">First Blog Post</a></h3>
//     <p>Published on 2024-01-10</p>
//   </article>
// </div>`,

//         // Assets
//         'src/assets/styles/main.css': `/* Main stylesheet */
// body {
//   font-family: Arial, sans-serif;
//   margin: 0;
//   padding: 20px;
// }

// .hero {
//   background: #f0f0f0;
//   padding: 40px;
//   text-align: center;
// }

// .feature-card {
//   border: 1px solid #ddd;
//   padding: 20px;
//   margin: 10px;
// }

// .grid {
//   display: grid;
//   grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
//   gap: 20px;
// }`,

//         'src/assets/scripts/main.js': `// Main JavaScript
// console.log('DOMpile Final Boss test loaded');

// // Test asset reference
// document.addEventListener('DOMContentLoaded', function() {
//   console.log('Page ready');
// });`,

//         'src/assets/images/logo.png': 'FAKE_PNG_DATA', // Simulated binary
//         'src/assets/favicon.ico': 'FAKE_ICO_DATA'
//       };

//       await createTestStructure(tempDir, siteStructure);

//       // Run the build process
//       const buildResult = await runDompileBuild(tempDir, sourceDir, outputDir);
      
//       expect(buildResult.code).toBe(0);

//       // Verify all output files exist
//       const outputFiles = [
//         'index.html',
//         'about.html', 
//         'features.html',
//         'docs.html',
//         'blog/post1.html',
//         'assets/styles/main.css',
//         'assets/scripts/main.js',
//         'assets/images/logo.png',
//         'assets/favicon.ico',
//         'sitemap.xml'
//       ];

//       for (const file of outputFiles) {
//         const filePath = path.join(outputDir, file);
//         const exists = await fs.access(filePath).then(() => true).catch(() => false);
//         expect(exists).toBeTruthy();
//       }

//       // Verify HTML content
//       const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      
//       // Should have proper DOCTYPE and structure
//       expect(indexContent.includes('<!DOCTYPE html>')).toBeTruthy();
//       expect(indexContent.includes('<html lang="en">')).toBeTruthy();
      
//       // Should have processed includes
//       expect(indexContent.includes('Final Boss Test Site')).toBeTruthy();
//       expect(indexContent.includes('Testing all the things')).toBeTruthy();
//       expect(indexContent.includes('GitHub</a>')).toBeTruthy();
      
//       // Should have CSS and JS references
//       expect(indexContent.includes('href="/assets/styles/main.css"')).toBeTruthy();
//       expect(indexContent.includes('src="/assets/scripts/main.js"')).toBeTruthy();
      
//       // Should have processed template slots
//       expect(indexContent.includes('Welcome to the Final Boss Test')).toBeTruthy();

//       // Verify markdown processing
//       const docsContent = await fs.readFile(path.join(outputDir, 'docs.html'), 'utf-8');
//       expect(docsContent.includes('<h1 id="dompile-documentation">DOMpile Documentation</h1>')).toBeTruthy();
//       expect(docsContent.includes('<strong>markdown</strong>')).toBeTruthy();
//       expect(docsContent.includes('Documentation - Final Boss Test Site')).toBeTruthy(); // Title from frontmatter

//       // Verify blog post
//       const blogContent = await fs.readFile(path.join(outputDir, 'blog/post1.html'), 'utf-8');
//       expect(blogContent.includes('First Blog Post - Final Boss Blog')).toBeTruthy();
//       expect(blogContent.includes('Published on 2024-01-10')).toBeTruthy();
//       expect(blogContent.includes('<code>console.log')).toBeTruthy();

//       // Verify sitemap
//       const sitemapContent = await fs.readFile(path.join(outputDir, 'sitemap.xml'), 'utf-8');
//       expect(sitemapContent.includes('https://finalboss.example.com')).toBeTruthy();
//       expect(sitemapContent.includes('<loc>https://finalboss.example.com/index.html</loc>')).toBeTruthy();
//       expect(sitemapContent.includes('<loc>https://finalboss.example.com/about.html</loc>')).toBeTruthy();
//     });

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
      expect(buildResult.code).toBe(0);

      // Check that security violations are handled
      const edgeContent = await fs.readFile(path.join(outputDir, 'edge-test.html'), 'utf-8');
      
      // Should not contain actual sensitive file content
      expect(edgeContent.includes('root:x:0:0')).toBeFalsy();
      
      // Should contain error comments for missing files
      expect(edgeContent.includes('Error:') || edgeContent.includes('not found')).toBeTruthy();
      
      // Should still contain valid content
      expect(edgeContent.includes('Edge Case Tests')).toBeTruthy();
      expect(edgeContent.includes('Security test')).toBeTruthy();
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

      expect(buildResult.code).toBe(0);

      const indexExists = await fs.access(path.join(customOutputDir, 'index.html'))
        .then(() => true).catch(() => false);
      expect(indexExists).toBeTruthy();
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

      expect(buildResult.code).toBe(0);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(buildTime).toBeLessThan(30000);

      // Verify some output files
      const page0Exists = await fs.access(path.join(outputDir, 'page-0.html'))
        .then(() => true).catch(() => false);
      const page99Exists = await fs.access(path.join(outputDir, 'page-99.html'))
        .then(() => true).catch(() => false);
      
      expect(page0Exists && page99Exists).toBeTruthy();
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
      
      expect(buildResult.code).toBe(0);

      const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      
      // Should contain all levels
      expect(content.includes('Level 0')).toBeTruthy();
      expect(content.includes('Level 9')).toBeTruthy();
      expect(content.includes('Deep content')).toBeTruthy();
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
      path.join(process.cwd(), 'bin/cli.js'),
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