import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugIncludesInTemplateDefinitions() {
  const sourceDir = '/tmp/debug-includes-in-templates';

  // Test case: includes in template definitions
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
    console.log('Has site header:', result.includes('<h1>Site Header</h1>'));
    console.log('Has custom title:', result.includes('<title>Custom Page</title>'));
    console.log('Has page title:', result.includes('<h2>Page Title</h2>'));
    console.log('Has copyright:', result.includes('&copy; 2024 My Site'));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugIncludesInTemplateDefinitions();
