/**
 * Unified HTML Processor for dompile
 * Handles both SSI-style includes (<!--#include -->) and DOM templating (<template>, <slot>)
 * in a single processing pipeline for consistency and simplicity.
 */

import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { processIncludes } from "./include-processor.js";
import { processDOMMode, shouldUseDOMMode } from "./dom-processor.js";
import { logger } from "../utils/logger.js";
import { isPathWithinDirectory } from "../utils/path-resolver.js";
import {
  ComponentError,
  LayoutError,
  FileSystemError,
} from "../utils/errors.js";

/**
 * Process HTML content with unified support for both SSI includes and DOM templating
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
    // Step 1: Process SSI includes first (traditional <!--#include --> directives)
    // This ensures all include content is expanded before DOM processing
    logger.debug(
      `Processing SSI includes for: ${path.relative(sourceRoot, filePath)}`
    );

    // Track dependencies before processing
    dependencyTracker.analyzePage(filePath, htmlContent, sourceRoot);

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
      
      // Use DOM processor which handles <include> elements, layouts, and slots all together
      processedContent = await processDOMMode(
        processedContent,
        filePath,
        sourceRoot,
        {
          layoutsDir: processingConfig.layoutsDir,
          componentsDir: processingConfig.componentsDir,
          defaultLayout: processingConfig.defaultLayout
        }
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
 * Process DOM templating features (slot replacement and layout)
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

  // Extract slot data from page content and apply to layout
  const slotData = extractSlotData(pageContent);
  return applySlots(layoutContent, slotData);
}

/**
 * Extract slot content from HTML
 * @param {string} htmlContent - HTML content to extract slots from
 * @returns {Object} Object with slot names as keys and content as values
 */
function extractSlotData(htmlContent) {
  const slots = {};
  const dom = new JSDOM(htmlContent, { contentType: "text/html" });
  const document = dom.window.document;

  // Find template elements with data-slot attributes
  const templateElements = document.querySelectorAll("template[data-slot]");
  
  templateElements.forEach((templateEl) => {
    const slotName = templateEl.getAttribute("data-slot");
    if (slotName) {
      slots[slotName] = templateEl.innerHTML;
    }
  });

  // Extract default content from the page (everything not in template elements)
  const bodyElement = document.body || document.documentElement;
  if (bodyElement) {
    // Clone the body to avoid modifying the original
    const bodyClone = bodyElement.cloneNode(true);
    
    // Remove all template elements from the clone
    const templatesInClone = bodyClone.querySelectorAll("template");
    templatesInClone.forEach(template => template.remove());
    
    // Remove script and style elements  
    const scriptsInClone = bodyClone.querySelectorAll("script");
    scriptsInClone.forEach(script => script.remove());
    
    const stylesInClone = bodyClone.querySelectorAll("style");
    stylesInClone.forEach(style => style.remove());
    
    // Get the remaining content as default slot
    const defaultContent = bodyClone.innerHTML.trim();
    if (defaultContent) {
      slots["default"] = defaultContent;
    }
  }

  return slots;
}

/**
 * Apply slot data to a template
 * @param {string} templateContent - Template HTML content
 * @param {Object} slotData - Slot data to apply
 * @returns {string} Template with slots replaced
 */
function applySlots(templateContent, slotData) {
  let result = templateContent;

  // Replace named slots
  for (const [slotName, content] of Object.entries(slotData)) {
    const slotRegex = new RegExp(
      `<slot\\s+name=["']${slotName}["'][^>]*>.*?</slot>`,
      "gs"
    );
    const selfClosingSlotRegex = new RegExp(
      `<slot\\s+name=["']${slotName}["'][^>]*/>`,
      "g"
    );

    result = result.replace(slotRegex, content);
    result = result.replace(selfClosingSlotRegex, content);
  }

  // Replace default slot (unnamed slot)
  if (slotData["default"]) {
    const defaultSlotRegex = /<slot(?!\s+name)(?:\s[^>]*)?>.*?<\/slot>/gs;
    const defaultSelfClosingSlotRegex = /<slot(?!\s+name)(?:\s[^>]*)?\/>/g;

    result = result.replace(defaultSlotRegex, slotData["default"]);
    result = result.replace(defaultSelfClosingSlotRegex, slotData["default"]);
  }

  // Replace any remaining named slots with their default content
  // This handles slots that weren't provided in slotData
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
