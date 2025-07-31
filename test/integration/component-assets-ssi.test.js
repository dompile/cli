import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Component Assets with SSI Includes', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  });

  it('should extract and relocate style elements from SSI-included components', async () => {
    // Create test structure
    const sourceDir = path.join(tempDir, 'src');
    const outputDir = path.join(tempDir, 'dist');
    
    await createTestStructure(sourceDir, {
      '.components/styled-button.html': `
<style>
  .btn {
    background: blue;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
  }
</style>
<button class="btn">Click Me</button>
        `,
      'index.html': `
<!DOCTYPE html>
<html>
<head>
  <title>SSI Style Test</title>
</head>
<body>
  <div>
    <!--#include virtual="/.components/styled-button.html" -->
  </div>
</body>
</html>
        `
    });

    // Build the site
    const { build } = await import('../../src/core/file-processor.js');
    await build({
      sourceDir,
      outputDir,
      layoutsDir: path.join(sourceDir, '.layouts'),
      componentsDir: path.join(sourceDir, '.components'),
      clean: true
    });

    // Read the output file
    const outputFile = path.join(outputDir, 'index.html');
    const content = await fs.readFile(outputFile, 'utf-8');

    // Should have component styles in head
    expect(content).toMatch(/<head>[\s\S]*<style>[\s\S]*\.btn[\s\S]*background:\s*blue[\s\S]*<\/style>[\s\S]*<\/head>/);
    
    // Should have component HTML in body (without style tags)
    expect(content).toMatch(/<body>[\s\S]*<button class="btn">Click Me<\/button>[\s\S]*<\/body>/);
    
    // Component content should NOT contain style tags anymore
    expect(content).not.toMatch(/<div>[\s\S]*<style>/);
  });

  it('should extract and relocate script elements from SSI-included components', async () => {
    // Create test structure
    const sourceDir = path.join(tempDir, 'src');
    const outputDir = path.join(tempDir, 'dist');
    
    await createTestStructure(sourceDir, {
      '.components/counter.html': `
<div id="counter">0</div>
<script>
  function increment() {
    const counter = document.getElementById('counter');
    counter.textContent = parseInt(counter.textContent) + 1;
  }
</script>
        `,
      'index.html': `
<!DOCTYPE html>
<html>
<head>
  <title>SSI Script Test</title>
</head>
<body>
  <div>
    <!--#include virtual="/.components/counter.html" -->
  </div>
</body>
</html>
        `
    });

    // Build the site
    const { build } = await import('../../src/core/file-processor.js');
    await build({
      sourceDir,
      outputDir,
      layoutsDir: path.join(sourceDir, '.layouts'),
      componentsDir: path.join(sourceDir, '.components'),
      clean: true
    });

    // Read the output file
    const outputFile = path.join(outputDir, 'index.html');
    const content = await fs.readFile(outputFile, 'utf-8');

    // Should have component scripts at end of body
    expect(content).toMatch(/<script>[\s\S]*function increment\(\)[\s\S]*<\/script>[\s\S]*<\/body>/);
    
    // Should have component HTML in body (without script tags)
    expect(content).toMatch(/<body>[\s\S]*<div id="counter">0<\/div>[\s\S]*<\/body>/);
    
    // Component content should NOT contain script tags in the included area
    expect(content).not.toMatch(/<div>[\s\S]*<div id="counter">0<\/div>[\s\S]*<script>/);
  });

  it('should handle both styles and scripts in SSI-included components', async () => {
    // Create test structure
    const sourceDir = path.join(tempDir, 'src');
    const outputDir = path.join(tempDir, 'dist');
    
    await createTestStructure(sourceDir, {
      '.components/modal.html': `
<style>
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    background: rgba(0,0,0,0.5);
  }
  .modal.show {
    display: block;
  }
</style>
<div class="modal" id="myModal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <p>Modal content here!</p>
  </div>
</div>
<script>
  function showModal() {
    document.getElementById('myModal').classList.add('show');
  }
  function hideModal() {
    document.getElementById('myModal').classList.remove('show');
  }
</script>
        `,
      'index.html': `
<!DOCTYPE html>
<html>
<head>
  <title>SSI Combined Test</title>
</head>
<body>
  <button onclick="showModal()">Open Modal</button>
  <!--#include virtual="/.components/modal.html" -->
</body>
</html>
        `
    });

    // Build the site
    const { build } = await import('../../src/core/file-processor.js');
    await build({
      sourceDir,
      outputDir,
      layoutsDir: path.join(sourceDir, '.layouts'),
      componentsDir: path.join(sourceDir, '.components'),
      clean: true
    });

    // Read the output file
    const outputFile = path.join(outputDir, 'index.html');
    const content = await fs.readFile(outputFile, 'utf-8');

    // Should have component styles in head
    expect(content).toMatch(/<head>[\s\S]*<style>[\s\S]*\.modal[\s\S]*position:\s*fixed[\s\S]*<\/style>[\s\S]*<\/head>/);
    
    // Should have component scripts at end of body
    expect(content).toMatch(/<script>[\s\S]*function showModal\(\)[\s\S]*<\/script>[\s\S]*<\/body>/);
    
    // Should have component HTML in body (without style/script tags)
    expect(content).toMatch(/<body>[\s\S]*<div class="modal" id="myModal">[\s\S]*<\/div>[\s\S]*<\/body>/);
    
    // The included section should not contain style or script tags
    expect(content).not.toMatch(/<!--#include virtual="\/\.components\/modal\.html" -->[\s\S]*<style>/);
  });
});
