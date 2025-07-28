#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, 'bin/cli.js');

// Create temp test structure
const tempDir = '/tmp/dompile-debug-mixed-flags';
await fs.rm(tempDir, { recursive: true, force: true });
await fs.mkdir(tempDir, { recursive: true });

const structure = {
  'content/index.html': '<div data-layout="base.html"><template data-slot="content">Mixed Flags</template></div>',
  'templates/base.html': '<!DOCTYPE html><html><body><slot name="content">Default</slot></body></html>'
};

// Create test structure
for (const [filePath, content] of Object.entries(structure)) {
  const fullPath = path.join(tempDir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
}

const outputDir = path.join(tempDir, 'dist');

// Run the CLI command
const child = spawn('node', [
  cliPath,
  'build',
  '-s', path.join(tempDir, 'content'),
  '--output', outputDir,
  '-l', path.join(tempDir, 'templates'),
  '--pretty-urls',
  '-p', '3000'
], {
  cwd: tempDir,
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
  
  // Clean up
  fs.rm(tempDir, { recursive: true, force: true });
});
