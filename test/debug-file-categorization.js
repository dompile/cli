/**
 * Debug what files get categorized during the advanced build
 */

import fs from 'fs/promises';
import path from 'path';
import { isHtmlFile, isPartialFile } from '../src/utils/path-resolver.js';
import { isMarkdownFile } from '../src/core/markdown-processor.js';

const sourceRoot = '/home/founder3/code/github/dompile/cli/example/advanced/src';
const config = {
  source: sourceRoot,
  components: path.resolve('/home/founder3/code/github/dompile/cli/example/advanced/src/custom_components/'),
  layouts: path.resolve('/home/founder3/code/github/dompile/cli/example/advanced/src/site_layouts/')
};

// Function to recursively collect all files
async function collectAllFiles(dirPath) {
  const files = [];
  
  async function walkDir(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  await walkDir(dirPath);
  return files;
}

console.log('=== BUILD FILE CATEGORIZATION DEBUG ===');
console.log('Source root:', sourceRoot);
console.log('Components dir:', config.components);
console.log('Layouts dir:', config.layouts);
console.log('');

const sourceFiles = await collectAllFiles(sourceRoot);

console.log(`Found ${sourceFiles.length} total source files:`);
sourceFiles.forEach(file => {
  const relative = path.relative(sourceRoot, file);
  console.log(`  ${relative}`);
});

console.log('');

// Categorize files like the build process does
const contentFiles = sourceFiles.filter(file => {
  const isPartial = isPartialFile(file, config);
  return (isHtmlFile(file) && !isPartial) || (isMarkdownFile(file) && !isPartial);
});

const assetFiles = sourceFiles.filter(file => 
  !isHtmlFile(file) && !isMarkdownFile(file)
);

const partialFiles = sourceFiles.filter(file => isPartialFile(file, config));

console.log(`CONTENT FILES (${contentFiles.length}):`);
contentFiles.forEach(file => {
  console.log(`  ✓ ${path.relative(sourceRoot, file)}`);
});

console.log('');
console.log(`ASSET FILES (${assetFiles.length}):`);
assetFiles.forEach(file => {
  console.log(`  📁 ${path.relative(sourceRoot, file)}`);
});

console.log('');
console.log(`PARTIAL FILES (${partialFiles.length}):`);
partialFiles.forEach(file => {
  console.log(`  🚫 ${path.relative(sourceRoot, file)}`);
});

console.log('');
console.log('FILES THAT ARE NEITHER CONTENT NOR ASSETS NOR PARTIALS:');
const unaccountedFiles = sourceFiles.filter(file => 
  !contentFiles.includes(file) && 
  !assetFiles.includes(file) && 
  !partialFiles.includes(file)
);
unaccountedFiles.forEach(file => {
  console.log(`  ❓ ${path.relative(sourceRoot, file)}`);
});
