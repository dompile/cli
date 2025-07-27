/**
 * Tests for markdown processor functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasHtmlElement } from '../../src/core/markdown-processor.js';

describe('markdown processor', () => {
  describe('hasHtmlElement', () => {
    it('should detect html element in content', () => {
      const contentWithHtml = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';
      assert.strictEqual(hasHtmlElement(contentWithHtml), true);
    });
    
    it('should detect html element with attributes', () => {
      const contentWithHtml = '<html lang="en" class="theme-dark"><head><title>Test</title></head><body><p>Content</p></body></html>';
      assert.strictEqual(hasHtmlElement(contentWithHtml), true);
    });
    
    it('should detect html element case insensitive', () => {
      const contentWithHtml = '<HTML><HEAD><TITLE>Test</TITLE></HEAD><BODY><P>Content</P></BODY></HTML>';
      assert.strictEqual(hasHtmlElement(contentWithHtml), true);
    });
    
    it('should not detect html element when not present', () => {
      const contentWithoutHtml = '<div><h1>Title</h1><p>Some content</p></div>';
      assert.strictEqual(hasHtmlElement(contentWithoutHtml), false);
    });
    
    it('should not detect html element in plain text', () => {
      const plainText = 'This is just plain text with no HTML elements';
      assert.strictEqual(hasHtmlElement(plainText), false);
    });
    
    it('should not detect partial html matches', () => {
      const partialMatch = '<h1>html is mentioned here</h1>';
      assert.strictEqual(hasHtmlElement(partialMatch), false);
    });
    
    it('should handle empty content', () => {
      assert.strictEqual(hasHtmlElement(''), false);
    });
  });
});