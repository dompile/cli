#!/usr/bin/env node

import { parseArgs } from '../src/cli/args-parser.js';

const config = parseArgs(['-s', 'test/fixtures/basic-site', '-o', 'content', '-l', 'templates']);
console.log('Config object from CLI:');
console.log(JSON.stringify(config, null, 2));

import { getUnifiedConfig } from '../src/core/unified-html-processor.js';
const unifiedConfig = getUnifiedConfig(config);
console.log('\nUnified config:');
console.log(JSON.stringify(unifiedConfig, null, 2));
