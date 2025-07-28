import { DompileError } from "../utils/errors.js";
/**
 * Command-line argument parser for dompile
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
    help: false,
    version: false,
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    // Commands
    if (arg === 'build' || arg === 'watch' || arg === 'serve') {
      args.command = arg;
      continue;
    }
    
    // Check for unknown commands (first non-option argument)
    if (!arg.startsWith('-') && !args.command) {
      if (arg !== 'build' && arg !== 'watch' && arg !== 'serve') {
        throw new DompileError(
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
    
    // Unknown arguments
    if (arg.startsWith('-')) {
      // Use DompileError for consistent CLI exit code
      throw new DompileError(
        `Unknown option: ${arg}`,
        null,
        null,
        [
          'Use --help to see valid options',
          'Check for typos in the option name',
          'Refer to the documentation for supported flags'
        ]
      );
    }
  }
  
  return args;
}