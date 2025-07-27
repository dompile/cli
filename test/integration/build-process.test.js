/**
 * Integration tests for full build process
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from '../../src/core/file-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFixturesDir = path.join(__dirname, '../fixtures/integration');

describe('build-process integration', () => {
  let sourceDir;
  let outputDir;
  
  beforeEach(async () => {
    // Create test directories
    sourceDir = path.join(testFixturesDir, 'src');
    outputDir = path.join(testFixturesDir, 'dist');
    
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(path.join(sourceDir, '.components'), { recursive: true });
    await fs.mkdir(path.join(sourceDir, 'css'), { recursive: true });
    
    // Create test files
    await fs.writeFile(
      path.join(sourceDir, '.components', 'head.html'),
      '<meta charset="UTF-8">\n<link rel="stylesheet" href="/css/style.css">'
    );
    
    await fs.writeFile(
      path.join(sourceDir, '.components', 'header.html'),
      '<header><h1>Test Site</h1><nav><!--#include file="nav.html" --></nav></header>'
    );
    
    await fs.writeFile(
      path.join(sourceDir, '.components', 'nav.html'),
      '<ul><li><a href="/">Home</a></li><li><a href="/about.html">About</a></li></ul>'
    );
    
    await fs.writeFile(
      path.join(sourceDir, '.components', 'footer.html'),
      '<footer><p>&copy; 2024 Test Site</p></footer>'
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'index.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>Home - Test Site</title>
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    <h2>Welcome</h2>
    <p>This is the home page.</p>
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>`
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'about.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>About - Test Site</title>
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    <h2>About Us</h2>
    <p>This is the about page.</p>
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>`
    );

        await fs.writeFile(
          path.join(sourceDir, "default-layout.html"),
          `
<head>
  <title>Default Layout - Test Site</title>
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    <h2>About Us</h2>
    <p>This is the about page.</p>
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>`
        );
    
    await fs.writeFile(
      path.join(sourceDir, 'css', 'style.css'),
      'body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }'
    );
  });
  
  afterEach(async () => {
    // Clean up test fixtures
    try {
      await fs.rm(testFixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should build complete site with components and head injection', async () => {
    const result = await build({
      source: sourceDir,
      output: outputDir,
      components: '.components',
      clean: true
    });
    
    // Verify build results
    assert.strictEqual(result.processed, 3); // index.html, about.html, default-layout.html
    assert.strictEqual(result.copied, 1);    // style.css
    assert.strictEqual(result.skipped, 4);   // 4 include files
    assert.strictEqual(result.errors.length, 0);
    
    // Verify output files exist
    const indexPath = path.join(outputDir, 'index.html');
    const aboutPath = path.join(outputDir, 'about.html');
    const cssPath = path.join(outputDir, 'css', 'style.css');
    
    await fs.access(indexPath);
    await fs.access(aboutPath);
    await fs.access(cssPath);
    
    // Verify include files are NOT in output
    const headerPath = path.join(outputDir, '.components', 'header.html');
    await assert.rejects(async () => {
      await fs.access(headerPath);
    });
  });
  
  it('should process nested components correctly', async () => {
    await build({
      source: sourceDir,
      output: outputDir,
      components: '.components'
    });
    
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    
    // Should contain nested navigation from header -> nav
    assert(indexContent.includes('<ul><li><a href="/">Home</a></li>'));
    assert(indexContent.includes('<li><a href="/about.html">About</a></li></ul>'));
    
    // Should not contain any include directives
    assert(!indexContent.includes('<!--#include'));
  });
  
  it('should inject head content into all pages', async () => {
    await build({
      source: sourceDir,
      output: outputDir,
      components: '.components'
    });
    
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    const aboutContent = await fs.readFile(path.join(outputDir, 'about.html'), 'utf-8');
    
    // Both pages should have head injection
    assert(indexContent.includes('<meta charset="UTF-8">'));
    assert(indexContent.includes('<link rel="stylesheet" href="/css/style.css">'));
    assert(aboutContent.includes('<meta charset="UTF-8">'));
    assert(aboutContent.includes('<link rel="stylesheet" href="/css/style.css">'));
    
    // Head injection should preserve existing titles
    assert(indexContent.includes('<title>Home - Test Site</title>'));
    assert(aboutContent.includes('<title>About - Test Site</title>'));
  });
  
  it('should maintain directory structure for assets', async () => {
    await build({
      source: sourceDir,
      output: outputDir
    });
    
    const cssContent = await fs.readFile(path.join(outputDir, 'css', 'style.css'), 'utf-8');
    assert(cssContent.includes('font-family: Arial'));
  });
  
  it('should track dependencies correctly', async () => {
    const result = await build({
      source: sourceDir,
      output: outputDir,
      components: '.components'
    });
    
    const tracker = result.dependencyTracker;
    
    // Verify dependency tracking
    const indexPath = path.join(sourceDir, 'index.html');
    const headerPath = path.join(sourceDir, '.components', 'header.html');
    const navPath = path.join(sourceDir, '.components', 'nav.html');
    
    const indexDeps = tracker.getPageDependencies(indexPath);
    assert(indexDeps.includes(headerPath));
    assert(indexDeps.includes(path.join(sourceDir, '.components', 'footer.html')));
    
    // Verify reverse mapping
    const headerAffected = tracker.getAffectedPages(headerPath);
    assert(headerAffected.includes(indexPath));
    assert(headerAffected.includes(path.join(sourceDir, 'about.html')));
    
    // Verify nested dependencies (nav included by header)
    const navAffected = tracker.getAffectedPages(navPath);
    // nav.html is included by header.html, which is included by both pages
    assert(navAffected.length > 0, `Expected nav.html to affect pages, got: ${JSON.stringify(navAffected)}`);
  });
  
  it('should fail build when components are missing', async () => {
    // Create a file with missing include
    const brokenFilePath = path.join(sourceDir, 'broken.html');
    await fs.writeFile(
      brokenFilePath,
      '<!DOCTYPE html><html><head></head><body><!--#include file="missing.html" --></body></html>'
    );
    
    // Build should throw an error when components are missing
    await assert.rejects(async () => {
      await build({
        source: sourceDir,
        output: outputDir,
        components: '.components'
      });
    }, /Build failed.*error.*/);
    
    // Clean up the broken file immediately after test
    try {
      await fs.unlink(brokenFilePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });
  
  it('should clean output directory before build', async () => {
    // Create output directory with existing file
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'old-file.txt'), 'should be deleted');
    
    await build({
      source: sourceDir,
      output: outputDir,
      clean: true
    });
    
    // Old file should be removed
    await assert.rejects(async () => {
      await fs.access(path.join(outputDir, 'old-file.txt'));
    });
    
    // New files should exist
    await fs.access(path.join(outputDir, 'index.html'));
  });
  
  it('should work with custom head file path', async () => {
    // Create custom head file
    await fs.writeFile(
      path.join(sourceDir, 'custom-head.html'),
      '<meta name="custom" content="test">\n<script>console.log("custom");</script>'
    );
    
    await build({
      source: sourceDir,
      output: outputDir,
      head: path.join(sourceDir, 'custom-head.html')
    });
    
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    
    // Should contain custom head content
    assert(indexContent.includes('<meta name="custom" content="test">'));
    assert(indexContent.includes('console.log("custom")'));
  });
  
  it('should apply default layout unless the source page includes an <html> element explicitly', async () => {
    // Create layouts directory with default.html
    await fs.mkdir(path.join(sourceDir, '.layouts'), { recursive: true });
    await fs.writeFile(
      path.join(sourceDir, '.layouts', 'default.html'),
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
</head>
<body>
  <header><h1>Default Layout</h1></header>
  <main>{{ content }}</main>
  <footer><p>Default Footer</p></footer>
</body>
</html>`
    );
    
    // Create markdown file without html element
    await fs.writeFile(
      path.join(sourceDir, 'test-markdown.md'),
      `---
title: Test Page
---

# Test Content

This is a test page content.`
    );
    
    // Create markdown file WITH html element (should not use layout)
    await fs.writeFile(
      path.join(sourceDir, 'full-html.md'),
      `---
title: Full HTML Page
---

<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Custom HTML</title>
</head>
<body>
  <h1>Custom HTML Structure</h1>
  <p>This has its own HTML structure.</p>
</body>
</html>`
    );

    // Create markdown file WITH html elements but WITHOUT <html> element (should use layout)
    await fs.writeFile(
      path.join(sourceDir, 'partial-html.md'),
      `---
title: Partial HTML Page
---

<head>
  <meta charset="UTF-8">
  <title>Partial HTML</title>
</head>
<body>
  <h1>Partial HTML Structure</h1>
  <p>This does not include the <html> element.</p>
</body>`
    );
    
    await build({
      source: sourceDir,
      output: outputDir,
      components: '.components',
      layouts: '.layouts',
      clean: true
    });
    
    // Verify markdown without html element uses default layout
    const testMarkdownContent = await fs.readFile(path.join(outputDir, 'test-markdown.html'), 'utf-8');
    assert(testMarkdownContent.includes('Default Layout'));
    assert(testMarkdownContent.includes('Default Footer'));
    assert(testMarkdownContent.includes('Test Content')); // Check for content presence
    
    // Verify markdown with html element does NOT use layout
    const fullHtmlContent = await fs.readFile(path.join(outputDir, 'full-html.html'), 'utf-8');
    assert(fullHtmlContent.includes('Custom HTML Structure'));
    assert(!fullHtmlContent.includes('Default Layout'));
    assert(!fullHtmlContent.includes('Default Footer'));

    //TODO: re-enable this check for properly applying default layout
    // // Verify markdown with html elements but WITHOUT <html> element uses default layout
    // const partialHtmlContent = await fs.readFile(path.join(outputDir, 'partial-html.html'), 'utf-8');
    // assert(partialHtmlContent.includes('Default Layout'));
    // assert(partialHtmlContent.includes('Default Footer'));
    // assert(partialHtmlContent.includes('Partial HTML Structure')); // Check for content presence
    // assert(!partialHtmlContent.includes('<html lang="en">')); // Should not include <html> from source
  });
  
  it('should not apply layout when no default.html exists and content has no html element', async () => {
    // Create markdown file without html element, but no default layout
    await fs.writeFile(
      path.join(sourceDir, 'no-layout.md'),
      `---
title: No Layout Test
---

# Content Without Layout

This should get basic HTML structure.`
    );
    
    await build({
      source: sourceDir,
      output: outputDir,
      components: '.components',
      layouts: '.layouts',
      clean: true
    });
    
    // Verify basic HTML structure is created
    const noLayoutContent = await fs.readFile(path.join(outputDir, 'no-layout.html'), 'utf-8');
    assert(noLayoutContent.includes('<!DOCTYPE html>'));
    assert(noLayoutContent.includes('<html lang="en">'));
    assert(noLayoutContent.includes('<title>No Layout Test</title>'));
    assert(noLayoutContent.includes('<main>'));
    assert(noLayoutContent.includes('Content Without Layout')); // Check for content presence
    assert(!noLayoutContent.includes('Default Layout')); // Should not have default layout content
  });
});