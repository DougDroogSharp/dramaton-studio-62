// Headless art generation for the HVB art demo: drives the local Flux
// bridge (dev server must be running) with each chapter's style pack,
// chroma-keys character green-screens to transparency, and saves PNGs
// into art-demo/. Idempotent: existing files are skipped, so re-runs
// only generate what's missing (delete a file to regenerate it).
//
// Run: node scripts/generate-art.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'art-demo');
const BRIDGE = 'http://localhost:8080/api/flux-generate';

// ---------------------------------------------------------------- manifest

const MANIFEST = [
  // WILLIAM — Bayeux tapestry style
  {
    file: 'william_hall.png', stylePack: 'William the Conqueror', isCharacter: false,
    prompt: 'Interior of a Norman great hall, 1070s: stone walls with round arches, a wooden throne on a dais, hanging banners, torch sconces, rush-strewn floor. Wide empty middle ground for characters. No people.',
  },
  {
    file: 'william_king.png', stylePack: 'William the Conqueror', isCharacter: true,
    prompt: 'William the Conqueror, Norman king: stern bearded face, gold crown, chain mail hauberk under a long red cloak, sword at his belt, standing, full body, facing slightly left.',
  },
  {
    file: 'william_odo.png', stylePack: 'William the Conqueror', isCharacter: true,
    prompt: 'Odo, Bishop of Bayeux: tonsured Norman bishop in ecclesiastical robes over chain mail, holding a wooden club-mace, standing, full body, facing slightly right.',
  },

  // LEOPOLD — 1900s documentary photograph style
  {
    file: 'leopold_station.png', stylePack: 'King Leopold', isCharacter: false,
    prompt: 'A Congo Free State river trading station, circa 1900: wooden colonial post building with a veranda, woven baskets of wild rubber stacked on the ground, a river steamboat at the bank beyond, palm trees. No people.',
  },
  {
    file: 'leopold_king.png', stylePack: 'King Leopold', isCharacter: true,
    prompt: 'King Leopold II of Belgium: aged man with an enormous white spade-shaped beard, dark military uniform with medals and a sash, standing stiffly, formal full-body portrait, facing slightly left.',
  },
  {
    file: 'leopold_casement.png', stylePack: 'King Leopold', isCharacter: true,
    prompt: 'Roger Casement, British consul, 1904: lean bearded man in a white tropical consular suit, holding a small notebook, standing, full body, facing slightly right.',
  },

  // CAPONE — 1986 Amiga pixel art style
  {
    file: 'capone_garage.png', stylePack: 'King of Chicago', isCharacter: false,
    prompt: 'Interior of a 1929 Chicago brick garage: bare brick wall, a parked black 1920s sedan, hanging work lamps, oil-stained concrete floor. No people.',
  },
  {
    file: 'capone_boss.png', stylePack: 'King of Chicago', isCharacter: true,
    prompt: 'Al Capone, 1929: heavyset man in a cream fedora and pinstriped double-breasted suit, silk tie, scar on his left cheek, cigar, confident stance, full body, facing slightly left.',
  },
  {
    file: 'capone_wilson.png', stylePack: 'King of Chicago', isCharacter: true,
    prompt: 'Frank J. Wilson, IRS special agent, 1930: wiry man in a gray three-piece suit, round spectacles, holding a ledger book, standing, full body, facing slightly right.',
  },

  // ELON — Doug's satirical alt-comics style
  {
    file: 'elon_hq.png', stylePack: 'Elon', isCharacter: false,
    prompt: 'A billionaire tech headquarters office at night: floor-to-ceiling windows over a rocket launchpad in the distance, a huge desk with multiple glowing screens showing charts going up, scattered energy drink cans. No people.',
  },
  {
    file: 'elon_musk.png', stylePack: 'Elon', isCharacter: true,
    prompt: 'Elon Musk caricature: smug expression, arms crossed, black t-shirt with a small rocket logo, standing, full body, facing slightly left.',
  },
  {
    file: 'elon_reporter.png', stylePack: 'Elon', isCharacter: true,
    prompt: 'An investigative reporter: sharp-eyed woman in a blazer with a press lanyard, holding up a phone recording, determined expression, standing, full body, facing slightly right.',
  },
];

// ---------------------------------------------------------------- chroma key

// Remove the green screen: fully green pixels go transparent, edge
// pixels get partial alpha + despill so sprites sit clean on any bg.
function chromaKey(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const greenness = g - Math.max(r, b);
    if (g > 90 && greenness > 60) {
      d[i + 3] = 0; // solid green: fully transparent
    } else if (g > 70 && greenness > 25) {
      // edge fringe: partial alpha, despill the green cast
      d[i + 3] = Math.max(0, 255 - greenness * 4);
      d[i + 1] = Math.max(r, b);
    }
  }
  return PNG.sync.write(png);
}

// ---------------------------------------------------------------- run

mkdirSync(outDir, { recursive: true });
let generated = 0, skipped = 0, failed = 0;

for (const item of MANIFEST) {
  const outPath = resolve(outDir, item.file);
  if (existsSync(outPath)) {
    console.log(`- ${item.file} exists, skipping`);
    skipped++;
    continue;
  }
  process.stdout.write(`* ${item.file} [${item.stylePack}] generating... `);
  try {
    const resp = await fetch(BRIDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: item.prompt,
        isCharacter: item.isCharacter,
        stylePack: item.stylePack,
        aspectRatio: item.isCharacter ? '2:3' : '16:9',
      }),
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);
    let buf = Buffer.from(data.imageUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
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
if (failed > 0) process.exit(1);
