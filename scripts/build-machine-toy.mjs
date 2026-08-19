// Builds public/machine-toy.json — the Machine toy scene (placeholder art).
// The core mechanic of Humans vs Billionaires: Henry George's Progress
// and Poverty as a 2D contraption. Rectangles with labels; BINDs proven.
//
// Run: npm run build:machine
// Play: http://localhost:8080/theater?game=/machine-toy.json
// (loading via ?game= does NOT touch the editor's autosaved game)

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, WORLD_BASE, ACTORS, SFX,
  machineHubScene, toyWitnessScenes, tuningScene,
} from './machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const witnessScenes = toyWitnessScenes('the_machine');

const game = {
  info: {
    title: 'Humans vs Billionaires',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { ...WORLD_BASE, machineIntroSeen: 0 },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'machine_intro',
    enableAutosave: true,
    customPoses: ['Overworked', 'FlareUp'],
  },
  actors: ACTORS,
  scenes: [
    {
      id: 'machine_intro',
      name: 'Intro',
      sceneType: 'AGENCY',
      dropId: null,
      stage: [],
      script: lines(
        'Narrator: "1879. Henry George asks: why does poverty deepen as progress advances?"',
        'Narrator: "This machine is his answer. Billionaires at the top. Humans at the bottom. Rent in between."',
        '[SCENE the_machine]',
      ),
      status: 'work',
    },
    machineHubScene({
      id: 'the_machine',
      name: 'The Machine',
      pool: 'witness',
      intro: {
        gateVar: 'machineIntroSeen',
        line: '1879. Henry George asks: why does poverty deepen as progress advances? This machine is his answer. Pull the levers.',
      },
      buttons: ['tune_button'],
    }),
    tuningScene({ backButton: 'back_button' }),
    ...witnessScenes,
  ],
  drops: [],
  items: [],
  sfx: SFX,
  buttons: [
    // Top-center strip: clear of the gauges (left) and sliders (right)
    {
      id: 'tune_button', name: 'Tune', label: 'TUNE',
      x: 44, y: 4, width: 9, height: 6,
      targetSceneId: 'machine_tuning', status: 'work',
    },
    {
      id: 'back_button', name: 'Back', label: 'BACK',
      x: 50, y: 97, width: 9, height: 5,
      targetSceneId: 'the_machine', status: 'work',
    },
  ],
  episodes: [
    {
      id: 'ep_machine_toy',
      name: 'The Machine (Toy)',
      description: 'Georgist economy toy: full panel, ticking economy, witness commentary pool, tuning cockpit.',
      sceneIds: ['machine_intro', 'the_machine', 'machine_tuning', ...witnessScenes.map(s => s.id)],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'machine-toy.json');
writeFileSync(outPath, JSON.stringify(game, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
console.log('Play: http://localhost:8080/theater?game=/machine-toy.json');
