/**
 * Unified HTML Processor for dompile
 * Handles both SSI-style includes (<!--#include -->) and DOM templating (<template>, <slot>)
 * in a single processing pipeline for consistency and simplicity.
 */

import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { processIncludes } from "./include-processor.js";
import { logger } from "../utils/logger.js";
import { isPathWithinDirectory } from "../utils/path-resolver.js";
import {
  DompileError,
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

    // Step 2: Check for DOM templating syntax (template extends, slots)
    // or the need for a default layout
    if (
      hasDOMTemplating(processedContent) ||
      !processedContent.includes("<html")
    ) {
      logger.debug(
        `Processing DOM templating for: ${path.relative(sourceRoot, filePath)}`
      );
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
  // Check for template extends attribute or slot elements
  return (
    content.includes("extends=") ||
    content.includes("<slot") ||
    content.includes("<template") ||
    content.includes("data-layout=")
  );
}

/**
 * Process DOM templating features (template extends, slot replacement)
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

    // Check for template extends
    const templateElement = document.querySelector("template[extends]");
    if (templateElement) {
      const extendsPath = templateElement.getAttribute("extends");
      return await processTemplateExtends(
        htmlContent,
        extendsPath,
        filePath,
        sourceRoot,
        config
      );
    }

    // Check for layout attribute on any element
    const layoutElement = document.querySelector("[data-layout]");
    if (layoutElement) {
      const layoutAttr = layoutElement.getAttribute("data-layout");
      return await processLayoutAttribute(
        htmlContent,
        layoutAttr,
        filePath,
        sourceRoot,
        config
      );
    }

    // Check for root element, other than head or html. If not html tag exists,
    // apply the default layout
    if (
      !document.documentElement ||
      !document.documentElement.tagName.toLowerCase() === "html"
    ) {
      // If no html tag, we assume a default layout is needed
      const defaultLayoutPath = path.join(
        sourceRoot,
        config.layoutsDir,
        config.defaultLayout
      );
      return await processLayoutAttribute(
        htmlContent,
        layoutAttr,
        filePath,
        sourceRoot,
        config
      );
    }

    // If no template extends or layout, process any standalone slots
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
 * Process template extends functionality
 * @param {string} pageContent - Page HTML content
 * @param {string} templatePath - Path to template file
 * @param {string} filePath - Current file path
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - Processing configuration
 * @returns {Promise<string>} Processed HTML with template applied
 */
async function processTemplateExtends(
  pageContent,
  templatePath,
  filePath,
  sourceRoot,
  config
) {
  // Extract the original slot data from the page content
  const originalSlotData = extractSlotData(pageContent);
  
  // Resolve the template and apply slots recursively
  return await applyTemplateInheritance(originalSlotData, templatePath, filePath, sourceRoot, config);
}

/**
 * Apply template inheritance recursively, preserving slot application order
 * @param {Object} slotData - Slot data to apply
 * @param {string} templatePath - Path to the template to extend
 * @param {string} filePath - Current file path for relative path resolution
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - Processing configuration
 * @returns {Promise<string>} Final resolved template content
 */
async function applyTemplateInheritance(slotData, templatePath, filePath, sourceRoot, config) {
  // Resolve template path
  let resolvedTemplatePath;
  
  if (templatePath.startsWith("/")) {
    // Absolute path from source root
    resolvedTemplatePath = path.join(sourceRoot, templatePath.substring(1));
  } else if (templatePath.startsWith("../") || templatePath.startsWith("./")) {
    // Relative path from current file's directory
    const currentFileDir = path.dirname(filePath);
    let candidatePath = path.resolve(currentFileDir, templatePath);
    
    // If the resolved path is outside the source root,
    // try resolving from the components directory instead
    // This handles cases where templates in included components have relative paths
    if (!candidatePath.startsWith(sourceRoot + path.sep) && candidatePath !== sourceRoot) {
      const componentsDir = path.join(sourceRoot, config.componentsDir || 'components');
      candidatePath = path.resolve(componentsDir, templatePath);
    }
    
    resolvedTemplatePath = candidatePath;
  } else if (templatePath.includes('/')) {
    // Path with directory structure, relative to source root
    resolvedTemplatePath = path.join(sourceRoot, templatePath);
  } else {
    // Bare filename, relative to layouts directory
    resolvedTemplatePath = path.join(
      sourceRoot,
      config.layoutsDir,
      templatePath
    );
  }

  // Security check
  if (!isPathWithinDirectory(resolvedTemplatePath, sourceRoot)) {
    throw new LayoutError(
      resolvedTemplatePath,
      `Template path outside source directory: ${templatePath}`,
      [path.join(sourceRoot, config.layoutsDir)]
    );
  }

  // Load template content
  let templateContent;
  try {
    templateContent = await fs.readFile(resolvedTemplatePath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new LayoutError(
        resolvedTemplatePath,
        `Template file not found: ${templatePath}`,
        [path.join(sourceRoot, config.layoutsDir)]
      );
    }
    throw new FileSystemError("read", resolvedTemplatePath, error);
  }

  // Process includes in the template content before doing template inheritance
  // This ensures that includes within template slot defaults get processed
  templateContent = await processIncludes(
    templateContent,
    resolvedTemplatePath,
    sourceRoot,
    new Set(),
    0,
    null // No dependency tracker needed for template processing
  );

  // Check if this template extends another template
  const dom = new JSDOM(templateContent, { contentType: "text/html" });
  const document = dom.window.document;
  const templateElement = document.querySelector("template[extends]");
  
  if (templateElement) {
    const extendsPath = templateElement.getAttribute("extends");
    
    // Extract slots from current template
    const templateSlotData = extractSlotData(templateContent);
    
    // Merge original slots with template slots (original slots take precedence)
    const mergedSlotData = { ...templateSlotData, ...slotData };
    
    // Recursively process the parent template
    return await applyTemplateInheritance(mergedSlotData, extendsPath, resolvedTemplatePath, sourceRoot, config);
  } else {
    // This is the base template - apply the slots and return
    return applySlots(templateContent, slotData);
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
  // Similar to template extends but for data-layout attribute
  return await processTemplateExtends(
    pageContent,
    layoutPath,
    filePath,
    sourceRoot,
    config
  );
}

/**
 * Extract slot content from HTML
 * @param {string} htmlContent - HTML content to extract slots from
 * @returns {Object} Object with slot names as keys and content as values
 */
/**
 * Extract slot content from HTML
 * @param {string} htmlContent - HTML content to extract slots from
 * @returns {Object} Object with slot names as keys and content as values
 */
function extractSlotData(htmlContent) {
  const slots = {};
  const dom = new JSDOM(htmlContent, { contentType: "text/html" });
  const document = dom.window.document;

  // Check for template elements with extends attribute
  const templateElements = document.querySelectorAll("template[extends]");
  
  templateElements.forEach((templateEl) => {
    // Parse the template content to find slots
    const templateDom = new JSDOM(`<div>${templateEl.innerHTML}</div>`, { contentType: "text/html" });
    const slotElements = templateDom.window.document.querySelectorAll("slot[name]");
    
    slotElements.forEach((element) => {
      const slotName = element.getAttribute("name");
      if (slotName) {
        slots[slotName] = element.innerHTML;
      }
    });
    
    // Handle default slot (slot elements without name attribute)
    const defaultSlotElements = templateDom.window.document.querySelectorAll("slot:not([name])");
    if (defaultSlotElements.length > 0) {
      // Combine content from all default slots
      const defaultContent = Array.from(defaultSlotElements)
        .map(el => el.innerHTML)
        .join('');
      if (defaultContent.trim()) {
        slots["default"] = defaultContent.trim();
      }
    }
  });

  // Also check for loose slot elements outside of templates (for include + slot scenarios)
  // Find all slot elements with name attributes that are not inside template elements
  const looseSlotElements = Array.from(document.querySelectorAll("slot[name]")).filter(slot => {
    // Check if this slot is inside a template element
    let parent = slot.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'template' && parent.hasAttribute('extends')) {
        return false; // This slot is inside a template, skip it
      }
      parent = parent.parentElement;
    }
    return true; // This is a loose slot
  });
  
  looseSlotElements.forEach((element) => {
    const slotName = element.getAttribute("name");
    if (slotName) {
      // Loose slots take precedence over template slots
      slots[slotName] = element.innerHTML;
    }
  });

  // Handle loose default slots (slot elements without name attribute, outside templates)
  const looseDefaultSlotElements = Array.from(document.querySelectorAll("slot:not([name])")).filter(slot => {
    let parent = slot.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === 'template' && parent.hasAttribute('extends')) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });
  
  if (looseDefaultSlotElements.length > 0) {
    // Combine content from all loose default slots
    const defaultContent = Array.from(looseDefaultSlotElements)
      .map(el => el.innerHTML)
      .join('');
    if (defaultContent.trim()) {
      slots["default"] = defaultContent.trim();
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
  return {
    componentsDir: ".components",
    layoutsDir: ".layouts",
    defaultLayout: "default.html",
    ...userConfig,
  };
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
