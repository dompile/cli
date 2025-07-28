import { wrapInLayout } from '../src/core/markdown-processor.js';

const layout = '<main>{{ content }}</main>';
const content = '<h1>Title</h1><p>Text</p>';
const metadata = { content };

console.log('Test 2: Calling wrapInLayout with:');
console.log('content:', content);
console.log('metadata:', metadata);
console.log('layout:', layout);

const result = wrapInLayout(content, metadata, layout);
console.log('\nResult:');
console.log(result);

console.log('\nChecks:');
console.log('includes expected:', result.includes('<main><h1>Title</h1><p>Text</p></main>'));
console.log('actual result:', result);
