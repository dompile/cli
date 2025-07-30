/**
 * Debug test for partial file detection
 */

import { isPartialFile } from '../src/utils/path-resolver.js';
import path from 'path';

// Test with the advanced example configuration
const config = {
  components: path.resolve(process.cwd(), 'example/advanced/src/custom_components/'),
  layouts: path.resolve(process.cwd(), 'example/advanced/src/site_layouts/')
};

const baseDir = path.resolve(process.cwd(), 'example/advanced/src');
const testFiles = [
  path.join(baseDir, 'index.html'),
  path.join(baseDir, 'about.html'),
  path.join(baseDir, 'custom_components/alert.html'),
  path.join(baseDir, 'custom_components/card.html'),
  path.join(baseDir, 'site_layouts/default.html'),
  path.join(baseDir, 'site_layouts/blog.html')
];

console.log('=== PARTIAL FILE DETECTION TEST ===');
console.log('Components dir:', config.components);
console.log('Layouts dir:', config.layouts);
console.log('');

for (const filePath of testFiles) {
  const isPartial = isPartialFile(filePath, config);
  console.log(`${isPartial ? '✓' : '✗'} ${path.relative(baseDir, filePath)} - ${isPartial ? 'PARTIAL' : 'CONTENT'}`);
}
