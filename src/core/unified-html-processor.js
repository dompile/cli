/**
 * Unified HTML Processor for unify
 * Handles both SSI-style includes (<!--#include -->) and DOM templating (<template>, <slot>)
 * in a single processing pipeline for consistency and simplicity.
 */

import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { processIncludes } from "./include-processor.js";
import { logger } from "../utils/logger.js";
import { isPathWithinDirectory } from "../utils/path-resolver.js";
import { runtime } from "../utils/runtime-detector.js";
import {
  ComponentError,
  LayoutError,
  FileSystemError,
} from "../utils/errors.js";

// Import Bun HTML processor when available
let BunHtmlProcessor;
if (runtime.isBun) {
  try {
    const { BunHtmlProcessor: BunProcessor } = await import('./bun-html-processor.js');
    BunHtmlProcessor = BunProcessor;
  } catch (error) {
    logger.warn('BunHtmlProcessor not available, falling back to JSDOM');
  }
}

/**
 * Process HTML content with unified support for both SSI includes and DOM templating
 * Uses Bun HTMLRewriter when available, falls back to JSDOM for Node.js
 * @param {string} htmlContent - Raw HTML content to process
 * @param {string} filePath - Path to the HTML file being processed
 * @param {string} sourceRoot - Source root directory
 * @param {DependencyTracker} dependencyTracker - Dependency tracker instance
 * @param {Object} config - Processing configuration
 * @returns {Promise<string>} Processed HTML content
 */
export async function processHtmlUnified(
  htmlContent,
  filePath,
  sourceRoot,
  dependencyTracker,
  config = {}
) {
  const processingConfig = {
    componentsDir: ".components",
    layoutsDir: ".layouts",
    defaultLayout: "default.html",
    ...config,
  };

  try {
    // Use Bun HTMLRewriter if available for better performance
    if (runtime.isBun && BunHtmlProcessor) {
      logger.debug(
        `Using Bun HTMLRewriter for: ${path.relative(sourceRoot, filePath)}`
      );
      
      const bunProcessor = new BunHtmlProcessor();
      
      // Track dependencies before processing
      if (dependencyTracker) {
        dependencyTracker.analyzePage(filePath, htmlContent, sourceRoot);
      }
      
      // Process includes with HTMLRewriter
      let processedContent = await bunProcessor.processIncludes(
        htmlContent,
        filePath,
        sourceRoot,
        processingConfig
      );
      
      // Handle layouts and slots if needed
      if (shouldUseDOMMode(processedContent)) {
        processedContent = await processDOMMode(
          processedContent,
          filePath,
          sourceRoot,
          processingConfig
        );
      } else if (
        hasDOMTemplating(processedContent) ||
        !processedContent.includes("<html")
      ) {
        processedContent = await processDOMTemplating(
          processedContent,
          filePath,
          sourceRoot,
          processingConfig
        );
      }
      
      // Apply HTML optimization if enabled
      if (processingConfig.optimize !== false) {
        processedContent = await bunProcessor.optimizeHtml(processedContent);
      }
      
      return processedContent;
    }

    // Fallback to original JSDOM processing for Node.js
    logger.debug(
      `Processing SSI includes for: ${path.relative(sourceRoot, filePath)}`
    );

    // Track dependencies before processing
    if (dependencyTracker) {
      dependencyTracker.analyzePage(filePath, htmlContent, sourceRoot);
    }

    let processedContent = await processIncludes(
      htmlContent,
      filePath,
      sourceRoot,
      new Set(),
      0,
      dependencyTracker
    );

    // Step 2: Check if we should use DOM mode processing (handles <include> elements, layouts, and slots)
    if (shouldUseDOMMode(processedContent)) {
      logger.debug(
        `Processing with DOM Mode for: ${path.relative(sourceRoot, filePath)}`
      );
      
      // Use integrated DOM processing which handles <include> elements, layouts, and slots all together
      processedContent = await processDOMMode(
        processedContent,
        filePath,
        sourceRoot,
        processingConfig
      );
    } else if (
      hasDOMTemplating(processedContent) ||
      !processedContent.includes("<html")
    ) {
      logger.debug(
        `Processing DOM templating for: ${path.relative(sourceRoot, filePath)}`
      );
      // Fallback to original DOM templating for layouts/slots only
      processedContent = await processDOMTemplating(
        processedContent,
        filePath,
        sourceRoot,
        processingConfig
      );
    }

    return processedContent;
  } catch (error) {
    logger.error(
      `Unified HTML processing failed for ${path.relative(
        sourceRoot,
        filePath
      )}: ${error.message}`
    );
    throw error; // Re-throw with original error details
  }
}

/**
 * Check if content should use DOM mode processing
 * @param {string} content - HTML content to check
 * @returns {boolean} True if content has DOM mode features
 */
function shouldUseDOMMode(content) {
  return content.includes('<include ') || 
         content.includes('<slot') || 
         content.includes('data-slot=') ||
         content.includes('data-layout=');
}

/**
 * Integrated DOM mode processing - handles <include> elements, layouts, and slots
 * @param {string} pageContent - Raw HTML content of the page
 * @param {string} pagePath - Path to the page file
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 * @returns {Promise<string>} Processed HTML content
 */
async function processDOMMode(pageContent, pagePath, sourceRoot, config = {}) {
  const domConfig = { 
    layoutsDir: '.layouts',
    componentsDir: '.components', 
    defaultLayout: 'default.html',
    sourceRoot, 
    ...config 
  };
  
  try {
    // Parse the page HTML
    const dom = new JSDOM(pageContent, { contentType: "text/html" });
    const document = dom.window.document;
    
    // Detect layout from root element
    let layoutPath;
    try {
      layoutPath = await detectLayout(document, sourceRoot, domConfig);
      logger.debug(`Using layout: ${layoutPath}`);
    } catch (error) {
      // Graceful degradation: if layout cannot be found, return content wrapped in basic HTML
      logger.warn(`Layout not found for ${path.relative(sourceRoot, pagePath)}: ${error.message}`);
      return `<!DOCTYPE html>
<html>
<head>
  <title>Page</title>
</head>
<body>
${pageContent}
</body>
</html>`;
    }
    
    // Load layout content as string
    let layoutContent;
    try {
      layoutContent = await fs.readFile(layoutPath, 'utf-8');
    } catch (error) {
      // Graceful degradation: if layout file cannot be read, return content wrapped in basic HTML
      logger.warn(`Could not read layout file ${layoutPath}: ${error.message}`);
      return `<!DOCTYPE html>
<html>
<head>
  <title>Page</title>
</head>
<body>
${pageContent}
</body>
</html>`;
    }
    
    // Extract slot content from page
    const slotData = extractSlotData(document);
    
    // Apply slots to layout using string replacement
    let processedHTML = applySlots(layoutContent, slotData);
    
    // Process includes in the result
    processedHTML = await processIncludesInHTML(processedHTML, sourceRoot, domConfig);
    
    return processedHTML;
    
  } catch (error) {
    logger.error(`DOM processing failed for ${pagePath}: ${error.message}`);
    throw new FileSystemError('dom-process', pagePath, error);
  }
}

/**
 * Detect which layout to use for a page
 */
async function detectLayout(document, sourceRoot, config) {
  const rootElements = [
    document.documentElement,
    document.body,
    document.querySelector('[data-layout]')
  ].filter(Boolean);
  
  for (const element of rootElements) {
    const layoutAttr = element.getAttribute('data-layout');
    if (layoutAttr) {
      let layoutPath;
      
      if (layoutAttr.startsWith('/')) {
        // Absolute path relative to source root
        const relativePath = layoutAttr.substring(1); // Remove leading slash
        layoutPath = path.join(sourceRoot, relativePath);
        
        // Security check - must be within source root for absolute paths
        if (!isPathWithinDirectory(layoutPath, sourceRoot)) {
          throw new Error(`Layout path outside source directory: ${layoutAttr}`);
        }
      } else {
        // Relative path within layouts directory
        if (path.isAbsolute(config.layoutsDir)) {
          // If layoutsDir is an absolute path (from CLI), use it directly
          layoutPath = path.join(config.layoutsDir, layoutAttr);
          
          // Security check - must be within the configured layouts directory
          if (!isPathWithinDirectory(layoutPath, config.layoutsDir)) {
            throw new Error(`Layout path outside layouts directory: ${layoutAttr}`);
          }
        } else {
          // If layoutsDir is relative, join with sourceRoot
          layoutPath = path.join(sourceRoot, config.layoutsDir, layoutAttr);
          
          // Security check - must be within source root for relative paths
          if (!isPathWithinDirectory(layoutPath, sourceRoot)) {
            throw new Error(`Layout path outside source directory: ${layoutAttr}`);
          }
        }
      }
      
      return layoutPath;
    }
  }
  
  // Fall back to default layout
  let defaultLayoutPath;
  if (path.isAbsolute(config.layoutsDir)) {
    // If layoutsDir is an absolute path (from CLI), use it directly
    defaultLayoutPath = path.join(config.layoutsDir, config.defaultLayout);
  } else {
    // If layoutsDir is relative, join with sourceRoot
    defaultLayoutPath = path.join(sourceRoot, config.layoutsDir, config.defaultLayout);
  }
  return defaultLayoutPath;
}

/**
 * Process includes in HTML content (both SSI and <include> elements)
 */
async function processIncludesInHTML(htmlContent, sourceRoot, config) {
  // Process SSI includes first (already done in main flow, but handle any in layout)
  let result = await processIncludes(
    htmlContent,
    null, // filePath not needed for this context 
    sourceRoot,
    new Set(),
    0,
    null // No dependency tracker needed
  );
  
  // Then process <include> elements if any remain
  const includeRegex = /<include\s+([^>]+)\/?\s*>/gi;
  const allStyles = [];
  const allScripts = [];
  
  // Process includes recursively until no more are found
  let hasIncludes = true;
  let depth = 0;
  const maxDepth = 10; // Prevent infinite recursion
  
  while (hasIncludes && depth < maxDepth) {
    const matches = [...result.matchAll(includeRegex)];
    hasIncludes = matches.length > 0;
    depth++;
    
    for (const match of matches) {
      try {
        const includeTag = match[0];
        const attributes = match[1];
        
        // Parse src attribute
        const srcMatch = attributes.match(/src=["']([^"']+)["']/);
        if (!srcMatch) continue;
        
        const src = srcMatch[1];
        
        // Load and process component
        const componentResult = await loadAndProcessComponent(src, {}, sourceRoot, config);
        
        // Collect styles and scripts
        allStyles.push(...componentResult.styles);
        allScripts.push(...componentResult.scripts);
        
        // Replace include tag with component content
        result = result.replace(includeTag, componentResult.content);
        
      } catch (error) {
        logger.error(`Failed to process include: ${error.message}`);
        result = result.replace(match[0], `<!-- Error: ${error.message} -->`);
      }
    }
    
    // Reset regex to find new includes in the updated content
    includeRegex.lastIndex = 0;
  }
  
  // Clean up any remaining artifacts
  result = cleanupDOMOutput(result);
  
  // Move styles to head and scripts to end of body
  if (allStyles.length > 0) {
    const headEndRegex = /<\/head>/i;
    const dedupedStyles = [...new Set(allStyles)]; // Remove duplicates
    const stylesHTML = dedupedStyles.join('\n');
    result = result.replace(headEndRegex, `${stylesHTML}\n</head>`);
  }
  
  if (allScripts.length > 0) {
    const bodyEndRegex = /<\/body>/i;
    const dedupedScripts = [...new Set(allScripts)]; // Remove duplicates  
    const scriptsHTML = dedupedScripts.join('\n');
    result = result.replace(bodyEndRegex, `${scriptsHTML}\n</body>`);
  }
  
  return result;
}

/**
 * Load and process a component
 */
async function loadAndProcessComponent(src, unused, sourceRoot, config) {
  // Resolve component path
  let componentPath;
  
  if (src.startsWith('/')) {
    // Absolute path relative to source root
    const relativePath = src.substring(1); // Remove leading slash
    componentPath = path.join(sourceRoot, relativePath);
  } else {
    // Relative path within components directory
    if (path.isAbsolute(config.componentsDir)) {
      // If componentsDir is an absolute path (from CLI), use it directly
      componentPath = path.join(config.componentsDir, src);
    } else {
      // If componentsDir is relative, join with sourceRoot
      componentPath = path.join(sourceRoot, config.componentsDir, src);
    }
  }
  
  if (!isPathWithinDirectory(componentPath, sourceRoot)) {
    throw new Error(`Component path outside source directory: ${src}`);
  }
  
  // Load component
  const componentContent = await fs.readFile(componentPath, 'utf-8');
  
  // Just return the component content as-is, without token replacement
  let processedContent = componentContent;
  
  // Extract and remove styles and scripts
  const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  
  const styles = [...processedContent.matchAll(styleRegex)].map(match => match[0]);
  const scripts = [...processedContent.matchAll(scriptRegex)].map(match => match[0]);
  
  // Remove styles and scripts from component content
  processedContent = processedContent.replace(styleRegex, '');
  processedContent = processedContent.replace(scriptRegex, '');
  
  return {
    content: processedContent,
    styles,
    scripts
  };
}

/**
 * Clean up DOM output by removing stray tags and artifacts
 */
function cleanupDOMOutput(html) {
  let result = html;
  
  // Remove stray closing include tags
  result = result.replace(/<\/include>/gi, '');
  
  // Remove stray closing slot tags
  result = result.replace(/<\/slot>/gi, '');
  
  // Remove any remaining self-closing include tags that weren't processed
  result = result.replace(/<include[^>]*\/>/gi, '');
  
  // Remove any remaining opening include tags that weren't processed
  result = result.replace(/<include[^>]*>/gi, '');
  
  // Clean up multiple consecutive empty lines
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result;
}

/**
 * Check if content contains DOM templating syntax
 * @param {string} content - HTML content to check
 * @returns {boolean} True if content has DOM templating
 */
function hasDOMTemplating(content) {
  // Check for slot elements or layout attributes
  return (
    content.includes("<slot") ||
    content.includes("<template") ||
    content.includes("data-layout=")
  );
}

/**
 * Extract slot content from HTML document (consolidated from both processors)
 * @param {Document} document - DOM document to extract slots from
 * @returns {Object} Object with slot names as keys and content as values
 */
function extractSlotData(document) {
  const slots = {};
  
  // Extract named slots with data-slot attribute (legacy support)
  const legacySlotTemplates = document.querySelectorAll('template[data-slot]');
  legacySlotTemplates.forEach(template => {
    const slotName = template.getAttribute('data-slot');
    slots[slotName] = template.innerHTML;
  });
  
  // Extract named slots with target attribute (spec-compliant)
  const targetTemplates = document.querySelectorAll('template[target]');
  targetTemplates.forEach(template => {
    const targetName = template.getAttribute('target');
    slots[targetName] = template.innerHTML;
  });
  
  // Extract default slot content from template without target attribute
  const defaultTemplates = document.querySelectorAll('template:not([target]):not([data-slot])');
  if (defaultTemplates.length > 0) {
    // Use the first template without target as default content
    slots['default'] = defaultTemplates[0].innerHTML;
  } else {
    // Extract default slot content (everything not in a template)
    const body = document.body || document.documentElement;
    
    // Clone the body and remove template elements
    const bodyClone = body.cloneNode(true);
    const allTemplates = bodyClone.querySelectorAll('template');
    allTemplates.forEach(template => template.remove());
    
    // Remove script and style elements  
    const scriptsInClone = bodyClone.querySelectorAll("script");
    scriptsInClone.forEach(script => script.remove());
    
    const stylesInClone = bodyClone.querySelectorAll("style");
    stylesInClone.forEach(style => style.remove());
    
    // Also remove the data-layout attribute from the root element
    const rootElement = bodyClone.querySelector('[data-layout]');
    if (rootElement) {
      rootElement.removeAttribute('data-layout');
    }
    
    const defaultContent = bodyClone.innerHTML.trim();
    if (defaultContent) {
      slots['default'] = defaultContent;
    }
  }
  
  return slots;
}

/**
 * Apply slot content to layout using string replacement (consolidated implementation)
 * @param {string} layoutContent - Layout HTML content
 * @param {Object} slotData - Slot data to apply
 * @returns {string} Layout with slots replaced
 */
function applySlots(layoutContent, slotData) {
  let result = layoutContent;
  
  // Replace named slots
  for (const [slotName, content] of Object.entries(slotData)) {
    if (slotName === 'default') continue;
    
    const slotRegex = new RegExp(`<slot\\s+name=["']${slotName}["'][^>]*>.*?</slot>`, 'gi');
    const simpleSlotRegex = new RegExp(`<slot\\s+name=["']${slotName}["'][^>]*\\s*/?>`, 'gi');
    
    result = result.replace(slotRegex, content);
    result = result.replace(simpleSlotRegex, content);
  }
  
  // Replace default slot
  const defaultSlotRegex = /<slot(?:\s+[^>]*)?>(.*?)<\/slot>/gi;
  const defaultSlotSelfClosing = /<slot(?:\s+[^>]*)?\/>/gi;
  
  result = result.replace(defaultSlotRegex, slotData.default || '$1');
  result = result.replace(defaultSlotSelfClosing, slotData.default || '');
  
  // Replace any remaining named slots with their default content
  result = result.replace(
    /<slot\s+name=["'][^"']*["'][^>]*>(.*?)<\/slot>/gs,
    '$1' // Replace with the default content (everything between slot tags)
  );
  
  // Replace any remaining self-closing named slots (remove them since no default content)
  result = result.replace(
    /<slot\s+name=["'][^"']*["'][^>]*\/>/g,
    '' // Remove self-closing slots with no content
  );

  // Replace any remaining unnamed default slots with their content or remove them
  result = result.replace(
    /<slot(?!\s+name)(?:\s[^>]*)?>([^<]*(?:<(?!\/slot>)[^<]*)*)<\/slot>/gs,
    '$1' // Replace with default content
  );
  
  result = result.replace(
    /<slot(?!\s+name)(?:\s[^>]*)?\/>/g,
    '' // Remove self-closing default slots with no content
  );
  
  return result;
}

/**
 * Process DOM templating features (slot replacement and layout) - simplified version
 * @param {string} htmlContent - HTML content with DOM templating
 * @param {string} filePath - Path to the current file
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - Processing configuration
 * @returns {Promise<string>} Processed HTML with templates applied
 */
async function processDOMTemplating(htmlContent, filePath, sourceRoot, config) {
  try {
    // Parse the HTML content
    const dom = new JSDOM(htmlContent, { contentType: "text/html" });
    const document = dom.window.document;

    // Check for layout attribute on any element
    const layoutElement = document.querySelector("[data-layout]");
    if (layoutElement) {
      const layoutAttr = layoutElement.getAttribute("data-layout");
      try {
        return await processLayoutAttribute(
          htmlContent,
          layoutAttr,
          filePath,
          sourceRoot,
          config
        );
      } catch (error) {
        // Graceful degradation: if specific layout is missing, log warning and return original content
        logger.warn(`Layout not found for ${path.relative(sourceRoot, filePath)}: ${error.message}`);
        // Remove data-layout attribute from content to avoid reprocessing
        const contentWithoutLayout = htmlContent.replace(/\s*data-layout=["'][^"']*["']/gi, '');
        return contentWithoutLayout;
      }
    }

    // Check for root element, other than head or html. If no html tag exists,
    // apply the default layout
    if (
      !document.documentElement ||
      document.documentElement.tagName.toLowerCase() !== "html"
    ) {
      // If no html tag, we assume a default layout is needed
      let defaultLayoutPath;
      if (path.isAbsolute(config.layoutsDir)) {
        // If layoutsDir is an absolute path (from CLI), use it directly
        defaultLayoutPath = path.join(config.layoutsDir, config.defaultLayout);
      } else {
        // If layoutsDir is relative, join with sourceRoot
        defaultLayoutPath = path.join(sourceRoot, config.layoutsDir, config.defaultLayout);
      }
      
      try {
        return await processLayoutAttribute(
          htmlContent,
          defaultLayoutPath,
          filePath,
          sourceRoot,
          config
        );
      } catch (error) {
        // Graceful degradation: if default layout is missing, wrap content in basic HTML
        logger.warn(`Default layout not found for ${path.relative(sourceRoot, filePath)}: ${error.message}`);
        return `<!DOCTYPE html>
<html>
<head>
  <title>Page</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
      }
    }

    // If no layout, process any standalone slots
    if (htmlContent.includes("<slot")) {
      return processStandaloneSlots(htmlContent);
    }

    return htmlContent;
  } catch (error) {
    throw new ComponentError(
      filePath,
      `DOM templating processing failed: ${error.message}`,
      filePath
    );
  }
}

/**
 * Process layout attribute functionality
 * @param {string} pageContent - Page HTML content
 * @param {string} layoutPath - Layout file path from data-layout attribute
 * @param {string} filePath - Current file path
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - Processing configuration
 * @returns {Promise<string>} Processed HTML with layout applied
 */
async function processLayoutAttribute(
  pageContent,
  layoutPath,
  filePath,
  sourceRoot,
  config
) {
  // Resolve layout path
  let resolvedLayoutPath;
  
  if (layoutPath.startsWith("/")) {
    // Absolute path from source root
    resolvedLayoutPath = path.join(sourceRoot, layoutPath.substring(1));
  } else if (layoutPath.includes('/')) {
    // Path with directory structure, relative to source root
    resolvedLayoutPath = path.join(sourceRoot, layoutPath);
  } else {
    // Bare filename, relative to layouts directory
    if (path.isAbsolute(config.layoutsDir)) {
      // layoutsDir is absolute path (from CLI)
      resolvedLayoutPath = path.join(config.layoutsDir, layoutPath);
    } else {
      // layoutsDir is relative path (default or relative)
      resolvedLayoutPath = path.join(sourceRoot, config.layoutsDir, layoutPath);
    }
  }

  // Security check - allow layouts in configured layouts directory or within source root
  const layoutsBaseDir = path.isAbsolute(config.layoutsDir) 
    ? config.layoutsDir 
    : path.join(sourceRoot, config.layoutsDir);
    
  if (!isPathWithinDirectory(resolvedLayoutPath, sourceRoot) && 
      !isPathWithinDirectory(resolvedLayoutPath, layoutsBaseDir)) {
    throw new LayoutError(
      resolvedLayoutPath,
      `Layout path outside allowed directories: ${layoutPath}`,
      [layoutsBaseDir, path.join(sourceRoot, config.layoutsDir)]
    );
  }

  // Load layout content
  let layoutContent;
  try {
    layoutContent = await fs.readFile(resolvedLayoutPath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new LayoutError(
        resolvedLayoutPath,
        `Layout file not found: ${layoutPath}`,
        [path.join(sourceRoot, config.layoutsDir)]
      );
    }
    throw new FileSystemError("read", resolvedLayoutPath, error);
  }

  // Process includes in the layout content first
  layoutContent = await processIncludes(
    layoutContent,
    resolvedLayoutPath,
    sourceRoot,
    new Set(),
    0,
    null // No dependency tracker needed for layout processing
  );

  // Parse page content for slot extraction
  const dom = new JSDOM(pageContent, { contentType: "text/html" });
  const document = dom.window.document;
  
  // Extract slot data from page content and apply to layout
  const slotData = extractSlotData(document);
  return applySlots(layoutContent, slotData);
}

/**
 * Process standalone slots (slots without template extends)
 * @param {string} htmlContent - HTML content with slots
 * @returns {string} Processed HTML
 */
function processStandaloneSlots(htmlContent) {
  // For standalone slots, we just remove empty slot elements
  // This handles cases where slots exist but no template is extending
  return htmlContent
    .replace(/<slot[^>]*><\/slot>/gs, "")
    .replace(/<slot[^>]*\/>/g, "");
}

/**
 * Get default configuration for unified processing
 * @param {Object} userConfig - User-provided configuration
 * @returns {Object} Complete configuration object
 */
export function getUnifiedConfig(userConfig = {}) {
  let config = {
    componentsDir: userConfig.components || ".components",
    layoutsDir: userConfig.layouts || ".layouts", 
    defaultLayout: "default.html",
    ...userConfig,
  };
  
  // Ensure componentsDir and layoutsDir are absolute paths if they don't start with '.'
  if (config.componentsDir && !path.isAbsolute(config.componentsDir) && !config.componentsDir.startsWith('.')) {
    config.componentsDir = path.resolve(config.componentsDir);
  }
  
  if (config.layoutsDir && !path.isAbsolute(config.layoutsDir) && !config.layoutsDir.startsWith('.')) {
    config.layoutsDir = path.resolve(config.layoutsDir);
  }
  
  // Also set components and layouts for compatibility with isPartialFile
  config.components = config.componentsDir;
  config.layouts = config.layoutsDir;
  
  return config;
}

/**
 * Check if content should use unified processing (always true now)
 * @param {string} htmlContent - HTML content to check
 * @returns {boolean} Always returns true for unified processing
 */
export function shouldUseUnifiedProcessing(htmlContent) {
  // Unified processor handles all HTML content
  return true;
}

/**
 * Optimize HTML content using Bun HTMLRewriter when available
 * @param {string} htmlContent - HTML content to optimize
 * @returns {Promise<string>} Optimized HTML content
 */
export async function optimizeHtml(htmlContent) {
  if (runtime.isBun && BunHtmlProcessor) {
    const bunProcessor = new BunHtmlProcessor();
    return await bunProcessor.optimizeHtml(htmlContent);
  }
  
  // No optimization available on Node.js
  return htmlContent;
}

/**
 * Extract metadata from HTML using Bun HTMLRewriter when available
 * @param {string} htmlContent - HTML content to analyze
 * @returns {Promise<Object>} Extracted metadata
 */
export async function extractHtmlMetadata(htmlContent) {
  if (runtime.isBun && BunHtmlProcessor) {
    const bunProcessor = new BunHtmlProcessor();
    return await bunProcessor.extractMetadata(htmlContent);
  }
  
  // Basic fallback for Node.js
  return {
    title: '',
    description: '',
    keywords: [],
    openGraph: {}
  };
}
