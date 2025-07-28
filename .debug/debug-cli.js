import { createTempDirectory, createTestStructure } from '../test/fixtures/temp-helper.js';
import { spawn } from 'child_process';
import path from 'path';

const cliPath = path.resolve('/home/founder3/code/github/dompile/cli/bin/cli.js');

async function runCLI(workingDir, args, timeout = 10000) {
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: workingDir,
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
      resolve({ code, stdout, stderr });
    });

    // Set timeout
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: -1, stdout, stderr: stderr + '\nTimeout' });
    }, timeout);

    child.on('close', () => {
      clearTimeout(timer);
    });
  });
}

const tempDir = await createTempDirectory();
const outputDir = path.join(tempDir, 'output');

const structure = {
  'content/index.html': '<div data-layout="base.html"><template data-slot="content">Content</template></div>',
  'templates/base.html': '<!DOCTYPE html><html><body><slot name="content">Default</slot></body></html>',
  'includes/header.html': '<header>Header</header>'
};

await createTestStructure(tempDir, structure);

console.log('Running CLI with short flags...');
const result = await runCLI(tempDir, [
  'build',
  '-s', path.join(tempDir, 'content'),
  '-o', outputDir,
  '-l', path.join(tempDir, 'templates'),
  '-c', path.join(tempDir, 'includes')
]);

console.log('Exit code:', result.code);
console.log('Stdout:', result.stdout);
console.log('Stderr:', result.stderr);
