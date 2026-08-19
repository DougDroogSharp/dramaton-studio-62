// Art generation for the KING LEOPOLD chapter (1885-1908).
// Drives the local Flux bridge (dev server on :8080) with the
// "King Leopold" style pack (1900s documentary photograph, B&W),
// chroma-keys character green-screens, saves PNGs into art-demo/leopold/.
// Idempotent: existing files are skipped.
//
// Run: node scripts/chapters/gen-leopold.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
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
  {
    file: 'leopold_community.png', isCharacter: true,
    prompt: 'A group of Congolese villagers standing together for a formal photograph, circa 1904: men, women and elders in wraps and cloth garments, dignified, composed, direct gazes at the camera, standing close together as a community, full bodies, formal group portrait.',
    fallback: 'A dignified group of central African villagers posed for a formal photograph, circa 1904: calm direct gazes, traditional cloth garments, standing together, full bodies, formal group portrait.',
  },
  {
    file: 'leopold_movement.png', isCharacter: true,
    prompt: 'A dense crowd of many people at a Liverpool reform meeting, 1904: dozens of Edwardian men and women packed shoulder to shoulder, bowler hats and cloth caps raised in the air, plain blank cloth banners with no writing held aloft, earnest determined faces, full-length group photograph of the whole crowd.',
    fallback: 'A large Edwardian public meeting crowd, 1904: dozens of men and women in period dress standing close together, hats raised, plain unlettered banners, determined expressions, full-length group photograph.',
  },
  {
    file: 'leopold_docks.png', isCharacter: false,
    prompt: 'Liverpool docks, 1900: a wet stone quayside at dusk, moored steamships with tall funnels, cranes, stacked cargo crates, and at one side the lit window of a small shipping ledger office, papers visible on a high desk inside. No people.',
    fallback: 'An Edwardian-era British dockside at dusk: steamships, cranes, stacked crates, and a small lamplit clerk\'s office with ledgers at a high desk. No people.',
  },
  {
    file: 'leopold_lecture.png', isCharacter: false,
    prompt: 'A darkened British lecture hall, 1906: rows of audience silhouettes seen from behind, a magic lantern projector on a stand casting a bright beam, and on the far wall a large projected rectangle of white light, empty. Dust motes in the beam. No faces visible.',
    fallback: 'A darkened Edwardian lecture hall: audience silhouettes from behind, a magic lantern projector beam, a blank bright projected frame on the wall. No faces.',
  },
];

// Mid-scene pose variants. Each uses the existing keyed sprite as a
// full-body reference so face and costume stay consistent across poses.
const VARIANTS = [
  {
    file: 'leopold_king_sit.png', ref: ['..', 'leopold_king.png'],
    prompt: 'The same elderly bearded king in the same dark uniform with medals, now SEATED in a carved chair at a huge desk, leaning back, hands folded over his stomach, smug satisfied expression, full body including chair, facing slightly right.',
    fallback: 'The same bearded elderly monarch in dark uniform, seated in an ornate chair at a desk, leaning back with a self-satisfied expression, full body, facing slightly right.',
  },
  {
    file: 'leopold_king_point.png', ref: ['..', 'leopold_king.png'],
    prompt: 'The same elderly bearded king in the same dark uniform with medals, now standing and POINTING sharply forward with his right arm fully extended, angry commanding expression, full body, facing slightly left.',
    fallback: 'The same bearded elderly monarch in dark uniform, standing and pointing forward with an outstretched arm, stern commanding face, full body, facing slightly left.',
  },
  {
    file: 'leopold_casement_closeup.png', ref: ['..', 'leopold_casement.png'],
    prompt: 'The same bearded Edwardian consul in the same dark suit, close-up from the chest up, pen in hand over a page of a handwritten report, jaw set, determined focused expression, looking down at the page.',
    fallback: 'The same bearded Edwardian gentleman in a dark suit, chest-up close view, writing with a pen on a report page, determined concentrated expression.',
  },
  {
    file: 'leopold_morel_point.png', ref: ['leopold_morel.png'],
    prompt: 'The same moustached Edwardian shipping clerk in the same dark suit and bowler hat, now POINTING with one arm at something off-frame while his other hand holds an open ledger, eyes wide, surprised astonished expression, full body, facing slightly right.',
    fallback: 'The same moustached clerk in dark suit and bowler hat, pointing with one arm, open ledger in the other hand, astonished wide-eyed expression, full body, facing slightly right.',
  },
  {
    file: 'leopold_harris_crouch.png', ref: ['leopold_harris.png'],
    prompt: 'The same Edwardian missionary woman in the same high-collared blouse, long dark skirt and sun hat, now CROUCHING low on one knee, steadying her box Kodak camera at eye level to frame a photograph, determined resolute expression, full body, facing slightly left.',
    fallback: 'The same Edwardian woman in blouse, long skirt and sun hat, kneeling low and holding an early box camera up to frame a shot, focused resolute expression, full body, facing slightly left.',
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

async function generate(prompt, isCharacter, referenceImageFullBody = null) {
  const resp = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      isCharacter,
      stylePack: STYLE,
      aspectRatio: isCharacter ? '2:3' : '16:9',
      ...(referenceImageFullBody ? { referenceImageFullBody } : {}),
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

// ---- Pose variants (reference-driven, keyed like all characters) ----
for (const item of VARIANTS) {
  const outPath = resolve(outDir, item.file);
  if (existsSync(outPath)) {
    console.log(`- ${item.file} exists, skipping`);
    skipped++;
    continue;
  }
  const refPath = resolve(outDir, ...item.ref);
  if (!existsSync(refPath)) {
    console.log(`- ${item.file} SKIPPED: reference ${item.ref.join('/')} missing`);
    failed++;
    continue;
  }
  const refDataUrl = `data:image/png;base64,${readFileSync(refPath).toString('base64')}`;
  process.stdout.write(`* ${item.file} generating (ref: ${item.ref[item.ref.length - 1]})... `);
  let buf = null;
  try {
    buf = await generate(item.prompt, true, refDataUrl);
  } catch (err) {
    if (/content_policy/i.test(err.message) && item.fallback) {
      process.stdout.write(`policy hit, retrying restrained... `);
      try {
        buf = await generate(item.fallback, true, refDataUrl);
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
  buf = chromaKey(buf);
  writeFileSync(outPath, buf);
  console.log(`ok (${Math.round(buf.length / 1024)} KB)`);
  generated++;
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed.`);
