// Builds public/hvb-campaign.json — Humans vs Billionaires campaign
// scaffold: "How the Billionaires Gained Power."
//
// Five history chapters (William the Conqueror, King Leopold, Gilded
// Age America, King of Chicago, Elon Musk) plus a raw-mechanics
// sandbox. Each chapter presets the levers to its era, runs the same
// Georgist machine, and draws Narraton commentary from its own pool.
// Scripted scene TEXT is Doug's — every [TODO] line is a placeholder
// marking where real writing goes. The engine selects; Doug writes.
//
// Run: npm run build:campaign
// Play: http://localhost:8080/theater?game=/hvb-campaign.json

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, setLines, WORLD_BASE, SIM_RESET, ACTORS, SFX,
  machineHubScene, witnessScene, toyWitnessScenes, tuningScene,
} from './machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- chapters

const CHAPTERS = [
  {
    n: 1, id: 'william', title: 'WILLIAM THE CONQUEROR', year: 1066,
    // Conquest: violence becomes property, property becomes rent
    presets: { hierarchy: 90, repression: 80, education: 5, greed: 70, regulation: 5, speculation: 10 },
    introLines: [
      'Narrator: "1066. William takes England by the sword and keeps it by the ledger."',
      'Narrator: "[TODO Doug: conquest becomes property, property becomes rent, loot distribution buys the barons]"',
    ],
    poolScenes: [
      { id: 'ch1_domesday', name: 'Ch1: The Domesday Survey', keys: { hoard: { target: 150, scale: 200 } },
        line: '[TODO Doug: every hide of land written down — the first rent extraction database]' },
      { id: 'ch1_barons', name: 'Ch1: Buying the Barons', keys: { prestige: { target: 60, scale: 100 } },
        line: '[TODO Doug: loot distribution — the enforcers get their cut and call it honor]' },
      { id: 'ch1_harrying', name: 'Ch1: The Harrying', keys: { flareUps: { target: 5, scale: 6 }, repression: { target: 90, scale: 100 } },
        line: '[TODO Doug: the North rises; the North burns — repression spending made visible]' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 300 }],
      line: '[TODO Doug: the feudal settlement complete — rent is now the law of the land]',
    },
  },
  {
    n: 2, id: 'leopold', title: 'KING LEOPOLD', year: 1885,
    // Pure extraction: a colony run as a private estate
    presets: { greed: 100, repression: 95, education: 10, hierarchy: 80, regulation: 5, speculation: 20 },
    introLines: [
      'Narrator: "1885. Leopold II acquires the Congo — not for Belgium, for himself."',
      'Narrator: "[TODO Doug: rubber quotas, the Force Publique, extraction with the mask fully off]"',
    ],
    poolScenes: [
      { id: 'ch2_quota', name: 'Ch2: The Quota', keys: { wages: { target: 5, scale: 60 }, greed: { target: 100, scale: 100 } },
        line: '[TODO Doug: the rubber quota — wages below survival, enforced by the basket of hands]' },
      { id: 'ch2_report', name: 'Ch2: The Casement Report', keys: { education: { target: 40, scale: 100 } },
        line: '[TODO Doug: witnesses publish; education rises; the prestige shell cracks]' },
      { id: 'ch2_philanthropy', name: 'Ch2: The Philanthropist King', keys: { prestige: { target: 90, scale: 100 } },
        line: '[TODO Doug: monuments and museums — prestige spending as insulation]' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 500 }],
      line: '[TODO Doug: the hoard complete, the colony sold to Belgium, the hands uncounted]',
    },
  },
  {
    n: 3, id: 'gilded', title: 'GILDED AGE AMERICA', year: 1879,
    // George's own era: speculation outruns production
    presets: { speculation: 85, greed: 80, education: 30, regulation: 10, hierarchy: 60, repression: 40 },
    introLines: [
      'Narrator: "1879. The exact year Henry George publishes. Railroads, land grants, panics."',
      'Narrator: "[TODO Doug: the era the machine was built to explain — speculation as the brake]"',
    ],
    poolScenes: [
      { id: 'ch3_landgrant', name: 'Ch3: The Land Grant', keys: { speculation: { target: 90, scale: 100 } },
        line: '[TODO Doug: railroad land grants — miles of margin withheld from use]' },
      { id: 'ch3_panic', name: 'Ch3: The Panic', requires: [{ variable: 'crisis', operator: '==', value: 1 }], keys: {},
        line: '[TODO Doug: the panic arrives on schedule — speculative prices meet real production]' },
      { id: 'ch3_george', name: 'Ch3: Progress and Poverty', keys: { education: { target: 60, scale: 100 } },
        line: '[TODO Doug: a printer in San Francisco writes the best-selling economics book of the century]' },
    ],
    finale: {
      requires: [{ variable: 'crisis', operator: '==', value: 1 }],
      line: '[TODO Doug: depression as proof — the chapter closes on George\'s diagnosis]',
    },
  },
  {
    n: 4, id: 'capone', title: 'KING OF CHICAGO', year: 1929,
    // The racket as rent: pay for permission to exist on the block
    presets: { repression: 60, greed: 75, regulation: 15, hierarchy: 60, education: 35, speculation: 50 },
    introLines: [
      'Narrator: "1929. Chicago. The racket is just rent with a tommy gun."',
      'Narrator: "[TODO Doug: protection money as land rent — the 1986 game returns to its subject]"',
    ],
    poolScenes: [
      { id: 'ch4_protection', name: 'Ch4: Protection', keys: { rent: { target: 30, scale: 40 } },
        line: '[TODO Doug: pay for permission to exist on the block — the purest rent there is]' },
      { id: 'ch4_cityhall', name: 'Ch4: City Hall', keys: { regulation: { target: 5, scale: 100 } },
        line: '[TODO Doug: regulation for sale — govStrength corroded by prestige and envelopes]' },
      { id: 'ch4_massacre', name: 'Ch4: The Massacre', keys: { flareUps: { target: 4, scale: 6 } },
        line: '[TODO Doug: competition among rentiers turns kinetic]' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 400 }],
      line: '[TODO Doug: the king of Chicago falls to an accounting ledger — rent leaves receipts]',
    },
  },
  {
    n: 5, id: 'musk', title: 'ELON MUSK', year: 2026,
    // The simulation era: prestige as armor
    presets: { greed: 85, speculation: 70, education: 40, regulation: 20, hierarchy: 70, repression: 30 },
    // Musk-era prestige floor — respects a bigger carried legacy
    extraLines: ['[SET prestige = clamp(max(prestige, 80), 0, 100)]'],
    introLines: [
      'Narrator: "2026. The hoard is beyond counting. The product is mostly story."',
      'Narrator: "[TODO Doug: prestige gameplay, outsourced-gamer-cred, the simulation era — link the comic]"',
    ],
    poolScenes: [
      { id: 'ch5_memes', name: 'Ch5: The Feed', keys: { prestige: { target: 95, scale: 100 } },
        line: '[TODO Doug: the feed as prestige machine — repression by timeline]' },
      { id: 'ch5_mars', name: 'Ch5: Mars as Margin', keys: { speculation: { target: 90, scale: 100 } },
        line: '[TODO Doug: the ultimate speculative land — a margin that does not exist yet, already priced]' },
      { id: 'ch5_walkout', name: 'Ch5: The Walkout', keys: { flareUps: { target: 4, scale: 6 }, education: { target: 60, scale: 100 } },
        line: '[TODO Doug: educated flare-ups — the shell corrodes fastest when they can read the ledger]' },
    ],
    finale: {
      requires: [{ variable: 'prestige', operator: '>=', value: 95 }],
      line: '[TODO Doug: peak prestige — the simulation complete, the humans optional. Or are they?]',
    },
  },
];

// ---------------------------------------------------------------- scene builders

// Per-era state that never carries between chapters
const TRANSIENT_RESET = {
  product: 0,
  rent: 0,
  wages: 30,
  interest: 9,
  marginHeight: 100,
  flareUps: 0,
  crisis: 0,
  wheelAngle: 0,
  commentaryTimer: 0,
  collapseTimer: 0,
  reconTimer: 0,
  singleTax: 0, // each era must re-win the lever
};

const chapterIntro = (ch) => {
  // education is continuity-aware; the other presets are plain levers
  const { education: presetEdu, ...leverPresets } = ch.presets;
  const carry = ch.n > 1
    ? [
        '# CONTINUITY: arriving from the previous chapter carries the',
        '# legacy — the fortune crosses the century. Any other entry',
        '# (menu jump) plays this era fresh and standalone.',
        `[IF chapter == ${ch.n - 1}]`,
        '[SET hoard = hoard * c_legacyHoard]',
        '[SET prestige = clamp(prestige * c_legacyPrestige, 10, 100)]',
        `[SET education = clamp(max(education * c_legacyEdu, ${presetEdu}), 0, 100)]`,
        '[SET publicFund = publicFund * 0.25]',
        '# productivity carries untouched: progress does not regress',
        'Narrator: "The fortune crosses the century. The hoard endures. The humans forget — but not everything."',
        '[ENDIF]',
        `[IF chapter != ${ch.n - 1}]`,
        '[SET hoard = 0]',
        '[SET prestige = 20]',
        '[SET productivity = 1.5]',
        `[SET education = ${presetEdu}]`,
        '[SET publicFund = 0]',
        '[ENDIF]',
      ]
    : [
        '# Chapter 1 always starts the ledger empty',
        '[SET hoard = 0]',
        '[SET prestige = 20]',
        '[SET productivity = 1.5]',
        `[SET education = ${presetEdu}]`,
        '[SET publicFund = 0]',
      ];

  return {
    id: `ch${ch.n}_intro`,
    name: `Chapter ${ch.n}: ${ch.title}`,
    sceneType: 'AGENCY',
    dropId: null,
    stage: [],
    script: lines(
      `# ============ CHAPTER ${ch.n} — ${ch.title} (${ch.year}) ============`,
      '# Era lever presets + legacy continuity. Numbers are guesses: tune live.',
      setLines(TRANSIENT_RESET),
      '',
      carry,
      '',
      setLines(leverPresets),
      ch.extraLines || [],
      `[SET chapter = ${ch.n}]`,
      '',
      ch.introLines,
      `[SCENE ch${ch.n}_machine]`,
    ),
    status: 'work',
  };
};

const chapterPoolScene = (ch, spec) => witnessScene(
  spec.id,
  spec.name,
  {
    pool: `ch${ch.n}`,
    ...(spec.requires ? { requires: spec.requires } : {}),
    keys: spec.keys,
    repeatable: true,
  },
  `ch${ch.n}_machine`,
  `Witness: "${spec.line}"`,
);

const chapterFinale = (ch) => {
  const next = ch.n < 5 ? `ch${ch.n + 1}_intro` : 'menu';
  return witnessScene(
    `ch${ch.n}_finale`,
    `Ch${ch.n} Finale`,
    {
      pool: `ch${ch.n}`,
      requires: ch.finale.requires,
      repeatable: false,
      weight: 5, // when eligible, the finale should usually win
    },
    next,
    `Witness: "${ch.finale.line}"`,
    `Narrator: "${ch.n < 5 ? `[TODO Doug: bridge to chapter ${ch.n + 1}]` : '[TODO Doug: the campaign closes — back to the beginning]'}"`,
  );
};

const chapterHub = (ch) => machineHubScene({
  id: `ch${ch.n}_machine`,
  name: `${ch.title} — The Machine`,
  pool: `ch${ch.n}`,
  endings: true,
  buttons: ['tune_button'],
});

// ---------------------------------------------------------------- fixed scenes

const menu = {
  id: 'menu',
  name: 'Chapter Select',
  sceneType: 'AGENCY',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "HUMANS VS BILLIONAIRES — How the Billionaires Gained Power"',
    'Narrator: "Same machine. Nine centuries. [TODO Doug: manifesto hook — Who wins? Billionaires or humans?]"',
    '[CHOICE]',
    '- "1066 — William the Conqueror" -> ch1_intro',
    '- "1885 — King Leopold" -> ch2_intro',
    '- "1879 — Gilded Age America" -> ch3_intro',
    '- "1929 — King of Chicago" -> ch4_intro',
    '- "2026 — Elon Musk" -> ch5_intro',
    '- "Sandbox — the raw machine" -> sandbox_intro',
    '[/CHOICE]',
  ),
  status: 'work',
};

const sandboxIntro = {
  id: 'sandbox_intro',
  name: 'Sandbox Intro',
  sceneType: 'AGENCY',
  dropId: null,
  stage: [],
  script: lines(
    '# Sandbox: default levers, full panel, no endings — the pure toy',
    setLines(SIM_RESET),
    setLines({ greed: 50, speculation: 30, education: 20, regulation: 30, hierarchy: 50, repression: 20 }),
    '[SET chapter = 0]',
    'Narrator: "The raw machine. No century, no story pressure. Pull the levers and watch the theory move."',
    '[SCENE sandbox_machine]',
  ),
  status: 'work',
};

const sandboxHub = machineHubScene({
  id: 'sandbox_machine',
  name: 'Sandbox — The Machine',
  pool: 'witness',
  endings: false,
  buttons: ['tune_button'],
});

const endingCollapse = {
  id: 'ending_collapse',
  name: 'Ending: COLLAPSE',
  sceneType: 'WITNESS',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "COLLAPSE."',
    'Witness: "Wages pinned at survival. Every human sparking. This is how Rome went — Book X, the reversion to barbarism."',
    'Narrator: "[TODO Doug: the collapse ending — Progress and Poverty Book X, the warning made kinetic]"',
    '[CHOICE]',
    '- "Begin again" -> menu',
    '[/CHOICE]',
  ),
  status: 'work',
};

const endingReconstitution = {
  id: 'ending_reconstitution',
  name: 'Ending: RECONSTITUTION',
  sceneType: 'WITNESS',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "RECONSTITUTION."',
    'Witness: "The lever held. Education kept climbing. The machine still runs — but the rent flows back to the people who make the value."',
    'Narrator: "THE TEN LITMUS TESTS — [TODO Doug: the manifesto\'s ten tests, displayed here as the victory screen]"',
    'Narrator: "[TODO Doug: test 1]"',
    'Narrator: "[TODO Doug: test 2]"',
    'Narrator: "[TODO Doug: tests 3 through 10]"',
    '[CHOICE]',
    '- "Begin again" -> menu',
    '[/CHOICE]',
  ),
  status: 'work',
};

// ---------------------------------------------------------------- game

const chapterScenes = CHAPTERS.flatMap(ch => [
  chapterIntro(ch),
  chapterHub(ch),
  ...ch.poolScenes.map(s => chapterPoolScene(ch, s)),
  chapterFinale(ch),
]);

const sandboxWitness = toyWitnessScenes('sandbox_machine');

const allScenes = [
  menu,
  ...chapterScenes,
  sandboxIntro,
  sandboxHub,
  ...sandboxWitness,
  endingCollapse,
  endingReconstitution,
  tuningScene({ backButton: 'back_button' }),
];

const game = {
  info: {
    title: 'Humans vs Billionaires',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { ...WORLD_BASE },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'menu',
    enableAutosave: true,
    customPoses: ['Overworked', 'FlareUp'],
  },
  actors: ACTORS,
  scenes: allScenes,
  drops: [],
  items: [],
  sfx: SFX,
  buttons: [
    {
      id: 'tune_button', name: 'Tune', label: 'TUNE',
      x: 5, y: 5, width: 8, height: 6,
      targetSceneId: 'machine_tuning', status: 'work',
    },
    {
      id: 'back_button', name: 'Back', label: 'BACK',
      x: 5, y: 5, width: 8, height: 6,
      targetSceneId: 'menu', status: 'work',
    },
  ],
  episodes: [
    ...CHAPTERS.map(ch => ({
      id: `ep_ch${ch.n}`,
      name: `Chapter ${ch.n}: ${ch.title}`,
      description: `${ch.year} — [TODO Doug: chapter description]`,
      sceneIds: [`ch${ch.n}_intro`, `ch${ch.n}_machine`, ...ch.poolScenes.map(s => s.id), `ch${ch.n}_finale`],
      status: 'work',
    })),
    {
      id: 'ep_sandbox',
      name: 'Sandbox',
      description: 'The raw machine: full panel, witness commentary, no endings.',
      sceneIds: ['sandbox_intro', 'sandbox_machine', ...sandboxWitness.map(s => s.id)],
      status: 'work',
    },
    {
      id: 'ep_frame',
      name: 'Frame',
      description: 'Menu, endings, tuning cockpit.',
      sceneIds: ['menu', 'ending_collapse', 'ending_reconstitution', 'machine_tuning'],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'hvb-campaign.json');
writeFileSync(outPath, JSON.stringify(game, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath} (${game.scenes.length} scenes)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-campaign.json');
