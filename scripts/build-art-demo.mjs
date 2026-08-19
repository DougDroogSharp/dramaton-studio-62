// Builds public/hvb-art-demo.json — a playable showcase of the four
// era art styles, using the Flux-generated art in art-demo/ and
// dialogue drawn from docs/HVB_RESEARCH.md.
//
// Run: node scripts/generate-art.mjs   (generates any missing art)
//      npm run build:artdemo
// Play: http://localhost:8080/theater?game=/hvb-art-demo.json

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lines } from './machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const art = (file) =>
  `data:image/png;base64,${readFileSync(resolve(here, '..', 'art-demo', file)).toString('base64')}`;

const actor = (id, name, file) => ({
  id,
  name,
  graphics: [{ id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image: art(file) }],
  status: 'work',
});

const drop = (id, name, file) => ({ id, name, image: art(file), status: 'work' });

const el = (id, assetId, x, y, scale = 2.4) => ({
  id, assetId, type: 'ACTOR', x, y, scale, zIndex: 3, rotation: 0,
  pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
});

const demoScene = (id, name, dropId, actors, dialogue) => ({
  id,
  name,
  sceneType: 'WITNESS',
  dropId,
  stage: actors,
  script: lines(
    ...dialogue,
    '[CHOICE]',
    '- "1066 — William" -> demo_william',
    '- "1900 — Leopold" -> demo_leopold',
    '- "1929 — Capone" -> demo_capone',
    '- "2026 — Elon" -> demo_elon',
    '- "Back to the title" -> demo_menu',
    '[/CHOICE]',
  ),
  status: 'work',
});

const game = {
  info: {
    title: 'HVB Art Demo',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {},
    gameMode: 'INTERACTIVE',
    titleSceneId: 'demo_menu',
    enableAutosave: true,
  },
  actors: [
    actor('william_king', 'William', 'william_king.png'),
    actor('william_odo', 'Odo', 'william_odo.png'),
    actor('leopold_king', 'Leopold', 'leopold_king.png'),
    actor('leopold_casement', 'Casement', 'leopold_casement.png'),
    actor('capone_boss', 'Capone', 'capone_boss.png'),
    actor('capone_wilson', 'Wilson', 'capone_wilson.png'),
    actor('elon_musk', 'Elon', 'elon_musk.png'),
    actor('elon_reporter', 'Reporter', 'elon_reporter.png'),
  ],
  scenes: [
    {
      id: 'demo_menu',
      name: 'Art Demo Menu',
      sceneType: 'AGENCY',
      dropId: null,
      stage: [],
      script: lines(
        'Narrator: "HUMANS VS BILLIONAIRES — four centuries, four art styles, one machine. All art generated through the era style packs."',
        '[CHOICE]',
        '- "1066 — William (Bayeux tapestry)" -> demo_william',
        '- "1900 — Leopold (documentary photograph)" -> demo_leopold',
        '- "1929 — Capone (Amiga pixel art)" -> demo_capone',
        '- "2026 — Elon (the comic)" -> demo_elon',
        '[/CHOICE]',
      ),
      status: 'work',
    },
    demoScene('demo_william', 'William: The Court', 'william_hall',
      [el('wk', 'william_king', 32, 62), el('wo', 'william_odo', 70, 63)],
      [
        'Odo: "The survey is complete, sire. Thirteen thousand places — every holder, every hide, every ox. Nothing escapes the book."',
        'William: "In mad fury I descended on the English of the north like a raging lion. So the monks will write of me. Let them."',
        'Odo: "The English call it the Domesday Book. The day of judgment — from which there is no appeal."',
        'William: "Then summon them all to Salisbury, brother, and have them swear it: all land is held of the king."',
      ]),
    demoScene('demo_leopold', 'Leopold: The Station', 'leopold_station',
      [el('lk', 'leopold_king', 30, 60), el('lc', 'leopold_casement', 71, 62)],
      [
        'Leopold: "My International Association is a work of Christian charity, Consul. Europe has said so at Berlin."',
        'Casement: "Two hundred and forty persons, compelled to supply one ton of foodstuffs per week — receiving the princely sum of fifteen shillings tenpence."',
        'Leopold: "You have been listening to missionaries. And their little cameras."',
        'Casement: "Forty pages, Majesty, with testimony appended. The facts are worse than the rumors. Parliament will have every name."',
      ]),
    demoScene('demo_capone', 'Capone: The Garage', 'capone_garage',
      [el('cb', 'capone_boss', 31, 63), el('cw', 'capone_wilson', 70, 63)],
      [
        'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business. I supply a popular demand."',
        'Wilson: "Your business keeps books, Mr. Capone. Cashier\'s checks. A net worth. And no declared income anywhere."',
        'Capone: "Every policeman in this town gets his bread and butter from the taxes I pay."',
        'Wilson: "Rent leaves receipts. It always leaves receipts."',
      ]),
    demoScene('demo_elon', 'Elon: The Office', 'elon_hq',
      [el('em', 'elon_musk', 31, 62), el('er', 'elon_reporter', 70, 62)],
      [
        'Elon: "It\'s not a company. It\'s a mission to save humanity. Nobody audits a mission."',
        'Reporter: "Six hundred documented injuries. Brownsville logs six times the industry average. On the record?"',
        'Elon: "The dashboard is green."',
        'Reporter: "The kodak has been a sore calamity to you people since 1905. We publish Thursday."',
      ]),
  ],
  drops: [
    drop('william_hall', 'Norman Great Hall', 'william_hall.png'),
    drop('leopold_station', 'Congo River Station', 'leopold_station.png'),
    drop('capone_garage', 'Clark Street Garage', 'capone_garage.png'),
    drop('elon_hq', 'The Headquarters', 'elon_hq.png'),
  ],
  items: [],
  sfx: [],
  buttons: [],
  episodes: [
    {
      id: 'ep_art_demo',
      name: 'Art Demo',
      description: 'Four era art styles generated through the Flux style packs.',
      sceneIds: ['demo_menu', 'demo_william', 'demo_leopold', 'demo_capone', 'demo_elon'],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'hvb-art-demo.json');
writeFileSync(outPath, JSON.stringify(game) + '\n', 'utf8');
const mb = (JSON.stringify(game).length / 1024 / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-art-demo.json');
