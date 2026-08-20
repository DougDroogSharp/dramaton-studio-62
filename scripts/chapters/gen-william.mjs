// Art generator for the WILLIAM THE CONQUEROR standalone chapter game.
// Drives the local Flux bridge (dev server on :8080) with the
// "William the Conqueror" (Bayeux tapestry) style pack, chroma-keys
// character green-screens, saves PNGs into art-demo/william/.
// Idempotent: existing files are skipped; delete a file to regenerate.
//
// Run: node scripts/chapters/gen-william.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'william');
const BRIDGE = 'http://localhost:8080/api/flux-generate';
const STYLE = 'William the Conqueror';

const MANIFEST = [
  // Title card — the engine draws the chapter title over the upper
  // third, so that band is kept deliberately empty.
  {
    file: 'title_william.png', isCharacter: false,
    prompt: 'Title card for a chapter on the Norman Conquest. A wide Bayeux-tapestry panel on bare linen: the whole upper third is EMPTY undecorated linen ground with no stitching at all, and all imagery sits in the lower two thirds — a line of Norman knights on horseback riding right with kite shields and lances, a Saxon shield-wall facing them, a low horizon of green hillocks, a decorative stitched border strip along the very bottom. Sparse composition, plenty of bare cloth. No lettering, no words, no text, no numerals anywhere.',
    retry: 'A wide medieval embroidery panel on plain linen: the top third left completely blank and unstitched, mounted Norman riders with lances and a row of shields worked along the lower half, a stitched ornamental border at the bottom edge. Sparse, lots of bare linen. No lettering or text of any kind.',
  },
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
    // Identity-locked to the base king sprite: without the reference
    // the angry variant reads as a different man entirely.
    file: 'william_angry.png', isCharacter: true,
    ref: ['..', 'william_king.png'],
    prompt: 'The same Norman king William the Conqueror in a fury: face twisted in rage, teeth bared, fist clenched on his sword hilt, standing, full body, facing slightly left. Same face, beard, gold crown, chain mail and long red cloak as the reference — only the expression changes.',
    retry: 'The same bearded Norman king as the reference, now with an enraged scowling expression, gripping his sword hilt, standing, full body, facing slightly left. Same face and costume as the reference.',
  },
  {
    file: 'orderic.png', isCharacter: true,
    prompt: 'Orderic Vitalis, Anglo-Norman monk chronicler: tonsured young monk in a plain black Benedictine habit, holding a quill pen and a parchment book, gentle sorrowful face, standing, full body, facing slightly right.',
  },
  // New backdrops (deepening pass)
  {
    file: 'rouen_chamber.png', isCharacter: false,
    prompt: 'A stone chamber in the priory of Saint Gervase near Rouen, September 1087: a wooden bed with rumpled linens, a single guttering candle, an overturned coffer with its lid open and emptied, bare stone walls, a small arched window with grey dawn light. Sombre, stripped, abandoned. No people.',
  },
  {
    file: 'motte_castle.png', isCharacter: false,
    prompt: 'A Norman motte-and-bailey castle under construction, 1070: a huge raw earth mound with a timber keep half-built on top, wooden scaffolding and palisade stakes, and at its base the razed remains of Saxon houses — charred beams, flattened plots. Winter light, muddy ground. No people.',
  },
  // Pose/expression variants (deepening pass) — each generated with the
  // character's existing keyed sprite as a full-body reference so face
  // and costume stay identical across poses.
  {
    file: 'william_pointing_angry.png', isCharacter: true,
    ref: ['..', 'william_king.png'],
    prompt: 'William the Conqueror giving a furious command: stern bearded Norman king, gold crown, chain mail hauberk under a long red cloak, right arm fully outstretched pointing forward, face contorted in rage, shouting, standing, full body, facing slightly left. Same face, crown, and costume as the reference.',
    retry: 'William the Conqueror, Norman king, arm outstretched pointing forward, angry commanding expression, gold crown, chain mail and long red cloak, standing, full body, facing slightly left. Same face and costume as the reference.',
  },
  {
    file: 'william_sit_sad.png', isCharacter: true,
    ref: ['..', 'william_king.png'],
    prompt: 'William the Conqueror dying: the same bearded Norman king, gold crown set beside him, chain mail and long red cloak, seated slumped on a low wooden bench, shoulders bowed, grief-stricken sorrowful face, hands loose in his lap, full body, facing slightly left. Same face and costume as the reference.',
  },
  {
    file: 'hereward_attack.png', isCharacter: true,
    ref: ['hereward.png'],
    prompt: 'Hereward the Wake mid-attack: the same long-haired bearded Saxon warrior in a mud-spattered leather jerkin and wool cloak, round shield raised on his left arm, short axe swung high overhead in his right hand, lunging forward, fierce determined face, full body, facing slightly right. Same face and costume as the reference.',
    retry: 'Hereward the Wake, Saxon warrior of the fens, axe raised high, shield up, charging stance, determined expression, leather jerkin and wool cloak, full body, facing slightly right. Same face and costume as the reference.',
  },
  // Crowd sprites (reaction-layer pass) — the village en masse.
  {
    file: 'crowd_calm.png', isCharacter: true,
    prompt: 'A huddled group of Saxon villagers, women and men together, wary faces: rough wool tunics, hoods and headscarves, standing close in a tight cluster, watchful and quiet, full bodies, facing slightly left.',
    retry: 'A small tight group of medieval Saxon villagers, men and women in rough wool clothing, huddled together with cautious wary expressions, standing, full bodies, facing slightly left.',
  },
  {
    file: 'crowd_angry.png', isCharacter: true,
    ref: ['crowd_calm.png'],
    prompt: 'A crowd of Saxon villagers with raised fists and farm tools, defiant: the same men and women in rough wool tunics and hoods, now shouting, fists and pitchforks and scythes lifted high, angry determined faces, full bodies, facing slightly left. Same people and costumes as the reference.',
    retry: 'A group of medieval Saxon villagers protesting, arms and farm tools raised, defiant angry expressions, rough wool clothing, full bodies, facing slightly left. Same people and costumes as the reference.',
  },
  {
    file: 'odo_pointing_smug.png', isCharacter: true,
    ref: ['..', 'william_odo.png'],
    prompt: 'Bishop Odo of Bayeux pointing with a self-satisfied smirk: the same tonsured Norman bishop in his vestments, one arm extended pointing forward, the other hand resting on his belt, smug knowing smile, standing, full body, facing slightly right. Same face and costume as the reference.',
  },
];

// 8-direction walk sets for the MAJOR actors only (William, Aldric).
// Two strides per direction; the engine flips the pair whose sprite
// angle is nearest the travel direction (e=0, se=45, s=90, sw=135,
// w=180, nw=225, n=270, ne=315).
const DIRS = [
  ['e',  'side profile facing right, walking to the right'],
  ['se', 'three-quarter front view facing right, walking diagonally toward the viewer and to the right'],
  ['s',  'front view facing the viewer, walking straight toward the viewer'],
  ['sw', 'three-quarter front view facing left, walking diagonally toward the viewer and to the left'],
  ['w',  'side profile facing left, walking to the left'],
  ['nw', 'three-quarter back view facing left, walking diagonally away from the viewer and to the left'],
  ['n',  'back view, walking straight away from the viewer'],
  ['ne', 'three-quarter back view facing right, walking diagonally away from the viewer and to the right'],
];
// Frame 1 of each direction references the BASE sprite. Frame 2
// references its OWN frame 1 — not the base — so the two frames of a
// cycle are the same person in the same clothes and only the stride
// changes. Referencing the base for both made frame 1 and frame 2 drift
// into two different-looking figures and the walk cycle flickered.
const STRIDE_1 = 'left leg forward, right leg back, arms mid-swing';
const STRIDE_2 = 'right leg forward, left leg back, arms in the opposite swing';

// The manifest is processed in array order, so each frame 1 MUST be
// pushed before the frame 2 that references it.
for (const [dir, view] of DIRS) {
  // --- frame 1: off the base sprite
  MANIFEST.push({
    file: `peasant_walk_${dir}1.png`, isCharacter: true,
    ref: ['peasant.png'],
    prompt: `The same Saxon peasant farmer walking: ${view}, mid-stride with ${STRIDE_1}, full body. Same face, rough wool tunic, hood and costume as the reference.`,
    retry: `A gaunt Saxon peasant in a rough wool tunic and hood walking, ${view}, ${STRIDE_1}, full body. Same face and costume as the reference.`,
  });
  MANIFEST.push({
    file: `william_walk_${dir}1.png`, isCharacter: true,
    ref: ['..', 'william_king.png'],
    prompt: `The same Norman king William the Conqueror walking: ${view}, mid-stride with ${STRIDE_1}, full body. Same face, beard, gold crown, chain mail hauberk and long red cloak as the reference.`,
    retry: `A stern bearded Norman king with a gold crown, chain mail and long red cloak walking, ${view}, ${STRIDE_1}, full body. Same face and costume as the reference.`,
  });
  // --- frame 2: off frame 1 of the SAME direction, stride only.
  // Keep this prompt SHORT. A long version with an explicit list of
  // things not to change ("no new hose, no new sleeves, ...") made the
  // drift much worse — the extra text pulled the model away from the
  // reference image and it regenerated the figure from scratch. Leading
  // with "identical to the reference" and saying almost nothing else
  // keeps the reference dominant.
  MANIFEST.push({
    file: `peasant_walk_${dir}2.png`, isCharacter: true,
    ref: [`peasant_walk_${dir}1.png`],
    prompt: `Identical to the reference image in every way — the same Saxon peasant, same face, same costume, same colours, same ${view}. Only the legs and arms move, into the opposite stride: ${STRIDE_2}.`,
    retry: `The same peasant as the reference image, same costume and colours, legs swapped into the opposite stride: ${STRIDE_2}.`,
  });
  MANIFEST.push({
    file: `william_walk_${dir}2.png`, isCharacter: true,
    ref: [`william_walk_${dir}1.png`],
    prompt: `Identical to the reference image in every way — the same Norman king, same face, same crown, same costume, same colours, same ${view}. Only the legs and arms move, into the opposite stride: ${STRIDE_2}.`,
    retry: `The same Norman king as the reference image, same crown, costume and colours, legs swapped into the opposite stride: ${STRIDE_2}.`,
  });
}

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

// Optional full-body reference: item.ref is a path (array of segments)
// relative to art-demo/william/, loaded as a data URL so the bridge can
// hold face/costume identical across pose variants.
const refDataUrl = (ref) => {
  const p = resolve(outDir, ...ref);
  if (!existsSync(p)) {
    console.warn(`  (missing reference ${ref.join('/')} — generating without it)`);
    return null;
  }
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
};

async function generate(prompt, isCharacter, ref) {
  const body = {
    prompt,
    isCharacter,
    stylePack: STYLE,
    aspectRatio: isCharacter ? '2:3' : '16:9',
  };
  if (ref) {
    const dataUrl = refDataUrl(ref);
    if (dataUrl) body.referenceImageFullBody = dataUrl;
  }
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
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter, item.ref);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.retry) {
        process.stdout.write(`policy hit, rephrasing... `);
        buf = await generate(item.retry, item.isCharacter, item.ref);
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
