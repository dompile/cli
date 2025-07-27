import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugNestedTemplate() {
  const sourceDir = '/tmp/debug-nested-template';

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

  try {
    await createTestStructure(sourceDir, structure);

    const dependencyTracker = new DependencyTracker();
    const config = {
      sourceRoot: sourceDir,
      layoutsDir: 'layouts',
      componentsDir: 'components'
    };

    const result = await processHtmlUnified(
      structure['article.html'],
      join(sourceDir, 'article.html'),
      sourceDir,
      dependencyTracker,
      config
    );

    console.log('RESULT:');
    console.log(result);
    console.log('\nCHECKS:');
    console.log('Has title:', result.includes('<title>Article Title</title>'));
    console.log('Has header:', result.includes('<h1>Article Header</h1>'));
    console.log('Has article:', result.includes('<article>Article content here</article>'));
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugNestedTemplate();
