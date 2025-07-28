#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { processIncludes } from './src/core/include-processor.js';

// Create temp directory
const tempDir = '/tmp/debug-large-file';
await fs.rm(tempDir, { recursive: true, force: true });
await fs.mkdir(tempDir, { recursive: true });
await fs.mkdir(path.join(tempDir, 'components'), { recursive: true });

// Create test structure
const largeContent = `<!DOCTYPE html>
<html>
<head><title>Large File Test</title></head>
<body>
${'<p>This is paragraph content that repeats many times to create a large file. '.repeat(10000)}
<!--#include virtual="/components/footer.html" -->
</body>
</html>`;

await fs.writeFile(path.join(tempDir, 'large.html'), largeContent);
await fs.writeFile(path.join(tempDir, 'components', 'footer.html'), '<footer>Footer content</footer>');

console.log('Original content length:', largeContent.length);

try {
  const result = await processIncludes(
    largeContent,
    path.join(tempDir, 'large.html'),
    tempDir
  );
  
  console.log('Processed result length:', result.length);
  console.log('Result includes footer:', result.includes('<footer>Footer content</footer>'));
  console.log('Result > 1MB:', result.length > 1000000);
} catch (error) {
  console.error('Error:', error.message);
}

// Cleanup
await fs.rm(tempDir, { recursive: true, force: true });
