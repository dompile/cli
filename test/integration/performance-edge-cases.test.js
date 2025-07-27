/**
 * Performance and Edge Cases Test Suite
 * Tests system limits, performance characteristics, and unusual scenarios
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { processIncludes } from '../../src/core/include-processor.js';
import { processHtmlUnified } from '../../src/core/unified-html-processor.js';
import { DependencyTracker } from '../../src/core/dependency-tracker.js';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Performance and Edge Cases', () => {
  let tempDir;
  let sourceDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Performance Tests', () => {
    it('should handle large HTML files efficiently', async () => {
      // Create a large HTML file (1MB+)
      const largeContent = `<!DOCTYPE html>
<html>
<head><title>Large File Test</title></head>
<body>
${'<p>This is paragraph content that repeats many times to create a large file. '.repeat(10000)}
<!--#include virtual="/components/footer.html" -->
</body>
</html>`;

      const structure = {
        'large.html': largeContent,
        'components/footer.html': '<footer>Footer content</footer>'
      };

      await createTestStructure(sourceDir, structure);

      const startTime = Date.now();
      
      const result = await processIncludes(
        largeContent,
        path.join(sourceDir, 'large.html'),
        sourceDir
      );

      const processingTime = Date.now() - startTime;

      assert(result.includes('<footer>Footer content</footer>'));
      assert(processingTime < 5000, `Processing took too long: ${processingTime}ms`);
      assert(result.length > 1000000, 'Should handle large files');
    });

    it('should handle many small includes efficiently', async () => {
      const structure = {
        'index.html': Array.from({ length: 100 }, (_, i) => 
          `<!--#include virtual="/components/item-${i}.html" -->`
        ).join('\n')
      };

      // Create 100 small include files
      for (let i = 0; i < 100; i++) {
        structure[`components/item-${i}.html`] = `<div class="item-${i}">Item ${i}</div>`;
      }

      await createTestStructure(sourceDir, structure);

      const startTime = Date.now();
      
      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      const processingTime = Date.now() - startTime;

      assert(result.includes('<div class="item-0">'));
      assert(result.includes('<div class="item-99">'));
      assert(processingTime < 10000, `Many includes took too long: ${processingTime}ms`);
    });

    it('should handle deep nesting efficiently', async () => {
      const maxDepth = 50;
      const structure = {};

      // Create deep nesting chain
      for (let i = 0; i < maxDepth; i++) {
        const nextInclude = i < maxDepth - 1 
          ? `<!--#include virtual="/components/level-${i + 1}.html" -->`
          : '<p>Final level reached</p>';
        
        structure[`components/level-${i}.html`] = `<div class="level-${i}">
  Level ${i}
  ${nextInclude}
</div>`;
      }

      structure['index.html'] = '<!--#include virtual="/components/level-0.html" -->';

      await createTestStructure(sourceDir, structure);

      const startTime = Date.now();
      
      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      const processingTime = Date.now() - startTime;

      assert(result.includes('Level 0'));
      assert(result.includes(`Level ${maxDepth - 1}`));
      assert(result.includes('Final level reached'));
      assert(processingTime < 5000, `Deep nesting took too long: ${processingTime}ms`);
    });

    it('should handle large dependency graphs efficiently', async () => {
      const structure = {};
      const numComponents = 200;

      // Create a complex dependency graph
      // Each page includes multiple components
      for (let page = 0; page < 10; page++) {
        const includes = Array.from({ length: 20 }, (_, i) => {
          const componentId = (page * 20 + i) % numComponents;
          return `<!--#include virtual="/components/comp-${componentId}.html" -->`;
        }).join('\n');

        structure[`page-${page}.html`] = `<h1>Page ${page}</h1>\n${includes}`;
      }

      // Create components
      for (let i = 0; i < numComponents; i++) {
        structure[`components/comp-${i}.html`] = `<div class="component-${i}">Component ${i}</div>`;
      }

      await createTestStructure(sourceDir, structure);

      const dependencyTracker = new DependencyTracker();
      const startTime = Date.now();

      // Process all pages and track dependencies
      for (let page = 0; page < 10; page++) {
        const pageContent = structure[`page-${page}.html`];
        const result = await processIncludes(
          pageContent,
          path.join(sourceDir, `page-${page}.html`),
          sourceDir,
          dependencyTracker
        );

        assert(result.includes(`Page ${page}`));
      }

      const processingTime = Date.now() - startTime;

      // Verify dependency tracking worked
      const dependencies = dependencyTracker.getIncludesForPage(path.join(sourceDir, 'page-0.html'));
      assert(dependencies.size > 0, 'Should track dependencies');

      assert(processingTime < 15000, `Large dependency graph took too long: ${processingTime}ms`);
    });

    it('should handle memory efficiently with large numbers of files', async () => {
      const numFiles = 500;
      const structure = {};

      for (let i = 0; i < numFiles; i++) {
        structure[`page-${i}.html`] = `<h1>Page ${i}</h1>
<p>Content for page ${i} with some repeated text to make it larger.</p>
<!--#include virtual="/components/shared.html" -->`;
      }

      structure['components/shared.html'] = '<div class="shared">Shared component</div>';

      await createTestStructure(sourceDir, structure);

      const startTime = Date.now();
      const memBefore = process.memoryUsage().heapUsed;

      // Process a subset to test memory usage
      for (let i = 0; i < 50; i++) {
        const pageContent = structure[`page-${i}.html`];
        const result = await processIncludes(
          pageContent,
          path.join(sourceDir, `page-${i}.html`),
          sourceDir
        );

        assert(result.includes(`Page ${i}`));
        assert(result.includes('Shared component'));
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = memAfter - memBefore;
      const processingTime = Date.now() - startTime;

      // Memory increase should be reasonable (less than 100MB for 50 files)
      assert(memIncrease < 100 * 1024 * 1024, `Memory usage too high: ${memIncrease / 1024 / 1024}MB`);
      assert(processingTime < 10000, `Memory test took too long: ${processingTime}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files gracefully', async () => {
      const structure = {
        'empty.html': '',
        'components/empty-component.html': '',
        'main.html': '<!--#include virtual="/components/empty-component.html" --><h1>After empty</h1>'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['main.html'],
        path.join(sourceDir, 'main.html'),
        sourceDir
      );

      assert(result.includes('<h1>After empty</h1>'));
    });

    it('should handle binary file includes gracefully', async () => {
      const structure = {
        'index.html': '<!--#include virtual="/assets/image.png" --><p>After binary</p>',
        'assets/image.png': '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' // Fake PNG header
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      // Should handle binary gracefully (might include as-is or show error)
      assert(result.includes('<p>After binary</p>'));
    });

    it('should handle very long file paths', async () => {
      const longPath = 'components/' + 'very-long-directory-name-'.repeat(10) + 'file.html';
      const structure = {
        'index.html': `<!--#include virtual="/${longPath}" -->`,
        [longPath]: '<div>Long path content</div>'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      assert(result.includes('Long path content'));
    });

    it('should handle files with unusual characters in names', async () => {
      const structure = {
        'index.html': '<!--#include virtual="/components/спасибо.html" --><!--#include virtual="/components/测试.html" -->',
        'components/спасибо.html': '<div>Russian content</div>',
        'components/测试.html': '<div>Chinese content</div>'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      assert(result.includes('Russian content'));
      assert(result.includes('Chinese content'));
    });

    it('should handle files with unicode content', async () => {
      const structure = {
        'index.html': '<!--#include virtual="/components/unicode.html" -->',
        'components/unicode.html': `<div>
          <p>Emojis: 🚀 🎉 💻 🌟</p>
          <p>Math: ∑ ∆ ∞ ≤ ≥</p>
          <p>Languages: Español, Français, Deutsch, Русский, 中文, 日本語</p>
          <p>Special: "Smart quotes" — em dash – en dash</p>
        </div>`
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      assert(result.includes('🚀'));
      assert(result.includes('∑'));
      assert(result.includes('Español'));
      assert(result.includes('"Smart quotes"'));
    });

    it('should handle malformed HTML gracefully', async () => {
      const structure = {
        'malformed.html': `<div><p>Unclosed paragraph
<span>Unclosed span
<div>Nested unclosed
<!--#include virtual="/components/good.html" -->
</div>`,
        'components/good.html': '<p>Good content</p>'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['malformed.html'],
        path.join(sourceDir, 'malformed.html'),
        sourceDir
      );

      assert(result.includes('Good content'));
      assert(result.includes('Unclosed paragraph'));
    });

    it('should handle concurrent processing safely', async () => {
      const structure = {
        'shared-component.html': '<div class="shared">Shared content</div>'
      };

      for (let i = 0; i < 20; i++) {
        structure[`page-${i}.html`] = `<h1>Page ${i}</h1>
<!--#include virtual="/shared-component.html" -->`;
      }

      await createTestStructure(sourceDir, structure);

      // Process multiple files concurrently
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const promise = processIncludes(
          structure[`page-${i}.html`],
          path.join(sourceDir, `page-${i}.html`),
          sourceDir
        );
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // All should complete successfully
      assert.strictEqual(results.length, 20);
      results.forEach((result, i) => {
        assert(result.includes(`Page ${i}`));
        assert(result.includes('Shared content'));
      });
    });

    it('should handle circular dependencies with depth limit', async () => {
      const structure = {
        'components/circular-a.html': '<!--#include virtual="/components/circular-b.html" -->A',
        'components/circular-b.html': '<!--#include virtual="/components/circular-c.html" -->B',
        'components/circular-c.html': '<!--#include virtual="/components/circular-a.html" -->C',
        'index.html': '<!--#include virtual="/components/circular-a.html" -->'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      // Should detect circular dependency and stop processing
      assert(result.includes('Error:') || result.includes('Circular') || 
             result.includes('A') || result.includes('B'));
    });

    it('should handle missing files in nested includes', async () => {
      const structure = {
        'components/existing.html': `<div>Existing content
<!--#include virtual="/components/missing.html" -->
<p>After missing</p>
</div>`,
        'index.html': '<!--#include virtual="/components/existing.html" -->'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      assert(result.includes('Existing content'));
      assert(result.includes('After missing'));
      // Should contain error comment for missing file
      assert(result.includes('Error:') || result.includes('not found'));
    });

    it('should handle template processing with unusual slot configurations', async () => {
      const structure = {
        'layouts/unusual.html': `<!DOCTYPE html>
<html>
<body>
  <slot name="content">Default content</slot>
  <slot><!-- Unnamed slot --></slot>
  <slot name="empty"></slot>
  <slot name="repeated">Default 1</slot>
  <slot name="repeated">Default 2</slot>
</body>
</html>`,
        'page.html': `<template extends="unusual.html">
  <slot name="content">Custom content</slot>
  <slot name="repeated">Custom repeated</slot>
  <div>Unnamed content goes here</div>
</template>`
      };

      await createTestStructure(sourceDir, structure);

      const config = {
        sourceRoot: sourceDir,
        layoutsDir: 'layouts',
        componentsDir: 'components'
      };

      const dependencyTracker = new DependencyTracker();
      const result = await processHtmlUnified(
        structure['page.html'],
        path.join(sourceDir, 'page.html'),
        sourceDir,
        dependencyTracker,
        config
      );

      assert(result.includes('Custom content'));
      assert(result.includes('Custom repeated'));
      assert(result.includes('Unnamed content'));
    });
  });

  describe('System Limits', () => {
    it('should handle maximum include depth gracefully', async () => {
      const maxDepth = 20; // Adjust based on system limits
      const structure = {};

      // Create deep nesting that exceeds reasonable limits
      for (let i = 0; i < maxDepth; i++) {
        const nextInclude = i < maxDepth - 1 
          ? `<!--#include virtual="/components/deep-${i + 1}.html" -->`
          : '<p>Maximum depth reached</p>';
        
        structure[`components/deep-${i}.html`] = `Level ${i} ${nextInclude}`;
      }

      structure['index.html'] = '<!--#include virtual="/components/deep-0.html" -->';

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      // Should either complete or fail gracefully
      assert(typeof result === 'string');
      assert(result.length > 0);
    });

    it('should handle files at filesystem limits', async () => {
      // Test with very large file (10MB content)
      const largeContent = 'X'.repeat(10 * 1024 * 1024);
      const structure = {
        'huge.html': `<html><body>${largeContent}<!--#include virtual="/components/small.html" --></body></html>`,
        'components/small.html': '<p>Small component</p>'
      };

      await createTestStructure(sourceDir, structure);

      try {
        const result = await processIncludes(
          structure['huge.html'],
          path.join(sourceDir, 'huge.html'),
          sourceDir
        );

        // If it completes, verify it worked
        assert(result.includes('Small component'));
        assert(result.length > 10 * 1024 * 1024);
      } catch (error) {
        // If it fails, should be a reasonable error
        assert(error.message.includes('size') || 
               error.message.includes('memory') || 
               error.message.includes('ENOMEM'));
      }
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after errors', async () => {
      const structure = {
        'index.html': `
<!--#include virtual="/components/missing1.html" -->
<p>Content 1</p>
<!--#include virtual="/components/existing.html" -->
<p>Content 2</p>
<!--#include virtual="/components/missing2.html" -->
<p>Content 3</p>
`,
        'components/existing.html': '<div>Existing component</div>'
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      // Should contain good content and error comments
      assert(result.includes('Content 1'));
      assert(result.includes('Existing component'));
      assert(result.includes('Content 2'));
      assert(result.includes('Content 3'));
    });

    it('should handle encoding errors gracefully', async () => {
      const structure = {
        'index.html': '<!--#include virtual="/components/encoded.html" --><p>After include</p>',
        // Create file with invalid UTF-8 sequence
        'components/encoded.html': Buffer.from([0xff, 0xfe, 0x48, 0x65, 0x6c, 0x6c, 0x6f]).toString('binary')
      };

      await createTestStructure(sourceDir, structure);

      const result = await processIncludes(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        sourceDir
      );

      // Should handle encoding issue and continue
      assert(result.includes('After include'));
    });
  });
});