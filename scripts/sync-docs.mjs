// Push every document this project produces into Doug's Dropbox
// exchange folder, so the chat team can read them.
//
//   npm run docs:sync      copy once
//   npm run docs:sync -- --watch   copy, then keep copying on change
//
// Copies only when the content actually differs, so Dropbox is not
// woken up for no reason. Safe to run any time; it never deletes.

import { readFileSync, writeFileSync, existsSync, mkdirSync, watch, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

// Where the chat team reads. Override with DOCS_OUT if the Dropbox
// path ever moves.
const OUT =
  process.env.DOCS_OUT ||
  'C:/Users/dougs/Dropbox/Apps/PhrogDrop/From HvB AI Dev';

// source in the repo -> name it gets in the exchange folder. The names
// are written to read clearly out of context, months from now.
const DOCS = [
  ['docs/DRAM_SCRIPT.md', 'Dramaton DRAMSCRIPT Reference.md'],
  ['docs/dramscript-reference.html', 'Dramaton DRAMSCRIPT Reference.html'],
  ['docs/CODEBASE_BRIEF.md', 'Dramaton CODEBASE_BRIEF for code review AI.md'],
  ['docs/MACHINE_BRIEF.md', 'Dramaton MACHINE brief.md'],
  ['docs/DESIGN_ADDENDUM_01.md', 'HvB DESIGN ADDENDUM 01.md'],
];

function copyIfChanged(from, toName) {
  const src = resolve(repo, from);
  if (!existsSync(src)) return { name: toName, status: 'missing' };
  const dest = resolve(OUT, toName);
  const body = readFileSync(src);
  if (existsSync(dest)) {
    const current = readFileSync(dest);
    if (current.equals(body)) return { name: toName, status: 'unchanged' };
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body);
  const kb = Math.round(body.length / 1024);
  return { name: toName, status: `copied (${kb} KB)` };
}

function syncAll() {
  const stamp = new Date().toISOString().slice(11, 19);
  let copied = 0;
  for (const [from, toName] of DOCS) {
    const r = copyIfChanged(from, toName);
    if (r.status.startsWith('copied')) copied++;
    if (r.status !== 'unchanged') console.log(`  ${r.name} — ${r.status}`);
  }
  console.log(`[${stamp}] sync complete${copied ? '' : ' (nothing changed)'}`);
}

console.log(`Syncing docs -> ${OUT}`);
syncAll();

if (process.argv.includes('--watch')) {
  console.log('Watching for changes. Ctrl+C to stop.');
  const pending = new Set();
  for (const [from] of DOCS) {
    const src = resolve(repo, from);
    if (!existsSync(src)) continue;
    watch(src, () => {
      // editors write in bursts; settle before copying
      if (pending.has(src)) return;
      pending.add(src);
      setTimeout(() => {
        pending.delete(src);
        syncAll();
      }, 400);
    });
  }
}
