// Art generation for the KING LEOPOLD chapter (1885-1908).
// Drives the local Flux bridge (dev server on :8080) with the
// "King Leopold" style pack (1900s documentary photograph, B&W),
// chroma-keys character green-screens, saves PNGs into art-demo/leopold/.
// Idempotent: existing files are skipped.
//
// Run: node scripts/chapters/gen-leopold.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'leopold');
const BRIDGE = 'http://localhost:8080/api/flux-generate';
const STYLE = 'King Leopold';

// Documentary restraint throughout: no violence, no wounds, no children
// in danger. The horror lives in absence and aftermath.
const MANIFEST = [
  {
    file: 'leopold_palace.png', isCharacter: false,
    prompt: 'Brussels royal palace grand office, 1900: gilded paneled walls, a huge desk stacked with papers and dispatch boxes, large maps of Africa on the wall, heavy drapes, a globe. Wide empty middle ground. No people.',
    fallback: 'Ornate European palace office interior, circa 1900: gilt paneling, large wall maps of a continent, grand desk with documents, globe, heavy curtains. No people.',
  },
  {
    file: 'leopold_village.png', isCharacter: false,
    prompt: 'An abandoned Congolese village, circa 1904: thatched houses standing empty, paths overgrown with vines and grass, cooking pots left mid-meal beside cold fire circles, jungle pressing in at the edges. Utterly still. No people.',
    fallback: 'An empty village clearing in central Africa, circa 1904: deserted thatched dwellings, overgrown paths, abandoned cooking pots by dead fires, encroaching forest. No people anywhere.',
  },
  {
    file: 'leopold_morel.png', isCharacter: true,
    prompt: 'E.D. Morel, 1900: earnest young Liverpool shipping clerk with a heavy moustache, dark Edwardian suit and bowler hat, thick shipping ledgers clutched under one arm, standing, full body, facing slightly right.',
    fallback: 'A young Edwardian shipping clerk, 1900: moustache, dark suit, bowler hat, ledger books under his arm, standing, full body, facing slightly right.',
  },
  {
    file: 'leopold_harris.png', isCharacter: true,
    prompt: 'Alice Seeley Harris, 1904: British missionary woman in a plain high-collared Edwardian blouse and long dark skirt, sun hat, holding a box Kodak camera at her waist, resolute expression, standing, full body, facing slightly left.',
    fallback: 'An Edwardian missionary woman, 1904: plain high-collared blouse, long skirt, sun hat, holding an early box camera, standing, full body, facing slightly left.',
  },
  {
    file: 'leopold_officer.png', isCharacter: true,
    prompt: 'A Force Publique officer, circa 1900: European colonial officer in a period khaki uniform with brass buttons and a peaked cap, rifle slung on his shoulder, stiff posture, standing, full body, facing slightly left.',
    fallback: 'A colonial military officer circa 1900: khaki uniform, brass buttons, peaked cap, rifle slung over the shoulder, standing at attention, full body, facing slightly left.',
  },
  {
    file: 'leopold_sheppard.png', isCharacter: true,
    prompt: 'William Sheppard, 1900: dignified African-American Presbyterian missionary, dark suit with clerical collar, pith helmet held at his side, notebook in hand, composed and resolute, standing, full body, facing slightly right.',
    fallback: 'A dignified African-American missionary, circa 1900: dark suit, clerical collar, holding a notebook, calm resolute expression, standing, full body, facing slightly right.',
  },
  {
    file: 'leopold_kodak.png', isCharacter: true,
    prompt: 'A 1900s box Kodak camera standing alone on a wooden tripod, leather-covered box body, brass lens, seen slightly from the side, full object, nothing else.',
    fallback: 'An antique early box camera on a wooden tripod, circa 1900, leather box body with brass lens, standing alone, full object.',
  },
];

// Green screen removal (same key as scripts/generate-art.mjs).
function chromaKey(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const greenness = g - Math.max(r, b);
    if (g > 90 && greenness > 60) {
      d[i + 3] = 0;
    } else if (g > 70 && greenness > 25) {
      d[i + 3] = Math.max(0, 255 - greenness * 4);
      d[i + 1] = Math.max(r, b);
    }
  }
  return PNG.sync.write(png);
}

async function generate(prompt, isCharacter) {
  const resp = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      isCharacter,
      stylePack: STYLE,
      aspectRatio: isCharacter ? '2:3' : '16:9',
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
  return Buffer.from(data.imageUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
}

mkdirSync(outDir, { recursive: true });
let generated = 0, skipped = 0, failed = 0;

for (const item of MANIFEST) {
  const outPath = resolve(outDir, item.file);
  if (existsSync(outPath)) {
    console.log(`- ${item.file} exists, skipping`);
    skipped++;
    continue;
  }
  process.stdout.write(`* ${item.file} generating... `);
  let buf = null;
  try {
    buf = await generate(item.prompt, item.isCharacter);
  } catch (err) {
    if (/content_policy/i.test(err.message) && item.fallback) {
      process.stdout.write(`policy hit, retrying restrained... `);
      try {
        buf = await generate(item.fallback, item.isCharacter);
      } catch (err2) {
        console.log(`FAILED: ${err2.message}`);
        failed++;
        continue;
      }
    } else {
      console.log(`FAILED: ${err.message}`);
      failed++;
      continue;
    }
  }
  if (item.isCharacter) buf = chromaKey(buf);
  writeFileSync(outPath, buf);
  console.log(`ok (${Math.round(buf.length / 1024)} KB)`);
  generated++;
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed.`);
