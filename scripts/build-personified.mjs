// Builds public/hvb-machine.json — THE PERSONIFIED MACHINE, the core
// game of Humans vs Billionaires, per docs/DESIGN_ADDENDUM_01.md.
//
// Run:  node scripts/build-personified.mjs            (art + build)
//       node scripts/build-personified.mjs --skip-art (build only)
//       node scripts/build-personified.mjs --art-only
// Play: http://localhost:8080/theater?game=/hvb-machine.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lines, balloon } from './machine-core.mjs';
import {
  ART_DIR, generateArt, WORLD,
  tickLedger, tickChain, tickEmigration, tickWalk, truthLines, tickNews,
} from './personified-core.mjs';
import { buildStamp } from './stamp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (!args.includes('--skip-art')) {
  await generateArt();
  if (args.includes('--art-only')) process.exit(0);
}

// ---------------------------------------------------------------- art loading

const artPath = (f) => resolve(ART_DIR, f);
const art = (f) => `data:image/png;base64,${readFileSync(artPath(f)).toString('base64')}`;

// Per-cast art availability — missing art falls back to labeled balloons.
const has = {
  worker: existsSync(artPath('worker_work.png')),
  workerConsume: existsSync(artPath('worker_consume.png')),
  capitalist: existsSync(artPath('capitalist.png')),
  government: existsSync(artPath('government.png')),
  governmentCaptured: existsSync(artPath('government_captured.png')),
  military: existsSync(artPath('military.png')),
  rifle: existsSync(artPath('rifle.png')),
  shell: existsSync(artPath('shell.png')),
};

const g = (pose, expression, img) => ({
  id: `${pose}_${expression}`.toLowerCase(), pose, expression, angle: 0, image: img,
});

const actors = [{ id: 'narrator', name: 'Narrator', graphics: [], status: 'work' }];

if (has.worker) {
  const work = art('worker_work.png');
  const consume = has.workerConsume ? art('worker_consume.png') : work;
  actors.push({
    id: 'worker', name: 'Worker', referenceImageFullBody: work,
    graphics: [
      g('Work', 'Neutral', work), g('Work', 'Tired', work), g('Work', 'Angry', work),
      g('Work', 'Happy', work), g('Work', 'Surprised', work),
      g('Consume', 'Neutral', consume), g('Consume', 'Tired', consume), g('Consume', 'Angry', consume),
    ],
    status: 'work',
  });
}
if (has.capitalist) {
  const cap = art('capitalist.png');
  actors.push({
    id: 'capitalist', name: 'Capitalist',
    graphics: [
      g('Neutral', 'Neutral', cap), g('Neutral', 'Happy', cap),
      g('Neutral', 'Confused', cap), g('Neutral', 'Scared', cap),
    ],
    status: 'work',
  });
}
if (has.government) {
  const gov = art('government.png');
  const captured = has.governmentCaptured ? art('government_captured.png') : gov;
  actors.push({
    id: 'government', name: 'Government',
    graphics: [
      g('Neutral', 'Neutral', gov), g('Neutral', 'Determined', gov),
      g('Jersey', 'Neutral', captured), g('Jersey', 'Confused', captured),
    ],
    status: 'work',
  });
}
if (has.military) {
  const mil = art('military.png');
  actors.push({
    id: 'military', name: 'Military',
    graphics: [g('Neutral', 'Neutral', mil), g('Neutral', 'Angry', mil)],
    status: 'work',
  });
}
if (has.rifle) actors.push({ id: 'rifle_asset', name: 'Rifle', graphics: [g('Neutral', 'Neutral', art('rifle.png'))], status: 'work' });
if (has.shell) actors.push({ id: 'shell_asset', name: 'Shell', graphics: [g('Neutral', 'Neutral', art('shell.png'))], status: 'work' });

// A pose matrix reuses one sprite across several pose/expression
// triples (the same worker art for Neutral, Tired and Angry). Keep the
// first copy of each distinct image and point the rest at it with
// imageRef; the load path (migrateGameData) hydrates them back. This
// alone cut this game from 18.2 MB to ~7 MB.
for (const actor of actors) {
  const firstIdFor = new Map();
  for (const gr of actor.graphics) {
    if (!gr.image) continue;
    const owner = firstIdFor.get(gr.image);
    if (owner === undefined) {
      firstIdFor.set(gr.image, gr.id);
    } else {
      gr.imageRef = owner;
      gr.image = '';
    }
  }
}

// stage element: real sprite if art exists, labeled balloon rectangle if not
const castEl = (ok, id, assetId, label, x, y, scale = 2.2, zIndex = 3, pose = 'Neutral') =>
  ok
    ? { id, assetId, type: 'ACTOR', x, y, scale, zIndex, rotation: 0, pose, expression: 'Neutral', spriteAngle: 0 }
    : balloon(id, label, x, y, { zIndex });

// dialogue with an acting tag only when the sprite (and thus the graphic) exists
const say = (ok, name, tag, text) => (ok ? `${name} (${tag}): "${text}"` : `${name}: "${text}"`);

// ---------------------------------------------------------------- quotes (§6)

const QUOTES_FALLBACK = [
  { text: 'It is difficult to get a man to understand something, when his salary depends upon his not understanding it.', speaker: 'Upton Sinclair', source: 'I, Candidate for Governor: And How I Got Licked', year: 1935, length: 'SHORT', sourcing: 'VERIFIED', voice: 'CRITIC', themes: ['WAGES', 'PROPAGANDA/PRESTIGE'] },
  { text: 'Political liberty, when the equal right to land is denied, becomes, as population increases and invention goes on, merely the liberty to compete for employment at starvation wages.', speaker: 'Henry George', source: 'Progress and Poverty', year: 1879, length: 'MEDIUM', sourcing: 'VERIFIED', voice: 'CRITIC', themes: ['WAGES', 'RENT/LAND'] },
  { text: 'Power concedes nothing without a demand. It never did and it never will.', speaker: 'Frederick Douglass', source: '"West India Emancipation" address', year: 1857, length: 'SHORT', sourcing: 'VERIFIED', voice: 'CRITIC', themes: ['RESISTANCE/HOPE'] },
  { text: 'Rise like Lions after slumber / In unvanquishable number— / Shake your chains to earth like dew / Which in sleep had fallen on you— / Ye are many—they are few.', speaker: 'Percy Bysshe Shelley', source: '"The Masque of Anarchy"', year: 1819, length: 'MEDIUM', sourcing: 'VERIFIED', voice: 'FICTION', themes: ['RESISTANCE/HOPE'] },
  { text: 'We must make our choice. We may have democracy, or we may have wealth concentrated in the hands of a few, but we cannot have both.', speaker: 'Louis Brandeis', source: 'Attributed to Louis Brandeis', length: 'MEDIUM', sourcing: 'DISPUTED', voice: 'CRITIC', themes: ['GOVERNMENT-CAPTURE', 'WEALTH-CONCENTRATION'] },
  { text: 'The public be damned! I am working for my stockholders.', speaker: 'William H. Vanderbilt', source: 'To reporters aboard his train near Chicago', year: 1882, length: 'SHORT', sourcing: 'VERIFIED', voice: 'VILLAIN', themes: ['GOVERNMENT-CAPTURE'] },
  { text: 'I can hire one half of the working class to kill the other half.', speaker: 'Jay Gould', source: 'Attributed, Great Southwest Railroad Strike', year: 1886, length: 'SHORT', sourcing: 'DISPUTED', voice: 'VILLAIN', themes: ['MILITARY/FORCE', 'WAGES'] },
  { text: "And the hapless Soldier's sigh / Runs in blood down Palace walls.", speaker: 'William Blake', source: '"London"', year: 1794, length: 'SHORT', sourcing: 'VERIFIED', voice: 'FICTION', themes: ['MILITARY/FORCE'] },
  { text: 'As it becomes more and more difficult to get land, so will the virtual enslavement of the laboring-classes go on.', speaker: 'Henry George', source: 'Progress and Poverty', year: 1879, length: 'SHORT', sourcing: 'VERIFIED', voice: 'CRITIC', themes: ['RENT/LAND', 'SLAVERY/COERCION'] },
  { text: "There's class warfare, all right, but it's my class, the rich class, that's making war, and we're winning.", speaker: 'Warren Buffett', source: 'Quoted by Ben Stein, The New York Times', year: 2006, length: 'MEDIUM', sourcing: 'VERIFIED', voice: 'VILLAIN', themes: ['WEALTH-CONCENTRATION'] },
];

let quotes = QUOTES_FALLBACK;
let quoteSource = 'inline 10-quote fallback (docs/QUOTES_PASS_1.md)';
const quotesPath = resolve(here, 'data', 'quotes.json');
if (existsSync(quotesPath)) {
  try {
    const parsed = JSON.parse(readFileSync(quotesPath, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed.quotes;
    if (Array.isArray(list) && list.length > 0 && list.every(q => q.text && q.speaker)) {
      quotes = list;
      quoteSource = `scripts/data/quotes.json (${list.length} quotes)`;
    }
  } catch (e) {
    console.warn(`quotes.json unreadable (${e.message}) — using fallback`);
  }
}

// §6 trigger map: theme fires when variable crosses threshold in direction
const quoteTriggers = [
  { theme: 'WAGES', variable: 'squeeze', threshold: 70, direction: 'rising' },
  { theme: 'RESISTANCE/HOPE', variable: 'education', threshold: 60, direction: 'rising' },
  { theme: 'GOVERNMENT-CAPTURE', variable: 'spine', threshold: 30, direction: 'falling' },
  { theme: 'MILITARY/FORCE', variable: 'aim', threshold: 60, direction: 'rising' },
  { theme: 'SLAVERY/COERCION', variable: 'shared', threshold: 15, direction: 'falling' },
  { theme: 'WEALTH-CONCENTRATION', variable: 'hoard', threshold: 500, direction: 'rising' },
  { theme: 'PROPAGANDA/PRESTIGE', variable: 'trust', threshold: 30, direction: 'falling' },
];

// ---------------------------------------------------------------- pose grammar (§5)

const workerMood = (hat, pose) => [
  `[IF workerHat == ${hat}]`,
  `[IF heat <= 40]`,
  `[POSE worker pose=${pose} expression=Neutral]`,
  '[ENDIF]',
  '[IF heat > 40]',
  `[POSE worker pose=${pose} expression=Tired]`,
  '[ENDIF]',
  '[IF heat > 70]',
  `[POSE worker pose=${pose} expression=Angry]`,
  '[ENDIF]',
  '[ENDIF]',
];

const poseBlock = () => [
  '# ---- §5 expression/pose grammar (last matching POSE wins) ----',
  ...(has.worker ? [
    ...workerMood(0, 'Work'),
    ...workerMood(1, 'Consume'),
    '# standingTall: single tax on and shared prosperity high',
    '[IF singleTax == 1]',
    '[IF shared > 60]',
    '[POSE worker pose=Work expression=Happy]',
    '[ENDIF]',
    '[ENDIF]',
  ] : []),
  ...(has.capitalist ? [
    '[POSE capitalist pose=Neutral expression=Neutral]',
    '# gleeful: the hoard is rising',
    '[IF hoard > hoardPrev]',
    '[POSE capitalist pose=Neutral expression=Happy]',
    '[ENDIF]',
    '# worried: education rising — he fears teachers, not mobs',
    '[IF education > 55]',
    '[POSE capitalist pose=Neutral expression=Confused]',
    '[ENDIF]',
    '# panicked: prestige shell cracking',
    '[IF education > 70]',
    '[IF propagandaCost > 3]',
    '[POSE capitalist pose=Neutral expression=Scared]',
    '[ENDIF]',
    '[ENDIF]',
  ] : []),
  ...(has.government ? [
    '[POSE government pose=Neutral expression=Neutral]',
    '[IF spine > 60]',
    '[POSE government pose=Neutral expression=Determined]',
    '[ENDIF]',
    '# collusion: jersey recolors toward the capitalist palette',
    '[IF spine < 30]',
    '[POSE government pose=Jersey expression=Neutral]',
    '[ENDIF]',
  ] : []),
  ...(has.military ? [
    '[POSE military pose=Neutral expression=Neutral]',
    '[IF aim > 60]',
    '[POSE military pose=Neutral expression=Angry]',
    '[ENDIF]',
  ] : []),
  '[SET hoardPrev = hoard]',
];

// ---------------------------------------------------------------- machine_main

const GAUGES = [
  ['health', 'HEALTH', 0, 100], ['crime', 'CRIME', 0, 100],
  ['hoard', 'HOARD', 0, 1000], ['shared', 'SHARED', 0, 100],
  ['climate', 'CLIMATE', 0, 100], ['population', 'POPULATION', 0, 100],
  ['innovation', 'INNOVATION', 0, 100], ['trust', 'TRUST', 0, 100],
];

const machineStage = () => [
  castEl(has.worker, 'worker', 'worker', 'WORKER', 26, 68, 2.2, 4, 'Work'),
  castEl(has.capitalist, 'capitalist', 'capitalist', 'CAPITALIST', 74, 42, 2.4, 3),
  ...(has.shell
    ? [{ id: 'shell', assetId: 'shell_asset', type: 'ACTOR', x: 74, y: 42, scale: 3.2, zIndex: 5, rotation: 0, opacity: 0.6, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0 }]
    : [balloon('shell', 'PRESTIGE SHELL', 74, 30, { zIndex: 5 })]),
  castEl(has.government, 'government', 'government', 'GOVERNMENT', 50, 48, 2.2, 3),
  castEl(has.military, 'military', 'military', 'MILITARY', 10, 62, 2.2, 3),
  ...(has.rifle
    ? [{ id: 'rifle', assetId: 'rifle_asset', type: 'ACTOR', x: 15, y: 58, scale: 1.3, zIndex: 4, rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0 }]
    : [balloon('rifle', 'RIFLE', 15, 58, { zIndex: 4 })]),
  balloon('works_label', 'THE WORKS', 20, 90),
  balloon('shop_label', 'THE SHOP', 74, 90),
  balloon('truth_1', 'TRUTH WINDOW', 38, 20, { zIndex: 8 }),
  balloon('truth_2', '—', 38, 27, { zIndex: 8 }),
  balloon('truth_3', '—', 38, 34, { zIndex: 8 }),
  balloon('truth_4', '—', 38, 41, { zIndex: 8 }),
  balloon('truth_5', '—', 38, 48, { zIndex: 8 }),
  balloon('news_ticker', 'THE MACHINE — STARTING UP', 50, 96, { zIndex: 9 }),
];

const machineScene = () => ({
  id: 'machine_main',
  name: 'The Machine',
  sceneType: 'AGENCY',
  dropId: null,
  stage: machineStage(),
  script: lines(
    '# ============ THE PERSONIFIED MACHINE (Design Addendum 01) ============',
    '# Five actors ARE the machine. Every coefficient is a c_* worldState var.',
    '',
    '# ---- the ledger: gauges across the top (§3) ----',
    GAUGES.map(([v, label, min, max], i) =>
      `[GAUGE ${v} at ${(6 + i * 12.5).toFixed(1)},8 min=${min} max=${max} label="${label}"]`),
    '',
    '# ---- player levers ----',
    '[SLIDER education at 93,30 min=0 max=100 label="EDUCATION"]',
    '[SLIDER squeeze at 93,46 min=0 max=100 label="SQUEEZE (sandbox)"]',
    '[SLIDER spine at 93,62 min=0 max=100 label="SPINE (sandbox)"]',
    '[BUTTON btn_singletax]',
    '[BUTTON btn_truth]',
    '[BUTTON btn_decide]',
    '',
    '# ---- flagship BINDs ----',
    '[BIND rifle.rotation to aim * 1.8]',
    '[BIND shell.opacity to prestige / 100]',
    '[BIND worker.x to workerX]',
    '[BIND truth_1.opacity to truthWindow]',
    '[BIND truth_2.opacity to truthWindow]',
    '[BIND truth_3.opacity to truthWindow]',
    '[BIND truth_4.opacity to truthWindow]',
    '[BIND truth_5.opacity to truthWindow]',
    '',
    '[IF introSeen == 0]',
    '[SET introSeen = 1]',
    'Narrator: "Five people ARE the machine. Watch the man in the flat cap: he makes everything — then walks to the shop, swaps hats, and buys it back at the fat man\'s price. Press TRUTH to see the arithmetic. Press DECIDE to act."',
    '[ENDIF]',
    '',
    '[TICK 500ms]',
    '[IF pauseSim == 0]',
    tickLedger(),
    '',
    tickChain(),
    '',
    tickEmigration(),
    '',
    tickWalk(),
    '',
    poseBlock(),
    '',
    '# ---- §2 recognition event: the flare-up trigger ----',
    '[IF recognition == 0]',
    '[IF education > 60]',
    '[IF heat > 70]',
    '[SET recognition = 1]',
    '[EFFECT glow on worker]',
    '[ENDIF]',
    '[ENDIF]',
    '[ENDIF]',
    '[IF recognition == 1]',
    '[IF recognitionSeen == 0]',
    '[SET recognitionSeen = 1]',
    '[SCENE witness_recognition]',
    '[ENDIF]',
    '[ENDIF]',
    '',
    truthLines(),
    '',
    tickNews(),
    '',
    '# ---- Narraton cadence: deal a witness scene when the state earns one ----',
    '[SET storyTimer = storyTimer + 1]',
    '[IF storyTimer > c_storyCooldown]',
    '[SET narratonGo = 0]',
    '[IF health < 25]',
    '[SET narratonGo = 1]',
    '[ENDIF]',
    '[IF crime > 70]',
    '[SET narratonGo = 1]',
    '[ENDIF]',
    '[IF aim > 60]',
    '[SET narratonGo = 1]',
    '[ENDIF]',
    '[IF spine < 30]',
    '[SET narratonGo = 1]',
    '[ENDIF]',
    '[IF narratonGo == 1]',
    '[SET storyTimer = 0]',
    '[NARRATON pool=machine_witness]',
    '[ENDIF]',
    '[ENDIF]',
    '[ENDIF]',
    '[/TICK]',
    '',
    '# the machine never ends on its own',
    '[WAIT 999999s]',
  ),
  status: 'work',
});

// ---------------------------------------------------------------- witness pool (§7)

const witness = (id, name, narraton, stage, ...body) => ({
  id, name, sceneType: 'WITNESS', dropId: null, stage,
  script: lines(...body, '[SCENE machine_main]'),
  narraton, status: 'work',
});

const witnessScenes = () => [
  witness('witness_recognition', 'Witness: Both Hats',
    { pool: 'machine_witness', requires: [{ variable: 'recognition', operator: '==', value: 1 }], repeatable: false, weight: 3 },
    [castEl(has.worker, 'worker', 'worker', 'WORKER', 50, 62, 2.6, 4, 'Work')],
    'Narrator: "Mid-stage, halfway between the works and the shop, the man stops. In one hand, the flat cap he wears to make everything. In the other, the boater he wears to buy it back."',
    say(has.worker, 'Worker', 'Surprised', 'Same hands. Same hands that made it, buying it back at his price...'),
    say(has.worker, 'Worker', 'Angry', 'There was never a worker AND a customer. There was only ever me — and the man taking a cut both times I pass his window.'),
    '[EFFECT glow on worker]',
    'Narrator: "He does not put either hat back on right away. That hesitation is the most dangerous thing in the world."',
  ),
  witness('witness_coinpass', 'Witness: The Coin Pass',
    { pool: 'machine_witness', requires: [{ variable: 'spine', operator: '<', value: 30 }], keys: { spine: { target: 0, scale: 100 } }, repeatable: true },
    [
      castEl(has.capitalist, 'capitalist', 'capitalist', 'CAPITALIST', 22, 60, 2.2, 3),
      castEl(has.government, 'government', 'government', 'GOVERNMENT', 50, 60, 2.2, 3),
      castEl(has.military, 'military', 'military', 'MILITARY', 78, 60, 2.2, 3),
      balloon('coin', '( $ )', 22, 42, { zIndex: 6 }),
    ],
    ...(has.government ? ['[POSE government pose=Jersey expression=Neutral]'] : []),
    say(has.capitalist, 'Capitalist', 'Happy', 'A small consideration, referee. For the upkeep of your whistle.'),
    '[MOVE coin to 50,42 over 1s]',
    '[WAIT 1s]',
    ...(has.government ? ['[POSE government pose=Jersey expression=Confused]'] : []),
    say(has.government, 'Government', 'Jersey/Confused', 'I merely hold it in trust. And pass along... operating expenses.'),
    '[MOVE coin to 78,42 over 1s]',
    '[WAIT 1s]',
    say(has.military, 'Military', 'Neutral', 'Orders received. Facing... adjusted.'),
    'Narrator: "Watch the jersey. It used to have stripes."',
  ),
  witness('witness_funeral', 'Witness: The Funeral',
    { pool: 'machine_witness', requires: [{ variable: 'health', operator: '<', value: 25 }], keys: { health: { target: 0, scale: 100 } }, repeatable: true },
    [castEl(has.worker, 'worker', 'worker', 'WORKER', 50, 62, 2.4, 4, 'Work')],
    say(has.worker, 'Worker', 'Tired', 'Third bell this month. The doctor costs a week\'s pay, so we buy the coffin instead. It\'s cheaper.'),
    'Narrator: "HEALTH lags the SQUEEZE. The gauge falls slowly, and then people fall all at once."',
  ),
  witness('witness_racket', 'Witness: The Racket',
    { pool: 'machine_witness', requires: [{ variable: 'crime', operator: '>', value: 70 }], keys: { crime: { target: 100, scale: 100 } }, repeatable: true },
    [castEl(has.worker, 'worker', 'worker', 'WORKER', 40, 62, 2.4, 4, 'Consume')],
    say(has.worker, 'Worker', 'Consume/Angry', 'The shop pays the racket, the racket pays the ward boss, the ward boss pays nobody. Heat has to go somewhere — and the schools are dark.'),
    'Narrator: "CRIME is HEAT multiplied by ignorance. Fund the school and watch this scene stop being dealt."',
  ),
  witness('witness_soldiers', 'Witness: Soldiers Face the Strikers',
    { pool: 'machine_witness', requires: [{ variable: 'aim', operator: '>', value: 60 }], keys: { aim: { target: 100, scale: 100 } }, repeatable: true },
    [
      castEl(has.military, 'military', 'military', 'MILITARY', 30, 62, 2.4, 3),
      castEl(has.worker, 'worker', 'worker', 'WORKER', 70, 62, 2.4, 4, 'Work'),
    ],
    ...(has.military ? ['[POSE military pose=Neutral expression=Angry]'] : []),
    say(has.worker, 'Worker', 'Angry', 'That rifle was bought with our taxes to point AWAY from us.'),
    say(has.military, 'Military', 'Angry', 'The rifle points where the spine bends. Take it up with the referee.'),
    'Narrator: "AIM is just 100 minus SPINE. Nothing personal. Arithmetic."',
  ),
];

// ---------------------------------------------------------------- agency scenes (§7)

const cons = (id, name, line, sets) => ({
  id, name, sceneType: 'WITNESS', dropId: null, stage: [],
  script: lines(sets, `Narrator: "${line}"`, '[SCENE machine_main]'),
  status: 'work',
});

const agency = (id, name, stage, thought, options) => ({
  id, name, sceneType: 'AGENCY', dropId: null, stage,
  script: lines(
    thought,
    '[CHOICE]',
    ...options.map(([text, target]) => `- "${text}" -> ${target}`),
    '[/CHOICE]',
  ),
  status: 'work',
});

const agencyScenes = () => [
  {
    id: 'agency_hub', name: 'Decisions', sceneType: 'AGENCY', dropId: null, stage: [],
    script: lines(
      'Narrator: "The machine holds its breath while you decide."',
      '[CHOICE]',
      '- "The school levy" -> agency_school',
      '- "The strike at the works" -> agency_strike',
      '- "The newspapers" -> agency_press',
      '- "Back to the machine" -> machine_main',
      '[/CHOICE]',
    ),
    status: 'work',
  },
  agency('agency_school', 'Decision: The School Levy',
    [castEl(has.government, 'government', 'government', 'GOVERNMENT', 50, 60, 2.4, 3)],
    has.government
      ? 'Government (thinking): "The levy sits on my desk. Fund the school and the man in the flat cap starts reading. Pocket it and the fat man remembers my birthday."'
      : 'Narrator (thinking): "The school levy sits on the desk. Fund it, or pocket it?"',
    [
      ['Fund the school', 'cons_fund_school'],
      ['Pocket the levy', 'cons_pocket_levy'],
    ]),
  agency('agency_strike', 'Decision: The Strike',
    [castEl(has.capitalist, 'capitalist', 'capitalist', 'CAPITALIST', 50, 60, 2.4, 3)],
    has.capitalist
      ? 'Capitalist (thinking): "They\'ve downed tools at the works. I could break it — the referee owes me. Or I could loosen the squeeze a notch. Loosen. The word tastes like vinegar."'
      : 'Narrator (thinking): "Tools are down at the works. Break the strike, or negotiate?"',
    [
      ['Break the strike', 'cons_break_strike'],
      ['Negotiate', 'cons_negotiate'],
    ]),
  agency('agency_press', 'Decision: The Newspapers',
    [castEl(has.capitalist, 'capitalist', 'capitalist', 'CAPITALIST', 50, 60, 2.4, 3)],
    has.capitalist
      ? 'Capitalist (thinking): "The papers want to print how the ledger really works. I could buy every masthead in town by Thursday. Or let them print — and let the shell take its chances."'
      : 'Narrator (thinking): "The papers want to print the ledger. Buy them, or let them print?"',
    [
      ['Buy the newspapers', 'cons_buy_press'],
      ['Let them print', 'cons_free_press'],
    ]),
  cons('cons_fund_school', 'Consequence: School Funded',
    'The school gets its roof, its books, and its dangerous habit of teaching arithmetic. EDUCATION +15.',
    ['[SET education = clamp(education + 15, 0, 100)]', '[SET hoard = hoard - 10]']),
  cons('cons_pocket_levy', 'Consequence: Levy Pocketed',
    'The levy vanishes into a friendly account. HOARD +10, TRUST -5, SPINE -5.',
    ['[SET hoard = hoard + 10]', '[SET trust = clamp(trust - 5, 0, 100)]', '[SET spine = clamp(spine - 5, 0, 100)]']),
  cons('cons_break_strike', 'Consequence: Strike Broken',
    'Clubs settle it by nightfall. HEAT +20, HOARD +10 — and the rifle drifts a degree inward.',
    ['[SET heat = clamp(heat + 20, 0, 100)]', '[SET hoard = hoard + 10]', '[SET spine = clamp(spine - 5, 0, 100)]']),
  cons('cons_negotiate', 'Consequence: Negotiated',
    'The squeeze loosens a notch. SQUEEZE -10, HEAT -10, TRUST +5.',
    ['[SET squeeze = clamp(squeeze - 10, 0, 100)]', '[SET heat = clamp(heat - 10, 0, 100)]', '[SET trust = clamp(trust + 5, 0, 100)]']),
  cons('cons_buy_press', 'Consequence: Press Bought',
    'Every masthead now agrees the machine is weather. PROPAGANDA up, TRUST +10, PRESTIGE +10.',
    ['[SET propagandaCost = propagandaCost + 5]', '[SET trust = clamp(trust + 10, 0, 100)]', '[SET prestige = clamp(prestige + 10, 0, 100)]']),
  cons('cons_free_press', 'Consequence: Free Press',
    'Thursday\'s edition prints the ledger, formulas and all. EDUCATION +10, PRESTIGE -10.',
    ['[SET education = clamp(education + 10, 0, 100)]', '[SET prestige = clamp(prestige - 10, 0, 100)]']),
];

// ---------------------------------------------------------------- menu

const menuScene = () => ({
  id: 'menu', name: 'Title', sceneType: 'AGENCY', dropId: null, stage: [],
  script: lines(
    'Narrator: "HUMANS VS BILLIONAIRES — THE MACHINE. Five people are the whole economy: a worker who is also the customer, a capitalist with the siphon, a referee with a price, a soldier with a rifle that rotates, and you."',
    '[CHOICE]',
    '- "Start the machine" -> machine_main',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ---------------------------------------------------------------- assemble

const game = {
  info: {
    title: 'Humans vs Billionaires — The Machine',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { ...WORLD, hoardPrev: 50, introSeen: 0 },
    // Which build this is. Stamped, never hand-edited -- see scripts/stamp.mjs.
    ...buildStamp(),
    gameMode: 'INTERACTIVE',
    titleSceneId: 'menu',
    enableAutosave: true,
    customPoses: ['Work', 'Consume', 'Jersey'],
    customExpressions: [],
  },
  actors,
  scenes: [menuScene(), machineScene(), ...witnessScenes(), ...agencyScenes()],
  drops: [],
  items: [],
  sfx: [
    { id: 'glow', name: 'Recognition Glow', type: 'glow', category: 'ATTACH', params: { intensity: 70 }, status: 'work' },
    { id: 'shake', name: 'Crisis Shake', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
  ],
  buttons: [
    { id: 'btn_singletax', name: 'Single Tax', label: 'SINGLE TAX', x: 2, y: 76, width: 14, height: 7, effects: [{ variable: 'singleTax', value: '1 - singleTax' }], style: 'primary', status: 'work' },
    { id: 'btn_truth', name: 'Truth Window', label: 'TRUTH', x: 2, y: 86, width: 14, height: 7, effects: [{ variable: 'truthWindow', value: '1 - truthWindow' }], style: 'default', status: 'work' },
    { id: 'btn_decide', name: 'Decide', label: 'DECIDE', x: 84, y: 86, width: 14, height: 7, targetSceneId: 'agency_hub', style: 'danger', status: 'work' },
  ],
  quotes,
  quoteTriggers,
  episodes: [
    {
      id: 'ep_machine',
      name: 'The Personified Machine',
      description: 'Five actors are the machine: ledger, hat-swap, heat/spine/aim, quotes, Narraton.',
      sceneIds: ['menu', 'machine_main', 'witness_recognition', 'witness_coinpass', 'witness_funeral', 'witness_racket', 'witness_soldiers', 'agency_hub', 'agency_school', 'agency_strike', 'agency_press', 'cons_fund_school', 'cons_pocket_levy', 'cons_break_strike', 'cons_negotiate', 'cons_buy_press', 'cons_free_press'],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'hvb-machine.json');
writeFileSync(outPath, JSON.stringify(game) + '\n', 'utf8');
const mb = (JSON.stringify(game).length / 1024 / 1024).toFixed(1);
const missing = Object.entries(has).filter(([, v]) => !v).map(([k]) => k);
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes, ${game.actors.length} actors)`);
console.log(`Quotes: ${quoteSource}; ${quoteTriggers.length} triggers`);
console.log(missing.length ? `Art fallbacks (balloons): ${missing.join(', ')}` : 'Art: all 8 pieces present');
console.log('Play: http://localhost:8080/theater?game=/hvb-machine.json');
