/**
 * Tests for template/slot/include combinations
 * Verifies complex DOM mode templating scenarios work correctly
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { processHtmlUnified } from '../../src/core/unified-html-processor.js';
import { DependencyTracker } from '../../src/core/dependency-tracker.js';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Template/Slot/Include Combinations', () => {
  let tempDir;
  let sourceDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Basic template inheritance', () => {
    it('should process template with slots correctly', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default Title</slot></title>
</head>
<body>
  <header><slot name="header">Default Header</slot></header>
  <main><slot name="content">Default Content</slot></main>
  <footer><slot name="footer">Default Footer</slot></footer>
</body>
</html>`,
        'page.html': `<template extends="base.html">
  <slot name="title">Custom Page Title</slot>
  <slot name="header">
    <h1>Welcome to My Site</h1>
    <nav>Navigation here</nav>
  </slot>
  <slot name="content">
    <h2>Page Content</h2>
    <p>This is the main content.</p>
  </slot>
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

      assert(result.includes('<title>Custom Page Title</title>'));
      assert(result.includes('<h1>Welcome to My Site</h1>'));
      assert(result.includes('<h2>Page Content</h2>'));
      assert(result.includes('Default Footer'));
    });

    it('should handle nested template inheritance', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<head><title><slot name="title">Base Title</slot></title></head>
<body>
  <slot name="content">Base Content</slot>
</body>
</html>`,
        'layouts/page.html': `<template extends="base.html">
  <slot name="title">Page Layout Title</slot>
  <slot name="content">
    <header><slot name="header">Default Page Header</slot></header>
    <main><slot name="main">Default Main Content</slot></main>
  </slot>
</template>`,
        'article.html': `<template extends="page.html">
  <slot name="title">Article Title</slot>
  <slot name="header">
    <h1>Article Header</h1>
  </slot>
  <slot name="main">
    <article>Article content here</article>
  </slot>
</template>`
      };

      await createTestStructure(sourceDir, structure);

      const config = {
        sourceRoot: sourceDir,
        layoutsDir: 'layouts',
        componentsDir: 'components'
      };

      const result = await processUnifiedHtml(
        structure['article.html'],
        path.join(sourceDir, 'article.html'),
        config
      );

      assert(result.includes('<title>Article Title</title>'));
      assert(result.includes('<h1>Article Header</h1>'));
      assert(result.includes('<article>Article content here</article>'));
    });
  });

  describe('Templates with includes', () => {
    it('should process includes within template slots', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<head><slot name="head"><!--#include virtual="/components/head.html" --></slot></head>
<body>
  <slot name="content">Default content</slot>
</body>
</html>`,
        'components/head.html': `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Site Title</title>`,
        'components/navigation.html': `<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>`,
        'page.html': `<template extends="base.html">
  <slot name="content">
    <!--#include virtual="/components/navigation.html" -->
    <h1>Welcome</h1>
    <p>Page content here</p>
  </slot>
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

      assert(result.includes('<meta charset="UTF-8">'));
      assert(result.includes('<meta name="viewport"'));
      assert(result.includes('<nav>'));
      assert(result.includes('<a href="/">Home</a>'));
      assert(result.includes('<h1>Welcome</h1>'));
    });

    it('should handle includes in template definitions', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<head>
  <!--#include virtual="/components/meta.html" -->
  <slot name="title"><title>Default</title></slot>
</head>
<body>
  <!--#include virtual="/components/header.html" -->
  <slot name="content">Default content</slot>
  <!--#include virtual="/components/footer.html" -->
</body>
</html>`,
        'components/meta.html': `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        'components/header.html': `<header>
  <h1>Site Header</h1>
</header>`,
        'components/footer.html': `<footer>
  <p>&copy; 2024 My Site</p>
</footer>`,
        'page.html': `<template extends="base.html">
  <slot name="title"><title>Custom Page</title></slot>
  <slot name="content">
    <main>
      <h2>Page Title</h2>
      <p>Page content</p>
    </main>
  </slot>
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

      assert(result.includes('<meta charset="UTF-8">'));
      assert(result.includes('<h1>Site Header</h1>'));
      assert(result.includes('<title>Custom Page</title>'));
      assert(result.includes('<h2>Page Title</h2>'));
      assert(result.includes('&copy; 2024 My Site'));
    });
  });

  describe('Complex nesting scenarios', () => {
    it('should handle components with their own templates', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<body>
  <slot name="content">Default</slot>
</body>
</html>`,
        'components/card.html': `<template extends="../layouts/base.html">
  <slot name="content">
    <div class="card">
      <slot name="card-content">Default card content</slot>
    </div>
  </slot>
</template>`,
        'page.html': `<!--#include virtual="/components/card.html" -->
<slot name="card-content">
  <h3>My Card Title</h3>
  <p>This is custom card content</p>
</slot>`
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

      assert(result.includes('<div class="card">'));
      assert(result.includes('<h3>My Card Title</h3>'));
      assert(result.includes('This is custom card content'));
    });

    it('should handle recursive includes with templates', async () => {
      const structure = {
        'layouts/wrapper.html': `<div class="wrapper">
  <slot name="content">Default wrapper content</slot>
</div>`,
        'components/section.html': `<template extends="../layouts/wrapper.html">
  <slot name="content">
    <section>
      <slot name="section-content">Default section</slot>
    </section>
  </slot>
</template>`,
        'components/article.html': `<!--#include virtual="/components/section.html" -->
<slot name="section-content">
  <article>
    <slot name="article-content">Default article</slot>
  </article>
</slot>`,
        'page.html': `<!--#include virtual="/components/article.html" -->
<slot name="article-content">
  <h1>My Article</h1>
  <p>Article content here</p>
</slot>`
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

      assert(result.includes('<div class="wrapper">'));
      assert(result.includes('<section>'));
      assert(result.includes('<article>'));
      assert(result.includes('<h1>My Article</h1>'));
    });
  });

  describe('Error handling', () => {
    it('should handle missing template files gracefully', async () => {
      const structure = {
        'page.html': `<template extends="missing.html">
  <slot name="content">Content here</slot>
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

      // Should contain error comment and original content
      assert(result.includes('Template not found'));
      assert(result.includes('Content here'));
    });

    it('should handle circular template dependencies', async () => {
      const structure = {
        'layouts/a.html': `<template extends="b.html">
  <slot name="content">Template A</slot>
</template>`,
        'layouts/b.html': `<template extends="a.html">
  <slot name="content">Template B</slot>
</template>`,
        'page.html': `<template extends="a.html">
  <slot name="content">Page content</slot>
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

      // Should detect circular dependency and handle gracefully
      assert(result.includes('Circular dependency') || result.includes('Page content'));
    });

    it('should handle malformed template syntax', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Default</slot></body>
</html>`,
        'page.html': `<template extends="base.html"
  <slot name="content">Malformed template</slot>
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

      // Should handle malformed syntax gracefully
      assert(result.length > 0);
    });
  });

  describe('Mixed content scenarios', () => {
    it('should handle HTML content before template declaration', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Default</slot></body>
</html>`,
        'page.html': `<!-- This is a comment before template -->
<p>This paragraph is before the template</p>
<template extends="base.html">
  <slot name="content">
    <h1>Template Content</h1>
  </slot>
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

      assert(result.includes('<h1>Template Content</h1>'));
    });

    it('should handle multiple template declarations', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Default</slot></body>
</html>`,
        'page.html': `<template extends="base.html">
  <slot name="content">First template</slot>
</template>
<template extends="base.html">
  <slot name="content">Second template</slot>
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

      // Should process first template found
      assert(result.includes('First template') || result.includes('Second template'));
    });
  });
});