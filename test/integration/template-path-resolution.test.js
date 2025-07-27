/**
 * Integration test for template path resolution fix
 * Verifies templates in layouts/ directory are found correctly
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { processHtmlUnified } from '../../src/core/unified-html-processor.js';
import { DependencyTracker } from '../../src/core/dependency-tracker.js';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

describe('Template Path Resolution Integration', () => {
  let tempDir;
  let sourceDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Template path resolution fix', () => {
    it('should resolve bare template names to layouts directory', async () => {
      const structure = {
        'layouts/default.html': `<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default Title</slot></title>
</head>
<body>
  <slot name="content">Default Content</slot>
</body>
</html>`,
        'page.html': `<template extends="default.html">
  <slot name="title">My Page Title</slot>
  <slot name="content">
    <h1>Welcome</h1>
    <p>This is my page content.</p>
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

      // Should successfully resolve template and process content
      assert(result.includes('<!DOCTYPE html>'));
      assert(result.includes('<title>My Page Title</title>'));
      assert(result.includes('<h1>Welcome</h1>'));
      assert(result.includes('This is my page content.'));
    });

    it('should handle absolute paths correctly', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Default</slot></body>
</html>`,
        'page.html': `<template extends="/layouts/base.html">
  <slot name="content">
    <h1>Absolute Path Content</h1>
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

      assert(result.includes('<h1>Absolute Path Content</h1>'));
    });

    it('should handle relative paths with directories', async () => {
      const structure = {
        'layouts/admin/admin-base.html': `<!DOCTYPE html>
<html>
<body>
  <div class="admin-layout">
    <slot name="content">Admin Default</slot>
  </div>
</body>
</html>`,
        'admin/dashboard.html': `<template extends="layouts/admin/admin-base.html">
  <slot name="content">
    <h1>Admin Dashboard</h1>
    <p>Admin content here</p>
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
        structure['admin/dashboard.html'],
        path.join(sourceDir, 'admin/dashboard.html'),
        config
      );

      assert(result.includes('<div class="admin-layout">'));
      assert(result.includes('<h1>Admin Dashboard</h1>'));
    });

    it('should prevent double directory nesting bug', async () => {
      // This test specifically checks the bug fix where "layouts/layout.html" 
      // was incorrectly resolved to "layouts/layouts/layout.html"
      
      const structure = {
        'layouts/layout.html': `<!DOCTYPE html>
<html>
<body><slot name="content">Layout Content</slot></body>
</html>`,
        'page.html': `<template extends="layouts/layout.html">
  <slot name="content">
    <h1>This should work without double nesting</h1>
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

      // Should successfully process without trying to find layouts/layouts/layout.html
      assert(result.includes('<!DOCTYPE html>'));
      assert(result.includes('<h1>This should work without double nesting</h1>'));
      assert(!result.includes('Template not found'));
    });

    it('should handle nested layout directories correctly', async () => {
      const structure = {
        'layouts/themes/dark.html': `<!DOCTYPE html>
<html class="dark-theme">
<body><slot name="content">Dark Theme Default</slot></body>
</html>`,
        'page.html': `<template extends="themes/dark.html">
  <slot name="content">
    <h1>Dark Theme Page</h1>
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

      assert(result.includes('<html class="dark-theme">'));
      assert(result.includes('<h1>Dark Theme Page</h1>'));
    });
  });

  describe('Error handling for missing templates', () => {
    it('should handle missing bare filename gracefully', async () => {
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

      // Should contain error message and preserve original content
      assert(result.includes('Template not found') || result.includes('Content here'));
    });

    it('should handle missing path with directory gracefully', async () => {
      const structure = {
        'page.html': `<template extends="themes/missing.html">
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

      assert(result.includes('Template not found') || result.includes('Content here'));
    });
  });

  describe('Integration with build process', () => {
    it('should work in full build scenario', async () => {
      const structure = {
        'layouts/base.html': `<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Site Title</slot></title>
  <meta charset="UTF-8">
</head>
<body>
  <header>
    <h1><slot name="header">Default Header</slot></h1>
  </header>
  <main>
    <slot name="content">Default Content</slot>
  </main>
  <footer>
    <slot name="footer">© 2024</slot>
  </footer>
</body>
</html>`,
        'components/nav.html': `<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>`,
        'index.html': `<template extends="base.html">
  <slot name="title">Home - My Site</slot>
  <slot name="header">Welcome to My Site</slot>
  <slot name="content">
    <!--#include virtual="/components/nav.html" -->
    <h2>Home Page</h2>
    <p>Welcome to our website!</p>
  </slot>
  <slot name="footer">© 2024 My Company</slot>
</template>`,
        'about.html': `<template extends="base.html">
  <slot name="title">About - My Site</slot>
  <slot name="header">About Us</slot>
  <slot name="content">
    <!--#include virtual="/components/nav.html" -->
    <h2>About Page</h2>
    <p>Learn more about us.</p>
  </slot>
</template>`
      };

      await createTestStructure(sourceDir, structure);

      const config = {
        sourceRoot: sourceDir,
        layoutsDir: 'layouts',
        componentsDir: 'components'
      };

      // Test index.html
      const indexResult = await processUnifiedHtml(
        structure['index.html'],
        path.join(sourceDir, 'index.html'),
        config
      );

      assert(indexResult.includes('<title>Home - My Site</title>'));
      assert(indexResult.includes('<h1>Welcome to My Site</h1>'));
      assert(indexResult.includes('<nav>'));
      assert(indexResult.includes('<a href="/">Home</a>'));
      assert(indexResult.includes('<h2>Home Page</h2>'));
      assert(indexResult.includes('© 2024 My Company'));

      // Test about.html
      const aboutResult = await processUnifiedHtml(
        structure['about.html'],
        path.join(sourceDir, 'about.html'),
        config
      );

      assert(aboutResult.includes('<title>About - My Site</title>'));
      assert(aboutResult.includes('<h1>About Us</h1>'));
      assert(aboutResult.includes('<h2>About Page</h2>'));
    });
  });
});