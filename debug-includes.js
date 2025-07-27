import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugIncludesInTemplates() {
  const sourceDir = '/tmp/debug-includes-templates';

  // Test case: includes within template slots
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

  try {
    await createTestStructure(sourceDir, structure);

    const config = {
      sourceRoot: sourceDir,
      layoutsDir: 'layouts',
      componentsDir: 'components'
    };

    const dependencyTracker = new DependencyTracker();
    const result = await processHtmlUnified(
      structure['page.html'],
      join(sourceDir, 'page.html'),
      sourceDir,
      dependencyTracker,
      config
    );

    console.log('=== RESULT ===');
    console.log(result);
    console.log('\n=== CHECKS ===');
    console.log('Has meta charset:', result.includes('<meta charset="UTF-8">'));
    console.log('Has viewport:', result.includes('<meta name="viewport"'));
    console.log('Has nav:', result.includes('<nav>'));
    console.log('Has home link:', result.includes('<a href="/">Home</a>'));
    console.log('Has welcome:', result.includes('<h1>Welcome</h1>'));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugIncludesInTemplates();
