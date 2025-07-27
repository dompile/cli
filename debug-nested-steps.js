import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';
import { processHtmlUnified } from './src/core/unified-html-processor.js';
import { DependencyTracker } from './src/core/dependency-tracker.js';
import { createTestStructure } from './test/fixtures/temp-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugNestedTemplateWithSteps() {
  const sourceDir = '/tmp/debug-nested-template-steps';

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

    console.log('=== STEP 1: Extract slots from article.html ===');
    console.log('Article content:', structure['article.html']);
    
    // Manually extract slots to see what we get
    
    function extractSlotDataDebug(htmlContent) {
      const slots = {};
      const dom = new JSDOM(htmlContent, { contentType: "text/html" });
      const document = dom.window.document;

      // Check for template elements with extends attribute
      const templateElements = document.querySelectorAll("template[extends]");
      
      templateElements.forEach((templateEl) => {
        console.log('Template innerHTML:', templateEl.innerHTML);
        // Parse the template content to find slots
        const templateDom = new JSDOM(`<div>${templateEl.innerHTML}</div>`, { contentType: "text/html" });
        const slotElements = templateDom.window.document.querySelectorAll("slot[name]");
        
        slotElements.forEach((element) => {
          const slotName = element.getAttribute("name");
          if (slotName) {
            slots[slotName] = element.innerHTML;
            console.log(`Slot "${slotName}":`, element.innerHTML);
          }
        });
      });

      return slots;
    }
    
    const slotData = extractSlotDataDebug(structure['article.html']);
    console.log('Extracted slots:', slotData);
    
    console.log('\n=== STEP 2: Apply to page.html ===');
    console.log('Page template:', structure['layouts/page.html']);
    
    function applySlotsDebug(templateContent, slotData) {
      let result = templateContent;

      for (const [slotName, content] of Object.entries(slotData)) {
        console.log(`Replacing slot "${slotName}" with: ${content}`);
        const slotRegex = new RegExp(
          `<slot\\s+name=["']${slotName}["'][^>]*>.*?</slot>`,
          "gs"
        );
        result = result.replace(slotRegex, content);
      }
      
      return result;
    }
    
    const afterFirstApplication = applySlotsDebug(structure['layouts/page.html'], slotData);
    console.log('After first application:', afterFirstApplication);

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

debugNestedTemplateWithSteps();
