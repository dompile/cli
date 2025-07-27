import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugTemplateChain() {
  const sourceDir = '/tmp/debug-template-chain';

  const structure = {
    'layouts/base.html': `<!DOCTYPE html>
<html>
<head><title><slot name="title">Base Title</slot></title></head>
<body>
  <slot name="content">Base Content</slot>
</body>
</html>`,
    'layouts/page.html': `<template extends="base.html">
  <slot name="title">Page Layout Title</slot>
  <slot name="content">
    <header><slot name="header">Default Page Header</slot></header>
    <main><slot name="main">Default Main Content</slot></main>
  </slot>
</template>`,
    'article.html': `<template extends="page.html">
  <slot name="title">Article Title</slot>
  <slot name="header">
    <h1>Article Header</h1>
  </slot>
  <slot name="main">
    <article>Article content here</article>
  </slot>
</template>`
  };

  try {
    await createTestStructure(sourceDir, structure);

    console.log('=== STEP 1: Extract original slots from article.html ===');
    
    function extractSlotData(htmlContent) {
      const slots = {};
      const dom = new JSDOM(htmlContent, { contentType: "text/html" });
      const document = dom.window.document;

      const templateElements = document.querySelectorAll("template[extends]");
      
      templateElements.forEach((templateEl) => {
        const templateDom = new JSDOM(`<div>${templateEl.innerHTML}</div>`, { contentType: "text/html" });
        const slotElements = templateDom.window.document.querySelectorAll("slot[name]");
        
        slotElements.forEach((element) => {
          const slotName = element.getAttribute("name");
          if (slotName) {
            slots[slotName] = element.innerHTML;
          }
        });
      });

      return slots;
    }
    
    const originalSlots = extractSlotData(structure['article.html']);
    console.log('Original slots from article.html:', originalSlots);
    
    console.log('\n=== STEP 2: Resolve template chain ===');
    console.log('Starting with page.html');
    
    // Manually resolve chain
    const pageSlots = extractSlotData(structure['layouts/page.html']);
    console.log('Slots in page.html:', pageSlots);
    
    function applySlots(templateContent, slotData) {
      let result = templateContent;

      for (const [slotName, content] of Object.entries(slotData)) {
        const slotRegex = new RegExp(
          `<slot\\s+name=["']${slotName}["'][^>]*>.*?</slot>`,
          "gs"
        );
        result = result.replace(slotRegex, content);
      }
      
      return result;
    }
    
    console.log('Applying page.html slots to base.html...');
    const afterPageSlots = applySlots(structure['layouts/base.html'], pageSlots);
    console.log('After applying page slots to base:', afterPageSlots);
    
    console.log('\n=== STEP 3: Apply original slots to final template ===');
    const finalResult = applySlots(afterPageSlots, originalSlots);
    console.log('Final result:', finalResult);

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugTemplateChain();
