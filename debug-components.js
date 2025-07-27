import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugComponentsWithTemplates() {
  const sourceDir = '/tmp/debug-components-templates';

  // Test case: components with their own templates
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
    console.log('Has card div:', result.includes('<div class="card">'));
    console.log('Has card title:', result.includes('<h3>My Card Title</h3>'));
    console.log('Has card content:', result.includes('This is custom card content'));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugComponentsWithTemplates();
