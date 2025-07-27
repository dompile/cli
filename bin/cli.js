#!/usr/bin/env node

import { parseArgs } from '../src/cli/args-parser.js';
import { build } from '../src/core/file-processor.js';
import { watch } from '../src/core/file-watcher.js';
import { DevServer } from '../src/server/dev-server.js';
import { liveReload } from '../src/server/live-reload.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.4.0';

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    
    // Handle version and help flags
    if (args.version) {
      console.log(`dompile v${VERSION}`);
      process.exit(0);
    }
    
    if (args.help) {
      showHelp();
      process.exit(0);
    }
    
    if (!args.command) {
      showHelp();
      process.exit(0);
    }
    
    // Execute commands
    switch (args.command) {
      case 'build':
        logger.info('Building static site...');
        await build(args);
        logger.info('Build completed successfully!');
        break;
        
      case 'watch':
        logger.info('Starting file watcher...');
        await watch(args);
        break;
        
      case 'serve':
        logger.info('Starting development server with live reload...');
        const server = new DevServer(args);
        
        // Enable live reload
        liveReload.setEnabled(true);
        
        // Start server
        await server.start();
        
        // Start file watcher with live reload callback
        const watchConfig = {
          ...args,
          onReload: (eventType, filePath) => {
            liveReload.notifyReload(eventType, filePath);
          }
        };
        
        await watch(watchConfig);
        break;
        
      default:
        throw new (await import('../src/utils/errors.js')).DompileError(
          `Unknown command: ${args.command}`,
          null,
          null,
          [
            'Use --help to see valid commands',
            'Check for typos in the command name',
            'Refer to the documentation for supported commands'
          ]
        );
    }
  } catch (error) {
    // Enhanced error formatting
    if (error.formatForCLI) {
      console.error('\n' + error.formatForCLI());
    } else {
      logger.error('❌ Error:', error.message);
    }

    // Show stack trace in debug mode or for unexpected errors
    if (process.env.DEBUG || (!error.suggestions && !error.formatForCLI)) {
      console.error('\n🔍 Stack trace:');
      console.error(error.stack);
    }

    // Exit with code 1 for errors with suggestions, 2 for unexpected errors
    if (error && error.suggestions && Array.isArray(error.suggestions)) {
      process.exit(1);
    } else {
      process.exit(2);
    }
  }
}

function showHelp() {
  console.log(`
dompile v${VERSION}

Usage: dompile <command> [options]

Commands:
  build     Build static site from source files
  watch     Watch files and rebuild on changes
  serve     Start development server with live reload

Options:
  --source, -s      Source directory (default: src)
  --output, -o      Output directory (default: dist)
  --layouts         Layouts directory (default: .layouts, relative to source)
  --components      Components directory (default: .components, relative to source)
  --head            Custom head include file path
  --port, -p        Server port (default: 3000)
  --host            Server host (default: localhost)
  --pretty-urls     Generate pretty URLs (about.md → about/index.html)
  --base-url        Base URL for sitemap.xml (default: https://example.com)
  --help, -h        Show this help message
  --version, -v     Show version number

Examples:
  dompile build                           # Uses all defaults (src → dist)
  dompile serve                           # Serve with live reload on port 3000
  dompile build --pretty-urls
  dompile build --base-url https://mysite.com
  dompile serve --port 8080
  dompile build --head common/head.html
`);
}

main();