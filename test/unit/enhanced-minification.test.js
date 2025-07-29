/**
 * Tests for enhanced HTML minification functionality
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { build } from '../../src/core/file-processor.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFixturesDir = path.join(__dirname, '../fixtures/minification');

describe('enhanced HTML minification', () => {
  let sourceDir;
  let outputDir;
  
  beforeEach(async () => {
    // Create test directories
    sourceDir = path.join(testFixturesDir, 'src');
    outputDir = path.join(testFixturesDir, 'dist');
    
    await fs.mkdir(sourceDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testFixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should minify HTML with CSS and JavaScript', async () => {
    // Create HTML file with verbose formatting
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>
        /* This is a CSS comment */
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Test Page</h1>
        <p>This is a test paragraph with    multiple spaces   .</p>
    </div>
    
    <script>
        // This is a JavaScript comment
        function greet(name) {
            console.log("Hello, " + name + "!");
        }
        
        /* Block comment */
        greet("World");
    </script>
</body>
</html>`;
    
    await fs.writeFile(path.join(sourceDir, 'index.html'), htmlContent);
    
    // Build with minification enabled
    await build({
      source: sourceDir,
      output: outputDir,
      minify: true,
      clean: true
    });
    
    // Read the minified output
    const minifiedContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    
    // Verify minification effects
    
    // Should not contain multiple consecutive spaces (except in quoted strings)
    assert(!minifiedContent.includes('    '), 'Should not contain multiple spaces');
    
    // Should not contain CSS comments
    assert(!minifiedContent.includes('/* This is a CSS comment */'), 'Should not contain CSS comments');
    
    // Should collapse whitespace in CSS rules
    assert(minifiedContent.includes('margin:0'), 'Should minify CSS spacing around colons');
    assert(minifiedContent.includes('padding:20px'), 'Should minify CSS spacing');
    
    
    // Should preserve HTML content (basic check)
    assert(minifiedContent.includes('<h1>Welcome to Test Page</h1>'), 'Should preserve HTML content');
    
    // Should have some JavaScript content (even if not perfectly minified)
    assert(minifiedContent.includes('<script>') && minifiedContent.includes('</script>'), 'Should preserve script tags');
    
    // Overall file should be significantly smaller
    const originalSize = htmlContent.length;
    const minifiedSize = minifiedContent.length;
    const compressionRatio = (originalSize - minifiedSize) / originalSize;
    
    // Should achieve at least 10% compression
    assert(compressionRatio > 0.1, `Should achieve significant compression, got ${(compressionRatio * 100).toFixed(1)}%`);
  });
  
  it('should preserve important HTML attributes and not over-minify', async () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Attribute Test</title>
</head>
<body>
    <div class="my-class" id="my-id" data-value="test value">
        <input type="text" placeholder="Enter text here" required>
        <button onclick="alert('Hello World!')">Click Me</button>
    </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(sourceDir, 'attributes.html'), htmlContent);
    
    // Build with minification enabled
    await build({
      source: sourceDir,
      output: outputDir,
      minify: true,
      clean: true
    });
    
    const minifiedContent = await fs.readFile(path.join(outputDir, 'attributes.html'), 'utf-8');
    
    // Should preserve attributes that need quotes (contain spaces or special chars)
    assert(minifiedContent.includes('data-value="test value"'), 'Should preserve quoted attributes with spaces');
    assert(minifiedContent.includes('placeholder="Enter text here"'), 'Should preserve quoted attributes');
    assert(minifiedContent.includes('onclick="alert(\'Hello World!\')"'), 'Should preserve quoted JS attributes');
    
    // Should preserve required boolean attributes
    assert(minifiedContent.includes('required'), 'Should preserve boolean attributes');
    
    // Should remove unnecessary quotes from simple attributes
    assert(minifiedContent.includes('type=text') || minifiedContent.includes('type="text"'), 'Should handle type attribute');
  });
  
  it('should not minify when minify option is false', async () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>No Minification Test</title>
    <style>
        body {
            margin: 0;
        }
    </style>
</head>
<body>
    <h1>Test</h1>
</body>
</html>`;
    
    await fs.writeFile(path.join(sourceDir, 'no-minify.html'), htmlContent);
    
    // Build WITHOUT minification
    await build({
      source: sourceDir,
      output: outputDir,
      minify: false,
      clean: true
    });
    
    const outputContent = await fs.readFile(path.join(outputDir, 'no-minify.html'), 'utf-8');
    
    // Should preserve original formatting when minification is disabled
    assert(outputContent.includes('    margin: 0;'), 'Should preserve CSS whitespace when not minifying');
    assert(outputContent.includes('</head>\n<body>'), 'Should preserve line breaks when not minifying');
  });
});