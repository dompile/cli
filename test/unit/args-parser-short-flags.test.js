/**
 * Tests for short argument flags
 * Verifies -c and -l flags work correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgs } from '../../src/cli/args-parser.js';

describe('Short Argument Flags', () => {
  describe('-c flag for components', () => {
    it('should parse -c as components directory', () => {
      const args = parseArgs(['build', '-c', 'partials']);
      
      assert.strictEqual(args.command, 'build');
      assert.strictEqual(args.components, 'partials');
    });

    it('should work with other arguments', () => {
      const args = parseArgs(['build', '-s', 'src', '-c', 'includes', '-o', 'dist']);
      
      assert.strictEqual(args.source, 'src');
      assert.strictEqual(args.components, 'includes');
      assert.strictEqual(args.output, 'dist');
    });

    it('should fail when -c has no value', () => {
      assert.throws(() => {
        parseArgs(['build', '-c']);
      }, /Unknown option/);
    });
  });

  describe('-l flag for layouts', () => {
    it('should parse -l as layouts directory', () => {
      const args = parseArgs(['build', '-l', 'templates']);
      
      assert.strictEqual(args.command, 'build');
      assert.strictEqual(args.layouts, 'templates');
    });

    it('should work with components flag', () => {
      const args = parseArgs(['build', '-c', 'partials', '-l', 'templates']);
      
      assert.strictEqual(args.components, 'partials');
      assert.strictEqual(args.layouts, 'templates');
    });

    it('should work with long form', () => {
      const args = parseArgs(['build', '--components', 'partials', '-l', 'templates']);
      
      assert.strictEqual(args.components, 'partials');
      assert.strictEqual(args.layouts, 'templates');
    });
  });

  describe('Mixed short and long flags', () => {
    it('should handle all combinations', () => {
      const args = parseArgs([
        'serve',
        '-s', 'content',
        '--output', 'public',
        '-l', 'templates',
        '--components', 'partials',
        '-p', '8080'
      ]);
      
      assert.strictEqual(args.command, 'serve');
      assert.strictEqual(args.source, 'content');
      assert.strictEqual(args.output, 'public');
      assert.strictEqual(args.layouts, 'templates');
      assert.strictEqual(args.components, 'partials');
      assert.strictEqual(args.port, 8080);
    });
  });

  describe('Backwards compatibility', () => {
    it('should still support long flags', () => {
      const args = parseArgs(['build', '--components', 'includes', '--layouts', 'templates']);
      
      assert.strictEqual(args.components, 'includes');
      assert.strictEqual(args.layouts, 'templates');
    });

    it('should prefer last value when flag specified multiple times', () => {
      const args = parseArgs(['build', '-c', 'first', '--components', 'second']);
      
      assert.strictEqual(args.components, 'second');
    });
  });
});