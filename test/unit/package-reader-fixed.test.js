/**
 * Tests for package.json reading and baseUrl resolution
 * Verifies package.json homepage extraction for sitemap generation
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { readPackageJson, findPackageJson, getBaseUrlFromPackage } from '../../src/utils/package-reader.js';
import { createTempDirectory, cleanupTempDirectory, createTestFile } from '../fixtures/temp-helper.js';

describe('Package.json Reading', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
      tempDir = null;
    }
  });

  describe('readPackageJson', () => {
    it('should read valid package.json', async () => {
      const packageContent = {
        name: 'test-project',
        version: '1.0.0',
        homepage: 'https://example.com'
      };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent, null, 2));
      
      const result = await readPackageJson(tempDir);
      
      assert.strictEqual(result.name, 'test-project');
      assert.strictEqual(result.homepage, 'https://example.com');
    });

    it('should return null for missing package.json', async () => {
      const result = await readPackageJson(tempDir);
      assert.strictEqual(result, null);
    });

    it('should return null for invalid JSON', async () => {
      await createTestFile(tempDir, 'package.json', '{ invalid json }');
      
      const result = await readPackageJson(tempDir);
      assert.strictEqual(result, null);
    });

    it('should handle package.json with no homepage', async () => {
      const packageContent = {
        name: 'test-project',
        version: '1.0.0'
      };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      const result = await readPackageJson(tempDir);
      
      assert.strictEqual(result.name, 'test-project');
      assert.strictEqual(result.homepage, undefined);
    });
  });

  describe('findPackageJson', () => {
    it('should find package.json in current directory', async () => {
      const packageContent = { name: 'current-dir', homepage: 'https://current.com' };
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      const result = await findPackageJson(tempDir);
      
      assert.strictEqual(result.name, 'current-dir');
      assert.strictEqual(result.homepage, 'https://current.com');
    });

    it('should find package.json in parent directory', async () => {
      const subDir = path.join(tempDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      
      const packageContent = { name: 'parent-dir', homepage: 'https://parent.com' };
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      const result = await findPackageJson(subDir);
      
      assert.strictEqual(result.name, 'parent-dir');
      assert.strictEqual(result.homepage, 'https://parent.com');
    });

    it('should find closest package.json', async () => {
      // Create nested structure with multiple package.json files
      const subDir = path.join(tempDir, 'sub', 'nested');
      await fs.mkdir(subDir, { recursive: true });
      
      const rootPackage = { name: 'root', homepage: 'https://root.com' };
      const subPackage = { name: 'sub', homepage: 'https://sub.com' };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(rootPackage));
      await createTestFile(path.join(tempDir, 'sub'), 'package.json', JSON.stringify(subPackage));
      
      const result = await findPackageJson(subDir);
      
      // Should find the closer one
      assert.strictEqual(result.name, 'sub');
      assert.strictEqual(result.homepage, 'https://sub.com');
    });

    it('should return null when no package.json found', async () => {
      const deepDir = path.join(tempDir, 'very', 'deep', 'nested', 'dir');
      await fs.mkdir(deepDir, { recursive: true });
      
      const result = await findPackageJson(deepDir);
      assert.strictEqual(result, null);
    });
  });

  describe('getBaseUrlFromPackage', () => {
    it('should use homepage from package.json', async () => {
      const packageContent = {
        name: 'test-site',
        homepage: 'https://mysite.com'
      };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      const baseUrl = await getBaseUrlFromPackage(tempDir);
      
      assert.strictEqual(baseUrl, 'https://mysite.com');
    });

    it('should use fallback when no package.json', async () => {
      const baseUrl = await getBaseUrlFromPackage(tempDir, 'https://fallback.com');
      
      assert.strictEqual(baseUrl, 'https://fallback.com');
    });

    it('should use fallback when no homepage field', async () => {
      const packageContent = {
        name: 'test-site',
        version: '1.0.0'
      };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      const baseUrl = await getBaseUrlFromPackage(tempDir, 'https://fallback.com');
      
      assert.strictEqual(baseUrl, 'https://fallback.com');
    });

    it('should use default fallback', async () => {
      const baseUrl = await getBaseUrlFromPackage(tempDir);
      
      assert.strictEqual(baseUrl, 'https://example.com');
    });

    it('should handle various homepage URL formats', async () => {
      const testCases = [
        'https://example.com',
        'https://example.com/',
        'http://example.com',
        'https://subdomain.example.com/path',
        'https://user.github.io/repo'
      ];

      for (const homepage of testCases) {
        const packageContent = { name: 'test', homepage };
        await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
        
        const baseUrl = await getBaseUrlFromPackage(tempDir);
        assert.strictEqual(baseUrl, homepage);
        
        // Clean up for next iteration
        const packagePath = path.join(tempDir, 'package.json');
        try {
          await fs.unlink(packagePath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }
    });
  });

  describe('Integration with build process', () => {
    it('should resolve baseUrl precedence correctly', async () => {
      const packageContent = {
        name: 'test-site',
        homepage: 'https://package.example.com'
      };
      
      await createTestFile(tempDir, 'package.json', JSON.stringify(packageContent));
      
      // Test precedence: CLI arg > package.json > default
      
      // 1. No CLI arg provided, should use package.json
      const fromPackage = await getBaseUrlFromPackage(tempDir, 'https://example.com');
      assert.strictEqual(fromPackage, 'https://package.example.com');
      
      // 2. Different fallback provided, should still use package.json
      const withFallback = await getBaseUrlFromPackage(tempDir, 'https://different.com');
      assert.strictEqual(withFallback, 'https://package.example.com');
    });

    it('should work with monorepo structure', async () => {
      // Simulate monorepo: project/packages/site/
      const packagesDir = path.join(tempDir, 'packages');
      const siteDir = path.join(packagesDir, 'site');
      await fs.mkdir(siteDir, { recursive: true });
      
      // Root package.json
      const rootPackage = { name: 'monorepo-root', homepage: 'https://root.com' };
      await createTestFile(tempDir, 'package.json', JSON.stringify(rootPackage));
      
      // Site package.json
      const sitePackage = { name: 'site', homepage: 'https://site.com' };
      await createTestFile(siteDir, 'package.json', JSON.stringify(sitePackage));
      
      // Should find site-specific homepage
      const baseUrl = await getBaseUrlFromPackage(siteDir);
      assert.strictEqual(baseUrl, 'https://site.com');
    });
  });
});
