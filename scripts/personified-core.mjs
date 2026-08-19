// Personified Machine core (DESIGN_ADDENDUM_01): the five-actor cast,
// ledger formulas, heat/spine/aim chain, art manifest + generation.
// Used by build-personified.mjs. Shares helpers with machine-core.mjs
// (imported, never modified).
//
// Art:   node scripts/build-personified.mjs --art-only   (dev server must run)
// Build: node scripts/build-personified.mjs --skip-art
// Both:  node scripts/build-personified.mjs

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
export const ART_DIR = resolve(here, '..', 'art-demo', 'personified');
const BRIDGE = 'http://localhost:8080/api/flux-generate';

// ---------------------------------------------------------------- art manifest
// NO stylePack; enforceStyleGuide gives the flat-color dieselpunk look.
// refFile: a previously generated sprite passed as referenceImageFullBody
// so the consume-hat worker is the SAME human, and the captured
// government is the SAME official in the capitalist's colors.

export const ART_MANIFEST = [
  {
    file: 'worker_work.png', isCharacter: true,
    prompt: 'A tired industrial worker in a flat cap (work hat), soot-smudged face, rolled sleeves, heavy gloves tucked in his belt, weary but dignified, dieselpunk laborer, standing, full body, facing slightly right. Flat color, bold outlines.',
  },
  {
    file: 'worker_consume.png', isCharacter: true, refFile: 'worker_work.png',
    prompt: 'The SAME man — identical face, build and clothes — but now off shift as a shopper: a straw boater hat instead of the flat cap, carrying a brown paper shopping parcel, slightly brighter posture, standing, full body, facing slightly left. Flat color, bold outlines.',
  },
  {
    file: 'capitalist.png', isCharacter: true,
    prompt: 'A coin-fat capitalist: enormously round man in a tall black top hat and pinstriped waistcoat straining at its gold buttons, a fat gold coin clutched in each hand, gold watch chain, smug jowly face, dieselpunk tycoon, standing, full body, facing slightly left. Flat color, bold outlines.',
  },
  {
    file: 'government.png', isCharacter: true,
    prompt: 'A government referee: upright official wearing a black-and-white vertically striped referee jersey, a brass whistle on a lanyard at his lips, flat officials cap, rulebook under one arm, dieselpunk civic official, standing, full body, facing forward. Flat color, bold outlines.',
  },
  {
    file: 'government_captured.png', isCharacter: true, refFile: 'government.png',
    prompt: 'The SAME referee official — identical face, build, whistle and cap — but his striped jersey has been recolored into a rich gold-and-purple plutocrat palette, matching a tycoon\'s livery, faint guilty expression, standing, full body, facing forward. Flat color, bold outlines.',
  },
  {
    file: 'military.png', isCharacter: true,
    prompt: 'A soldier standing at attention with EMPTY HANDS, no weapon at all, dieselpunk military uniform with brass buttons, peaked cap, puttees, stiff posture, expressionless, standing, full body, facing slightly left. Flat color, bold outlines.',
  },
  {
    file: 'rifle.png', isCharacter: true, aspectRatio: '1:1',
    prompt: 'A single bolt-action rifle with a bayonet, isolated object on a plain background, shown horizontally, barrel pointing left, dieselpunk military prop, no people, no hands. Flat color, bold outlines.',
  },
  {
    file: 'shell.png', isCharacter: true, aspectRatio: '1:1',
    prompt: 'A pale translucent-looking disc: a soft milky-white glowing circular shell or bubble, faint halo rings, ghostly and thin like frosted glass, isolated object on a plain background, no people. Flat color.',
  },
];

// ---------------------------------------------------------------- chroma key
// Same pass as scripts/generate-art.mjs (shared file — not modified).

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

const toDataUri = (path) =>
  `data:image/png;base64,${readFileSync(path).toString('base64')}`;

// Sequential (reference images depend on earlier results). Idempotent.
export async function generateArt() {
  mkdirSync(ART_DIR, { recursive: true });
  let generated = 0, skipped = 0, failed = 0;
  for (const item of ART_MANIFEST) {
    const outPath = resolve(ART_DIR, item.file);
    if (existsSync(outPath)) { console.log(`- ${item.file} exists, skipping`); skipped++; continue; }
    process.stdout.write(`* ${item.file} generating... `);
    try {
      const body = {
        prompt: item.prompt,
        isCharacter: item.isCharacter,
        enforceStyleGuide: true,
        aspectRatio: item.aspectRatio || (item.isCharacter ? '2:3' : '16:9'),
      };
      const refPath = item.refFile && resolve(ART_DIR, item.refFile);
      if (refPath && existsSync(refPath)) body.referenceImageFullBody = toDataUri(refPath);
      const resp = await fetch(BRIDGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  console.log(`Art: ${generated} generated, ${skipped} skipped, ${failed} failed.`);
  return { generated, skipped, failed };
}

// ---------------------------------------------------------------- world state
// Every coefficient in the addendum's formulas is a c_* worldState var.

export const WORLD = {
  // player levers
  education: 20,
  squeeze: 50,        // sandbox slider
  spine: 60,          // sandbox slider
  singleTax: 0,       // BUTTON toggle
  truthWindow: 0,     // BUTTON toggle
  pauseSim: 0,

  // the causal chain
  heat: 30,
  aim: 40,
  trust: 60,

  // the ledger
  health: 70,
  crime: 0,
  hoard: 50,
  shared: 20,
  climate: 80,
  population: 100,
  innovation: 0,

  // supporting sim state
  productionOutput: 0,
  rentBurden: 30,
  regulation: 30,
  propagandaCost: 1,
  repressionCost: 0,
  prestige: 60,
  crisis: 0,
  crisisTicks: 0,
  crisisRoll: 0,
  recognition: 0,
  recognitionSeen: 0,
  workerCount: 8,
  heatHighTicks: 0,
  cycle: 0,
  workerX: 26,
  workerHat: 0,       // 0 = work, 1 = consume
  storyTimer: 0,
  narratonGo: 0,

  // coefficients — §3 ledger
  c_healthGain: 0.1,
  c_healthDrift: 0.02,
  c_hoardRate: 0.01,
  c_climSqueeze: 0.01,
  c_climReg: 0.005,
  c_trustProp: 0.05,
  c_trustEdu: 0.03,

  // coefficients — §4 chain
  c_heatSqueeze: 0.05,
  c_heatShared: 0.03,
  c_heatTax: 2,
  c_spineHoard: 0.005,
  c_spineEdu: 0.02,
  c_crisisSqueezeMin: 80,
  c_crisisChance: 0.05,
  c_crisisTicks: 20,

  // supporting coefficients
  c_prestigeProp: 0.05,
  c_prestigeEdu: 0.02,
  c_represAim: 0.05,
  c_popPerWorker: 12.5,
  c_emigHeat: 85,
  c_emigTicks: 24,
  c_cycleSpeed: 2,
  c_storyCooldown: 50,
};

// ---------------------------------------------------------------- tick body
// §3 ledger + §4 chain, exactly as written; wrapped in a pauseSim gate.

export const tickLedger = () => [
  '# ---- production (drives the hoard; halved during crisis) ----',
  '[SET repressionCost = aim * c_represAim]',
  '[SET productionOutput = workerCount * (1 + innovation / 100)]',
  '[IF crisis == 1]',
  '[SET productionOutput = productionOutput * 0.5]',
  '[SET crisisTicks = crisisTicks - 1]',
  '[IF crisisTicks <= 0]',
  '[SET crisis = 0]',
  '[ENDIF]',
  '[ENDIF]',
  '',
  '# ---- §3 THE LEDGER ----',
  '[SET health = clamp(health + c_healthGain * (50 - squeeze) * c_healthDrift, 0, 100)]',
  '[SET crime = clamp(heat * (1 - education / 100), 0, 100)]',
  '[SET hoard = hoard + squeeze * productionOutput * c_hoardRate - repressionCost - propagandaCost]',
  '[SET shared = clamp(100 - squeeze - rentBurden, 0, 100)]',
  '[SET climate = clamp(climate - squeeze * c_climSqueeze + regulation * c_climReg, 0, 100)]',
  '[SET population = clamp(workerCount * c_popPerWorker, 0, 100)]',
  '[SET innovation = clamp((health / 100) * (education / 100) * 100, 0, 100)]',
  '[SET trust = clamp(trust + propagandaCost * c_trustProp - education * c_trustEdu, 0, 100)]',
  '[SET prestige = clamp(prestige + propagandaCost * c_prestigeProp - education * c_prestigeEdu, 0, 100)]',
];

export const tickChain = () => [
  '# ---- §4 HEAT / SPINE / AIM causal chain ----',
  '[SET heat = clamp(heat + squeeze * c_heatSqueeze - shared * c_heatShared - singleTax * c_heatTax, 0, 100)]',
  '[SET spine = clamp(spine - hoard * c_spineHoard + education * c_spineEdu, 0, 100)]',
  '[SET aim = clamp(100 - spine, 0, 100)]',
  '',
  '# crisis check: squeeze past the redline, dice each tick',
  '[SET crisisRoll = rand()]',
  '[IF squeeze > c_crisisSqueezeMin]',
  '[IF crisisRoll < c_crisisChance]',
  '[IF crisis == 0]',
  '[SET crisis = 1]',
  '[SET crisisTicks = c_crisisTicks]',
  '[EFFECT shake on news_ticker]',
  '[ENDIF]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF crisis == 0]',
  '[CLEAR_EFFECT shake from news_ticker]',
  '[ENDIF]',
];

export const tickEmigration = () => [
  '# ---- emigration: sustained heat > c_emigHeat walks a worker off ----',
  '[IF heat > c_emigHeat]',
  '[SET heatHighTicks = heatHighTicks + 1]',
  '[ENDIF]',
  '[IF heat <= c_emigHeat]',
  '[SET heatHighTicks = 0]',
  '[ENDIF]',
  '[IF heatHighTicks > c_emigTicks]',
  '[SET heatHighTicks = 0]',
  '[SET workerCount = max(workerCount - 1, 1)]',
  '[SET_TEXT news_ticker "ANOTHER FAMILY EMIGRATES — POPULATION {population} — HEAT {heat}"]',
  '[ENDIF]',
];

// The hat-swap walk: cycle 0..200 sawtooth folded to a 26..74 shuttle.
// Left of 50 = production side (work hat), right = shop side (boater).
export const tickWalk = () => [
  '# ---- §2 hat-swap walk: works side <-> shop side each cycle ----',
  '[SET cycle = cycle + c_cycleSpeed]',
  '[IF cycle >= 200]',
  '[SET cycle = 0]',
  '[ENDIF]',
  '[SET workerX = 26 + cycle * 0.48]',
  '[IF cycle > 100]',
  '[SET workerX = 26 + (200 - cycle) * 0.48]',
  '[ENDIF]',
  '[SET workerHat = 0]',
  '[IF workerX > 50]',
  '[SET workerHat = 1]',
  '[ENDIF]',
];

export const truthLines = () => [
  '# ---- §3 truth-window: live formulas when truthWindow == 1 ----',
  '[IF truthWindow == 1]',
  '[SET_TEXT truth_1 "CRIME {crime} = HEAT {heat} x (1 - EDUCATION {education}/100)"]',
  '[SET_TEXT truth_2 "HEAT {heat} += SQUEEZE {squeeze} x {c_heatSqueeze} - SHARED {shared} x {c_heatShared} - TAX x {c_heatTax}"]',
  '[SET_TEXT truth_3 "SPINE {spine} -= HOARD {hoard} x {c_spineHoard} - EDU x {c_spineEdu} | AIM = 100 - SPINE = {aim}"]',
  '[SET_TEXT truth_4 "HEALTH {health} += {c_healthGain} x (50 - SQUEEZE {squeeze}) x {c_healthDrift} | TRUST {trust} += PROP {propagandaCost} x {c_trustProp} - EDU x {c_trustEdu}"]',
  '[SET_TEXT truth_5 "HOARD {hoard} += SQUEEZE x PRODUCT {productionOutput} x {c_hoardRate} - COSTS | SHARED = 100 - SQUEEZE - RENT {rentBurden}"]',
  '[ENDIF]',
];

export const tickNews = () => [
  '# ---- news ticker: last matching line wins ----',
  '[SET_TEXT news_ticker "THE MACHINE RUNS — HOARD {hoard} · SHARED {shared} · HEAT {heat}"]',
  '[IF crime > 70]',
  '[SET_TEXT news_ticker "RACKETS RULE THE WARDS — CRIME {crime} — SCHOOLS DARK"]',
  '[ENDIF]',
  '[IF health < 25]',
  '[SET_TEXT news_ticker "FEVER IN THE ROWS — HEALTH {health} — THE BELLS AGAIN"]',
  '[ENDIF]',
  '[IF aim > 60]',
  '[SET_TEXT news_ticker "GARRISON FACES INWARD — AIM {aim} — SPINE {spine}"]',
  '[ENDIF]',
  '[IF singleTax == 1]',
  '[SET_TEXT news_ticker "SINGLE TAX IN EFFECT — SHARED {shared} RISING — HEAT {heat} COOLING"]',
  '[ENDIF]',
  '[IF crisis == 1]',
  '[SET_TEXT news_ticker "PANIC! SQUEEZE PAST THE REDLINE — PRODUCTION HALVED"]',
  '[ENDIF]',
];
