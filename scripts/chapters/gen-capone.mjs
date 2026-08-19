// Art generation for the KING OF CHICAGO / CAPONE chapter game.
// Drives the local Flux bridge (dev server on :8080) with the
// "King of Chicago" style pack (chunky 1986 Amiga 32-color pixel art),
// chroma-keys character green-screens, saves into art-demo/capone/.
// Idempotent: existing files are skipped. On a fal content policy
// block, rephrases once and retries; otherwise skips the piece.
//
// Run: node scripts/chapters/gen-capone.mjs

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'capone');
const BRIDGE = 'http://localhost:8080/api/flux-generate';
const STYLE = 'King of Chicago';

const MANIFEST = [
  // Backdrops
  {
    file: 'capone_soupkitchen.png', isCharacter: false,
    prompt: 'Exterior of a Chicago storefront soup kitchen, winter 1930: brick facade with a big painted sign reading "FREE SOUP COFFEE AND DOUGHNUTS FOR THE UNEMPLOYED", a long breadline of men in caps and worn overcoats along the sidewalk, steam drifting from the doorway, gray Depression morning.',
    fallback: 'Exterior of a Chicago storefront charity kitchen, winter 1930: brick facade, big painted sign reading "FREE SOUP COFFEE AND DOUGHNUTS FOR THE UNEMPLOYED", a queue of men in caps and coats waiting on the sidewalk, steam from the doorway.',
  },
  {
    file: 'capone_lexington.png', isCharacter: false,
    prompt: 'A luxury suite in the Lexington Hotel, Chicago 1929: velvet armchairs, a broad mahogany desk with a candlestick telephone and an open cigar box, cigar smoke hanging in the lamplight, tall windows with a view of the city skyline at dusk. No people.',
    fallback: 'A luxury 1929 hotel suite interior: velvet armchairs, mahogany desk, candlestick telephone, cigar box, smoke haze in lamplight, tall windows over a city skyline at dusk. No people.',
  },

  // Characters (green-screen, chroma-keyed)
  {
    file: 'capone_torrio.png', isCharacter: true,
    prompt: 'Johnny Torrio, 1928: dapper older strategist, slight build, neat gray three-piece suit, homburg hat, watch chain, calm appraising expression, standing, full body, facing slightly right.',
    fallback: 'A dapper older 1920s businessman strategist: slight build, gray three-piece suit, homburg hat, watch chain, calm expression, standing, full body, facing slightly right.',
  },
  {
    file: 'capone_breadline.png', isCharacter: true,
    prompt: 'An unemployed working man in a Chicago breadline, 1930: flat cap, worn patched overcoat, tired lined face, hands deep in pockets, standing, full body, facing slightly left.',
    fallback: 'A 1930 working man: flat cap, worn overcoat, tired face, hands in pockets, standing, full body, facing slightly left.',
  },
  {
    file: 'capone_ness.png', isCharacter: true,
    prompt: 'Eliot Ness, 1930: young clean-cut Prohibition lawman, fedora, trench coat over a suit and tie, square jaw, resolute expression, standing, full body, facing slightly right.',
    fallback: 'A young 1930 federal lawman: fedora, trench coat over a suit and tie, square jaw, resolute expression, standing, full body, facing slightly right.',
  },
  {
    file: 'capone_newsboy.png', isCharacter: true,
    prompt: 'A Chicago newsboy, 1930: boy in a flat cap, knickers and suspenders, waving a folded newspaper overhead, mouth open mid-shout, standing, full body, facing slightly left.',
    fallback: 'A 1930 newsboy: flat cap, knickers, suspenders, holding up a folded newspaper, shouting, standing, full body, facing slightly left.',
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
  try {
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.fallback) {
        process.stdout.write(`policy block, rephrasing... `);
        buf = await generate(item.fallback, item.isCharacter);
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
