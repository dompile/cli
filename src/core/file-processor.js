/**
 * File Processing System for dompile
 * Handles the build workflow and file operations
 */

import fs from 'fs/promises';
import path from 'path';
// processIncludes is now handled by unified-html-processor
import { DependencyTracker } from './dependency-tracker.js';
import { AssetTracker } from './asset-tracker.js';
import { 
  processMarkdown, 
  isMarkdownFile, 
  wrapInLayout, 
  generateTableOfContents, 
  addAnchorLinks,
  hasHtmlElement
} from './markdown-processor.js';
import { 
  isHtmlFile, 
  isPartialFile, 
  getOutputPath, 
  getFileExtension 
} from '../utils/path-resolver.js';
import { 
  generateSitemap, 
  extractPageInfo, 
  enhanceWithFrontmatter, 
  writeSitemap 
} from './sitemap-generator.js';
import { 
  processHtmlUnified,
  getUnifiedConfig
} from './unified-html-processor.js';
import { FileSystemError, BuildError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getBaseUrlFromPackage } from '../utils/package-reader.js';

/**
 * Cache for tracking file modification times for incremental builds
 */
const fileModificationCache = new Map();

/**
 * Build configuration options
 */
const DEFAULT_OPTIONS = {
  source: 'src',
  output: 'dist',
  components: '.components',
  layouts: '.layouts',
  clean: true,
  prettyUrls: false,
  baseUrl: 'https://example.com'
};

/**
 * Build the complete static site from source files with include processing and head injection.
 * Processes HTML files through the include engine, injects global head content, copies static assets,
 * and generates dependency tracking information for development server use.
 * 
 * @param {Object} options - Build configuration options
 * @param {string} [options.source='src'] - Source directory path
 * @param {string} [options.output='dist'] - Output directory path
 * @param {string} [options.components='src/.components'] - Components directory path
 * @param {boolean} [options.clean=true] - Whether to clean output directory before build
 * @returns {Promise<Object>} Build results with statistics and dependency tracker
 * @returns {number} returns.processed - Number of HTML pages processed
 * @returns {number} returns.copied - Number of static assets copied
 * @returns {number} returns.skipped - Number of partial files skipped
 * @returns {Array} returns.errors - Array of build errors encountered
 * @returns {number} returns.duration - Build time in milliseconds
 * @returns {DependencyTracker} returns.dependencyTracker - Dependency tracking instance
 * @throws {BuildError} When source directory doesn't exist or other critical errors
 * 
 * @example
 * // Basic build
 * const result = await build({ source: 'src', output: 'dist' });
 * console.log(`Built ${result.processed} pages in ${result.duration}ms`);
 * 
 * // Build with custom options
 * const result = await build({ 
 *   source: 'src', 
 *   output: 'public',
 *   prettyUrls: true
 * });
 */
export async function build(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  logger.info(`Building site from ${config.source} to ${config.output}`);
  
  try {
    // Resolve paths
    const sourceRoot = path.resolve(config.source);
    const outputRoot = path.resolve(config.output);
    
    // Validate source directory exists
    try {
      await fs.access(sourceRoot);
    } catch (error) {
      throw new BuildError(`Source directory not found: ${sourceRoot}`);
    }
    
    // Clean output directory if requested
    if (config.clean) {
      await cleanOutputDirectory(outputRoot);
    }
    
    // Ensure output directory exists
    await fs.mkdir(outputRoot, { recursive: true });
    
    // Initialize dependency and asset trackers
    const dependencyTracker = new DependencyTracker();
    const assetTracker = new AssetTracker();
    
    // Scan source directory
    const sourceFiles = await scanDirectory(sourceRoot);
    logger.info(`Found ${sourceFiles.length} source files`);
    
    // Categorize files - exclude components and layouts from being processed as pages
    const contentFiles = sourceFiles.filter(file => {
      const isPartial = isPartialFile(file, config);
      return (isHtmlFile(file) && !isPartial) || (isMarkdownFile(file) && !isPartial);
    });
    const assetFiles = sourceFiles.filter(file => 
      !isHtmlFile(file) && !isMarkdownFile(file)
    );
    
    const results = {
      processed: 0,
      copied: 0,
      skipped: 0,
      errors: []
    };
    
    // Track processed content files for sitemap generation
    const processedFiles = [];
    const frontmatterData = new Map();
    
    // Load layout file for markdown (if it exists)
    const layoutFile = await findLayoutFile(sourceRoot, config.layouts);
    let layoutContent = null;
    if (layoutFile) {
      try {
        layoutContent = await fs.readFile(layoutFile, 'utf-8');
        logger.debug(`Using layout file: ${path.relative(sourceRoot, layoutFile)}`);
      } catch (error) {
        const msg = `Could not read layout file ${layoutFile}: ${error.message}`;
        logger.warn(msg);
        results.errors.push({
          file: layoutFile,
          relativePath: path.relative(sourceRoot, layoutFile),
          error: error.message,
          errorType: error.constructor.name,
          suggestions: error.suggestions || [],
        });
      }
    }
    
    // Process content files (HTML and Markdown) first to discover asset dependencies
    for (const filePath of sourceFiles) {
      try {
        const relativePath = path.relative(sourceRoot, filePath);
        
        if (isHtmlFile(filePath)) {
          if (isPartialFile(filePath, config)) {
            // Skip partial files in output
            logger.debug(`Skipping partial file: ${relativePath}`);
            results.skipped++;
          } else {
            // Process HTML file
            await processHtmlFile(
              filePath, 
              sourceRoot, 
              outputRoot, 
              dependencyTracker,
              assetTracker,
              config
            );
            processedFiles.push(filePath);
            results.processed++;
            logger.debug(`Processed HTML: ${relativePath}`);
          }
        } else if (isMarkdownFile(filePath)) {
          // Process Markdown file and capture frontmatter
          const frontmatter = await processMarkdownFile(
            filePath,
            sourceRoot,
            outputRoot,
            layoutContent,
            assetTracker,
            config.prettyUrls,
            config.layouts
          );
          processedFiles.push(filePath);
          if (frontmatter) {
            frontmatterData.set(filePath, frontmatter);
          }
          results.processed++;
          logger.debug(`Processed Markdown: ${relativePath}`);
        }
      } catch (error) {
        const relativePath = path.relative(sourceRoot, filePath);
        
        // Use enhanced error formatting if available
        if (error.formatForCLI) {
          logger.error(error.formatForCLI());
        } else {
          logger.error(`Error processing ${relativePath}: ${error.message}`);
        }
        
        results.errors.push({ 
          file: filePath, 
          relativePath,
          error: error.message,
          errorType: error.constructor.name,
          suggestions: error.suggestions || []
        });
      }
    }
    
    // Second pass: Copy only referenced assets
    for (const filePath of assetFiles) {
      try {
        const relativePath = path.relative(sourceRoot, filePath);
        
        if (assetTracker.isAssetReferenced(filePath)) {
          await copyAsset(filePath, sourceRoot, outputRoot);
          results.copied++;
          logger.debug(`Copied referenced asset: ${relativePath}`);
        } else {
          logger.debug(`Skipped unreferenced asset: ${relativePath}`);
          results.skipped++;
        }
      } catch (error) {
        const relativePath = path.relative(sourceRoot, filePath);
        
        // Use enhanced error formatting if available
        if (error.formatForCLI) {
          logger.error(error.formatForCLI());
        } else {
          logger.error(`Error copying asset ${relativePath}: ${error.message}`);
        }
        
        results.errors.push({ 
          file: filePath, 
          relativePath,
          error: error.message,
          errorType: error.constructor.name,
          suggestions: error.suggestions || []
        });
      }
    }
    
    // Generate sitemap.xml (if enabled)  
    if (config.sitemap !== false) {
      try {
        // Resolve baseUrl: CLI arg → package.json homepage → default
        const baseUrl = config.baseUrl !== 'https://example.com' 
          ? config.baseUrl 
          : await getBaseUrlFromPackage(sourceRoot, config.baseUrl);
          
        const pageInfo = extractPageInfo(processedFiles, sourceRoot, outputRoot, config.prettyUrls);
        const enhancedPageInfo = enhanceWithFrontmatter(pageInfo, frontmatterData);
        const sitemapContent = generateSitemap(enhancedPageInfo, baseUrl);
        await writeSitemap(sitemapContent, outputRoot);
      } catch (error) {
        logger.error(`Error generating sitemap: ${error.message}`);
        results.errors.push({ file: 'sitemap.xml', error: error.message });
      }
    }
    
    // Build summary
    const duration = Date.now() - startTime;
    logger.success(`Build completed in ${duration}ms`);
    logger.info(`Processed: ${results.processed} pages, Copied: ${results.copied} assets, Skipped: ${results.skipped} partials`);
    
    if (results.errors.length > 0) {
      // Enhanced error reporting with categorization
      const errorsByType = results.errors.reduce((acc, err) => {
        acc[err.errorType] = (acc[err.errorType] || 0) + 1;
        return acc;
      }, {});
      
      logger.error('\\n📋 Build Error Summary:');
      for (const [errorType, count] of Object.entries(errorsByType)) {
        logger.error(`   ${errorType}: ${count} error(s)`);
      }
      
      logger.error(`\\n💥 Total: ${results.errors.length} error(s) encountered`);
      
      throw new BuildError(`${results.errors.length} error(s)`, results.errors);
    }
    
    return {
      ...results,
      duration,
      dependencyTracker,
      assetTracker
    };
    
  } catch (error) {
    logger.error('Build failed:', error.message);
    throw error;
  }
}

/**
 * Perform incremental build - only rebuild files that have changed
 * @param {Object} options - Build configuration options
 * @param {string} changedFile - Specific file that changed (optional)
 * @param {DependencyTracker} dependencyTracker - Existing dependency tracker
 * @returns {Promise<Object>} Build results
 */
export async function incrementalBuild(options = {}, changedFile = null, dependencyTracker = null, assetTracker = null) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  logger.info(`Starting incremental build...`);
  
  try {
    const sourceRoot = path.resolve(config.source);
    const outputRoot = path.resolve(config.output);
    
    // Initialize or reuse trackers
    const tracker = dependencyTracker || new DependencyTracker();
    const assets = assetTracker || new AssetTracker();
    
    // Determine what files need rebuilding
    const filesToRebuild = await getFilesToRebuild(sourceRoot, changedFile, tracker, config);
    
    const results = {
      processed: 0,
      copied: 0,
      skipped: 0,
      errors: []
    };
    
    if (filesToRebuild.length === 0) {
      logger.info('No files need rebuilding');
      return { ...results, duration: Date.now() - startTime, dependencyTracker: tracker };
    }
    
    logger.info(`Rebuilding ${filesToRebuild.length} file(s)...`);
    
    for (const filePath of filesToRebuild) {
      try {
        const relativePath = path.relative(sourceRoot, filePath);
        
        if (isHtmlFile(filePath)) {
          if (!isPartialFile(filePath, config)) {
            await processHtmlFile(filePath, sourceRoot, outputRoot, tracker, assets, config);
            results.processed++;
            logger.debug(`Rebuilt HTML: ${relativePath}`);
          }
        } else if (isMarkdownFile(filePath)) {
          // Load layout for markdown processing
          const layoutFile = await findLayoutFile(sourceRoot, config.layouts);
          let layoutContent = null;
          if (layoutFile) {
            try {
              layoutContent = await fs.readFile(layoutFile, 'utf-8');
            } catch (error) {
              logger.warn(`Could not read layout file ${layoutFile}: ${error.message}`);
            }
          }
          
          await processMarkdownFile(filePath, sourceRoot, outputRoot, layoutContent, assets, config.prettyUrls, config.layouts);
          results.processed++;
          logger.debug(`Rebuilt Markdown: ${relativePath}`);
        } else {
          // For assets, only copy if referenced (or during initial build)
          if (assets.isAssetReferenced(filePath) || !assetTracker) {
            await copyAsset(filePath, sourceRoot, outputRoot);
            results.copied++;
            logger.debug(`Copied: ${relativePath}`);
          } else {
            logger.debug(`Skipped unreferenced asset: ${relativePath}`);
            results.skipped++;
          }
        }
        
        // Update modification cache
        const stats = await fs.stat(filePath);
        fileModificationCache.set(filePath, stats.mtime.getTime());
        
      } catch (error) {
        logger.error(`Error processing ${filePath}: ${error.message}`);
        results.errors.push({ file: filePath, error: error.message });
      }
    }
    
    const duration = Date.now() - startTime;
    logger.success(`Incremental build completed in ${duration}ms`);
    logger.info(`Rebuilt: ${results.processed} pages, ${results.copied} assets`);
    
    if (results.errors.length > 0) {
      logger.error(`Incremental build failed with ${results.errors.length} errors`);
      throw new BuildError(`Incremental build failed with ${results.errors.length} errors`, results.errors);
    }
    
    return {
      ...results,
      duration,
      dependencyTracker: tracker,
      assetTracker: assets
    };
    
  } catch (error) {
    logger.error('Incremental build failed:', error.message);
    throw error;
  }
}

/**
 * Get list of files that need rebuilding based on changes
 * @param {string} sourceRoot - Source root directory
 * @param {string|null} changedFile - Specific file that changed
 * @param {DependencyTracker} dependencyTracker - Dependency tracker
 * @returns {Promise<string[]>} Array of file paths to rebuild
 */
async function getFilesToRebuild(sourceRoot, changedFile, dependencyTracker, config = {}) {
  const filesToRebuild = new Set();
  
  if (changedFile) {
    // Specific file changed - determine impact
    const resolvedChangedFile = path.resolve(changedFile);
    
    if (isHtmlFile(resolvedChangedFile)) {
      if (isPartialFile(resolvedChangedFile, config)) {
        // Partial file changed - rebuild all pages that depend on it
        const dependentPages = dependencyTracker.getDependentPages(resolvedChangedFile);
        dependentPages.forEach(page => filesToRebuild.add(page));
        logger.debug(`Partial ${path.relative(sourceRoot, resolvedChangedFile)} changed, rebuilding ${dependentPages.length} dependent pages`);
      } else {
        // Main page changed - rebuild just this page
        filesToRebuild.add(resolvedChangedFile);
        logger.debug(`Page ${path.relative(sourceRoot, resolvedChangedFile)} changed`);
      }
    } else {
      // Asset changed - copy just this asset
      filesToRebuild.add(resolvedChangedFile);
      logger.debug(`Asset ${path.relative(sourceRoot, resolvedChangedFile)} changed`);
    }
  } else {
    // No specific file - check all files for changes
    const allFiles = await scanDirectory(sourceRoot);
    
    for (const filePath of allFiles) {
      if (await hasFileChanged(filePath)) {
        filesToRebuild.add(filePath);
      }
    }
  }
  
  return Array.from(filesToRebuild);
}

/**
 * Check if a file has changed since last build
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>} True if file has changed
 */
async function hasFileChanged(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const currentMtime = stats.mtime.getTime();
    const cachedMtime = fileModificationCache.get(filePath);
    
    return !cachedMtime || currentMtime > cachedMtime;
  } catch (error) {
    // File doesn't exist or can't be accessed - consider it changed
    return true;
  }
}

/**
 * Initialize file modification cache for a directory
 * @param {string} sourceRoot - Source root directory
 */
export async function initializeModificationCache(sourceRoot) {
  const files = await scanDirectory(sourceRoot);
  
  for (const filePath of files) {
    try {
      const stats = await fs.stat(filePath);
      fileModificationCache.set(filePath, stats.mtime.getTime());
    } catch (error) {
      // Ignore files that can't be accessed
    }
  }
  
  logger.debug(`Initialized modification cache with ${fileModificationCache.size} files`);
}

/**
 * Generate output path for a file, with optional pretty URL support
 * @param {string} filePath - Source file path
 * @param {string} sourceRoot - Source root directory  
 * @param {string} outputRoot - Output root directory
 * @param {boolean} prettyUrls - Whether to generate pretty URLs
 * @returns {string} Output file path
 */
function getOutputPathWithPrettyUrls(filePath, sourceRoot, outputRoot, prettyUrls = false) {
  const relativePath = path.relative(sourceRoot, filePath);
  
  if (prettyUrls && isMarkdownFile(filePath)) {
    // Convert about.md → about/index.html for pretty URLs
    const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
    const dir = path.dirname(relativePath);
    
    // Special case: if the file is already named index.md, don't create nested directory
    if (nameWithoutExt === 'index') {
      return path.join(outputRoot, dir, 'index.html');
    }
    
    // Create directory structure: about.md → about/index.html
    return path.join(outputRoot, dir, nameWithoutExt, 'index.html');
  }
  
  // For HTML files or when pretty URLs is disabled, use standard conversion
  if (isMarkdownFile(filePath)) {
    return path.join(outputRoot, relativePath.replace(/\.md$/i, '.html'));
  }
  
  // For all other files (HTML, assets), use original logic
  return getOutputPath(filePath, sourceRoot, outputRoot);
}

/**
 * Find layout file for markdown processing
 * @param {string} sourceRoot - Source root directory
 * @returns {Promise<string|null>} Path to layout file or null if not found
 */
async function findLayoutFile(sourceRoot, layoutsDir = '.layouts') {
  const possibleLayouts = [
    path.join(sourceRoot, 'layout.html'),
    path.join(sourceRoot, '_layout.html'),
    path.join(sourceRoot, 'templates', 'layout.html'),
    path.join(sourceRoot, layoutsDir, 'default.html'),
    path.join(sourceRoot, 'layouts', 'default.html'),  // Legacy support
    path.join(sourceRoot, '.components', 'layout.html')  // Components directory fallback
  ];
  
  for (const layoutPath of possibleLayouts) {
    try {
      await fs.access(layoutPath);
      return layoutPath;
    } catch {
      // File doesn't exist, try next
    }
  }
  
  return null;
}

/**
 * Check if default.html layout exists in the layouts directory
 * @param {string} sourceRoot - Source root directory
 * @param {string} layoutsDir - Layouts directory name
 * @returns {Promise<boolean>} True if default.html exists
 */
async function hasDefaultLayout(sourceRoot, layoutsDir = '.layouts') {
  const defaultLayoutPath = path.join(sourceRoot, layoutsDir, 'default.html');
  try {
    await fs.access(defaultLayoutPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create basic HTML structure for content without layout
 * @param {string} content - HTML content
 * @param {string} title - Page title
 * @param {string} excerpt - Page excerpt
 * @returns {string} Complete HTML document
 */
function createBasicHtmlStructure(content, title, excerpt) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Untitled'}</title>
  ${excerpt ? `<meta name="description" content="${excerpt}">` : ''}
</head>
<body>
  <main>
    ${content}
  </main>
</body>
</html>`;
}

/**
 * Process a single Markdown file
 * @param {string} filePath - Path to Markdown file
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 * @param {string|null} layoutContent - Layout template content
 * @param {AssetTracker} assetTracker - Asset tracker instance
 * @param {boolean} prettyUrls - Whether to generate pretty URLs
 * @param {string} layoutsDir - Layouts directory name
 * @returns {Promise<Object|null>} Frontmatter data or null
 */
async function processMarkdownFile(filePath, sourceRoot, outputRoot, layoutContent, assetTracker, prettyUrls = false, layoutsDir = '.layouts') {
  // Read markdown content
  let markdownContent;
  try {
    markdownContent = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FileSystemError('read', filePath, error);
  }
  
  // Process includes in markdown content first (before converting to HTML)
  // For markdown, we'll import processIncludes directly since we're processing markdown syntax
  const { processIncludes } = await import('./include-processor.js');
  const processedMarkdown = await processIncludes(markdownContent, filePath, sourceRoot, new Set(), 0, null);
  
  // Process markdown to HTML
  const { html, frontmatter, title, excerpt } = processMarkdown(processedMarkdown, filePath);
  
  // Add anchor links to headings
  const htmlWithAnchors = addAnchorLinks(html);
  
  // Generate table of contents
  const tableOfContents = generateTableOfContents(htmlWithAnchors);
  
  // Determine layout application strategy
  const metadata = { frontmatter, title, excerpt, tableOfContents };
  let finalContent;
  
  // Check if content already has <html> element
  const contentHasHtml = hasHtmlElement(htmlWithAnchors);
  
  if (contentHasHtml) {
    // Content already has complete HTML structure, use as-is
    finalContent = htmlWithAnchors;
    logger.debug('Using content as-is (contains <html> element)');
  } else if (layoutContent) {
    // Apply specified layout when content doesn't have <html> element
    finalContent = wrapInLayout(htmlWithAnchors, metadata, layoutContent);
    logger.debug('Applied specified layout');
  } else {
    // No layout specified, check for default layout
    const hasDefault = await hasDefaultLayout(sourceRoot, layoutsDir);
    if (hasDefault) {
      // Load and apply default layout
      const defaultLayoutPath = path.join(sourceRoot, layoutsDir, 'default.html');
      try {
        const defaultLayoutContent = await fs.readFile(defaultLayoutPath, 'utf-8');
        finalContent = wrapInLayout(htmlWithAnchors, metadata, defaultLayoutContent);
        logger.debug('Applied default layout');
      } catch (error) {
        logger.warn(`Could not read default layout: ${error.message}`);
        // Fallback: only create basic HTML if layout is not specified, default not found, and no <html> element
        finalContent = createBasicHtmlStructure(htmlWithAnchors, title, excerpt);
        logger.debug('Created basic HTML structure (default layout failed)');
      }
    } else {
      // No layout specified, no default layout found, no <html> element → create basic HTML
      finalContent = createBasicHtmlStructure(htmlWithAnchors, title, excerpt);
      logger.debug('Created basic HTML structure (no layout available)');
    }
  }
  
  // Track asset references in the final content
  if (assetTracker) {
    assetTracker.recordAssetReferences(filePath, finalContent, sourceRoot);
  }
  
  // Generate output path with pretty URL support
  const outputPath = getOutputPathWithPrettyUrls(filePath, sourceRoot, outputRoot, prettyUrls);
  await ensureDirectoryExists(path.dirname(outputPath));
  
  try {
    await fs.writeFile(outputPath, finalContent, 'utf-8');
  } catch (error) {
    throw new FileSystemError('write', outputPath, error);
  }
  
  // Return frontmatter for sitemap generation
  return frontmatter;
}

/**
 * Process a single HTML file
 * @param {string} filePath - Path to HTML file
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 * @param {DependencyTracker} dependencyTracker - Dependency tracker instance
 * @param {AssetTracker} assetTracker - Asset tracker instance
 */
async function processHtmlFile(filePath, sourceRoot, outputRoot, dependencyTracker, assetTracker, config = {}) {
  // Read HTML content
  let htmlContent;
  try {
    htmlContent = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FileSystemError('read', filePath, error);
  }
  
  // Use unified HTML processor that handles both SSI includes and DOM templating
  logger.debug(`Processing HTML with unified processor: ${path.relative(sourceRoot, filePath)}`);
  
  const unifiedConfig = getUnifiedConfig(config);
  let processedContent = await processHtmlUnified(
    htmlContent, 
    filePath, 
    sourceRoot, 
    dependencyTracker,
    unifiedConfig
  );
  
  // Track asset references in the final content
  if (assetTracker) {
    assetTracker.recordAssetReferences(filePath, processedContent, sourceRoot);
  }
  
  // Write to output
  const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
  await ensureDirectoryExists(path.dirname(outputPath));
  
  try {
    await fs.writeFile(outputPath, processedContent, 'utf-8');
  } catch (error) {
    throw new FileSystemError('write', outputPath, error);
  }
}

/**
 * Copy a static asset file
 * @param {string} filePath - Path to asset file
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 */
async function copyAsset(filePath, sourceRoot, outputRoot) {
  const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
  await ensureDirectoryExists(path.dirname(outputPath));
  
  try {
    await fs.copyFile(filePath, outputPath);
  } catch (error) {
    throw new FileSystemError('copy', filePath, error);
  }
}

/**
 * Recursively scan directory for files
 * @param {string} dirPath - Directory to scan
 * @param {string[]} files - Accumulated file list
 * @returns {Promise<string[]>} Array of file paths
 */
async function scanDirectory(dirPath, files = []) {
  let entries;
  
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    throw new FileSystemError('readdir', dirPath, error);
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip hidden directories except for .components and .layouts
      // Also skip common build/dependency directories
      if ((!entry.name.startsWith('.') || entry.name === '.components' || entry.name === '.layouts') &&
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' && 
          entry.name !== 'build') {
        await scanDirectory(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Skip hidden files
      if (!entry.name.startsWith('.')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Clean output directory
 * @param {string} outputRoot - Output directory to clean
 */
async function cleanOutputDirectory(outputRoot) {
  try {
    const stats = await fs.stat(outputRoot);
    if (stats.isDirectory()) {
      logger.debug(`Cleaning output directory: ${outputRoot}`);
      await fs.rm(outputRoot, { recursive: true, force: true });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new FileSystemError('clean', outputRoot, error);
    }
    // Directory doesn't exist, nothing to clean
  }
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileSystemError('mkdir', dirPath, error);
  }
}

/**
 * Get MIME type for file extension
 * @param {string} filePath - File path
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = getFileExtension(filePath);
  
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file should be processed as HTML
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file should be processed
 */
export function shouldProcessFile(filePath, includesDir = 'includes') {
  return isHtmlFile(filePath) && !isPartialFile(filePath, includesDir);
}

/**
 * Get build statistics
 * @param {string} sourceRoot - Source root directory
 * @returns {Promise<Object>} Build statistics
 */
export async function getBuildStats(sourceRoot) {
  const files = await scanDirectory(sourceRoot);
  
  const stats = {
    total: files.length,
    html: 0,
    partials: 0,
    assets: 0
  };
  
  for (const filePath of files) {
    if (isHtmlFile(filePath)) {
      if (isPartialFile(filePath)) {
        stats.partials++;
      } else {
        stats.html++;
      }
    } else {
      stats.assets++;
    }
  }
  
  return stats;
}