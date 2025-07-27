// Quick test file to debug unified processing with DOM templating
import fs from 'fs/promises';
import { processHtmlUnified } from '../src/core/unified-html-processor.js';
import { DependencyTracker } from '../src/core/dependency-tracker.js';

const testHTML = `
<div data-layout="/layouts/default.html">
  <template data-slot="title">My Test Title</template>
  <h1>Main Content</h1>
  <p>This should go in the default slot.</p>
</div>
`;

const layoutHTML = `
<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default Title</slot></title>
</head>
<body>
  <main><slot></slot></main>
</body>
</html>
`;

// Write test files
await fs.mkdir('./test-dom/layouts', { recursive: true });
await fs.writeFile('./test-dom/layouts/default.html', layoutHTML);

try {
  const dependencyTracker = new DependencyTracker();
  const config = {
    layoutsDir: 'layouts',
    componentsDir: 'components'
  };
  
  const result = await processHtmlUnified(testHTML, './test.html', './test-dom', dependencyTracker, config);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
}