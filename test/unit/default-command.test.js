/**
 * Tests for default command behavior
 * Verifies CLI defaults to 'build' when no command specified
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgs } from '../../src/cli/args-parser.js';

describe('Default Command Behavior', () => {
  describe('No command specified', () => {
    it('should default to build when only options provided', () => {
      const args = parseArgs(['--source', 'src', '--output', 'dist']);
      
      // parseArgs should not set command, CLI main should default it
      assert.strictEqual(args.command, null);
      assert.strictEqual(args.source, 'src');
      assert.strictEqual(args.output, 'dist');
    });

    it('should handle empty arguments', () => {
      const args = parseArgs([]);
      
      assert.strictEqual(args.command, null);
      assert.strictEqual(args.source, 'src');
      assert.strictEqual(args.output, 'dist');
    });

    it('should handle flags only', () => {
      const args = parseArgs(['--pretty-urls', '--port', '3000']);
      
      assert.strictEqual(args.command, null);
      assert.strictEqual(args.prettyUrls, true);
      assert.strictEqual(args.port, 3000);
    });
  });

  describe('Explicit commands still work', () => {
    it('should parse explicit build command', () => {
      const args = parseArgs(['build', '--source', 'content']);
      
      assert.strictEqual(args.command, 'build');
      assert.strictEqual(args.source, 'content');
    });

    it('should parse serve command', () => {
      const args = parseArgs(['serve', '--port', '8080']);
      
      assert.strictEqual(args.command, 'serve');
      assert.strictEqual(args.port, 8080);
    });

    it('should parse watch command', () => {
      const args = parseArgs(['watch', '--source', 'src']);
      
      assert.strictEqual(args.command, 'watch');
      assert.strictEqual(args.source, 'src');
    });
  });

  describe('Command detection', () => {
    it('should reject unknown commands', () => {
      assert.throws(() => {
        parseArgs(['invalid-command']);
      }, /Unknown command: invalid-command/);
    });

    it('should handle command at any position', () => {
      // Commands should only be first argument
      // This should be treated as an unknown argument, not a command
      assert.throws(() => {
        parseArgs(['--source', 'src', 'build']);
      }, /Unknown option: build/);
    });
  });

  describe('Help and version flags', () => {
    it('should parse help flag without command', () => {
      const args = parseArgs(['--help']);
      
      assert.strictEqual(args.help, true);
      assert.strictEqual(args.command, null);
    });

    it('should parse version flag without command', () => {
      const args = parseArgs(['--version']);
      
      assert.strictEqual(args.version, true);
      assert.strictEqual(args.command, null);
    });

    it('should parse short help flag', () => {
      const args = parseArgs(['-h']);
      
      assert.strictEqual(args.help, true);
    });

    it('should parse short version flag', () => {
      const args = parseArgs(['-v']);
      
      assert.strictEqual(args.version, true);
    });
  });
});