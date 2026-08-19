// Art generator for the WILLIAM THE CONQUEROR standalone chapter game.
// Drives the local Flux bridge (dev server on :8080) with the
// "William the Conqueror" (Bayeux tapestry) style pack, chroma-keys
// character green-screens, saves PNGs into art-demo/william/.
// Idempotent: existing files are skipped; delete a file to regenerate.
//
// Run: node scripts/chapters/gen-william.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'william');
const BRIDGE = 'http://localhost:8080/api/flux-generate';
const STYLE = 'William the Conqueror';

const MANIFEST = [
  // Backdrops
  {
    file: 'burning_village.png', isCharacter: false,
    prompt: 'A northern English village burning at night in deep winter, 1069: thatched Saxon cottages ablaze, orange flames against a black sky, smoke over snow-covered fields, a broken cart, empty grain store thrown open. No people.',
    retry: 'A Saxon village at night in winter 1069, cottages on fire, glowing orange light on snow, smoke rising to a dark sky, abandoned cart and empty granary. Empty scene, no people.',
  },
  {
    file: 'salisbury_field.png', isCharacter: false,
    prompt: 'A great open field assembly at Salisbury, 1086: rows of Norman tents and tall banners with heraldic devices, a wooden dais with an empty throne, spears stacked, chalk downs on the horizon, summer daylight. No people.',
  },
  {
    file: 'ely_fens.png', isCharacter: false,
    prompt: 'The fens of Ely at dawn, 1071: misty flat marshland, tall reed beds, dark still water channels, a narrow wooden causeway, the distant silhouette of the abbey on its island. Moody grey-gold light. No people.',
  },
  {
    file: 'scriptorium.png', isCharacter: false,
    prompt: 'A monastic scriptorium, 1086: rows of sloped writing desks with open parchment ledgers, ink horns and quills, candles, a great bound book on a lectern, stone walls with a small arched window. No people.',
  },
  // Characters (green screen, chroma-keyed)
  {
    file: 'hereward.png', isCharacter: true,
    prompt: 'Hereward the Wake, Anglo-Saxon rebel of the fens, 1071: long-haired bearded Saxon warrior in a mud-spattered leather jerkin and wool cloak, round shield slung on his back, short axe in hand, wary stance, full body, facing slightly right.',
  },
  {
    file: 'peasant.png', isCharacter: true,
    prompt: 'A Saxon peasant farmer, 1069: gaunt middle-aged man in a rough wool tunic and hood, winter-worn, clutching an empty grain sack, weathered anxious face, standing, full body, facing slightly left.',
  },
  {
    file: 'william_angry.png', isCharacter: true,
    prompt: 'William the Conqueror in a fury: stern bearded Norman king, gold crown, chain mail hauberk under a long red cloak, face twisted in rage, teeth bared, fist clenched on his sword hilt, standing, full body, facing slightly left.',
    retry: 'William the Conqueror, Norman king, enraged expression: bearded face scowling fiercely, gold crown, chain mail and long red cloak, gripping his sword hilt, standing, full body, facing slightly left.',
  },
  {
    file: 'orderic.png', isCharacter: true,
    prompt: 'Orderic Vitalis, Anglo-Norman monk chronicler: tonsured young monk in a plain black Benedictine habit, holding a quill pen and a parchment book, gentle sorrowful face, standing, full body, facing slightly right.',
  },
];

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
  try {
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.retry) {
        process.stdout.write(`policy hit, rephrasing... `);
        buf = await generate(item.retry, item.isCharacter);
      } else throw err;
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
