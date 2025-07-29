import { UnifyError } from "../utils/errors.js";
/**
 * Command-line argument parser for unify
 * Handles parsing of CLI arguments and options
 */

export function parseArgs(argv) {
  const args = {
    command: null,
    source: "src",
    output: "dist",
    layouts: ".layouts",
    components: ".components",
    port: 3000,
    host: "localhost",
    prettyUrls: false,
    baseUrl: "https://example.com",
    clean: false,
    sitemap: true,
    perfection: false,
    minify: false,
    verbose: false,
    help: false,
    version: false,
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    // Commands (only at the beginning, before any options)
    if (arg === 'build' || arg === 'watch' || arg === 'serve') {
      if (i === 0) {
        args.command = arg;
        continue;
      } else {
        // Command found after options, treat as unknown option
        throw new UnifyError(
          `Unknown option: ${arg}`,
          null,
          null,
          [
            'Commands must be the first argument',
            'Use --help to see valid options',
            'Check for typos in the option name'
          ]
        );
      }
    }
    
    // Check for unknown commands (first non-option argument)
    if (!arg.startsWith('-') && !args.command && i === 0) {
      if (arg !== 'build' && arg !== 'watch' && arg !== 'serve') {
        throw new UnifyError(
          `Unknown command: ${arg}`,
          null,
          null,
          [
            'Use --help to see valid commands',
            'Check for typos in the command name',
            'Refer to the documentation for supported commands'
          ]
        );
      }
      args.command = arg;
      continue;
    }
    
    // Flags
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    
    if (arg === '--version' || arg === '-v') {
      args.version = true;
      continue;
    }
    
    // Options with values
    if ((arg === '--source' || arg === '-s') && nextArg) {
      args.source = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--output' || arg === '-o') && nextArg) {
      args.output = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--layouts' || arg === '-l') && nextArg) {
      args.layouts = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--components' || arg === '-c') && nextArg) {
      args.components = nextArg;
      i++;
      continue;
    }
    
    
    if ((arg === '--port' || arg === '-p') && nextArg) {
      args.port = parseInt(nextArg, 10);
      if (isNaN(args.port) || args.port < 1 || args.port > 65535) {
        throw new Error('Port must be a number between 1 and 65535');
      }
      i++;
      continue;
    }
    
    if (arg === '--host' && nextArg) {
      args.host = nextArg;
      i++;
      continue;
    }
    
    if (arg === '--pretty-urls') {
      args.prettyUrls = true;
      continue;
    }
    
    if (arg === '--base-url' && nextArg) {
      args.baseUrl = nextArg;
      i++;
      continue;
    }
    
    if (arg === '--clean') {
      args.clean = true;
      continue;
    }
    
    if (arg === '--no-sitemap') {
      args.sitemap = false;
      continue;
    }
    
    if (arg === '--perfection') {
      args.perfection = true;
      continue;
    }
    
    if (arg === '--minify') {
      args.minify = true;
      continue;
    }
    
    if (arg === '--verbose') {
      args.verbose = true;
      continue;
    }
    
    // Unknown arguments
    if (arg.startsWith('-')) {
      // Use UnifyError for consistent CLI exit code
      throw new UnifyError(
        `Unknown option: ${arg}`,
        null,
        null,
        [
          'Use --help to see valid options',
          'Check for typos in the option name',
          'Refer to the documentation for supported flags'
        ]
      );
    } else {
      // Non-option argument that's not a command
      throw new UnifyError(
        `Unknown option: ${arg}`,
        null,
        null,
        [
          'Commands must be the first argument',
          'Use --help to see valid options',
          'Check for typos in the argument'
        ]
      );
    }
  }
  
  return args;
}