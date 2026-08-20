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

  // ---------------------------------------------------------------
  // ANIMATION LOOPS — frame sets for [ANIMATE el A B C every 200ms].
  // Same rule as the walk cycles: frame 1 is generated off the style
  // pack alone, and every later frame references the frame BEFORE it
  // with a SHORT "identical to the reference" prompt naming only the
  // one thing that moves. No negative lists — they pull the model off
  // the reference and it starts over from scratch.
  // Order matters: each frame must be pushed before the one that
  // references it.
  // ---------------------------------------------------------------

  // Flames — matched to the fire already stitched into
  // burning_village.png: satin-stitch tongues in orange, ochre and
  // rust red, stem-stitch outlines, bare linen behind.
  {
    file: 'flame_1.png', isCharacter: true,
    prompt: 'One single tall tongue of fire worked in Bayeux tapestry embroidery, exactly as fire is stitched above a burning thatched house in a medieval tapestry: a tall mass of pointed flame tongues rising from the bottom edge of the picture, one continuous flame. Every tongue is outlined in dark rust red stem stitch and filled with dense satin stitch in vivid orange and golden ochre wool, deepening to rust red at the roots, the tips tapering into sharp curling points. Flat saturated orange stitching, no shading. Only the one fire fills the picture — no torch, no handle, no stick, no candle, no building, no ground.',
    retry: 'A single mass of stitched flames in medieval wool embroidery, rising from the bottom of the picture: pointed tongues in bright orange and golden satin stitch, rust red at the base, dark red outlines, curling tips. Only the one flame, nothing else, no torch or handle.',
  },
  {
    file: 'flame_2.png', isCharacter: true,
    ref: ['flame_1.png'], refMode: 'edit',
    // Abstract "left/right" language proved unreliable — two rounds
    // both drifted toward a rightward lean regardless of which word was
    // used. Anchoring to a picture corner the tip must point at, plus
    // pinning the base in place, gave a reliable, unambiguous target.
    prompt: 'Bend the flame over so its topmost tip now points into the TOP-LEFT corner of the picture. The base stays exactly where it is at the bottom-centre. Same colours, same stitching, same size.',
    retry: 'Bend the flame so its tip points at the top-left corner of the picture, base unmoved at the bottom-centre. Same colours and stitching.',
  },
  {
    file: 'flame_3.png', isCharacter: true,
    // Deliberately references flame_1, NOT flame_2. Chaining 1→2→3
    // made frame 3 inherit frame 2's leftward displacement and then add
    // a rightward one on top, which overshot into a completely
    // different shape. Both lean frames are edits of the same upright
    // fire, so the loop swings symmetrically: upright, left, right.
    ref: ['flame_1.png'], refMode: 'edit',
    prompt: 'Bend the flame over so its topmost tip now points into the TOP-RIGHT corner of the picture. The base stays exactly where it is at the bottom-centre. Same colours, same stitching, same size.',
    retry: 'Bend the flame so its tip points at the top-right corner of the picture, base unmoved at the bottom-centre. Same colours and stitching.',
  },

  // Birds — the register of the tapestry's border creatures: simple
  // outline, minimal fill, one bird only.
  {
    file: 'bird_1.png', isCharacter: true,
    prompt: 'A single bird in flight worked in Bayeux tapestry embroidery, in the style of the creatures stitched along the tapestry border: simple stem-stitch outline with minimal wool fill in tan and rust red, small body, long neck, both wings raised high above the back in an upstroke, tail feathers fanned, flying to the right. Flat medieval embroidery on bare linen, one bird only, nothing else in the picture.',
    retry: 'A single stitched bird in flight, medieval embroidery border creature: plain outline in dark wool with light tan fill, wings raised up above its back, tail fanned, facing right. Only the bird, nothing else.',
  },
  {
    file: 'bird_2.png', isCharacter: true,
    ref: ['bird_1.png'], refMode: 'edit',
    // "Sweep down" alone left the wings ambiguously mid-position.
    // Naming a concrete downward shape (a V pointing at the ground)
    // forces a real displacement instead of a partial one.
    prompt: 'Fold both wings sharply DOWNWARD into a tight V-shape below the body, like an open pair of scissors pointing at the ground, wingtips lower than the feet. Same bird, same colours, same size.',
    retry: 'Fold both wings down into a V below the body, wingtips pointing toward the ground. Same colours and size.',
  },

  // Smoke — the companion to the burning village: the pale scrolled
  // plumes already stitched above the cottages there.
  {
    file: 'smoke_1.png', isCharacter: true,
    prompt: 'A plume of smoke worked in Bayeux tapestry embroidery: rounded scrolling curls of smoke rising and widening upward, outlined in stem stitch in grey-brown wool and filled with pale cream and soft grey stitching, the way smoke is stitched above a burning house in a medieval tapestry. Flat embroidery, one plume only, nothing else in the picture.',
    retry: 'A rising plume of smoke in medieval wool embroidery: scrolled rounded curls outlined in grey-brown thread with pale cream fill, widening as it rises. Only the smoke, nothing else.',
  },
  {
    file: 'smoke_2.png', isCharacter: true,
    ref: ['smoke_1.png'], refMode: 'edit',
    // Four rounds asking for a lean/slide/stretch all came back as a
    // near-exact copy of the reference (measured centroid shift under
    // 5px each time) — this particular swirl silhouette is being
    // reproduced almost verbatim regardless of the instruction. A
    // mirror flip is a precisely-defined operation edit models execute
    // reliably, and it still reads as the same plume caught by wind
    // from the other side, so it survives as a legitimate second frame.
    prompt: 'Mirror this image left-to-right, like a reflection — the whole plume of smoke flips to face the opposite way. Same colours, same stitching, same size.',
    retry: 'Flip the image horizontally, left-to-right, like a mirror. Same colours and stitching.',
  },

  // Instrument-shelf gauges (theater console). All isCharacter: true so
  // they green-screen and chroma-key onto any panel. Short prompts,
  // essential constraint first — see the note above the DIRS loop.
  {
    file: 'gauge_frame.png', isCharacter: true,
    prompt: 'An empty round dial face stitched in Bayeux tapestry embroidery: a plain stem-stitch circle outline on bare linen, one thin decorative ring inside the rim, nothing else — no needle, no numbers. Centered, straight on.',
    retry: 'A plain stitched circle on bare linen, Bayeux tapestry embroidery, empty dial rim only, no needle, no numbers, centered, straight on.',
  },
  {
    file: 'gauge_needle.png', isCharacter: true,
    prompt: 'A single stitched needle pointer in Bayeux tapestry embroidery: one thin stem-stitch line tapering to a point, pivoting from a small stitched dot at the bottom center, pointing straight up. Only the needle — no dial, no circle, no numbers.',
    retry: 'One thin stitched pointer needle, Bayeux tapestry embroidery, tapering to a point, small pivot dot at the bottom, pointing straight up, nothing else in the picture.',
  },
  {
    file: 'gauge_bar.png', isCharacter: true, aspectRatio: '16:9',
    prompt: 'An empty horizontal bar-meter housing stitched in Bayeux tapestry embroidery: a long stem-stitch rectangle outline on bare linen, empty inside, no fill, no numbers. Centered, straight on.',
    retry: 'A long empty stitched rectangle outline on bare linen, Bayeux tapestry embroidery, bar-meter housing, no fill, no numbers, centered.',
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

async function generate(prompt, isCharacter, ref, refMode, aspectRatio) {
  const body = {
    prompt,
    isCharacter,
    stylePack: STYLE,
    aspectRatio: aspectRatio || (isCharacter ? '2:3' : '16:9'),
  };
  if (ref) {
    const dataUrl = refDataUrl(ref);
    if (dataUrl) {
      // Three ways to pass the previous frame, and which one you pick
      // decides whether an animation frame holds together:
      //
      //  'body' (default) — referenceImageFullBody, which the bridge
      //    labels "character body reference — match body proportions
      //    and clothing". Right for people, meaningless for a fire or
      //    a bird, so the model treats it weakly and redraws.
      //  'composition' — also sends referenceImage ("match this layout,
      //    perspective and camera angle"). Locks the silhouette hard —
      //    so hard the requested motion stops happening.
      //  'edit' — editMode + existingImage ("edit THIS image, keeping
      //    the overall scene"). This is the one that works for object
      //    animation frames: colour and stitch density survive because
      //    the model is editing the frame rather than regenerating it.
      //    Keep 'edit' prompts phrased as an instruction ("Make the
      //    flames lean left"), not as a description of a picture.
      if (refMode === 'edit') {
        body.editMode = true;
        body.existingImage = dataUrl;
        // Drop the style pack for edits. The frame being edited ALREADY
        // is the style; sending the pack as well appends its mandatory
        // "render figures mostly UNFILLED on bare linen" text after the
        // edit instruction, which strips the colour out of every frame
        // (the orange fire came back as bare linen every single time).
        // With no stylePack the bridge uses an empty pack, so the edit
        // is judged only against the source frame.
        delete body.stylePack;
      } else {
        body.referenceImageFullBody = dataUrl;
        if (refMode === 'composition') body.referenceImage = dataUrl;
      }
    }
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
      buf = await generate(item.prompt, item.isCharacter, item.ref, item.refMode, item.aspectRatio);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.retry) {
        process.stdout.write(`policy hit, rephrasing... `);
        buf = await generate(item.retry, item.isCharacter, item.ref, item.refMode, item.aspectRatio);
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
