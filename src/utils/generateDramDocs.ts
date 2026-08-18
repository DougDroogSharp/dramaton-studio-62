// DRAM Script Documentation Generator
// This script generates docs/DRAM_SCRIPT.md from the command registry
// Run with: npm run docs:dram

import { COMMAND_DOCS, CATEGORY_INFO, validateDocumentation, CommandDoc } from './scriptDocs';

const CATEGORY_ORDER: CommandDoc['category'][] = [
  'scene',
  'actor',
  'dialogue',
  'audio',
  'effect',
  'button',
  'choice',
  'flow',
];

function generateMarkdown(): string {
  const lines: string[] = [];

  // Header (no date stamp: output must be stable so regens diff clean)
  lines.push('# DRAM Script Language Reference');
  lines.push('');
  lines.push('**Version:** 1.0');
  lines.push('');
  lines.push('DRAM Script is the scripting language used by Dramaton to control narrative flow, scene transitions, character dialogue, and interactive elements in visual novel-style games.');
  lines.push('');
  lines.push('> **Note:** This document is auto-generated from `src/utils/scriptDocs.ts`. Do not edit directly.');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('1. [Overview](#overview)');
  lines.push('2. [Basic Syntax](#basic-syntax)');
  lines.push('3. [Commands](#commands)');
  
  for (const category of CATEGORY_ORDER) {
    const info = CATEGORY_INFO[category];
    const anchor = info.title.toLowerCase().replace(/\s+/g, '-');
    lines.push(`   - [${info.title}](#${anchor})`);
  }
  
  lines.push('4. [Examples](#examples)');
  lines.push('5. [Best Practices](#best-practices)');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push('DRAM Script files are plain text scripts that define the sequence of events in a Dramaton game. Each line represents a single command that the engine executes in order during playback.');
  lines.push('');
  lines.push('Scripts are attached to **Scenes** and executed when that scene is active. The script runner processes commands sequentially, with some commands (like CHOICE) pausing for user input.');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Basic Syntax
  lines.push('## Basic Syntax');
  lines.push('');
  lines.push('- One command per line');
  lines.push('- Bracketed commands use `[COMMAND ...]` format');
  lines.push('- Dialogue uses `ACTOR_NAME: "text"` format');
  lines.push('- Comments start with `#` or `//`');
  lines.push('- Blank lines are ignored');
  lines.push('- Arguments can include strings (in quotes), numbers, and flags');
  lines.push('');
  lines.push('```');
  lines.push('[COMMAND argument1 argument2]');
  lines.push('ACTOR_NAME: "dialogue text"');
  lines.push('# This is a comment');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Commands by Category
  lines.push('## Commands');
  lines.push('');
  
  for (const category of CATEGORY_ORDER) {
    const categoryDocs = COMMAND_DOCS.filter(doc => doc.category === category);
    if (categoryDocs.length === 0) continue;
    
    const info = CATEGORY_INFO[category];
    lines.push(`### ${info.title}`);
    lines.push('');
    lines.push(info.description);
    lines.push('');
    
    for (const doc of categoryDocs) {
      // Skip internal commands like UNKNOWN
      if (doc.type === 'UNKNOWN') continue;
      
      lines.push(`#### \`${doc.type}\``);
      lines.push('');
      lines.push(doc.description);
      lines.push('');
      lines.push('**Syntax:**');
      lines.push('```');
      lines.push(doc.syntax);
      lines.push('```');
      lines.push('');
      
      if (doc.parameters && doc.parameters.length > 0) {
        lines.push('**Parameters:**');
        lines.push('| Name | Type | Description |');
        lines.push('|------|------|-------------|');
        for (const param of doc.parameters) {
          const optional = param.optional ? ' *(optional)*' : '';
          lines.push(`| \`${param.name}\` | ${param.type} | ${param.description}${optional} |`);
        }
        lines.push('');
      }
      
      lines.push('**Example:**');
      lines.push('```');
      lines.push(doc.example);
      lines.push('```');
      lines.push('');
      
      if (!doc.implemented) {
        lines.push('> ⚠️ **Planned Feature** - Not yet implemented');
        lines.push('');
      }
    }
    
    lines.push('---');
    lines.push('');
  }
  
  // Examples Section
  lines.push('## Examples');
  lines.push('');
  
  lines.push('### Simple Dialogue Scene');
  lines.push('');
  lines.push('```');
  lines.push('[ENTER detective at 50,50]');
  lines.push('Detective: "Another late night at the precinct."');
  lines.push('[WAIT 1s]');
  lines.push('Detective: "The case files aren\'t going to solve themselves."');
  lines.push('[SFX: "phone_ring"]');
  lines.push('Detective: "Now what?"');
  lines.push('```');
  lines.push('');
  
  lines.push('### Scene with Choices');
  lines.push('');
  lines.push('```');
  lines.push('[ENTER guide at 50,50]');
  lines.push('Guide: "Which path will you take?"');
  lines.push('[CHOICE]');
  lines.push('- "The mountain pass" -> mountain');
  lines.push('- "The forest trail" -> forest');
  lines.push('- "Return to town" -> town');
  lines.push('[/CHOICE]');
  lines.push('```');
  lines.push('');
  
  lines.push('### Interactive Scene with Buttons');
  lines.push('');
  lines.push('```');
  lines.push('[BUTTON examine_desk]');
  lines.push('[BUTTON check_window]');
  lines.push('[BUTTON read_letter]');
  lines.push('Narrator: "The office is quiet. What catches your attention?"');
  lines.push('```');
  lines.push('');
  
  lines.push('### Conditional Logic');
  lines.push('');
  lines.push('```');
  lines.push('[IF hasKey == true]');
  lines.push('Player: "I can use this key on the locked door."');
  lines.push('[SCENE locked_room]');
  lines.push('[ENDIF]');
  lines.push('');
  lines.push('[IF visitCount > 1]');
  lines.push('Shopkeeper: "Back again? I remember you."');
  lines.push('[ENDIF]');
  lines.push('```');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  
  // Best Practices
  lines.push('## Best Practices');
  lines.push('');
  lines.push('1. **Use descriptive IDs**: `forest_night` is better than `scene_7`');
  lines.push('2. **Keep dialogue concise**: Break long speeches into multiple lines');
  lines.push('3. **Test frequently**: Use Theater mode to preview your scripts');
  lines.push('4. **Comment your logic**: Add notes for complex branching with `#` comments');
  lines.push('5. **Organize by act**: Group related scenes together');
  lines.push('6. **Use consistent naming**: Stick to snake_case for IDs');
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Implementation Status
  const { missing, documented } = validateDocumentation();
  
  lines.push('## Implementation Status');
  lines.push('');
  lines.push(`✅ **${documented.length} commands documented**`);
  
  if (missing.length > 0) {
    lines.push(`⚠️ **${missing.length} commands missing documentation**: ${missing.join(', ')}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*This document is auto-generated from the Dramaton source code.*');
  
  return lines.join('\n');
}

// Export for use in other contexts
export { generateMarkdown };

// If running as a script, write docs/DRAM_SCRIPT.md directly.
// Usage: npm run docs:dram
if (typeof process !== 'undefined' && process.argv[1]?.includes('generateDramDocs')) {
  const { writeFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const outPath = resolve(process.cwd(), 'docs', 'DRAM_SCRIPT.md');
  writeFileSync(outPath, generateMarkdown() + '\n', 'utf8');
  console.log(`Wrote ${outPath}`);
}
