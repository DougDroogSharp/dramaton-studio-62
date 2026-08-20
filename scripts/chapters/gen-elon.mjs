// Art generation for the ELON MUSK (2020s) standalone chapter.
// Drives the local Flux bridge (dev server on :8080) with the "Elon"
// style pack (Doug's satirical alt-comics style), chroma-keys the
// character green-screens, and saves PNGs into art-demo/elon/.
// Idempotent: existing files are skipped.
//
// Run: node scripts/chapters/gen-elon.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'art-demo', 'elon');
const BRIDGE = 'http://localhost:8080/api/flux-generate';

// ---------------------------------------------------------------- manifest

const MANIFEST = [
  // Title card — the engine draws the chapter title over the upper
  // third, so that band is kept deliberately empty.
  {
    file: 'title_elon.png', isCharacter: false,
    prompt: 'A wide desert launch-site scene at dusk. The top third of the frame is nothing but an empty gradient sky — completely blank, no rocket, no tower, no structure, no object of any kind reaching up into it. Everything sits low in the bottom half: a small floodlit rocket on its pad far off on the horizon, a chain-link fence running across the middle distance, cracked asphalt and a single tipped-over office chair in the foreground, long raking shadows. Deserted, nobody present. The image contains no screens and no writing whatsoever: no words, no letters, no logos, no numbers, no captions, no signage.',
    alt: 'A wide satirical dusk scene with the entire top third left as plain empty sky containing nothing at all: a distant floodlit rocket low on the horizon, a chain-link fence across the middle, cracked pavement and an overturned office chair in the foreground. No people, no screens, and absolutely no lettering, logos or numbers.',
  },
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
  // ---- new backdrops -----------------------------------------------------
  {
    file: 'courtroom.png', isCharacter: false,
    prompt: 'A federal courtroom interior: raised judge\'s bench with a carved seal, witness stand, empty jury box, wood paneling, an American flag, cold institutional light through tall windows. Wide empty middle ground for characters. No people.',
    alt: 'An empty courtroom: judge\'s bench, witness box, jury seats, dark wood paneling, flag, harsh overhead light. Empty middle ground. No people.',
  },
  {
    file: 'bedroom3am.png', isCharacter: false,
    prompt: 'A dark billionaire bedroom at 3am, comic-page composition: an enormous rumpled bed in shadow, a smartphone lying on the sheets glowing cold blue and throwing the only light in the room, a big empty white thought-cloud shape hovering above the bed, city lights faint through a huge window. Wide empty middle ground for characters. No people.',
    alt: 'A shadowy bedroom at night: huge messy bed, a glowing phone on the sheets casting cold blue light, an empty cartoon thought bubble floating above the bed, dark window behind. Empty middle ground. No people.',
  },
  // ---- pose variants (built from the keyed base sprites via reference) ----
  {
    file: 'elon_point_smug.png', isCharacter: true, ref: 'elon_musk.png',
    prompt: 'Elon Musk caricature, triumphant announcement: one arm fully outstretched pointing forward, chin raised, smug self-satisfied grin, half-lidded eyes, black t-shirt with a small rocket logo, standing, full body, facing slightly left.',
    alt: 'A smug billionaire tech CEO caricature pointing grandly with an outstretched arm, self-satisfied grin, black t-shirt with a rocket logo, standing, full body, facing slightly left.',
  },
  {
    file: 'elon_crouch_scared.png', isCharacter: true, ref: 'elon_musk.png',
    prompt: 'Elon Musk caricature, terrified: crouching low with knees deeply bent, arms pulled in protectively over his head, eyes huge with fear, cartoon sweat drops flying, black t-shirt with a small rocket logo, full body, facing slightly left.',
    alt: 'A terrified billionaire tech CEO caricature crouching low, arms shielding his head, bulging frightened eyes, cartoon sweat beads, black t-shirt with rocket logo, full body, facing slightly left.',
  },
  {
    file: 'elon_sit_angry.png', isCharacter: true, ref: 'elon_musk.png',
    prompt: 'Elon Musk caricature posting at 3am: sitting cross-legged in rumpled bedsheets, hunched over a glowing smartphone, furious scowl lit cold blue from below, dark bags under his eyes, thumbs jabbing at the screen, black t-shirt with a small rocket logo, full body.',
    alt: 'An angry billionaire tech CEO caricature sitting cross-legged in bedsheets, hunched over a glowing phone, scowling face lit from below, dark eye bags, black t-shirt with rocket logo, full body.',
  },
  // ---- crowd sprites (the reaction layer's mass responders) --------------
  {
    file: 'workers_crowd.png', isCharacter: true,
    prompt: 'A crowd of factory workers in safety vests standing together, arms crossed: a tight group of five or six industrial workers in hi-vis vests and hard hats, shoulder to shoulder, arms folded, grim solidarity on their faces, standing, full bodies, facing slightly right.',
    alt: 'A group of industrial workers in high-visibility vests and hard hats standing shoulder to shoulder with arms crossed, stern determined faces, full bodies, facing slightly right.',
  },
  {
    file: 'fans_crowd.png', isCharacter: true,
    prompt: 'A crowd of phone-waving superfans with glowing screens, adoring faces: a tight cluster of five or six eager fans holding smartphones aloft, screens glowing on their upturned worshipful faces, mouths open in cheers, standing, full bodies, facing slightly left.',
    alt: 'A cluster of adoring fans waving glowing smartphones overhead, ecstatic worshipful expressions lit by their screens, standing, full bodies, facing slightly left.',
  },
  {
    file: 'reporter_closeup_determined.png', isCharacter: true, ref: 'elon_reporter.png',
    prompt: 'A newspaper reporter, dramatic close-up from the chest up: notebook and pen raised mid-note, steady unblinking determined gaze, jaw set hard, press lanyard around the neck.',
    alt: 'Close-up of a journalist from the chest up, holding a notebook and pen, determined focused expression, set jaw, press badge on a lanyard.',
  },
  {
    file: 'worker_point_angry.png', isCharacter: true, ref: 'elon/worker.png',
    prompt: 'A factory worker in a high-visibility orange safety vest and hard hat, pointing accusingly with a fully outstretched arm, angry shouting expression, mouth open mid-yell, work gloves, standing, full body, facing slightly left.',
    alt: 'An industrial worker in hi-vis vest and hard hat pointing an accusing finger, furious shouting face, work gloves, standing, full body, facing slightly left.',
  },

  // Instrument-shelf gauges (theater console). All isCharacter: true so
  // they green-screen and chroma-key onto any panel. Short prompts,
  // essential constraint first — see the technique note in gen-william.mjs.
  {
    file: 'gauge_frame.png', isCharacter: true,
    prompt: 'An empty round telemetry dial, flat modern comic linework, bold black outlines: sleek dark instrument housing, blank glass face, nothing inside — no needle, no numbers. Centered, straight on.',
    alt: 'A sleek dark telemetry dial housing, flat comic linework, blank glass face, empty inside, no needle, no numbers, centered, straight on.',
  },
  {
    file: 'gauge_needle.png', isCharacter: true,
    prompt: 'A single telemetry needle alone, flat modern comic linework, bold black outlines: one thin tapering pointer, pivoting from a small dot at the bottom center, pointing straight up. Only the needle — nothing else.',
    alt: 'One thin tapering pointer needle, flat comic linework, small pivot dot at the bottom, pointing straight up, nothing else in the picture.',
  },
  {
    file: 'gauge_bar.png', isCharacter: true, aspectRatio: '16:9',
    prompt: 'An empty horizontal telemetry bar housing, flat modern comic linework, bold black outlines: sleek dark bar-meter case with a blank glass window, empty inside, no fill, no numbers. Centered, straight on.',
    alt: 'A sleek dark bar-meter housing, flat comic linework, blank glass window, empty inside, no fill, no numbers, centered.',
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

const artRoot = resolve(here, '..', '..', 'art-demo');

// Load an existing keyed sprite as a data URL to use as a full-body
// reference for pose variants. Returns null if the file is missing.
function refDataUrl(relPath) {
  const p = resolve(artRoot, relPath);
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
}

async function generate(prompt, isCharacter, ref, aspectRatio) {
  const body = {
    prompt,
    isCharacter,
    stylePack: 'Elon',
    aspectRatio: aspectRatio || (isCharacter ? '2:3' : '16:9'),
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
    console.log(`- elon/${item.file} exists, skipping`);
    skipped++;
    continue;
  }
  process.stdout.write(`* elon/${item.file} generating... `);
  try {
    let buf;
    try {
      buf = await generate(item.prompt, item.isCharacter, item.ref, item.aspectRatio);
    } catch (err) {
      if (/content_policy/i.test(err.message) && item.alt) {
        process.stdout.write(`policy hit, rephrasing... `);
        buf = await generate(item.alt, item.isCharacter, item.ref, item.aspectRatio);
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
