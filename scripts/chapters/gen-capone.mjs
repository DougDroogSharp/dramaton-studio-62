// Art generation for the KING OF CHICAGO / CAPONE chapter game.
// Drives the local Flux bridge (dev server on :8080) with the
// "King of Chicago" style pack (chunky 1986 Amiga 32-color pixel art),
// chroma-keys character green-screens, saves into art-demo/capone/.
// Idempotent: existing files are skipped. On a fal content policy
// block, rephrases once and retries; otherwise skips the piece.
//
// Run: node scripts/chapters/gen-capone.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'capone');
const BRIDGE = 'http://localhost:8080/api/flux-generate';
const STYLE = 'King of Chicago';

// Existing keyed sprites double as identity references for pose variants.
const artDemo = resolve(here, '..', '..', 'art-demo');
const refDataUrl = (...rel) => {
  const p = resolve(artDemo, ...rel);
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
};

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

  // New backdrops (deepening pass)
  {
    file: 'capone_courtroom.png', isCharacter: false,
    prompt: 'Interior of a federal courtroom, Chicago 1931: dark wood paneling, high judge\'s bench with an American flag, empty jury box of twelve chairs along one wall, defense table with scattered papers, tall windows with pale morning light, hanging globe lamps. No people.',
    fallback: 'A 1931 American courtroom interior: dark wood paneling, high judge\'s bench, flag, empty jury box, defense table with papers, tall windows, hanging lamps. No people.',
  },
  {
    file: 'capone_cicero.png', isCharacter: false,
    prompt: 'Exterior of a polling place in Cicero, Illinois, election day 1924: brick storefront with a "POLLING PLACE — VOTE HERE" banner, American bunting over the door, a black 1920s sedan parked at the curb, gray overcast sky, wind-blown handbills on the sidewalk. No people.',
    fallback: 'A 1924 American small-town polling place exterior: brick storefront, "VOTE HERE" banner, bunting, a black 1920s sedan at the curb, overcast sky, papers blowing on the sidewalk. No people.',
  },

  // Crowd sprites (reaction layer): the street and the press, en masse.
  {
    file: 'capone_crowd_breadline.png', isCharacter: true,
    prompt: 'a Depression breadline crowd of men in caps and coats, waiting: a tight group of six unemployed men in flat caps and worn overcoats standing bunched in a queue, tired faces, hands in pockets, full bodies',
    fallback: 'A group of six 1930 unemployed men in flat caps and worn coats standing bunched together in a line, waiting, tired faces, full bodies.',
  },
  {
    file: 'capone_crowd_press.png', isCharacter: true,
    prompt: 'a crowd of reporters with flash cameras and notebooks pressing forward',
    fallback: 'A group of 1930 newspaper reporters in fedoras with press cards, flash cameras and notebooks, leaning forward, full bodies.',
  },

  // Mid-scene pose variants — same identity, new pose+expression.
  // ref = existing keyed sprite passed as referenceImageFullBody.
  {
    file: 'capone_point_angry.png', isCharacter: true, ref: ['capone_boss.png'],
    prompt: 'Al Capone, 1928, same man as the reference image: heavyset in a pinstripe suit and white fedora, now pointing forcefully forward with his right arm fully extended, index finger out, angry scowling expression, jaw set, giving an order, standing, full body, facing slightly right.',
    fallback: 'A heavyset 1928 boss in a pinstripe suit and white fedora, matching the reference image, pointing forcefully forward with an angry scowl, giving an order, standing, full body, facing slightly right.',
  },
  {
    file: 'capone_wave_happy.png', isCharacter: true, ref: ['capone_boss.png'],
    prompt: 'Al Capone, 1930, same man as the reference image: heavyset in a pinstripe suit and white fedora, one arm raised high waving warmly to a crowd, broad happy grin, playing the benefactor, standing, full body, facing slightly left.',
    fallback: 'A heavyset 1930 man in a pinstripe suit and white fedora, matching the reference image, waving warmly overhead with a broad grin, standing, full body, facing slightly left.',
  },
  {
    file: 'capone_sit_confused.png', isCharacter: true, ref: ['capone_boss.png'],
    prompt: 'Al Capone, 1931, same man as the reference image: heavyset in a pinstripe suit, no hat, sitting slumped on a plain wooden courtroom chair, hands loose in his lap, confused uncertain expression, brow knitted, watching something slip away, full body, facing slightly right.',
    fallback: 'A heavyset 1931 man in a pinstripe suit, matching the reference image, sitting slumped on a wooden chair, hands in his lap, confused uncertain expression, full body, facing slightly right.',
  },
  {
    file: 'wilson_closeup_determined.png', isCharacter: true, ref: ['capone_wilson.png'],
    prompt: 'IRS agent Frank Wilson, 1931, same man as the reference image: close-up portrait from the chest up, round wire-rim glasses, neat dark suit and tie, bent over an open ledger he holds up near his face, determined narrowed eyes, lamplight from below, facing slightly left.',
    fallback: 'A 1931 accountant investigator matching the reference image: chest-up close-up, wire-rim glasses, dark suit, holding an open ledger, determined narrowed eyes, lamplight, facing slightly left.',
  },
  {
    file: 'torrio_lean_tired.png', isCharacter: true, ref: ['capone', 'capone_torrio.png'],
    prompt: 'Johnny Torrio, 1928, same man as the reference image: slight older strategist in a gray three-piece suit and homburg, leaning wearily against a door frame with one shoulder, arms folded, tired heavy-lidded eyes, counseling caution, full body, facing slightly right.',
    fallback: 'A slight older 1928 businessman matching the reference image: gray three-piece suit, homburg, leaning wearily against a door frame, arms folded, tired eyes, full body, facing slightly right.',
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

async function generate(prompt, isCharacter, referenceImageFullBody) {
  const body = {
    prompt,
    isCharacter,
    stylePack: STYLE,
    aspectRatio: isCharacter ? '2:3' : '16:9',
  };
  if (referenceImageFullBody) body.referenceImageFullBody = referenceImageFullBody;
  const resp = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    const ref = item.ref ? refDataUrl(...item.ref) : null;
    if (item.ref && !ref) process.stdout.write(`(reference missing, generating unreferenced) `);
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter, ref);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.fallback) {
        process.stdout.write(`policy block, rephrasing... `);
        buf = await generate(item.fallback, item.isCharacter, ref);
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
