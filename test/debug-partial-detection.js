/**
 * Debug test for partial file detection
 */

import { isPartialFile } from '../src/utils/path-resolver.js';
import path from 'path';

// Test with the advanced example configuration
const config = {
  components: path.resolve('/home/founder3/code/github/dompile/cli/example/advanced/src/custom_components/'),
  layouts: path.resolve('/home/founder3/code/github/dompile/cli/example/advanced/src/site_layouts/')
};

const testFiles = [
  '/home/founder3/code/github/dompile/cli/example/advanced/src/index.html',
  '/home/founder3/code/github/dompile/cli/example/advanced/src/about.html',
  '/home/founder3/code/github/dompile/cli/example/advanced/src/custom_components/alert.html',
  '/home/founder3/code/github/dompile/cli/example/advanced/src/custom_components/card.html',
  '/home/founder3/code/github/dompile/cli/example/advanced/src/site_layouts/default.html',
  '/home/founder3/code/github/dompile/cli/example/advanced/src/site_layouts/blog.html'
];

console.log('=== PARTIAL FILE DETECTION TEST ===');
console.log('Components dir:', config.components);
console.log('Layouts dir:', config.layouts);
console.log('');

for (const filePath of testFiles) {
  const isPartial = isPartialFile(filePath, config);
  console.log(`${isPartial ? '✓' : '✗'} ${path.relative('/home/founder3/code/github/dompile/cli/example/advanced/src/', filePath)} - ${isPartial ? 'PARTIAL' : 'CONTENT'}`);
}
