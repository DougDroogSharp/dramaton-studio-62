// Art generation for the ELON MUSK (2020s) standalone chapter.
// Drives the local Flux bridge (dev server on :8080) with the "Elon"
// style pack (Doug's satirical alt-comics style), chroma-keys the
// character green-screens, and saves PNGs into art-demo/elon/.
// Idempotent: existing files are skipped.
//
// Run: node scripts/chapters/gen-elon.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'elon');
const BRIDGE = 'http://localhost:8080/api/flux-generate';

// ---------------------------------------------------------------- manifest

const MANIFEST = [
  {
    file: 'factory.png', isCharacter: false,
    prompt: 'A rocket factory floor: a giant rocket engine mounted on a steel test stand, yellow warning signs and caution stripes, harsh overhead work lights throwing hard shadows, cables and tool carts on the concrete. Wide empty middle ground for characters. No people.',
    alt: 'Industrial rocket assembly hall interior: a huge engine bell on a test rig, hazard signage, harsh floodlights, concrete floor with painted safety lines. Empty middle ground. No people.',
  },
  {
    file: 'feedroom.png', isCharacter: false,
    prompt: 'A giant glowing social media feed control room: a towering wall of screens showing trending panels and scrolling feeds, control desks with blinking consoles, cold blue light washing the floor. Wide empty middle ground for characters. No people.',
    alt: 'A dark control room dominated by a wall of glowing monitors full of charts and scrolling text panels, operator desks in the foreground, electric blue glow. Empty middle ground. No people.',
  },
  {
    file: 'worker.png', isCharacter: true,
    prompt: 'A factory worker in a high-visibility orange safety vest and hard hat: tired eyes with dark circles, determined set jaw, work gloves, standing, full body, facing slightly right.',
    alt: 'An industrial worker wearing a hi-vis vest and hard hat, weary but resolute expression, standing, full body, facing slightly right.',
  },
  {
    file: 'hypebro.png', isCharacter: true,
    prompt: 'A smug tech hype-bro lieutenant: slicked hair, company fleece vest over a hoodie, clutching a tablet to his chest, insufferable grin, standing, full body, facing slightly right.',
    alt: 'A smug young tech executive in a fleece vest and hoodie holding a tablet, grinning, standing, full body, facing slightly right.',
  },
  {
    file: 'elon_sweat.png', isCharacter: true,
    prompt: 'Elon Musk caricature, panicking: eyes bugged wide, big cartoon sweat drops flying off his forehead, gritted teeth, black t-shirt with a small rocket logo, hands half-raised in alarm, standing, full body, facing slightly left.',
    alt: 'A panicking billionaire tech CEO caricature: bulging eyes, cartoon sweat beads, clenched teeth, black t-shirt with a rocket logo, hands raised in alarm, standing, full body, facing slightly left.',
  },
  {
    file: 'lawyer.png', isCharacter: true,
    prompt: 'A trial lawyer: crisp dark suit, leather briefcase in one hand and a sheaf of court papers in the other, steely confident expression, standing, full body, facing slightly right.',
    alt: 'An attorney in a sharp suit carrying a briefcase and legal documents, calm and confident, standing, full body, facing slightly right.',
  },
];

// ---------------------------------------------------------------- chroma key

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

// ---------------------------------------------------------------- run

async function generate(prompt, isCharacter) {
  const resp = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      isCharacter,
      stylePack: 'Elon',
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
    console.log(`- elon/${item.file} exists, skipping`);
    skipped++;
    continue;
  }
  process.stdout.write(`* elon/${item.file} generating... `);
  try {
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.alt) {
        process.stdout.write(`policy hit, rephrasing... `);
        buf = await generate(item.alt, item.isCharacter);
      } else {
        throw err;
      }
    }
    if (item.isCharacter) buf = chromaKey(buf);
    writeFileSync(outPath, buf);
    console.log(`ok (${Math.round(buf.length / 1024)} KB)`);
    generated++;
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed.`);
