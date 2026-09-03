import { Plugin } from 'vite';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin that auto-generates DRAM Script documentation
 * Runs on every dev server start and production build
 */
export function dramDocsPlugin(): Plugin {
  return {
    name: 'dram-docs-generator',
    
    // Run at the very start of both dev and build
    buildStart: async () => {
      try {
        // Dynamic import to get fresh content each time
        const { generateMarkdown } = await import('./src/utils/generateDramDocs');
        const markdown = generateMarkdown();
        
        // Ensure docs directory exists
        const docsDir = resolve(process.cwd(), 'docs');
        if (!existsSync(docsDir)) {
          mkdirSync(docsDir, { recursive: true });
        }
        
        // Write the documentation
        const outputPath = resolve(docsDir, 'DRAM_SCRIPT.md');
        writeFileSync(outputPath, markdown, 'utf-8');
        
        // Count commands for the log message
        const commandCount = (markdown.match(/#### `/g) || []).length;
        console.log(`\n📝 DRAM Script docs updated (${commandCount} commands)\n`);
      } catch (error) {
        console.error('⚠️ Failed to generate DRAM docs:', error);
      }
    },
  };
}
