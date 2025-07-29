/**
 * Tests for template target attribute functionality
 * Verifies spec compliance for <template target="name"> syntax
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { processHtmlUnified } from '../../src/core/unified-html-processor.js';
import { DependencyTracker } from '../../src/core/dependency-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFixturesDir = path.join(__dirname, '../fixtures/template-target');

describe('template target attribute', () => {
  let sourceDir;
  let layoutsDir;
  let dependencyTracker;
  
  beforeEach(async () => {
    // Create test directories
    sourceDir = path.join(testFixturesDir, 'src');
    layoutsDir = path.join(sourceDir, '.layouts');
    
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(layoutsDir, { recursive: true });
    
    dependencyTracker = new DependencyTracker();
  });
  
  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testFixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should handle template with target attribute for named slots', async () => {
    // Create layout with named slots
    const layoutContent = `<!DOCTYPE html>
<html>
<head>
  <title>Test Layout</title>
  <slot name="head"></slot>
</head>
<body>
  <header>
    <slot name="header">Default Header</slot>
  </header>
  <main>
    <slot>Default main content</slot>
  </main>
  <aside>
    <slot name="sidebar">Default Sidebar</slot>
  </aside>
</body>
</html>`;
    
    await fs.writeFile(path.join(layoutsDir, 'default.html'), layoutContent);
    
    // Create page with template target attributes
    const pageContent = `<div data-layout="default.html">
  <template target="head">
    <meta name="description" content="Custom page description">
    <link rel="stylesheet" href="custom.css">
  </template>
  
  <template target="header">
    <h1>Custom Header</h1>
    <nav>Custom Navigation</nav>
  </template>
  
  <template target="sidebar">
    <ul>
      <li>Custom Sidebar Item 1</li>
      <li>Custom Sidebar Item 2</li>
    </ul>
  </template>
  
  <h2>Main Content</h2>
  <p>This is the main page content that goes in the default slot.</p>
</div>`;
    
    const pagePath = path.join(sourceDir, 'test.html');
    const result = await processHtmlUnified(
      pageContent,
      pagePath,
      sourceDir,
      dependencyTracker,
      { layoutsDir: '.layouts' }
    );
    
    // Verify head slot replacement
    assert(result.includes('<meta name="description" content="Custom page description">'));
    assert(result.includes('<link rel="stylesheet" href="custom.css">'));
    
    // Verify header slot replacement
    assert(result.includes('<h1>Custom Header</h1>'));
    assert(result.includes('<nav>Custom Navigation</nav>'));
    
    // Verify sidebar slot replacement
    assert(result.includes('<li>Custom Sidebar Item 1</li>'));
    assert(result.includes('<li>Custom Sidebar Item 2</li>'));
    
    // Verify main content in default slot
    assert(result.includes('<h2>Main Content</h2>'));
    assert(result.includes('<p>This is the main page content that goes in the default slot.</p>'));
    
    // Verify template elements are removed from output
    assert(!result.includes('<template target='));
  });
  
  it('should handle template without target attribute as default slot content', async () => {
    // Create simple layout
    const layoutContent = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <slot>Default content</slot>
</body>
</html>`;
    
    await fs.writeFile(path.join(layoutsDir, 'default.html'), layoutContent);
    
    // Create page with template without target (default slot)
    const pageContent = `<div data-layout="default.html">
  <template>
    <article>
      <h1>Article Title</h1>
      <p>Article content for default slot</p>
    </article>
  </template>
</div>`;
    
    const pagePath = path.join(sourceDir, 'test.html');
    const result = await processHtmlUnified(
      pageContent,
      pagePath,
      sourceDir,
      dependencyTracker,
      { layoutsDir: '.layouts' }
    );
    
    // Verify template content replaces default slot
    assert(result.includes('<article>'));
    assert(result.includes('<h1>Article Title</h1>'));
    assert(result.includes('<p>Article content for default slot</p>'));
    
    // Verify template element is removed
    assert(!result.includes('<template>'));
  });
  
  it('should support multiple template elements with different targets', async () => {
    // Create layout with multiple named slots
    const layoutContent = `<!DOCTYPE html>
<html>
<head>
  <slot name="meta"></slot>
</head>
<body>
  <header><slot name="nav"></slot></header>
  <main><slot></slot></main>
  <footer><slot name="footer"></slot></footer>
</body>
</html>`;
    
    await fs.writeFile(path.join(layoutsDir, 'multi-slot.html'), layoutContent);
    
    // Create page with multiple targeted templates
    const pageContent = `<div data-layout="multi-slot.html">
  <template target="meta">
    <meta charset="UTF-8">
    <title>Multi-Template Page</title>
  </template>
  
  <template target="nav">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </template>
  
  <template target="footer">
    <p>&copy; 2024 Test Site</p>
  </template>
  
  <h1>Main Content</h1>
  <p>This goes in the default slot.</p>
</div>`;
    
    const pagePath = path.join(sourceDir, 'multi-test.html');
    const result = await processHtmlUnified(
      pageContent,
      pagePath,
      sourceDir,
      dependencyTracker,
      { layoutsDir: '.layouts' }
    );
    
    
    // Verify all targeted content is placed correctly
    assert(result.includes('<meta charset="UTF-8">'));
    assert(result.includes('<title>Multi-Template Page</title>'));
    assert(result.includes('<a href="/">Home</a>'));
    assert(result.includes('<a href="/about">About</a>'));
    assert(result.includes('<p>© 2024 Test Site</p>'));
    assert(result.includes('<h1>Main Content</h1>'));
    
    // Verify all template elements are removed
    assert(!result.includes('<template target='));
  });
  
  it('should maintain backward compatibility with data-slot attribute', async () => {
    // Create layout
    const layoutContent = `<!DOCTYPE html>
<html>
<body>
  <header><slot name="header">Default Header</slot></header>
  <main><slot>Default Content</slot></main>
</body>
</html>`;
    
    await fs.writeFile(path.join(layoutsDir, 'default.html'), layoutContent);
    
    // Create page using legacy data-slot attribute
    const pageContent = `<div data-layout="default.html">
  <template data-slot="header">
    <h1>Legacy Header</h1>
  </template>
  
  <p>Main content using legacy approach</p>
</div>`;
    
    const pagePath = path.join(sourceDir, 'legacy-test.html');
    const result = await processHtmlUnified(
      pageContent,
      pagePath,
      sourceDir,
      dependencyTracker,
      { layoutsDir: '.layouts' }
    );
    
    // Verify legacy data-slot still works
    assert(result.includes('<h1>Legacy Header</h1>'));
    assert(result.includes('<p>Main content using legacy approach</p>'));
    
    // Verify template elements are removed
    assert(!result.includes('<template data-slot'));
  });
});