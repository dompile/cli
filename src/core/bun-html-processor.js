/**
 * Bun HTMLRewriter integration for Unify CLI
 * Replaces jsdom with streaming HTML processing
 */

import fs from 'fs/promises';
import path from 'path';
import { runtime, ensureBunFeature } from '../utils/runtime-detector.js';
import { logger } from '../utils/logger.js';
import { resolveIncludePath, isPathWithinDirectory } from '../utils/path-resolver.js';

export class BunHtmlProcessor {
  constructor() {
    if (runtime.isBun) {
      ensureBunFeature('htmlRewriter');
    }
  }

  /**
   * Process HTML content with include expansion using HTMLRewriter
   * @param {string} htmlContent - HTML content to process
   * @param {string} filePath - Path to the HTML file
   * @param {string} sourceRoot - Source root directory
   * @param {Object} config - Processing configuration
   * @returns {Promise<string>} Processed HTML content
   */
  async processIncludes(htmlContent, filePath, sourceRoot, config = {}) {
    if (!runtime.isBun) {
      // Fallback to existing processor for Node.js
      const { processHtmlUnified } = await import('./unified-html-processor.js');
      return processHtmlUnified(htmlContent, filePath, sourceRoot, null, config);
    }

    const rewriter = new HTMLRewriter();
    const includePaths = [];
    let transformedContent = htmlContent;

    // Handle SSI-style includes
    rewriter.on('*', {
      comments(comment) {
        const commentText = comment.text;
        const includeMatch = commentText.match(/^#include\s+(virtual|file)="([^"]+)"\s*$/);
        
        if (includeMatch) {
          const [, type, includePath] = includeMatch;
          this.processIncludeDirective(comment, type, includePath, filePath, sourceRoot, config);
        }
      }
    });

    // Handle modern DOM includes
    rewriter.on('include', {
      async element(element) {
        const src = element.getAttribute('src');
        if (src) {
          await this.processIncludeElement(element, src, filePath, sourceRoot, config);
        }
      }
    });

    // Process slots for layout system
    rewriter.on('slot', {
      element(element) {
        const name = element.getAttribute('name');
        if (name) {
          element.replace(`<!-- slot:${name} -->`, { html: true });
        }
      }
    });

    // Transform the HTML
    try {
      return rewriter.transform(transformedContent);
    } catch (error) {
      logger.error(`HTMLRewriter transformation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process SSI include directive
   */
  async processIncludeDirective(comment, type, includePath, filePath, sourceRoot, config) {
    try {
      const resolvedPath = this.resolveIncludePath(type, includePath, filePath, sourceRoot);
      const includeContent = await fs.readFile(resolvedPath, 'utf-8');
      
      // Recursively process nested includes in the included content
      const processedContent = await this.processIncludes(includeContent, resolvedPath, sourceRoot, config);
      
      comment.replace(processedContent, { html: true });
      logger.debug(`Processed include: ${includePath} -> ${resolvedPath}`);
    } catch (error) {
      logger.warn(`Include not found: ${includePath} in ${filePath}`);
      comment.replace(`<!-- Include not found: ${includePath} -->`, { html: true });
    }
  }

  /**
   * Process modern include element
   */
  async processIncludeElement(element, src, filePath, sourceRoot, config) {
    try {
      const resolvedPath = this.resolveIncludePath('file', src, filePath, sourceRoot);
      const includeContent = await fs.readFile(resolvedPath, 'utf-8');
      
      // Recursively process nested includes in the included content
      const processedContent = await this.processIncludes(includeContent, resolvedPath, sourceRoot, config);
      
      element.setInnerContent(processedContent, { html: true });
      logger.debug(`Processed include element: ${src} -> ${resolvedPath}`);
    } catch (error) {
      logger.warn(`Include element not found: ${src} in ${filePath}`);
      element.setInnerContent(`<!-- Include not found: ${src} -->`, { html: true });
    }
  }

  /**
   * Resolve include path based on type
   */
  resolveIncludePath(type, includePath, currentFile, sourceRoot) {
    if (type === 'file') {
      // Relative to current file
      return resolveIncludePath(type, includePath, currentFile, sourceRoot);
    } else {
      // Virtual - relative to source root
      return resolveIncludePath(type, includePath, currentFile, sourceRoot);
    }
  }

  /**
   * Optimize HTML content with HTMLRewriter
   * @param {string} html - HTML content to optimize
   * @returns {string} Optimized HTML
   */
  async optimizeHtml(html) {
    if (!runtime.isBun) {
      return html; // Skip optimization on Node.js
    }

    const rewriter = new HTMLRewriter();

    // Remove unnecessary whitespace (basic optimization)
    rewriter.on('*', {
      text(text) {
        if (text.lastInTextNode) {
          // Collapse multiple whitespace into single space
          const optimized = text.text.replace(/\s+/g, ' ');
          if (optimized !== text.text) {
            text.replace(optimized);
          }
        }
      }
    });

    // Optimize attributes (remove empty ones)
    rewriter.on('*', {
      element(element) {
        // Remove empty class attributes
        const classAttr = element.getAttribute('class');
        if (classAttr === '') {
          element.removeAttribute('class');
        }
        
        // Remove empty id attributes
        const idAttr = element.getAttribute('id');
        if (idAttr === '') {
          element.removeAttribute('id');
        }
      }
    });

    return rewriter.transform(html);
  }

  /**
   * Extract metadata from HTML using HTMLRewriter
   * @param {string} html - HTML content
   * @returns {Object} Extracted metadata
   */
  async extractMetadata(html) {
    if (!runtime.isBun) {
      return {}; // Fallback for Node.js
    }

    const metadata = {
      title: '',
      description: '',
      keywords: [],
      openGraph: {}
    };

    const rewriter = new HTMLRewriter();

    // Extract title
    rewriter.on('title', {
      text(text) {
        metadata.title += text.text;
      }
    });

    // Extract meta tags
    rewriter.on('meta', {
      element(element) {
        const name = element.getAttribute('name');
        const property = element.getAttribute('property');
        const content = element.getAttribute('content');

        if (name === 'description' && content) {
          metadata.description = content;
        } else if (name === 'keywords' && content) {
          metadata.keywords = content.split(',').map(k => k.trim());
        } else if (property && property.startsWith('og:') && content) {
          const ogKey = property.replace('og:', '');
          metadata.openGraph[ogKey] = content;
        }
      }
    });

    // Transform to trigger handlers (we don't need the output)
    rewriter.transform(html);
    
    return metadata;
  }
}
