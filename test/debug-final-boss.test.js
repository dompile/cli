/**
 * Quick test to debug the final boss sitemap issue
 */

import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { runCLI } from './test-utils.js';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from './fixtures/temp-helper.js';

describe('Final Boss Debug', () => {
  let tempDir, sourceDir, outputDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  it('should debug sitemap generation', async () => {
    // Create a minimal structure that reproduces the issue
    const structure = {
      'package.json': JSON.stringify({
        name: 'debug-test-site',
        homepage: 'https://debug.example.com',
        version: '1.0.0'
      }, null, 2),

      'src/layouts/base.html': `<!DOCTYPE html>
<html>
<head><title><slot name="title">Test</slot></title></head>
<body><slot name="content">Default</slot></body>
</html>`,

      'src/index.html': `<div data-layout="/layouts/base.html">
  <template data-slot="title">Home Page</template>
  <template data-slot="content">
    <h1>Welcome</h1>
    <img src="/assets/images/logo.png" alt="Logo" />
  </template>
</div>`,

      'src/assets/images/logo.png': 'FAKE_PNG_DATA',
      'src/assets/styles/main.css': 'body { margin: 0; }'
    };

    await createTestStructure(tempDir, structure);

    // Run the CLI build
    const buildResult = await runBuild(tempDir, sourceDir, outputDir);
    
    console.log('Build result code:', buildResult.code);
    console.log('Build stdout:', buildResult.stdout);
    if (buildResult.stderr) {
      console.log('Build stderr:', buildResult.stderr);
    }

    expect(buildResult.code).toBe(0);

    // Check the generated index.html content
    const indexExists = await fs.access(path.join(outputDir, 'index.html'))
      .then(() => true).catch(() => false);
    console.log('Index exists:', indexExists);

    if (indexExists) {
      const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      console.log('Generated index.html content:');
      console.log('------------------------');
      console.log(indexContent);
      console.log('------------------------');
      
      const hasDoctype = indexContent.includes('<!DOCTYPE html>');
      console.log('Has DOCTYPE:', hasDoctype);
      
      expect(hasDoctype).toBe(true);
    }

    // Check if assets were copied
    const logoExists = await fs.access(path.join(outputDir, 'assets/images/logo.png'))
      .then(() => true).catch(() => false);
    console.log('Logo copied:', logoExists);
    
    expect(logoExists).toBe(true);
  });
});

async function runBuild(workingDir, sourceDir, outputDir) {
  const args = [
    'build',
    '--source', sourceDir,
    '--output', outputDir
  ];

  return await runCLI(args, { cwd: workingDir });
}
