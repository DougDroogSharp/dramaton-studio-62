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

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- helpers

const balloon = (id, text, x, y, { scale = 1, zIndex = 2, rotation = 0 } = {}) => ({
  id,
  assetId: '',
  type: 'BALLOON',
  x, y, scale, zIndex, rotation,
  text,
  balloonType: 'SPEECH',
});

const actorEl = (id, assetId, x, y, { scale = 1, zIndex = 3 } = {}) => ({
  id,
  assetId,
  type: 'ACTOR',
  x, y, scale, zIndex,
  rotation: 0,
});

const lines = (...xs) => xs.join('\n');

// ---------------------------------------------------------------- worldState
// Working rule: EVERY simulation coefficient is a worldState variable
// (c_*) so the whole machine tunes live — no hardcoded constants.

const worldState = {
  // Player levers (SLIDERs)
  greed: 50,
  speculation: 30,
  education: 20,
  regulation: 30,
  hierarchy: 50,
  repression: 20,
  singleTax: 0, // the lever: 0/1 snap slider

  // Simulation state
  productivity: 1.5,
  laborForce: 40,
  marginHeight: 100,
  product: 0,
  rent: 0,
  wages: 30,
  interest: 9,
  hoard: 0,
  prestige: 20,
  publicFund: 0,
  flareUps: 0,
  flareThreshold: 20,
  crisis: 0,
  wheelAngle: 0,
  crisisRoll: 0,
  commentaryTimer: 0,
  narratonGo: 0,
  machineIntroSeen: 0,

  // Coefficients — tune these live (hidden debug sliders welcome)
  c_prodGrowth: 0.01,     // productivity gain per tick
  c_prodMax: 3,           // productivity ceiling
  c_specMargin: 0.5,      // how hard speculation lowers the margin
  c_greedMargin: 0.3,     // how hard greed lowers the margin
  c_regMargin: 0.2,       // how much regulation raises the margin
  c_taxMargin: 30,        // margin boost while the single tax is on
  c_rentGreedDiv: 50,     // rent = gap * (greed / this)
  c_interestShare: 0.3,   // interest moves WITH wages (George's law)
  c_survivalFloor: 5,     // wages never fall below this
  c_prestigeSpend: 0.2,   // hoard spent on prestige per tick
  c_eduPrestige: 0.005,   // education corrodes the shell
  c_repressionCost: 0.02, // hoard drain per repression point
  c_crisisSpecMin: 70,    // speculation threshold for crisis risk
  c_crisisChance: 0.05,   // per-tick crisis probability past threshold
  c_taxRedirect: 0.9,     // share of rent redirected to the public fund
  c_fundMargin: 0.01,     // public fund raises the margin
  c_fundEdu: 0.005,       // public fund raises education
  c_flareBase: 20,        // flare-up threshold base
  c_flareHier: 0.3,       // hierarchy raises the threshold
  c_flareEdu: 0.2,        // education lowers it
  c_flareDiv: 4,          // wages shortfall per additional flare-up
  c_wheelSpeed: 0.5,      // wheel degrees per product unit per tick
  c_commentaryCooldown: 40,   // ticks between Narraton commentary
  c_commentaryFlareMin: 3,    // flare-ups needed to trigger commentary
};

// ---------------------------------------------------------------- the rig

const machineStage = [
  // Billionaire tier (top)
  balloon('prestige_shell', 'PRESTIGE SHELL', 32, 14),
  actorEl('billionaire', 'billionaire', 45, 13, { scale: 1.2, zIndex: 4 }),
  balloon('hoard_reservoir', 'HOARD', 60, 14),

  // Middle mechanism
  balloon('production_wheel', 'PRODUCTION WHEEL', 38, 38),
  balloon('rent_siphon', 'RENT SIPHON', 56, 30),
  balloon('speculation_brake', 'SPECULATION BRAKE', 71, 38),
  balloon('wage_pipe', 'WAGE PIPE', 38, 55),
  balloon('interest_pipe', 'INTEREST PIPE', 56, 55),
  balloon('margin_floor', 'THE MARGIN', 47, 64, { zIndex: 1 }),

  // Human tier (bottom)
  ...[0, 1, 2, 3, 4, 5].map(i => actorEl(`human_${i + 1}`, 'human', 24 + i * 7, 82)),
];

const machineScript = lines(
  '# ============ THE MACHINE — Georgist economy toy ============',
  '# Every c_* coefficient is a worldState variable: tune live.',
  '',
  '# --- Instrument panel: right = levers, left = readouts ---',
  '[SLIDER greed at 90,8 min=0 max=100 label="GREED"]',
  '[SLIDER speculation at 90,20 min=0 max=100 label="SPECULATION"]',
  '[SLIDER education at 90,32 min=0 max=100 label="EDUCATION"]',
  '[SLIDER regulation at 90,44 min=0 max=100 label="REGULATION"]',
  '[SLIDER hierarchy at 90,56 min=0 max=100 label="HIERARCHY"]',
  '[SLIDER repression at 90,68 min=0 max=100 label="REPRESSION"]',
  '[SLIDER singleTax at 90,82 min=0 max=1 step=1 label="SINGLE TAX"]',
  '',
  '[GAUGE wages at 8,12 min=0 max=60 label="WAGES"]',
  '[GAUGE rent at 8,34 min=0 max=40 label="RENT"]',
  '[GAUGE marginHeight at 8,56 min=0 max=100 label="MARGIN"]',
  '[GAUGE hoard at 8,78 min=0 max=600 label="HOARD"]',
  '',
  '# --- The rig: transforms driven by the economy ---',
  '[BIND production_wheel.rotation to wheelAngle]',
  '[BIND rent_siphon.rotation to clamp(rent * 2, 0, 75)]',
  '[BIND speculation_brake.y to 30 + speculation * 0.12]',
  '[BIND wage_pipe.scale to clamp(wages / 30, 0.3, 2.5)]',
  '[BIND interest_pipe.scale to clamp(interest / 10, 0.3, 2.5)]',
  '[BIND margin_floor.y to 78 - marginHeight * 0.14]',
  '[BIND hoard_reservoir.scale to clamp(0.6 + hoard / 300, 0.6, 3)]',
  '[BIND prestige_shell.opacity to 0.25 + prestige / 130]',
  '[BIND prestige_shell.scale to 0.8 + prestige / 120]',
  '',
  '[IF machineIntroSeen == 0]',
  '[SET machineIntroSeen = 1]',
  'Narrator: "1879. Henry George asks: why does poverty deepen as progress advances? This machine is his answer. Pull the levers."',
  '[ENDIF]',
  '',
  '[TICK 500ms]',
  '# progress raises productivity; education accelerates it',
  '[SET productivity = clamp(productivity + c_prodGrowth * (1 + education / 200), 0.5, c_prodMax)]',
  '',
  '# speculation and greed LOWER the margin; regulation and the single tax raise it',
  '[SET marginHeight = clamp(100 - speculation * c_specMargin - greed * c_greedMargin + regulation * c_regMargin + singleTax * c_taxMargin, 5, 100)]',
  '',
  '# product of labor (wages\' true source — anti-wage-fund)',
  '[SET product = laborForce * productivity * (marginHeight / 100)]',
  '',
  '# rent captures the gap between best land and the margin',
  '[SET rent = product * (1 - marginHeight / 100) * (greed / c_rentGreedDiv)]',
  '[IF singleTax == 1]',
  '[SET publicFund = publicFund + rent * c_taxRedirect]',
  '[SET rent = rent * (1 - c_taxRedirect)]',
  '[ENDIF]',
  '',
  '# wages and interest move together, squeezed by rent',
  '[SET wages = max(product - rent, c_survivalFloor)]',
  '[SET interest = wages * c_interestShare]',
  '',
  '# hoard and prestige',
  '[SET hoard = max(hoard + rent - repression * c_repressionCost - c_prestigeSpend, 0)]',
  '[SET prestige = clamp(prestige + c_prestigeSpend - education * c_eduPrestige, 0, 100)]',
  '',
  '# flare-ups: poverty past threshold; hierarchy raises tolerance, education lowers it',
  '[SET flareThreshold = c_flareBase + hierarchy * c_flareHier - education * c_flareEdu]',
  '[SET flareUps = clamp(floor((flareThreshold - wages) / c_flareDiv), 0, 6)]',
  '',
  '# crisis: speculative prices outrun production',
  '[SET crisisRoll = rand()]',
  '[IF speculation > c_crisisSpecMin]',
  '[IF crisisRoll < c_crisisChance]',
  '[SET crisis = 1]',
  '[SET product = product * 0.5]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF speculation <= c_crisisSpecMin]',
  '[SET crisis = 0]',
  '[ENDIF]',
  '',
  '# single tax feedback: the fund raises the margin and education',
  '[IF singleTax == 1]',
  '[SET marginHeight = clamp(marginHeight + publicFund * c_fundMargin, 5, 100)]',
  '[SET education = clamp(education + publicFund * c_fundEdu, 0, 100)]',
  '[ENDIF]',
  '',
  '# spin the wheel at product speed',
  '[SET wheelAngle = wheelAngle + product * c_wheelSpeed]',
  '',
  '# flare-up visuals: humans past the threshold spark',
  '[IF flareUps >= 1]',
  '[EFFECT electric_flare on human_1]',
  '[ENDIF]',
  '[IF flareUps < 1]',
  '[CLEAR_EFFECT electric_flare from human_1]',
  '[ENDIF]',
  '[IF flareUps >= 2]',
  '[EFFECT electric_flare on human_2]',
  '[ENDIF]',
  '[IF flareUps < 2]',
  '[CLEAR_EFFECT electric_flare from human_2]',
  '[ENDIF]',
  '[IF flareUps >= 3]',
  '[EFFECT electric_flare on human_3]',
  '[ENDIF]',
  '[IF flareUps < 3]',
  '[CLEAR_EFFECT electric_flare from human_3]',
  '[ENDIF]',
  '[IF flareUps >= 4]',
  '[EFFECT electric_flare on human_4]',
  '[ENDIF]',
  '[IF flareUps < 4]',
  '[CLEAR_EFFECT electric_flare from human_4]',
  '[ENDIF]',
  '[IF flareUps >= 5]',
  '[EFFECT electric_flare on human_5]',
  '[ENDIF]',
  '[IF flareUps < 5]',
  '[CLEAR_EFFECT electric_flare from human_5]',
  '[ENDIF]',
  '[IF flareUps >= 6]',
  '[EFFECT electric_flare on human_6]',
  '[ENDIF]',
  '[IF flareUps < 6]',
  '[CLEAR_EFFECT electric_flare from human_6]',
  '[ENDIF]',
  '',
  '# crisis shakes the wheel; a vast hoard glows',
  '[IF crisis == 1]',
  '[EFFECT shake_all on production_wheel]',
  '[ENDIF]',
  '[IF crisis == 0]',
  '[CLEAR_EFFECT shake_all from production_wheel]',
  '[ENDIF]',
  '[IF hoard > 300]',
  '[EFFECT gold_glow on hoard_reservoir]',
  '[ENDIF]',
  '[IF hoard <= 300]',
  '[CLEAR_EFFECT gold_glow from hoard_reservoir]',
  '[ENDIF]',
  '',
  '# Narraton commentary cadence (last in the body: it may leave the scene)',
  '[SET commentaryTimer = commentaryTimer + 1]',
  '[SET narratonGo = 0]',
  '[IF commentaryTimer > c_commentaryCooldown]',
  '[IF crisis == 1]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[IF flareUps >= c_commentaryFlareMin]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[IF singleTax == 1]',
  '[IF publicFund > 40]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF narratonGo == 1]',
  '[SET commentaryTimer = 0]',
  '[NARRATON pool=witness]',
  '[ENDIF]',
  '[/TICK]',
  '',
  '# hold the scene open forever: the machine never "ends"',
  '[WAIT 999999s]',
);

// ---------------------------------------------------------------- witness pool

const witnessScene = (id, name, narraton, ...dialogue) => ({
  id,
  name,
  sceneType: 'WITNESS',
  dropId: null,
  stage: [actorEl('witness_figure', 'witness', 50, 60, { scale: 1.4 })],
  script: lines(...dialogue, '[SCENE the_machine]'),
  narraton,
  status: 'work',
});

const witnessScenes = [
  witnessScene(
    'witness_poverty', 'Witness: Poverty',
    { pool: 'witness', keys: { wages: { target: 5, scale: 60 }, flareUps: { target: 5, scale: 6 } }, repeatable: true },
    'Witness: "The margin has fallen to nothing. They work harder every year, and every year they are poorer."',
    'Witness: "Progress, they call it."',
  ),
  witnessScene(
    'witness_crisis', 'Witness: Crisis',
    { pool: 'witness', requires: [{ variable: 'crisis', operator: '==', value: 1 }], keys: { speculation: { target: 95, scale: 100 } }, repeatable: true },
    'Witness: "The speculators priced the land beyond what any labor could pay. Now the whole machine seizes."',
    'Witness: "They will call it a mystery. It is not a mystery."',
  ),
  witnessScene(
    'witness_complacency', 'Witness: Complacency',
    { pool: 'witness', keys: { wages: { target: 40, scale: 60 }, flareUps: { target: 0, scale: 6 }, greed: { target: 15, scale: 100 } }, repeatable: true },
    'Witness: "Wages hold. The humans are quiet. The machine hums."',
    'Witness: "Quiet is not the same as just. Watch what happens when the hand on the greed lever tires of moderation."',
  ),
  witnessScene(
    'witness_hoard', 'Witness: The Hoard',
    { pool: 'witness', keys: { hoard: { target: 500, scale: 200 } }, repeatable: true },
    'Witness: "Look at the reservoir. Every drop passed through hands that made something — and stuck to hands that made nothing."',
    'Witness: "Rent is the price of permission to exist somewhere."',
  ),
  witnessScene(
    'witness_margin_collapse', 'Witness: The Floor Falls',
    { pool: 'witness', keys: { marginHeight: { target: 5, scale: 100 } }, repeatable: true },
    'Witness: "The margin of production — the best land free labor can still reach — has sunk to the sea floor."',
    'Witness: "When the margin falls, wages fall with it. Everywhere. Always."',
  ),
  witnessScene(
    'witness_singletax', 'Witness: The Lever',
    { pool: 'witness', requires: [{ variable: 'singleTax', operator: '==', value: 1 }], keys: { publicFund: { target: 60, scale: 60 } }, repeatable: false, weight: 2 },
    'Witness: "Someone pulled the lever. Rent flows to the public fund now — the value the community creates, returned to the community."',
    'Witness: "Watch the margin rise. Watch the schools fill. This is the whole argument, moving."',
  ),
];

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'The Machine (Toy)',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState,
    gameMode: 'INTERACTIVE',
    titleSceneId: 'machine_intro',
    enableAutosave: true,
    customPoses: ['Overworked', 'FlareUp'],
  },
  actors: [
    { id: 'billionaire', name: 'The Billionaire', graphics: [], status: 'work' },
    { id: 'human', name: 'Human', graphics: [], status: 'work' },
    { id: 'witness', name: 'Witness', graphics: [], status: 'work' },
    { id: 'narrator', name: 'Narrator', graphics: [], status: 'work' },
  ],
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
    {
      id: 'the_machine',
      name: 'The Machine',
      sceneType: 'AGENCY',
      dropId: null,
      stage: machineStage,
      script: machineScript,
      status: 'work',
    },
    ...witnessScenes,
  ],
  drops: [],
  items: [],
  sfx: [
    { id: 'electric_flare', name: 'Electric Flare', type: 'electric', category: 'ATTACH', params: { intensity: 70 }, status: 'work' },
    { id: 'shake_all', name: 'Crisis Shake', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
    { id: 'gold_glow', name: 'Gold Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
  ],
  buttons: [],
  episodes: [
    {
      id: 'ep_machine_toy',
      name: 'The Machine (Toy)',
      description: 'Georgist economy toy: full panel, ticking economy, witness commentary pool.',
      sceneIds: ['machine_intro', 'the_machine', ...witnessScenes.map(s => s.id)],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'machine-toy.json');
writeFileSync(outPath, JSON.stringify(game, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
console.log('Play: http://localhost:8080/theater?game=/machine-toy.json');
