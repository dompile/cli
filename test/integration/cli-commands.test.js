/**
 * Comprehensive CLI Commands and Options Test
 * Tests all CLI commands, arguments, and edge cases
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { createTempDirectory, cleanupTempDirectory, createTestStructure } from '../fixtures/temp-helper.js';

const cliPath = path.resolve(process.cwd(), 'bin/cli.js');

describe('CLI Commands and Options', () => {
  let tempDir;
  let sourceDir;
  let outputDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    sourceDir = path.join(tempDir, 'src');
    outputDir = path.join(tempDir, 'dist');
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  describe('Build Command', () => {
    it('should build with default arguments', async () => {
      const structure = {
        'src/index.html': '<h1>Default Build Test</h1>',
        'src/about.html': '<h1>About Page</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, ['build']);
      
      assert.strictEqual(result.code, 0, `Build failed: ${result.stderr}`);
      
      const indexExists = await fileExists(path.join(outputDir, 'index.html'));
      const aboutExists = await fileExists(path.join(outputDir, 'about.html'));
      
      assert(indexExists, 'index.html should exist in output');
      assert(aboutExists, 'about.html should exist in output');
    });

    it('should build with custom source and output directories', async () => {
      const customSource = path.join(tempDir, 'content');
      const customOutput = path.join(tempDir, 'build');

      const structure = {
        'content/index.html': '<h1>Custom Directories</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', customSource,
        '--output', customOutput
      ]);

      assert.strictEqual(result.code, 0);
      
      const indexExists = await fileExists(path.join(customOutput, 'index.html'));
      assert(indexExists, 'Should build to custom output directory');
    });

    it('should build with short flags', async () => {
      const structure = {
        'content/index.html': '<div data-layout="base.html"><template data-slot="content">Content</template></div>',
        'templates/base.html': '<!DOCTYPE html><html><body><slot name="content">Default</slot></body></html>',
        'includes/header.html': '<header>Header</header>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '-s', path.join(tempDir, 'content'),
        '-o', outputDir,
        '-l', path.join(tempDir, 'templates'),
        '-c', path.join(tempDir, 'includes')
      ]);

      assert.strictEqual(result.code, 0);
      
      const content = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
      assert(content.includes('<!DOCTYPE html>'));
    });

    it('should build with pretty URLs option', async () => {
      const structure = {
        'src/index.md': '# Home',
        'src/about.md': '# About'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir,
        '--pretty-urls'
      ]);

      assert.strictEqual(result.code, 0);
      
      // With pretty URLs, about.md should become about/index.html
      const aboutDirExists = await fileExists(path.join(outputDir, 'about', 'index.html'));
      assert(aboutDirExists, 'Pretty URLs should create about/index.html');
    });

    it('should generate sitemap with custom base URL', async () => {
      const structure = {
        'src/index.html': '<h1>Home</h1>',
        'src/about.html': '<h1>About</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir,
        '--base-url', 'https://custom.example.com'
      ]);

      assert.strictEqual(result.code, 0);
      
      const sitemapExists = await fileExists(path.join(outputDir, 'sitemap.xml'));
      assert(sitemapExists, 'Sitemap should be generated');
      
      const sitemapContent = await fs.readFile(path.join(outputDir, 'sitemap.xml'), 'utf-8');
      assert(sitemapContent.includes('https://custom.example.com'), 'Should use custom base URL');
    });

    it('should clean output directory when specified', async () => {
      // Create existing files in output directory
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, 'old-file.html'), 'old content');

      const structure = {
        'src/index.html': '<h1>New Content</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir,
        '--clean'
      ]);

      assert.strictEqual(result.code, 0);
      
      const oldFileExists = await fileExists(path.join(outputDir, 'old-file.html'));
      const newFileExists = await fileExists(path.join(outputDir, 'index.html'));
      
      assert(!oldFileExists, 'Old file should be removed with --clean');
      assert(newFileExists, 'New file should exist');
    });

    it('should handle no-sitemap option', async () => {
      const structure = {
        'src/index.html': '<h1>No Sitemap Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir,
        '--no-sitemap'
      ]);

      assert.strictEqual(result.code, 0);
      
      const sitemapExists = await fileExists(path.join(outputDir, 'sitemap.xml'));
      assert(!sitemapExists, 'Sitemap should not be generated with --no-sitemap');
    });
  });

  describe('Serve Command', () => {
    it('should start development server on default port', async () => {
      const structure = {
        'src/index.html': '<h1>Server Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      // First build the site
      await runCLI(tempDir, ['build', '--source', sourceDir, '--output', outputDir]);

      // Start server (will timeout after short period)
      const result = await runCLI(tempDir, [
        'serve',
        '--source', outputDir,
        '--port', '3001'
      ], 2000); // 2 second timeout

      // Server should start successfully (will be killed by timeout)
      assert(result.stdout.includes('3001') || result.stderr.includes('3001'), 
             'Should mention the port number');
    });

    it('should serve with custom port', async () => {
      const structure = {
        'src/index.html': '<h1>Custom Port Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      await runCLI(tempDir, ['build', '--source', sourceDir, '--output', outputDir]);

      const result = await runCLI(tempDir, [
        'serve',
        '--source', outputDir,
        '--port', '8080'
      ], 2000);

      assert(result.stdout.includes('8080') || result.stderr.includes('8080'), 
             'Should use custom port');
    });

    it('should serve with short port flag', async () => {
      const structure = {
        'src/index.html': '<h1>Short Flag Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      await runCLI(tempDir, ['build', '--source', sourceDir, '--output', outputDir]);

      const result = await runCLI(tempDir, [
        'serve',
        '--source', outputDir,
        '-p', '9000'
      ], 2000);

      assert(result.stdout.includes('9000') || result.stderr.includes('9000'), 
             'Should use short flag for port');
    });
  });

  describe('Watch Command', () => {
    it('should start file watcher', async () => {
      const structure = {
        'src/index.html': '<h1>Watch Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'watch',
        '--source', sourceDir,
        '--output', outputDir
      ], 3000);

      // Watch should start and begin monitoring
      assert(result.stdout.includes('Watching') || result.stderr.includes('Watching') ||
             result.stdout.includes('Server') || result.stderr.includes('Server'), 
             'Should start watching for changes');
    });

  });

  describe('Help and Version', () => {
    it('should show help with --help', async () => {
      const result = await runCLI(tempDir, ['--help']);
      
      assert(result.stdout.includes('Usage') || result.stdout.includes('Commands') ||
             result.stdout.includes('build') || result.stdout.includes('serve'), 
             'Should show help information');
    });

    it('should show help with -h', async () => {
      const result = await runCLI(tempDir, ['-h']);
      
      assert(result.stdout.includes('Usage') || result.stdout.includes('Commands'), 
             'Should show help with short flag');
    });

    it('should show version with --version', async () => {
      const result = await runCLI(tempDir, ['--version']);
      
      assert(result.stdout.match(/\d+\.\d+\.\d+/) || result.stderr.match(/\d+\.\d+\.\d+/), 
             'Should show version number');
    });

    it('should show version with -v', async () => {
      const result = await runCLI(tempDir, ['-v']);
      
      assert(result.stdout.match(/\d+\.\d+\.\d+/) || result.stderr.match(/\d+\.\d+\.\d+/), 
             'Should show version with short flag');
    });

    it('should show help for specific commands', async () => {
      const result = await runCLI(tempDir, ['build', '--help']);
      
      assert(result.stdout.includes('build') || result.stdout.includes('source') ||
             result.stdout.includes('output'), 
             'Should show build command help');
    });
  });

  describe('Default Command Behavior', () => {
    it('should default to build when no command specified', async () => {
      const structure = {
        'src/index.html': '<h1>Default Command Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        '--source', sourceDir,
        '--output', outputDir
      ]);

      assert.strictEqual(result.code, 0, 'Should successfully run default build command');
      
      const indexExists = await fileExists(path.join(outputDir, 'index.html'));
      assert(indexExists, 'Should build files with default command');
    });

    it('should work with only flags and no command', async () => {
      const structure = {
        'src/index.html': '<h1>Flags Only Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        '--source', sourceDir,
        '--output', outputDir,
        '--pretty-urls'
      ]);

      assert.strictEqual(result.code, 0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands', async () => {
      const result = await runCLI(tempDir, ['unknown-command']);
      
      assert.notStrictEqual(result.code, 0, 'Should fail for unknown command');
      assert(result.stderr.includes('Unknown') || result.stderr.includes('Invalid'), 
             'Should show error for unknown command');
    });

    it('should handle unknown options', async () => {
      const result = await runCLI(tempDir, ['build', '--unknown-option']);
      
      assert.notStrictEqual(result.code, 0, 'Should fail for unknown option');
    });

    it('should handle missing required values', async () => {
      const result = await runCLI(tempDir, ['build', '--source']);
      
      assert.notStrictEqual(result.code, 0, 'Should fail when option value is missing');
    });

    it('should handle invalid source directory', async () => {
      const result = await runCLI(tempDir, [
        'build',
        '--source', '/nonexistent/directory',
        '--output', outputDir
      ]);
      
      assert.notStrictEqual(result.code, 0, 'Should fail for nonexistent source directory');
    });

    it('should handle permission errors gracefully', async () => {
      const structure = {
        'src/index.html': '<h1>Permission Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      // Try to output to system directory (should fail gracefully)
      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', '/root/forbidden'
      ]);
      
      assert.notStrictEqual(result.code, 0, 'Should fail for permission errors');
      assert(result.stderr.includes('Error') || result.stderr.includes('permission') ||
             result.stderr.includes('EACCES') || result.stderr.includes('ENOENT'), 
             'Should show appropriate error message');
    });
  });

  describe('Configuration File Support', () => {
    it('should work without configuration file', async () => {
      const structure = {
        'src/index.html': '<h1>No Config Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir
      ]);

      assert.strictEqual(result.code, 0, 'Should work without config file');
    });

    it('should handle CLI args priority over defaults', async () => {
      const structure = {
        'custom-source/index.html': '<h1>CLI Priority Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      const customSource = path.join(tempDir, 'custom-source');
      const customOutput = path.join(tempDir, 'custom-output');

      const result = await runCLI(tempDir, [
        'build',
        '--source', customSource,
        '--output', customOutput
      ]);

      assert.strictEqual(result.code, 0);
      
      const indexExists = await fileExists(path.join(customOutput, 'index.html'));
      assert(indexExists, 'Should use CLI args over defaults');
    });
  });

  describe('Mixed Flag Formats', () => {
    it('should handle mixed long and short flags', async () => {
      const structure = {
        'content/index.html': '<div data-layout="base.html"><template data-slot="content">Mixed Flags</template></div>',
        'templates/base.html': '<!DOCTYPE html><html><body><slot name="content">Default</slot></body></html>'
      };

      await createTestStructure(tempDir, structure);

      const result = await runCLI(tempDir, [
        'build',
        '-s', path.join(tempDir, 'content'),
        '--output', outputDir,
        '-l', path.join(tempDir, 'templates'),
        '--pretty-urls',
        '-p', '3000' // This would be for serve, but testing parsing
      ]);

      assert.strictEqual(result.code, 0, 'Should handle mixed flag formats');
    });

    it('should handle flag order variations', async () => {
      const structure = {
        'src/index.html': '<h1>Flag Order Test</h1>'
      };

      await createTestStructure(tempDir, structure);

      // Test flags before command
      const result1 = await runCLI(tempDir, [
        '--source', sourceDir,
        '--output', outputDir,
        'build'
      ]);

      // Test flags after command
      const result2 = await runCLI(tempDir, [
        'build',
        '--source', sourceDir,
        '--output', outputDir
      ]);

      // At least one should work (depending on implementation)
      assert(result1.code === 0 || result2.code === 0, 
             'Should handle flag order variations');
    });
  });
});

/**
 * Helper function to run CLI command
 */
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

/**
 * Helper function to check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}