/**
 * Asset Handling Unit Tests
 * Tests for proper copying of assets and exclusion of layout/component files
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { build } from '../../src/core/file-processor.js';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Asset Handling', () => {
  let tempDir, sourceDir, outputDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Asset Copying', () => {
    it('should copy referenced image files to output', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <img src="/assets/logo.png" alt="Logo">
  <img src="/images/photo.jpg" alt="Photo">
</body>
</html>`,
        'src/assets/logo.png': 'FAKE_PNG_DATA',
        'src/images/photo.jpg': 'FAKE_JPG_DATA',
        'src/images/unused.gif': 'UNUSED_IMAGE_DATA'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Referenced images should be copied
      const logoExists = await fs.access(path.join(outputDir, 'assets/logo.png'))
        .then(() => true).catch(() => false);
      const photoExists = await fs.access(path.join(outputDir, 'images/photo.jpg'))
        .then(() => true).catch(() => false);
      
      assert(logoExists, 'Referenced logo.png should be copied');
      assert(photoExists, 'Referenced photo.jpg should be copied');

      // Unreferenced images should NOT be copied (asset tracking should work)
      const unusedExists = await fs.access(path.join(outputDir, 'images/unused.gif'))
        .then(() => true).catch(() => false);
      assert(!unusedExists, 'Unreferenced unused.gif should NOT be copied');
    });

    it('should copy CSS files referenced in HTML', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="stylesheet" href="/css/theme.css">
</head>
<body><h1>Test</h1></body>
</html>`,
        'src/styles/main.css': 'body { margin: 0; }',
        'src/css/theme.css': '.theme { color: blue; }',
        'src/css/unused.css': '.unused { display: none; }'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Referenced CSS should be copied
      const mainCssExists = await fs.access(path.join(outputDir, 'styles/main.css'))
        .then(() => true).catch(() => false);
      const themeCssExists = await fs.access(path.join(outputDir, 'css/theme.css'))
        .then(() => true).catch(() => false);
      
      assert(mainCssExists, 'Referenced main.css should be copied');
      assert(themeCssExists, 'Referenced theme.css should be copied');

      // Unreferenced CSS should NOT be copied
      const unusedCssExists = await fs.access(path.join(outputDir, 'css/unused.css'))
        .then(() => true).catch(() => false);
      assert(!unusedCssExists, 'Unreferenced unused.css should NOT be copied');
    });

    it('should copy JavaScript files referenced in HTML', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test</h1>
  <script src="/js/main.js"></script>
  <script src="/scripts/app.js"></script>
</body>
</html>`,
        'src/js/main.js': 'console.log("main");',
        'src/scripts/app.js': 'console.log("app");',
        'src/js/unused.js': 'console.log("unused");'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Referenced JS should be copied
      const mainJsExists = await fs.access(path.join(outputDir, 'js/main.js'))
        .then(() => true).catch(() => false);
      const appJsExists = await fs.access(path.join(outputDir, 'scripts/app.js'))
        .then(() => true).catch(() => false);
      
      assert(mainJsExists, 'Referenced main.js should be copied');
      assert(appJsExists, 'Referenced app.js should be copied');

      // Unreferenced JS should NOT be copied
      const unusedJsExists = await fs.access(path.join(outputDir, 'js/unused.js'))
        .then(() => true).catch(() => false);
      assert(!unusedJsExists, 'Unreferenced unused.js should NOT be copied');
    });

    it('should handle various asset file types', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head>
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/fonts/custom.woff2">
</head>
<body>
  <img src="/images/logo.svg" alt="SVG Logo">
  <video src="/media/video.mp4" controls></video>
  <audio src="/media/audio.mp3" controls></audio>
</body>
</html>`,
        'src/favicon.ico': 'FAKE_ICO_DATA',
        'src/fonts/custom.woff2': 'FAKE_FONT_DATA',
        'src/images/logo.svg': '<svg>FAKE_SVG</svg>',
        'src/media/video.mp4': 'FAKE_VIDEO_DATA',
        'src/media/audio.mp3': 'FAKE_AUDIO_DATA'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // All referenced assets should be copied
      const assetFiles = [
        'favicon.ico',
        'fonts/custom.woff2',
        'images/logo.svg',
        'media/video.mp4',
        'media/audio.mp3'
      ];

      for (const assetFile of assetFiles) {
        const exists = await fs.access(path.join(outputDir, assetFile))
          .then(() => true).catch(() => false);
        assert(exists, `Referenced ${assetFile} should be copied`);
      }
    });

    it('should copy assets referenced in CSS files', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="/styles/main.css"></head>
<body><h1>Test</h1></body>
</html>`,
        'src/styles/main.css': `
body {
  background-image: url('/images/bg.jpg');
  font-face: url('/fonts/custom.woff');
}
.icon {
  background: url('/icons/arrow.svg');
}`,
        'src/images/bg.jpg': 'FAKE_BG_IMAGE',
        'src/fonts/custom.woff': 'FAKE_FONT_DATA',
        'src/icons/arrow.svg': '<svg>ARROW</svg>',
        'src/images/unused.jpg': 'UNUSED_IMAGE'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // CSS file should be copied
      const cssExists = await fs.access(path.join(outputDir, 'styles/main.css'))
        .then(() => true).catch(() => false);
      assert(cssExists, 'CSS file should be copied');

      // Assets referenced in CSS should be copied
      const bgExists = await fs.access(path.join(outputDir, 'images/bg.jpg'))
        .then(() => true).catch(() => false);
      const fontExists = await fs.access(path.join(outputDir, 'fonts/custom.woff'))
        .then(() => true).catch(() => false);
      const iconExists = await fs.access(path.join(outputDir, 'icons/arrow.svg'))
        .then(() => true).catch(() => false);

      assert(bgExists, 'Background image from CSS should be copied');
      assert(fontExists, 'Font from CSS should be copied');
      assert(iconExists, 'Icon from CSS should be copied');

      // Unreferenced assets should NOT be copied
      const unusedExists = await fs.access(path.join(outputDir, 'images/unused.jpg'))
        .then(() => true).catch(() => false);
      assert(!unusedExists, 'Unreferenced image should NOT be copied');
    });
  });

  describe('Layout and Component Exclusion', () => {
    it('should NOT copy layout directories to output', async () => {
      const structure = {
        'src/index.html': `<div data-layout="/.layouts/base.html">
  <template data-slot="title">Test Page</template>
  <h1>Content</h1>
</div>`,
        'src/.layouts/base.html': `<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default</slot></title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body><slot></slot></body>
</html>`,
        'src/.layouts/blog.html': `<template extends="base.html">
  <slot name="content">Blog content</slot>
</template>`,
        'src/styles/main.css': 'body { margin: 0; }'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true,
        layouts: '.layouts'
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Main page should be generated
      const indexExists = await fs.access(path.join(outputDir, 'index.html'))
        .then(() => true).catch(() => false);
      assert(indexExists, 'index.html should be generated');

      // Layout directory should NOT be copied to output
      const layoutDirExists = await fs.access(path.join(outputDir, '.layouts'))
        .then(() => true).catch(() => false);
      assert(!layoutDirExists, '.layouts directory should NOT be copied to output');

      // Individual layout files should NOT be copied
      const baseLayoutExists = await fs.access(path.join(outputDir, '.layouts/base.html'))
        .then(() => true).catch(() => false);
      const blogLayoutExists = await fs.access(path.join(outputDir, '.layouts/blog.html'))
        .then(() => true).catch(() => false);
      
      assert(!baseLayoutExists, 'base.html layout should NOT be copied to output');
      assert(!blogLayoutExists, 'blog.html layout should NOT be copied to output');

      // Regular assets should still be copied
      const cssExists = await fs.access(path.join(outputDir, 'styles/main.css'))
        .then(() => true).catch(() => false);
      assert(cssExists, 'CSS files should still be copied');
    });

    it('should NOT copy component directories to output', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main><h1>Content</h1></main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>`,
        'src/.components/header.html': `<header>
  <nav><!--#include virtual="/.components/nav.html" --></nav>
</header>`,
        'src/.components/nav.html': `<ul>
  <li><a href="/">Home</a></li>
  <li><a href="/about.html">About</a></li>
</ul>`,
        'src/.components/footer.html': `<footer>
  <p>&copy; 2025 Test Site</p>
</footer>`,
        'src/assets/style.css': 'body { margin: 0; }'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true,
        components: '.components'
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Main page should be generated with includes processed
      const indexExists = await fs.access(path.join(outputDir, 'index.html'))
        .then(() => true).catch(() => false);
      assert(indexExists, 'index.html should be generated');

      const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      assert(indexContent.includes('<header>'), 'Should include header component');
      assert(indexContent.includes('<footer>'), 'Should include footer component');
      assert(indexContent.includes('<li><a href="/">Home</a></li>'), 'Should include nested nav component');

      // Component directory should NOT be copied to output
      const componentDirExists = await fs.access(path.join(outputDir, '.components'))
        .then(() => true).catch(() => false);
      assert(!componentDirExists, '.components directory should NOT be copied to output');

      // Individual component files should NOT be copied
      const headerExists = await fs.access(path.join(outputDir, '.components/header.html'))
        .then(() => true).catch(() => false);
      const navExists = await fs.access(path.join(outputDir, '.components/nav.html'))
        .then(() => true).catch(() => false);
      const footerExists = await fs.access(path.join(outputDir, '.components/footer.html'))
        .then(() => true).catch(() => false);
      
      assert(!headerExists, 'header.html component should NOT be copied to output');
      assert(!navExists, 'nav.html component should NOT be copied to output');
      assert(!footerExists, 'footer.html component should NOT be copied to output');

      // Regular assets should still be copied
      const cssExists = await fs.access(path.join(outputDir, 'assets/style.css'))
        .then(() => true).catch(() => false);
      assert(cssExists, 'CSS files should still be copied');
    });

    it('should handle alternative layout/component directory names', async () => {
      const structure = {
        'src/index.html': `<div data-layout="/layouts/base.html">
  <template data-slot="content">
    <!--#include virtual="/includes/header.html" -->
    <h1>Main Content</h1>
  </template>
</div>`,
        'src/layouts/base.html': `<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="/public/style.css"></head>
<body><slot name="content">Default</slot></body>
</html>`,
        'src/includes/header.html': `<header><h1>Site Header</h1></header>`,
        'src/public/style.css': 'body { font-family: Arial; }'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true,
        layouts: 'layouts',
        components: 'includes'
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Main page should be generated
      const indexExists = await fs.access(path.join(outputDir, 'index.html'))
        .then(() => true).catch(() => false);
      assert(indexExists, 'index.html should be generated');

      // Layout and component directories should NOT be copied
      const layoutDirExists = await fs.access(path.join(outputDir, 'layouts'))
        .then(() => true).catch(() => false);
      const includesDirExists = await fs.access(path.join(outputDir, 'includes'))
        .then(() => true).catch(() => false);
      
      assert(!layoutDirExists, 'layouts directory should NOT be copied to output');
      assert(!includesDirExists, 'includes directory should NOT be copied to output');

      // Regular directories should be copied
      const publicDirExists = await fs.access(path.join(outputDir, 'public'))
        .then(() => true).catch(() => false);
      assert(publicDirExists, 'public directory should be copied');

      const cssExists = await fs.access(path.join(outputDir, 'public/style.css'))
        .then(() => true).catch(() => false);
      assert(cssExists, 'CSS in public directory should be copied');
    });
  });

  describe('Build Statistics', () => {
    it('should report correct statistics for processed, copied, and skipped files', async () => {
      const structure = {
        'src/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <img src="/images/logo.png" alt="Logo">
</body>
</html>`,
        'src/about.html': `<!DOCTYPE html>
<html><body><h1>About</h1></body></html>`,
        'src/.layouts/base.html': `<!DOCTYPE html><html><body><slot></slot></body></html>`,
        'src/.components/header.html': `<header><h1>Header</h1></header>`,
        'src/.components/footer.html': `<footer><p>Footer</p></footer>`,  // Not used
        'src/styles/main.css': 'body { margin: 0; }',
        'src/images/logo.png': 'FAKE_PNG_DATA',
        'src/images/unused.jpg': 'UNUSED_IMAGE_DATA'
      };

      await createTestStructure(tempDir, structure);

      const result = await build({
        source: sourceDir,
        output: outputDir,
        clean: true,
        layouts: '.layouts',
        components: '.components'
      });

      assert.strictEqual(result.errors.length, 0, 'Build should succeed');

      // Should process 2 HTML pages (index.html, about.html)
      assert.strictEqual(result.processed, 2, 'Should process 2 HTML files');

      // Should copy 2 assets (main.css, logo.png) - only referenced ones
      assert.strictEqual(result.copied, 2, 'Should copy 2 referenced assets');

      // Should skip 3 files (1 layout + 2 components) + 1 unreferenced asset = 4 total
      assert.strictEqual(result.skipped, 4, 'Should skip 4 files (layouts, components, unreferenced assets)');
    });
  });
});
