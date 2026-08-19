// Builds public/hvb-william.json — the standalone WILLIAM THE CONQUEROR
// (1066) chapter game of Humans vs Billionaires. Content sourced from
// docs/HVB_RESEARCH.md, Chapter 1 only. Disputed quotes stay framed as
// chronicler claims (Orderic Vitalis).
//
// Art: art-demo/william_*.png (court set) + art-demo/william/*.png
// (chapter set, from scripts/chapters/gen-william.mjs). Robust to
// missing art files: absent graphics/backdrops are skipped gracefully.
//
// Run:  node scripts/chapters/build-william.mjs
// Play: http://localhost:8080/theater?game=/hvb-william.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  machineHubScene,
  WORLD_BASE,
  ACTORS as CORE_ACTORS,
  SFX as CORE_SFX,
} from '../machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const lines = (...xs) => xs.flat().join('\n');

// ---- art loading (skip gracefully when a file is missing) ----------------

const art = (...rel) => {
  const p = resolve(root, 'art-demo', ...rel);
  if (!existsSync(p)) {
    console.warn(`  (missing art: art-demo/${rel.join('/')} — skipped)`);
    return null;
  }
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
};

const graphic = (id, pose, expression, image) =>
  image ? [{ id, pose, expression, angle: 0, image }] : [];

const mkActor = (id, name, graphics) =>
  graphics.length ? { id, name, graphics, status: 'work' } : null;

const mkDrop = (id, name, image) =>
  image ? { id, name, image, status: 'work' } : null;

// ---- actors --------------------------------------------------------------

const actors = [
  mkActor('william_king', 'William', [
    ...graphic('william_g', 'Neutral', 'Neutral', art('william_king.png')),
    ...graphic('william_angry_g', 'Neutral', 'Angry', art('william', 'william_angry.png')),
    ...graphic('william_point_g', 'Pointing', 'Angry', art('william', 'william_pointing_angry.png')),
    ...graphic('william_sit_g', 'Sit', 'Sad', art('william', 'william_sit_sad.png')),
  ]),
  mkActor('william_odo', 'Odo', [
    ...graphic('odo_g', 'Neutral', 'Neutral', art('william_odo.png')),
    ...graphic('odo_point_g', 'Pointing', 'Smug', art('william', 'odo_pointing_smug.png')),
  ]),
  mkActor('hereward', 'Hereward', [
    ...graphic('hereward_g', 'Neutral', 'Neutral', art('william', 'hereward.png')),
    ...graphic('hereward_attack_g', 'Attack', 'Determined', art('william', 'hereward_attack.png')),
  ]),
  mkActor('peasant', 'Aldric', graphic('peasant_g', 'Neutral', 'Neutral', art('william', 'peasant.png'))),
  mkActor('orderic', 'Orderic', graphic('orderic_g', 'Neutral', 'Neutral', art('william', 'orderic.png'))),
  mkActor('crowd', 'The Village', [
    ...graphic('crowd_calm_g', 'Neutral', 'Neutral', art('william', 'crowd_calm.png')),
    ...graphic('crowd_angry_g', 'Attack', 'Angry', art('william', 'crowd_angry.png')),
  ]),
].filter(Boolean);

const haveActor = (assetId) => actors.some((a) => a.id === assetId);

// ---- drops ---------------------------------------------------------------

const drops = [
  mkDrop('wm_hall', 'Norman Great Hall', art('william_hall.png')),
  mkDrop('wm_village', 'Burning Northern Village', art('william', 'burning_village.png')),
  mkDrop('wm_salisbury', 'The Field at Salisbury', art('william', 'salisbury_field.png')),
  mkDrop('wm_ely', 'The Fens of Ely', art('william', 'ely_fens.png')),
  mkDrop('wm_scriptorium', 'The Scriptorium', art('william', 'scriptorium.png')),
  mkDrop('wm_rouen', 'The Chamber at Rouen', art('william', 'rouen_chamber.png')),
  mkDrop('wm_motte_drop', 'The Motte Rises', art('william', 'motte_castle.png')),
].filter(Boolean);

const dropId = (id, fallback = null) =>
  drops.some((d) => d.id === id) ? id : fallback && drops.some((d) => d.id === fallback) ? fallback : null;

// ---- stage helpers -------------------------------------------------------

const el = (id, assetId, x, y, { scale = 2.4, pose = 'Neutral', expression = 'Neutral' } = {}) =>
  haveActor(assetId)
    ? [{ id, assetId, type: 'ACTOR', x, y, scale, zIndex: 3, rotation: 0, pose, expression, spriteAngle: 0 }]
    : [];

// Emit a [POSE] line only when the actor really has that exact
// pose/expression graphic — the renderer needs an exact triple match and
// silently falls back to the first graphic on a miss, so a POSE without
// its sprite is noise. POSE targets the STAGE ELEMENT id, not the actor id.
const poseCmd = (elementId, actorId, pose, expression) => {
  const a = actors.find((x) => x.id === actorId);
  const hit = a?.graphics.some((g) => g.pose === pose && g.expression === expression && g.angle === 0);
  if (!hit) {
    console.warn(`  (no ${pose}/${expression} sprite for ${actorId} — POSE on ${elementId} skipped)`);
    return [];
  }
  return [`[POSE ${elementId} pose=${pose} expression=${expression}]`];
};

const GAUGE = '[GAUGE ruthless at 88,84 min=0 max=4 label="RUTHLESSNESS"]';

const balloon = (id, text, x, y, { scale = 1, zIndex = 5 } = {}) => [
  { id, assetId: '', type: 'BALLOON', x, y, scale, zIndex, rotation: 0, text, balloonType: 'SPEECH' },
];

// ---- sfx (campaign taxonomy) ---------------------------------------------

const sfx = [
  { id: 'flame_burn', name: 'Flame', type: 'flame', category: 'ATTACH', params: { intensity: 80 }, status: 'work' },
  { id: 'shake_all', name: 'Crisis Shake', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
  { id: 'gold_glow', name: 'Gold Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
  { id: 'electric_flare', name: 'Electric Flare', type: 'electric', category: 'ATTACH', params: { intensity: 70 }, status: 'work' },
];

// ---- scenes --------------------------------------------------------------

const scenes = [];

// 1. The court, winter 1069 — news of the northern rising.
scenes.push({
  id: 'wm_court',
  name: 'The Court of the Conqueror',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('c_william', 'william_king', 32, 62),
    ...el('c_odo', 'william_odo', 70, 63),
    ...balloon('crown_sign', 'ENGLAND, WINTER 1069', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    '[SET ruthless = 0]',
    '[SET spared = 0]',
    '[EFFECT gold_glow on c_william]',
    'Narrator: "HUMANS VS BILLIONAIRES — Chapter 1: WILLIAM THE CONQUEROR. Three years after Hastings, the conquest is still not paid for."',
    'Odo: "Ill news, brother. The Danes have landed in the Humber. York has risen around Edgar Aetheling, and the garrison castles are ash."',
    'William: "Twice I have raised castles at York. Twice the shire has burned them down around my men."',
    'Odo: "The North will not be held by castles alone, sire. The rebels eat from the same fields that feed the rebellion."',
    'William: "Then the fields themselves are the enemy\'s armory. There is a remedy for that, and every man in this hall knows its name."',
    'Narrator: "The order under consideration: a scorched-earth winter campaign across Yorkshire — villages, food stores, livestock. The chroniclers will call it the Harrying of the North."',
    'Narrator: "Your choices will move the RUTHLESSNESS gauge. The gauge decides what kind of ending this king deserves."',
    '[CHOICE]',
    '- "Give the order — harry the North into famine" -> wm_order',
    '- "Refuse the order — hold the knights back" -> wm_refuse',
    '- "Voices of the Conquest — hear the witnesses" -> wm_hub',
    '- "Witness: The Burning of the North" -> wm_cut_burning',
    '- "Witness: The Book" -> wm_cut_book',
    '- "Enter the Machine" -> wm_machine',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 1b. The order branch — given gladly. +2 ruthless.
scenes.push({
  id: 'wm_order',
  name: 'The Order Given',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('o_william', 'william_king', 32, 62),
    ...el('o_odo', 'william_odo', 70, 63),
  ],
  script: lines(
    '[SET ruthless = ruthless + 2]',
    GAUGE,
    ...poseCmd('o_william', 'william_king', 'Pointing', 'Angry'),
    '[EFFECT shake_all on stage]',
    'William: "Burn it. From York to Durham, from the Ouse to the Tees — the granaries, the byres, the ploughs, the seed corn. Leave nothing a rebel can eat."',
    'Odo: "And the people, sire?"',
    'William: "The people ARE the rebellion. A field that cannot feed a man cannot feed an army. See it done before the thaw."',
    'Narrator: "The order goes north with the knights. No one in the hall speaks against it — counsel costs land, and land is the only currency here."',
    '[CHOICE]',
    '- "Ride north with the order" -> wm_harrying',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 2. The refusal branch — counsel overridden, history proceeds.
scenes.push({
  id: 'wm_refuse',
  name: 'The Counsel Refused',
  sceneType: 'AGENCY',
  dropId: dropId('wm_salisbury'),
  stage: [
    ...el('r_william', 'william_king', 30, 62),
    ...el('r_odo', 'william_odo', 68, 63),
  ],
  script: lines(
    'Narrator: "You counsel mercy. For a moment, the order is not given."',
    'Odo: "Sire, the barons murmur. Every week the North stands, another shire wonders whether the king can be defied."',
    'William: "And every village that feeds a rebel feeds the next rebellion. Mercy is a rent I cannot collect."',
    'Narrator: "This is the machine\'s logic: repression is cheaper than losing the rent. In the history we actually have, no such refusal survived the winter."',
    ...poseCmd('r_william', 'william_king', 'Pointing', 'Angry'),
    'William: "Enough. Burn it. Burn all of it, from York to Durham."',
    '[EFFECT shake_all on stage]',
    GAUGE,
    'Narrator: "The counsel is overridden. The order goes north with the knights."',
    '[CHOICE]',
    '- "Ride north with the order" -> wm_harrying',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 3. The Harrying — burning village, winter 1069-70.
scenes.push({
  id: 'wm_harrying',
  name: 'The Harrying of the North',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('h_william', 'william_king', 26, 60, { expression: 'Angry' }),
    ...el('h_peasant', 'peasant', 72, 64),
    ...balloon('h_granary', 'THE GRANARY', 55, 26, { scale: 0.8 }),
    ...balloon('h_byre', 'THE BYRE', 86, 30, { scale: 0.8 }),
    ...balloon('h_sign', 'YORKSHIRE, WINTER 1069', 18, 10, { scale: 0.9 }),
  ],
  script: lines(
    '[POSE h_william pose=Neutral expression=Angry]',
    GAUGE,
    '[EFFECT flame_burn on h_granary]',
    '[EFFECT flame_burn on h_byre]',
    '[EFFECT shake_all on stage]',
    '[SET ash = 0]',
    '[BIND h_sign.opacity to 1 - ash / 300]',
    '[TICK 1s]',
    '[SET ash = clamp(ash + 12, 0, 200)]',
    '[/TICK]',
    'Narrator: "Norman columns move village to village. Crops, stores, and livestock burn so that nothing can feed a rebel — or anyone else."',
    'Aldric: "The seed corn too, lord? If the seed corn burns, there is no harvest next year. There is no year after that at all."',
    'William: "The North rebelled twice. It will not have the strength to rebel a third time."',
    'Aldric: "We did not rise, lord. We only lived here."',
    '[IF ruthless >= 2]',
    'William: "I gave this order with my own mouth, and I would give it again. Write that down, if any of you can write."',
    '[ENDIF]',
    '[IF ruthless < 2]',
    'Narrator: "You counseled mercy in the hall. The fires burn anyway. In this machine, one refusal changes the king\'s conscience, not the king\'s arithmetic."',
    '[ENDIF]',
    'Narrator: "Famine follows the fires through the winter. Orderic Vitalis will claim more than a hundred thousand dead — a chronicler\'s round number; modern historians accept a catastrophe in the tens of thousands."',
    'Narrator: "Symeon of Durham will write that no village remained inhabited between York and Durham. Seventeen years later, the king\'s own survey will still mark two-thirds of Yorkshire \'vasta\' — waste."',
    '[WAIT 1s]',
    'Narrator: "Ahead lies the next village: Aldric\'s. The column awaits the word."',
    '[CHOICE]',
    '- "Press on — this village burns like the rest" -> wm_press',
    '- "Spare this one village" -> wm_spare',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 3b. Press on — Aldric's village burns. +1 ruthless.
scenes.push({
  id: 'wm_press',
  name: 'No Exceptions',
  sceneType: 'AGENCY',
  dropId: dropId('wm_village'),
  stage: [
    ...el('p_william', 'william_king', 26, 60, { expression: 'Angry' }),
    ...el('p_peasant', 'peasant', 72, 64),
    ...balloon('p_roof', 'THE LAST ROOF', 60, 24, { scale: 0.8 }),
  ],
  script: lines(
    '[SET ruthless = ruthless + 1]',
    GAUGE,
    ...poseCmd('p_william', 'william_king', 'Pointing', 'Angry'),
    '[EFFECT flame_burn on p_roof]',
    '[EFFECT shake_all on stage]',
    'William: "No exceptions. An exception is a story, and stories travel faster than knights."',
    'Aldric: "Lord — the children are under that roof."',
    'William: "Then they had best come out of it."',
    'Narrator: "The village burns like the rest. In the spring, the survey teams will write one word next to its name: vasta."',
    '[CHOICE]',
    '- "On south, past the new castle" -> wm_motte',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 3c. Spare this one — a story the machine cannot collect.
scenes.push({
  id: 'wm_spare',
  name: 'The Spared Village',
  sceneType: 'AGENCY',
  dropId: dropId('wm_village'),
  stage: [
    ...el('sp_william', 'william_king', 26, 60),
    ...el('sp_peasant', 'peasant', 72, 64),
  ],
  script: lines(
    '[SET spared = 1]',
    GAUGE,
    'William: "Pass this one by. One granary standing between York and Durham. Call it... an experiment."',
    'Aldric: "God keep you, lord. God keep you."',
    'William: "God had nothing to do with it, farmer. Feed no rebels, and I will not have been wrong."',
    'Narrator: "One village eats this winter. The chronicles will not record its name — mercy leaves a thinner paper trail than fire. But Aldric will remember."',
    '[CHOICE]',
    '- "On south, past the new castle" -> wm_motte',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 3d. The motte — a castle rises over razed houses.
scenes.push({
  id: 'wm_motte',
  name: 'The Motte Rises',
  sceneType: 'WITNESS',
  dropId: dropId('wm_motte_drop', 'wm_village'),
  stage: [
    ...el('m_odo', 'william_odo', 30, 62),
    ...el('m_peasant', 'peasant', 72, 64),
    ...balloon('m_sign', 'A CASTLERY, 1070', 82, 10, { scale: 0.9 }),
  ],
  script: lines(
    GAUGE,
    'Narrator: "Where the houses stood, earth is heaped into a motte. English hands dig it; a Norman keep will crown it. Some five hundred castles rise in a generation — the conquest, poured in timber and soil."',
    ...poseCmd('m_odo', 'william_odo', 'Pointing', 'Smug'),
    'Odo: "You see the genius of it? The castle is not built to keep armies out. It is built to keep the rent coming in."',
    '[IF spared == 1]',
    'Aldric: "My village still stands, your grace. We paid our geld from a full granary. Does that please the king?"',
    'Odo: "It proves the king\'s point, farmer. A fed village pays better than a burned one. A pity the lesson came after the torch."',
    '[ENDIF]',
    '[IF ruthless >= 3]',
    'Aldric: "They make us dig the mound ourselves, over our own floors. My father\'s hearth is under my feet."',
    'Odo: "And your children\'s rent will keep the tower above it. That is what forever looks like, farmer."',
    '[ENDIF]',
    '[IF ruthless <= 1]',
    'Odo: "The king hesitated once, they say. The castles did not. Stone does not need to be ruthless — only present."',
    '[ENDIF]',
    '[CHOICE]',
    '- "Follow the survivors into the fens" -> wm_fens',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4. Hereward in the fens — witness scene.
scenes.push({
  id: 'wm_fens',
  name: 'Ely Holds',
  sceneType: 'WITNESS',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('f_hereward', 'hereward', 38, 62),
    ...balloon('f_sign', 'THE ISLE OF ELY, 1070', 78, 12, { scale: 0.9 }),
  ],
  script: lines(
    'Narrator: "Not everyone starves quietly. In the fens of Ely, the water itself is a wall."',
    'Hereward: "The Normans have maps of every road in England. There are no roads here. There is mud, and reed, and men who know which tussock holds a man\'s weight."',
    'Hereward: "They burned the North so no one could feed a rebel. Out here the eels feed us, and the marsh does not swear oaths to any king."',
    'Narrator: "Hereward the Wake — part fact, part legend — holds the Isle of Ely with Anglo-Saxon rebels through 1071. The chronicles remember him because resistance, too, gets written down."',
    ...poseCmd('f_hereward', 'hereward', 'Attack', 'Determined'),
    'Hereward: "Ely holds. Tell them that in Winchester. Ely holds."',
    '[EFFECT electric_flare on f_hereward]',
    '[WAIT 1s]',
    '[CLEAR_EFFECT electric_flare from f_hereward]',
    'Narrator: "In Winchester the king weighs the isle. Three ways in, and every one of them is a policy."',
    GAUGE,
    '[CHOICE]',
    '- "Assault the isle — build the great causeway" -> wm_ely_assault',
    '- "Starve it out — blockade the fens" -> wm_ely_starve',
    '- "Offer terms to the rebels" -> wm_ely_terms',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4b. Ely: the assault. +1 ruthless.
scenes.push({
  id: 'wm_ely_assault',
  name: 'The Causeway',
  sceneType: 'AGENCY',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('ea_hereward', 'hereward', 36, 62, { pose: 'Attack', expression: 'Determined' }),
    ...el('ea_william', 'william_king', 76, 61, { expression: 'Angry' }),
  ],
  script: lines(
    '[SET ruthless = ruthless + 1]',
    GAUGE,
    ...poseCmd('ea_william', 'william_king', 'Pointing', 'Angry'),
    '[EFFECT shake_all on stage]',
    'William: "Build the causeway. Two miles of timber and stone and inflated hides, straight across the black water. The marsh is an accounting problem."',
    'Narrator: "The first causeway collapses under the weight of armored knights; the fen swallows men whole. Legend adds a hired witch on a wooden tower, and Hereward burning the whole works around her."',
    'Hereward: "Come across, Frenchmen! The eels are patient, and so are we!"',
    'William: "Build it again. I did not cross the sea to be stopped by mud."',
    'Narrator: "In the end it is not the causeway that takes the isle — the monks of Ely, their lands squeezed, show the king a safe path. The garrison is mutilated or imprisoned. Hereward slips into the fen-mist, and into legend."',
    '[CHOICE]',
    '- "Fifteen years pass — to the scriptorium" -> wm_domesday',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4c. Ely: the blockade. +1 ruthless.
scenes.push({
  id: 'wm_ely_starve',
  name: 'The Blockade',
  sceneType: 'AGENCY',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('es_hereward', 'hereward', 36, 62),
    ...el('es_odo', 'william_odo', 76, 62),
  ],
  script: lines(
    '[SET ruthless = ruthless + 1]',
    GAUGE,
    ...poseCmd('es_odo', 'william_odo', 'Pointing', 'Smug'),
    'Odo: "No assault. Ring the fens with boats and patrols and let arithmetic do the fighting. An island is only a larder with a moat."',
    'Narrator: "The same logic as the Harrying, at a slower burn: cut the food, wait for the body to fail. The fen feeds its own — eels, fowl, fish — but the abbey\'s estates outside the water are hostage."',
    'Hereward: "They cannot starve the marsh. But they can starve the monks who own it — watch which surrender comes first."',
    'Narrator: "The monks of Ely, their revenues strangled, treat with the king and show his men the safe path in. The isle falls without a battle worth the name. Hereward slips into the mist, and into legend."',
    '[CHOICE]',
    '- "Fifteen years pass — to the scriptorium" -> wm_domesday',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4d. Ely: terms offered — the cheap mercy of a good bookkeeper.
scenes.push({
  id: 'wm_ely_terms',
  name: 'Terms for the Isle',
  sceneType: 'AGENCY',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('et_hereward', 'hereward', 36, 62),
    ...el('et_william', 'william_king', 76, 61),
  ],
  script: lines(
    GAUGE,
    'William: "Send an envoy. Lands restored to any rebel who swears — the fen war costs me more silver than the fen is worth."',
    'Hereward: "Swear to the man who made Yorkshire a graveyard? Tell your king the marsh has heard Norman oaths before."',
    'Narrator: "Some English lords do take terms and keep their lands — at double relief and a Norman overlord. The machine prefers a paying tenant to a dead rebel, when the price is right."',
    'Hereward: "Ely holds a while longer. And when it falls — and isles do fall — it will not be because we knelt cheap."',
    'Narrator: "The monks of Ely settle first, as owners do, and show the king the causeway path. The isle passes into the survey with its rents intact. Mercy, it turns out, was also a rate."',
    '[CHOICE]',
    '- "Fifteen years pass — to the scriptorium" -> wm_domesday',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 5. The Domesday scriptorium — TICK-driven survey ticker.
scenes.push({
  id: 'wm_domesday',
  name: 'The Domesday Scriptorium',
  sceneType: 'WITNESS',
  dropId: dropId('wm_scriptorium'),
  stage: [
    ...el('d_odo', 'william_odo', 28, 62),
    ...el('d_orderic', 'orderic', 68, 63),
    ...balloon('survey_ticker', 'THE SURVEY BEGINS...', 50, 10, { scale: 1.0 }),
    ...balloon('d_book', 'THE KING\'S BOOK', 50, 40, { scale: 0.7 }),
  ],
  script: lines(
    '[SET hides = 0]',
    '[SET wave = 0]',
    '[BIND d_book.scale to 0.7 + hides / 26000]',
    '[TICK 2s]',
    '[SET hides = clamp(hides + 650, 0, 13000)]',
    '[SET wave = wave + 1]',
    '[IF wave == 1]',
    '[SET_TEXT survey_ticker "SURVEY, 1086: {hides} PLACES RECORDED — EVERY HOLDER, EVERY HIDE"]',
    '[ENDIF]',
    '[IF wave == 2]',
    '[SET_TEXT survey_ticker "THE KING\'S BOOK KNOWS EVERY OX AND ACRE"]',
    '[ENDIF]',
    '[IF wave == 3]',
    '[SET_TEXT survey_ticker "GELD RAISED AGAIN — SHERIFFS RIDE TO COLLECT"]',
    '[ENDIF]',
    '[IF wave == 4]',
    '[SET_TEXT survey_ticker "NEW FOREST CLEARED — COMMONERS BARRED FROM THE WOOD"]',
    '[ENDIF]',
    '[IF wave == 5]',
    '[SET_TEXT survey_ticker "TWO-THIRDS OF YORKSHIRE STILL MARKED VASTA — WASTE"]',
    '[SET wave = 0]',
    '[ENDIF]',
    '[/TICK]',
    '[GAUGE hides at 12,80 min=0 max=13000 label="PLACES SURVEYED"]',
    'Narrator: "1086. Royal commissioners fan out to survey every hide of land in England — more than thirteen thousand places, their holders, and their taxable value, so nothing escapes render."',
    'Odo: "Each entry is a rent fixed forever. The English call it the Domesday Book — the day of judgment, from which there is no appeal."',
    'Orderic: "I was born here, of an English mother, the year the survey was still smoke and rumor. A monk writes what he sees: the plough follows the pen now, not the other way round."',
    ...poseCmd('d_odo', 'william_odo', 'Pointing', 'Smug'),
    'Odo: "The pen is cheaper than the torch, little brother, and collects more."',
    'Orderic: "The torch came first, your grace. The pen only counts what the torch left standing."',
    '[IF spared == 1]',
    'Orderic: "There is one village in the Yorkshire returns with a full granary and a paid geld. The commissioners queried it twice as an error."',
    'Odo: "Mercy always looks like an error in a ledger. That is why there is so little of it."',
    '[ENDIF]',
    '[IF ruthless >= 3]',
    'Orderic: "And page after page in the northern returns says only \'vasta.\' Waste. A word doing the work of ten thousand funerals."',
    '[ENDIF]',
    '[WAIT 2s]',
    '[CHOICE]',
    '- "To the oath at Salisbury" -> wm_salisbury',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 6. The Oath of Salisbury, 1086.
scenes.push({
  id: 'wm_salisbury',
  name: 'The Oath of Salisbury',
  sceneType: 'WITNESS',
  dropId: dropId('wm_salisbury'),
  stage: [
    ...el('s_william', 'william_king', 34, 60),
    ...el('s_odo', 'william_odo', 70, 63),
    ...balloon('s_sign', 'SALISBURY, 1086', 15, 10, { scale: 0.9 }),
  ],
  script: lines(
    '[EFFECT gold_glow on s_william]',
    'Narrator: "The survey done, William summons the landholders of England to Salisbury to swear fealty directly to him — over the heads of their own lords."',
    'William: "Fewer than two hundred men hold England of me. I keep a fifth of it myself; the Church a quarter. Every acre in the book, every man on the acre — held of the king."',
    'Odo: "Swear the oath: all land is held of the king. There is no allod, no free earth, nothing outside the system."',
    'Narrator: "Anglo-Saxon lords are dispossessed; their tenants pay new Norman lords. Conquest has been converted into a permanent rent system — the machine this whole game is about."',
    'William: "Hastings was one afternoon. This — this is forever."',
    '[CHOICE]',
    '- "September 1087 — Rouen" -> wm_deathbed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 7. The deathbed — the disputed confession, framed as Orderic's invention.
scenes.push({
  id: 'wm_deathbed',
  name: 'The Deathbed at Rouen',
  sceneType: 'WITNESS',
  dropId: dropId('wm_rouen', 'wm_hall'),
  stage: [
    ...el('e_william', 'william_king', 30, 63, { pose: 'Sit', expression: 'Sad', scale: 2.2 }),
    ...el('e_orderic', 'orderic', 70, 62),
    ...balloon('e_sign', 'ROUEN, SEPTEMBER 1087', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    GAUGE,
    ...poseCmd('e_william', 'william_king', 'Sit', 'Sad'),
    'Narrator: "9 September 1087. William lies dying near Rouen, his intestines ruptured against the saddle pommel when his horse threw him. What happens next depends on who is holding the pen."',
    'William: "Six weeks I have lain here listening to my own bells. A king has time, at the end, to do sums."',
    'Orderic: "Decades later, in my Ecclesiastical History, I gave the dying king a speech. Understand what I am about to read to you: I wrote it. Historians like David Bates judge it my invention, not his words."',
    'Orderic: "I have him say: \'I treated the native inhabitants of the kingdom with unreasonable severity... and caused the death of thousands by starvation and war, especially in Yorkshire.\'"',
    'Orderic: "And: \'In mad fury I descended on the English of the north like a raging lion.\' And: \'I tremble, my friends, when I reflect on the grievous sins which burden my conscience.\'"',
    '[IF ruthless >= 3]',
    'William: "If your speech is invented, monk, it is invented from true figures. I burned the seed corn. Kings are remembered by their totals."',
    '[ENDIF]',
    '[IF ruthless < 3]',
    'William: "You will put words in my mouth, monk. Put this one in too: once — once — I passed a village by, and nothing broke. I have wondered about that ever since."',
    '[ENDIF]',
    'Narrator: "What is documented: on his deathbed he released prisoners and pardoned enemies, including his half-brother Odo. Then, Orderic reports, his attendants stripped the room and fled, leaving the body almost naked on the floor."',
    'Orderic: "The Anglo-Saxon Chronicle needed no invented speech. It wrote simply: \'Truly, in his time men had much oppression and many injuries.\'"',
    '[WAIT 1s]',
    '[IF ruthless >= 3]',
    '[CHOICE]',
    '- "To the funeral at Caen" -> wm_funeral',
    '[/CHOICE]',
    '[ENDIF]',
    '[IF ruthless < 3]',
    '[CHOICE]',
    '- "Out of the chamber, into the greenwood" -> wm_coda',
    '[/CHOICE]',
    '[ENDIF]',
  ),
  status: 'work',
});

// 8a. HIGH-RUTHLESSNESS ENDING — the funeral at Caen, and the body's answer.
scenes.push({
  id: 'wm_funeral',
  name: 'The Funeral at Caen',
  sceneType: 'WITNESS',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('fu_orderic', 'orderic', 34, 62),
    ...el('fu_odo', 'william_odo', 70, 63),
    ...balloon('fu_sign', 'SAINT-ETIENNE, CAEN, 1087', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    'Narrator: "ENDING: THE TOTAL. The king who burned the North is carried to the abbey he built at Caen — and even his funeral is an extraction dispute."',
    'Orderic: "A man named Ascelin stood up in the church and cried that the very ground of the grave was stolen from his father. The service halted while the bishops counted out silver for the plot. Silver, at the graveside, for the grave."',
    'Narrator: "Then the bearers forced the swollen body into a stone sarcophagus cut too small. The corpse burst. Orderic records the stench driving the mourners from the church, incense helpless against it."',
    '[EFFECT shake_all on stage]',
    'Odo: "Finish the rite. Whatever the nose says, the ledger is immaculate: two hundred men hold England, and every acre of it is held of a dead king\'s heirs."',
    'Orderic: "He conquered a kingdom, counted it to the last ox, and could not in the end be fitted into his own coffin. Let the reader make of the arithmetic what they will."',
    'Narrator: "The extraction system did not die with him. It hardened into English feudalism, and its heirs are still collecting. That is why this chapter is first."',
    '[WAIT 1s]',
    '[CHOICE]',
    '- "Play the chapter again" -> wm_court',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 8b. LOW-RUTHLESSNESS ENDING — the greenwood coda, Charter of the Forest.
scenes.push({
  id: 'wm_coda',
  name: 'The Greenwood Coda',
  sceneType: 'WITNESS',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('co_peasant', 'peasant', 34, 63),
    ...el('co_orderic', 'orderic', 70, 62),
    ...balloon('co_sign', 'THE FOREST EDGE', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    'Narrator: "ENDING: THE SEED CORN. A quieter reckoning. The king is buried at Caen; the machine he built keeps collecting. But you were not only its instrument — and neither was everyone else."',
    'Aldric: "My grandchildren keep pigs at the wood\'s edge, where the king\'s New Forest law says no commoner may. They go in anyway, at dusk. The wood does not report them."',
    'Orderic: "Every mercy you chose was small, and none of them stopped the conquest. But small mercies are how people remember that the law was once otherwise — and could be otherwise again."',
    'Narrator: "In 1217, a hundred and thirty years after William\'s death, the Charter of the Forest will be sealed: commoners\' rights to wood, pasture, and pannage restored — the first great clawback from the conquest machine."',
    'Aldric: "One granary they did not burn. One charter they could not refuse. It is not victory. It is seed corn."',
    'Orderic: "And seed corn, as any farmer in Yorkshire could have told the king, is the one thing you must never burn."',
    '[EFFECT gold_glow on co_peasant]',
    '[WAIT 1s]',
    '[CHOICE]',
    '- "Play the chapter again" -> wm_court',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ==========================================================================
// REACTION LAYER — "Voices of the Conquest": ~100 episode vignettes.
// Data-driven: EVENTS x RESPONDERS, plus defiant/resigned stance variants
// for the human responders on the four harshest events. Every vignette
// carries narraton metadata (pool 'william_reactions') keyed to the
// event's economic state per HVB_RESEARCH.md gates, so the campaign
// machine can later select them as commentary. First-pass prose for Doug
// to edit; disputed facts stay framed as chronicler claims.
// ==========================================================================

const RPOOL = 'william_reactions';
const HARSH = new Set(['coronation', 'harrying', 'burning', 'famine']);

// Narraton keys follow the research gates: the Harrying chain wants
// repression high + flare-ups; Domesday/Salisbury/forest are greed/rent
// states; the early events sit lower on both axes.
const EVENTS = [
  { id: 'pevensey', name: 'The Landing at Pevensey', sign: 'PEVENSEY, 28 SEPTEMBER 1066',
    drop: ['wm_salisbury', null],
    intro: '28 September 1066. The Norman fleet lands unopposed at Pevensey while Harold\'s army is far to the north. Who speaks?',
    keys: { greed: { target: 50, scale: 60 }, flareUps: { target: 1, scale: 4 } } },
  { id: 'hastings', name: 'Hastings', sign: 'SENLAC RIDGE, 14 OCTOBER 1066',
    drop: ['wm_salisbury', null],
    intro: '14 October 1066. Nine hours on Senlac ridge end with Harold dead and England\'s door broken open. Who speaks?',
    keys: { repression: { target: 60, scale: 50 }, flareUps: { target: 2, scale: 5 } } },
  { id: 'coronation', name: 'The Coronation Riot', sign: 'WESTMINSTER, CHRISTMAS DAY 1066',
    drop: ['wm_hall', null],
    intro: 'Christmas Day 1066. William is crowned at Westminster while his guards, mistaking English cheers for riot, fire the surrounding houses. Who speaks?',
    keys: { repression: { target: 70, scale: 40 }, flareUps: { target: 3, scale: 5 } } },
  { id: 'harrying', name: 'The Harrying Order', sign: 'THE KING\'S CAMP, WINTER 1069',
    drop: ['wm_hall', null],
    intro: 'Winter 1069. The order goes out: burn everything north of the Humber that can feed a rebel. Who speaks?',
    keys: { repression: { target: 85, scale: 30 }, flareUps: { target: 4, scale: 5 } } },
  { id: 'burning', name: 'The Burning of the North', sign: 'YORKSHIRE, WINTER 1069-70',
    drop: ['wm_village', null],
    intro: 'Winter 1069-70. The columns move village to village; the North becomes smoke. Who speaks?',
    keys: { repression: { target: 95, scale: 25 }, flareUps: { target: 5, scale: 5 } } },
  { id: 'famine', name: 'The Famine Winter', sign: 'THE NORTH, 1070',
    drop: ['wm_village', null],
    intro: 'The hungry winter, 1070. Famine follows the fires; the king\'s own survey will still say "vasta" seventeen years on. Who speaks?',
    keys: { repression: { target: 90, scale: 30 }, greed: { target: 70, scale: 50 } } },
  { id: 'castles', name: 'The Castles Rise', sign: 'A CASTLERY, 1067-1087',
    drop: ['wm_motte_drop', 'wm_village'],
    intro: '1067 to 1087. Some five hundred castles rise in a generation, many on razed streets. Who speaks?',
    keys: { repression: { target: 75, scale: 40 }, flareUps: { target: 2, scale: 6 } } },
  { id: 'forest', name: 'The Forest Law', sign: 'THE NEW FOREST, c.1079',
    drop: ['wm_ely', null],
    intro: 'Around 1079. Forest law closes the woods; the New Forest is set aside for the king\'s deer. Who speaks?',
    keys: { greed: { target: 70, scale: 40 }, repression: { target: 60, scale: 50 } } },
  { id: 'domesday', name: 'The Domesday Survey', sign: 'THE SHIRES, 1086',
    drop: ['wm_scriptorium', null],
    intro: '1086. Royal commissioners survey every hide in England for the king\'s book — more than thirteen thousand places. Who speaks?',
    keys: { greed: { target: 80, scale: 35 }, repression: { target: 55, scale: 60 } } },
  { id: 'salisbury', name: 'The Oath of Salisbury', sign: 'SALISBURY PLAIN, 1 AUGUST 1086',
    drop: ['wm_salisbury', null],
    intro: '1 August 1086. The landholders of England swear to William directly, over their own lords\' heads. Who speaks?',
    keys: { greed: { target: 75, scale: 45 }, repression: { target: 65, scale: 60 } } },
];

const RESPONDERS = [
  { key: 'william', actorId: 'william_king', label: 'William', opts: {} },
  { key: 'odo', actorId: 'william_odo', label: 'Odo', opts: {} },
  { key: 'hereward', actorId: 'hereward', label: 'Hereward', opts: {} },
  { key: 'orderic', actorId: 'orderic', label: 'Orderic', opts: {} },
  { key: 'aldric', actorId: 'peasant', label: 'Aldric', opts: {} },
  { key: 'crowd', actorId: 'crowd', label: 'The village', opts: { scale: 2.6 } },
];

// Acting tags used below only where the sprite exists: William (Angry),
// (Pointing/Angry), (Sit/Sad); Odo (Pointing/Smug); Hereward
// (Attack/Determined); The Village (Attack/Angry). Aldric and Orderic
// have single sprites — no tags.
const VOICES = {
  pevensey: {
    william: [
      'William: "The beach was empty. Harold is in the north, burying his own brother at Stamford Bridge — every enemy of mine is generous in his timing."',
      'William (Angry): "They will say I stumbled coming ashore. Write it thus: I seized England with both hands."',
      'Narrator: "The stumble and the answer are chroniclers\' polish; the unopposed landing is fact."',
    ],
    odo: [
      'Odo: "A bishop may not shed blood, so I carry a mace. The Church is nothing if not exact."',
      'Odo (Pointing/Smug): "Look there — the castle came off the ships in numbered timbers, before the horses. We brought England its future flat-packed."',
    ],
    hereward: [
      'Hereward: "I was out of England when the ships came. A man misses one autumn and comes home to a country with a new landlord."',
      'Hereward (Attack/Determined): "Let them dig in at Pevensey. Sand holds no oath, and neither do we."',
    ],
    orderic: [
      'Orderic: "I was born nine years after that landing, of an English mother and a Norman father. The wound runs through my own blood."',
      'Orderic: "The chroniclers say the wind changed at Michaelmas and carried the fleet over. It has never changed back."',
    ],
    aldric: [
      'Aldric: "Word came up the road: ships at Pevensey, more masts than trees. We asked what it meant for the harvest."',
      'Aldric: "The reeve said, pray. My father said, hide the seed corn. My father was right."',
    ],
    crowd: [
      'The Village: "Ships. Hundreds of ships. Whose men are they? And what will they eat — ours?"',
      'The Village (Attack/Angry): "If they come up this road they will find the wells fouled and the byres empty!"',
    ],
  },
  hastings: {
    william: [
      'William: "Nine hours on that ridge. Their shield wall stood like a sworn debt — it broke only when hope did."',
      'William (Pointing/Angry): "Harold swore on relics and took my crown anyway. God has ruled on perjury today."',
      'Narrator: "That the cause was Harold\'s oath-breaking is Norman framing; the arrow in his eye is tapestry tradition, not certainty."',
    ],
    odo: [
      'Odo: "I blessed the army at dawn and rallied the rout at noon. The Tapestry will show me with a mace, cheering on the boys."',
      'Odo (Pointing/Smug): "One afternoon, brother. One afternoon bought a kingdom worth a thousand years of rent."',
    ],
    hereward: [
      'Hereward: "They say the housecarls died where they stood, around the standard, axes in hand. That is how the old England ended — standing."',
      'Hereward (Attack/Determined): "It is not how it will end everywhere. The fens have no ridge to lose."',
    ],
    orderic: [
      'Orderic: "So many fell that the chroniclers wrote the ground itself was sown with corpses. Victory abbeys grow well in such soil."',
      'Orderic: "The king raised Battle Abbey on the spot where Harold fell. Penance, or a receipt — I have never decided."',
    ],
    aldric: [
      'Aldric: "Our thegn marched south with eight men. None came back. His hall has a Norman in it now who cannot say our names."',
      'Aldric: "They tell us one battle settled it. No one asked the fields, and the fields must pay for it."',
    ],
    crowd: [
      'The Village: "The king is dead. The other king is dead too. Which king is ours now?"',
      'The Village (Attack/Angry): "Whoever he is, he was not chosen here!"',
    ],
  },
  coronation: {
    william: [
      'William: "On the day of my crowning, my own guards heard English cheering and mistook it for revolt. They fired the houses around the abbey."',
      'William: "I finished the rite in an emptying church that smelled of smoke. Mark what my reign learned at the altar: acclaim and riot sound alike."',
    ],
    william_defiant: [
      'William (Pointing/Angry): "Let it burn, then. A king anointed in smoke is still anointed — and London learned in one hour what obedience costs."',
      'William: "I trembled at the altar, the monks say. Kings may tremble. Kings may not stop."',
    ],
    william_resigned: [
      'William (Sit/Sad): "Christmas Day, and my crowning smelled of burning thatch. I trembled — that much of the story is true."',
      'William: "I wanted Edward\'s crown, not Edward\'s city in ashes. Wanting, I have learned, is not a term the sword recognizes."',
    ],
    odo: [
      'Odo: "A misunderstanding, a few streets — coronations are untidy. What matters is that the oath was said and the crown stayed on."',
      'Odo (Pointing/Smug): "And every burned plot is now available. Note that. Everything after a fire is available."',
    ],
    odo_defiant: [
      'Odo (Pointing/Smug): "I would order it again. A capital that fears its king on the first day saves years of instruction."',
      'Odo: "Call it liturgy. Fire is how a conquest says amen."',
    ],
    odo_resigned: [
      'Odo: "Between us: it was a blunder. Frightened guards, torches, and a city taught to hate us by supper."',
      'Odo: "We spent the next decade paying in castles for one hour of panic."',
    ],
    hereward: [
      'Hereward: "They crowned him in Edward\'s church while his men torched the streets outside. That is the whole reign in one morning."',
      'Hereward (Attack/Determined): "Remember it when they preach about God\'s chosen king."',
    ],
    hereward_defiant: [
      'Hereward (Attack/Determined): "Smoke at the coronation — an honest omen. England saw at once what it had; now England must answer it."',
      'Hereward: "A king made in fire can be unmade in it."',
    ],
    hereward_resigned: [
      'Hereward: "I heard the news and understood: there will be no undoing this by wishing. The Godwins are dead and the Aetheling is a boy."',
      'Hereward: "So a man keeps his axe oiled, and waits for the fen to be needed."',
    ],
    orderic: [
      'Orderic: "The clergy asked the crowd, in English and in French, whether they would have William as king. The shout of assent began the burning of the houses."',
      'Orderic: "I record it as the chroniclers gave it: consent, misheard as rebellion, answered with fire."',
    ],
    orderic_defiant: [
      'Orderic: "I will write it plainly, though Norman abbots read my pages: the king\'s men burned the city on the day of his anointing."',
      'Orderic: "A chronicle that flatters is only expensive paper."',
    ],
    orderic_resigned: [
      'Orderic: "Perhaps it was fear, not malice — frightened soldiers in a foreign city. I write that possibility too."',
      'Orderic: "It comforts no widow. But a monk must weigh even the mercies."',
    ],
    aldric: [
      'Aldric: "News from London by Candlemas: the new king crowned, and the streets around the abbey burned by his own guard."',
      'Aldric: "We understood the message even before the tax did the explaining."',
    ],
    aldric_defiant: [
      'Aldric: "If cheering gets your house burned, then quiet is no safer. I said so at the moot, out loud."',
      'Aldric: "Let them write my name in whatever book they keep for men who say so."',
    ],
    aldric_resigned: [
      'Aldric: "You learn to make no sound at all while the lords are being glorious."',
      'Aldric: "We kept Christmas quietly that year. We have kept it quietly since."',
    ],
    crowd: [
      'The Village: "We shouted for the king because they told us to shout! Then the roofs were burning!"',
      'The Village (Attack/Angry): "Cheer, and burn for cheering — what is left us? Silence? Then we will be silent the way thunder is silent!"',
    ],
  },
  harrying: {
    william: [
      'William: "The North has risen twice and eaten my garrisons twice. Tonight I sign the remedy: nothing north of the Humber that can feed a rebel."',
      'William (Pointing/Angry): "Granaries, byres, ploughs, seed corn. See it done before the thaw."',
    ],
    william_defiant: [
      'William (Pointing/Angry): "Yes, the seed corn too. Rebellion is a harvest like any other — I am burning next year\'s crop of it."',
      'William: "History may gasp. History has never had to hold York twice."',
    ],
    william_resigned: [
      'William (Sit/Sad): "I have signed orders that killed men before. This one kills the fields themselves."',
      'William: "I tell myself it is arithmetic. At night the arithmetic has faces."',
    ],
    odo: [
      'Odo: "The order is sound, brother. A field that cannot feed a man cannot feed an army — the logic is beyond reproach."',
      'Odo (Pointing/Smug): "And razed land re-grants cheaply. Even mercy could not price it better."',
    ],
    odo_defiant: [
      'Odo (Pointing/Smug): "I will defend it from any pulpit. The Church holds a quarter of England, and order is what keeps the quarter."',
      'Odo: "Severity now is clemency later, at compound interest."',
    ],
    odo_resigned: [
      'Odo: "Privately? The order buys peace and beggars the tax rolls in the same stroke. Waste pays no geld."',
      'Odo: "We are burning our own rents. I said nothing in the hall. Neither did anyone."',
    ],
    hereward: [
      'Hereward: "An order to make winter itself a weapon. Not even the Danes did that, and we called the Danes heathen."',
      'Hereward (Attack/Determined): "Every man who escapes it will find his way to a marsh or a wood. I will be in the marsh."',
    ],
    hereward_defiant: [
      'Hereward (Attack/Determined): "Let him burn Yorkshire — he cannot burn the fen, and every fire lights recruits for me."',
      'Hereward: "The king is minting rebels faster than Danegeld ever did."',
    ],
    hereward_resigned: [
      'Hereward: "I know what a burned shire means: no bread for any rising, mine included. He is starving my war too."',
      'Hereward: "That is the cruel cleverness of it. I hate him most for being right."',
    ],
    orderic: [
      'Orderic: "I must write of it, though it dishonors the king my patrons serve: he ordered the food of a whole people destroyed in winter."',
      'Orderic: "Nothing in my Church\'s long memory of pagan cruelty prepared me for a baptized king\'s ledger."',
    ],
    orderic_defiant: [
      'Orderic: "I wrote that God would punish such a deed, and I let the words stand."',
      'Orderic: "Let the copyists blush. The page is the one court a king cannot pack."',
    ],
    orderic_resigned: [
      'Orderic: "Some brothers say: judge not — the rebellion forced his hand, and war is war. I copy their argument faithfully."',
      'Orderic: "Then I copy the number of the dead beside it, and let the two lines look at each other."',
    ],
    aldric: [
      'Aldric: "The knights came to the moot and read it out: stores forfeit, byres forfeit, seed forfeit, by the king\'s command."',
      'Aldric: "Forfeit. As if the winter were a court, and we had already lost."',
    ],
    aldric_defiant: [
      'Aldric: "We buried a third of the seed corn under the church floor the night the order was read. Under the font, where knights do not dig."',
      'Aldric: "If that is treason, then ploughing is treason, and I am guilty every spring."',
    ],
    aldric_resigned: [
      'Aldric: "You cannot argue with an order. You can only decide what to carry, and which child goes south to your sister."',
      'Aldric: "We drew lots by the fire. I still hear the sticks."',
    ],
    crowd: [
      'The Village: "They read the order at the cross: everything that feeds us is the enemy\'s now!"',
      'The Village (Attack/Angry): "Then WE are the enemy! Say it plainly — the order makes us the enemy!"',
    ],
  },
  burning: {
    william: [
      'William: "I rode with the columns. A king should look at what he signs — village, granary, byre, village again, until smoke was the whole weather."',
      'William: "No one fought us. That was the strangest part. There was no one left to fight."',
    ],
    william_defiant: [
      'William (Pointing/Angry): "Write what you like of me — raging lion, scourge of God. The North rose twice; count the risings since."',
      'William: "Cruelty finishes wars. Kindness schedules them."',
    ],
    william_resigned: [
      'William (Sit/Sad): "There was a child on the York road who did not beg. That is what I remember — a child past begging."',
      'William: "I have taken towns all my life. I did not know until Yorkshire that you can take a winter."',
    ],
    odo: [
      'Odo: "Efficient, as campaigns go: no sieges, no battles, minimal losses. Our losses, I mean."',
      'Odo (Pointing/Smug): "The chronicles will handle the other column of the ledger."',
    ],
    odo_defiant: [
      'Odo (Pointing/Smug): "Spare me the trembling. Every crown in Christendom rests on some winter no one writes hymns about — ours is merely recent."',
      'Odo: "The difference between a warlord and a dynasty is one thorough season."',
    ],
    odo_resigned: [
      'Odo: "I sang mass downwind of a burned village once that winter. Once was enough; I arranged to be elsewhere after."',
      'Odo: "A bishop learns which memories to leave in the field."',
    ],
    hereward: [
      'Hereward: "I crossed Yorkshire after the columns had passed. I will say only that the crows were fat, and the roads were full of people walking nowhere."',
      'Hereward (Attack/Determined): "Every one of them that lives, the king should count as my army now."',
    ],
    hereward_defiant: [
      'Hereward (Attack/Determined): "He thinks ash is obedience. Ash is kindling."',
      'Hereward: "The fen fills nightly with men who have nothing left to lose — the one army no king can starve."',
    ],
    hereward_resigned: [
      'Hereward: "You cannot raise a rising from starving men. They do not want banners, they want bread."',
      'Hereward: "He knew that. That is why it was the food he killed."',
    ],
    orderic: [
      'Orderic: "I set down what the survivors told: villages burned with their winter stores in them, and famine following the knights like a second army."',
      'Orderic: "I put the dead at more than a hundred thousand. It is a chronicler\'s round number; the truth is a catastrophe with fewer zeros and no less shame."',
    ],
    orderic_defiant: [
      'Orderic: "Let my order\'s patrons rage: I wrote that God will exact vengeance for this deed, and I signed my name beneath it."',
      'Orderic: "Fear of a Norman abbot is a small thing next to fear of the recording angel."',
    ],
    orderic_resigned: [
      'Orderic: "What can a page do against a torch? The village burns whether or not I describe it beautifully."',
      'Orderic: "I write anyway. It is the only door I can hold open."',
    ],
    aldric: [
      'Aldric: "They were quick, I will grant them that. A village is an hour\'s work when no one resists."',
      'Aldric: "The granary went first. They know exactly what they are doing. That is the worst of it."',
    ],
    aldric_defiant: [
      'Aldric: "We raised a roof again before the ash was cold, out of spite as much as need."',
      'Aldric: "Burn it twice, then. A man who replants is not defeated. He is farming."',
    ],
    aldric_resigned: [
      'Aldric: "The third village that day was ours. We had watched the smoke of the first two come up the valley, so we were already on the road."',
      'Aldric: "You do not fight it. You walk, and you keep the children in the middle."',
    ],
    crowd: [
      'The Village: "The smoke started in the next valley at dawn. By noon it was our sky too."',
      'The Village (Attack/Angry): "They burn the food in front of the hungry! In front of us! In winter!"',
    ],
  },
  famine: {
    william: [
      'William: "The reports come south all winter: the roads, the churchyards, the numbers. I read every one. A king does not get to look away from his own signature."',
      'William: "Symeon will write that no village stood inhabited between York and Durham. Seventeen years on, my own survey will still say waste."',
    ],
    william_defiant: [
      'William (Pointing/Angry): "And still no third rising. Tell me the policy failed — point to the rebellion. There is none. There is nothing."',
      'William: "Nothing was the objective. I achieved it."',
    ],
    william_resigned: [
      'William (Sit/Sad): "I caused the death of thousands by starvation — a monk will one day put those words in my dying mouth. Dispute them as he may, they fit."',
      'Narrator: "The deathbed confession is Orderic\'s composition, decades later. The famine needed no author."',
    ],
    odo: [
      'Odo: "Famine is the tail of the comet; every campaign has one. By spring the survivors were docile and the geld ran on schedule."',
      'Odo (Pointing/Smug): "On reduced assessments, naturally. We are not monsters."',
    ],
    odo_defiant: [
      'Odo (Pointing/Smug): "You want me ashamed of arithmetic that worked? The North is quiet to this day. Quiet is the whole product."',
      'Odo: "Sentiment is for men who have never had to hold a frontier."',
    ],
    odo_resigned: [
      'Odo: "There were reports I stopped reading that winter. A man keeps his appetite by choosing his documents."',
      'Odo: "I have built churches since. Draw your own conclusions about why."',
    ],
    hereward: [
      'Hereward: "They ate what a winter leaves: bark, roots, the seed they had hidden and then could not bear to keep hidden."',
      'Hereward: "Some sold themselves into bondage for bread. Free English, collared like oxen, because the king burned the alternative."',
    ],
    hereward_defiant: [
      'Hereward (Attack/Determined): "Every bowl of eel broth in the fen fed a man the king had marked for starving. If feeding people is rebellion, rebellion is easy."',
      'Hereward: "We fished. That was our warfare that winter."',
    ],
    hereward_resigned: [
      'Hereward: "I took in forty from the Yorkshire road. The fen feeds its own, but it does not feed multitudes."',
      'Hereward: "Turning the forty-first away — that is a wound I carry yet."',
    ],
    orderic: [
      'Orderic: "They died on the roads, in the churchyards, at the gates of monasteries whose stores were long since given out."',
      'Orderic: "Old and young perished alike of hunger, I wrote. One chronicle says human flesh was eaten. I let that sentence stand in the sources\' own words."',
    ],
    orderic_defiant: [
      'Orderic: "I name it what it was: not war\'s misfortune but war\'s design. The famine was the weapon, wielded on purpose, by the anointed."',
      'Orderic: "If that page costs me a priory, the price is fair."',
    ],
    orderic_resigned: [
      'Orderic: "At some point a chronicler stops describing and starts counting, because description fails."',
      'Orderic: "Vasta, the survey says. Waste. Sixty entries a page, and every one was somebody\'s parish."',
    ],
    aldric: [
      'Aldric: "We ate the seed corn in February. I had said we never would. Hunger does not debate."',
      'Aldric: "Eating the seed corn means eating next year too. There is a word for that arithmetic, and it is not one I use in church."',
    ],
    aldric_defiant: [
      'Aldric: "I kept back one sack. One. We went hungrier to keep it, and in spring I sowed it with the children watching."',
      'Aldric: "That green row was the only argument I had left. It was enough."',
    ],
    aldric_resigned: [
      'Aldric: "My youngest does not remember that winter, God be thanked. My eldest remembers nothing else."',
      'Aldric: "We do not speak of who was buried when the ground softened. The parish knows. That is enough."',
    ],
    crowd: [
      'The Village: "First the cattle, then the dogs, then the bark bread. When the children stopped crying — that silence is the thing you never stop hearing."',
      'The Village (Attack/Angry): "The king kept his Christmas feast at York! At YORK! While the shire he burned was eating grass!"',
    ],
  },
  castles: {
    william: [
      'William: "Where I halt, a castle rises: motte, bailey, palisade — timber now, stone to follow. Five hundred of them before my sons are done."',
      'William: "The English had no castles. That is why there are no English kings."',
    ],
    odo: [
      'Odo (Pointing/Smug): "Understand the instrument: a castle does not keep armies out, it keeps rent coming in. It is a strongbox you can live in."',
      'Odo: "We cleared a hundred houses at York for the footprint, and the tenants dug the mound. Elegance."',
    ],
    hereward: [
      'Hereward: "You can take a castle. We took one. Then you are holding a stone box while every other castle in the shire rides at you."',
      'Hereward (Attack/Determined): "That is their genius — not one fortress but a net of them. The answer is water they cannot garrison."',
    ],
    orderic: [
      'Orderic: "The English, my mother\'s people, built halls: open doors, long fires. The Normans build keeps: one door, high and barred."',
      'Orderic: "You can read a whole theory of rule in that architecture."',
    ],
    aldric: [
      'Aldric: "They pulled down my cousin\'s street in York for the second castle, then made the street\'s own men heap up the mound."',
      'Aldric: "He carried earth over his own floor. He says you stop thinking about it. He says it twice."',
    ],
    crowd: [
      'The Village: "Dig, they said. Your backs, your baskets, your own doorposts for the palisade."',
      'The Village (Attack/Angry): "We built the thing that watches us! With our own hands we built it!"',
    ],
  },
  forest: {
    william: [
      'William: "I have set aside the New Forest and its fellows: the deer, the boar, the very green of the wood, reserved to the crown."',
      'William (Angry): "The Chronicle will sneer that I loved the tall deer as if I were their father. Fathers guard what is theirs. The wood is mine."',
    ],
    odo: [
      'Odo (Pointing/Smug): "Forest law is the subtlest rent of all: we did not take their land, we took their right to use it."',
      'Odo: "Firewood, pannage, a hare for the pot — all purchasable offenses now. The wood has become an annuity."',
    ],
    hereward: [
      'Hereward: "They have made the greenwood itself a crime. Mark that word — outlaw. Men outside the law multiply in exactly such woods."',
      'Hereward (Attack/Determined): "Every forest court fills the wild places with angry men who know the paths. They are planting stories they will not enjoy harvesting."',
    ],
    orderic: [
      'Orderic: "Later tradition will say whole villages were cleared for the king\'s hunting; the true extent is disputed among us who write."',
      'Orderic: "What is not disputed: a commoner blinded for taking a deer, under law, in a wood his grandfather gleaned freely."',
    ],
    aldric: [
      'Aldric: "The wood fed us in the bad years: acorns for the pigs, deadfall for the fire, and no lord counting."',
      'Aldric: "Now there is a verderer with a tally stick where the acorns fall. They have put a fence around the weather."',
    ],
    crowd: [
      'The Village: "No wood for the fire, no mast for the pigs, no coney for the pot — but the deer may eat our crops freely."',
      'The Village (Attack/Angry): "The king\'s deer live better than the king\'s people!"',
    ],
  },
  domesday: {
    william: [
      'William: "Send the commissioners into every shire: every hide, every holder, every ox, every mill. Value as it was, as it is, as it might be."',
      'William: "A conquest you cannot count is merely a raid. I intend to have been more than a raid."',
    ],
    odo: [
      'Odo (Pointing/Smug): "The English named it Domesday — the book of judgment, from which there is no appeal. They meant it bitterly. I could not have flattered it better."',
      'Odo: "The pen collects what the torch cannot: everything, forever."',
    ],
    hereward: [
      'Hereward: "Men who fought them with axes are entered in their book as so many ploughs and pigs."',
      'Hereward: "There is no entry for what we were. That is what the book is for — to replace what we were."',
    ],
    orderic: [
      'Orderic: "The Chronicle says it with disgust: not one ox nor one cow nor one pig was left out of the king\'s writ."',
      'Orderic: "It shamed even some of the men who compiled it. It also worked, which shames the rest of us."',
    ],
    aldric: [
      'Aldric: "Two sets of commissioners came, the second checking the first, and asked the same questions down to the last piglet."',
      'Aldric: "My holding is in the king\'s book now, valued at more than it yields. The book does not allow for bad harvests. The geld follows the book."',
    ],
    crowd: [
      'The Village: "They counted the ploughs, the mills, the meadows, the men. They counted us."',
      'The Village (Attack/Angry): "Numbered like cattle in a stranger\'s ledger — and taxed to the number, drought or no!"',
    ],
  },
  salisbury: {
    william: [
      'William: "Every landholder that matters in England, gathered on one plain, swearing to me over the heads of their own lords."',
      'William: "Fewer than two hundred men hold England of me; after today, even their men hold it of me first. There is no ground outside the system."',
    ],
    odo: [
      'Odo (Pointing/Smug): "Observe the masterstroke: loyalty itself made a freehold of the crown. A vassal\'s vassal now answers to the king before his own lord."',
      'Odo: "Twenty years from the ships to this. Show me a dynasty that consolidated faster."',
    ],
    hereward: [
      'Hereward: "An oath sworn under that many spears is a receipt, not a promise."',
      'Hereward (Attack/Determined): "English lords knelt on that plain too — the few still holding anything. Kneeling kept their acres, not their honor."',
    ],
    orderic: [
      'Orderic: "I note the date beside the survey\'s completion: first the counting, then the swearing. The book and the oath are two clasps of one collar."',
      'Orderic: "Men of law will study this day for nine hundred years. The peasants it bound did not need nine hundred years to understand it."',
    ],
    aldric: [
      'Aldric: "The lords rode south to swear, and the swearing changed no furrow of my work. My rent goes up the same ladder either way."',
      'Aldric: "But now the ladder has one top. Every ladder in England has the same top."',
    ],
    crowd: [
      'The Village: "They swore the land away over our heads — every acre held of the king."',
      'The Village (Attack/Angry): "No one asked the hands that plough it! No one has EVER asked the hands!"',
    ],
  },
};

// ---- vignette generator --------------------------------------------------

const vignetteId = (ev, resp, stance) =>
  `wmv_${ev.id}_${resp.key}${stance ? `_${stance}` : ''}`;

const vignetteScene = (ev, resp, stance) => {
  const voiceKey = stance ? `${resp.key}_${stance}` : resp.key;
  const voice = VOICES[ev.id]?.[voiceKey];
  if (!voice) throw new Error(`missing voice: ${ev.id}/${voiceKey}`);
  const id = vignetteId(ev, resp, stance);
  // Harsh events: the base human vignette offers the two stance variants.
  const tail =
    !stance && HARSH.has(ev.id) && resp.key !== 'crowd'
      ? [
          '[CHOICE]',
          `- "Press them — the defiant answer" -> ${vignetteId(ev, resp, 'defiant')}`,
          `- "Press them — the resigned answer" -> ${vignetteId(ev, resp, 'resigned')}`,
          `- "Back to the witnesses" -> wmch_${ev.id}`,
          '[/CHOICE]',
        ]
      : [`[SCENE wmch_${ev.id}]`];
  return {
    id,
    name: `${ev.name} — ${resp.label}${stance ? ` (${stance})` : ''}`,
    sceneType: 'WITNESS',
    dropId: dropId(ev.drop[0], ev.drop[1]),
    stage: [
      ...el(`${id}_el`, resp.actorId, 42, 62, resp.opts),
      ...balloon(`${id}_sign`, ev.sign, 76, 10, { scale: 0.8 }),
    ],
    script: lines(...voice, ...tail),
    narraton: { pool: RPOOL, keys: ev.keys, repeatable: true },
    status: 'work',
  };
};

// Per-event responder chooser.
const chooserScene = (ev) => ({
  id: `wmch_${ev.id}`,
  name: `Voices: ${ev.name}`,
  sceneType: 'AGENCY',
  dropId: dropId(ev.drop[0], ev.drop[1]),
  stage: [...balloon(`wmch_${ev.id}_sign`, ev.sign, 50, 10, { scale: 0.9 })],
  script: lines(
    `Narrator: "${ev.intro}"`,
    '[CHOICE]',
    ...RESPONDERS.map((r) => `- "${r.label}" -> ${vignetteId(ev, r, null)}`),
    '- "Back to the events" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

for (const ev of EVENTS) {
  scenes.push(chooserScene(ev));
  for (const resp of RESPONDERS) {
    scenes.push(vignetteScene(ev, resp, null));
    if (HARSH.has(ev.id) && resp.key !== 'crowd') {
      scenes.push(vignetteScene(ev, resp, 'defiant'));
      scenes.push(vignetteScene(ev, resp, 'resigned'));
    }
  }
}

// The episodes hub — linked from the opening court scene.
scenes.push({
  id: 'wm_hub',
  name: 'Voices of the Conquest',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('hub_crowd', 'crowd', 50, 62, { scale: 2.6 }),
    ...balloon('hub_sign', 'VOICES OF THE CONQUEST, 1066-1087', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    'Narrator: "Twenty-one years, ten turnings of the screw. Choose an event and hear how it landed — on the king, on his lieutenant, on the rebels, on the chronicler, on the people who ploughed."',
    '[CHOICE]',
    ...EVENTS.map((ev) => `- "${ev.name}" -> wmch_${ev.id}`),
    '- "Witness: The Burning of the North (cutscene)" -> wm_cut_burning',
    '- "Witness: The Book (cutscene)" -> wm_cut_book',
    '- "Enter the Machine" -> wm_machine',
    '- "Return to the court" -> wm_court',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ==========================================================================
// CUTSCENES + THE GEORGIST MACHINE LAYER
//
// Two auto-playing cutscenes (pure show, no interaction), each ending in
// an IMPACT scene — the Georgist ledger of what was just watched, with
// gauges animating the deltas — and from there into wm_machine: the
// shared campaign rig from machine-core.mjs, ticking the 1086 economy
// with pool 'william_reactions' so the Narraton surfaces the painted
// vignettes above as commentary while the machine runs.
// ==========================================================================

// CUTSCENE A — The Burning of the North. Horror by accumulation: fire
// spreads element to element on timed beats, the village flees, then
// snow falls on the ash (opacity cross-fade via BIND + TICK).
scenes.push({
  id: 'wm_cut_burning',
  name: 'Cutscene: The Burning of the North',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('cb_crowd', 'crowd', 62, 68, { scale: 2.6 }),
    ...balloon('cb_sign', 'YORKSHIRE. A NIGHT IN WINTER, 1069.', 50, 8, { scale: 0.9 }),
    ...balloon('cb_granary', 'THE GRANARY', 22, 30, { scale: 0.8 }),
    ...balloon('cb_byre', 'THE BYRE', 46, 25, { scale: 0.8 }),
    ...balloon('cb_roof', 'THE LAST ROOF', 74, 30, { scale: 0.8 }),
    ...balloon('cb_snow', 'SNOW, FALLING ON ASH', 50, 46, { scale: 0.9 }),
  ],
  script: lines(
    '[AUTOPLAY on]',
    '# snow starts invisible; the burning elements will fade as it rises',
    '[SET cb_fade = 0]',
    '[BIND cb_snow.opacity to cb_fade / 100]',
    '[BIND cb_granary.opacity to 1 - cb_fade / 100]',
    '[BIND cb_byre.opacity to 1 - cb_fade / 100]',
    '[BIND cb_roof.opacity to 1 - cb_fade / 100]',
    'Narrator: "Night. The column reaches the village after dark, as ordered. Fire needs no daylight."',
    '[WAIT 1s]',
    '[EFFECT flame_burn on cb_granary]',
    'Narrator: "The granary first. They always know where the granary is."',
    '[WAIT 1500ms]',
    '[EFFECT flame_burn on cb_byre]',
    'Narrator: "Then the byre. The cattle are driven out and killed in the lane — not stolen. Killed. Food is the target."',
    '[WAIT 1500ms]',
    '[EFFECT flame_burn on cb_roof]',
    '[EFFECT shake_all on stage]',
    '[WAIT 1s]',
    '[MOVE cb_crowd to 4,74 over 3s]',
    'Narrator: "No one fights. The village walks into the dark with what it can carry, which is winter."',
    '[WAIT 2s]',
    'Narrator: "Symeon of Durham: \'Between York and Durham no village was inhabited. To the traveller there was only wasteness.\'"',
    '[WAIT 1s]',
    '[CLEAR_EFFECT flame_burn from cb_granary]',
    '[CLEAR_EFFECT flame_burn from cb_byre]',
    '[CLEAR_EFFECT flame_burn from cb_roof]',
    '# the snow: fade the burned things out, the falling snow in',
    '[TICK 200ms]',
    '[IF cb_fade < 100]',
    '[SET cb_fade = clamp(cb_fade + 5, 0, 100)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "Then it snows. It falls on the ash as it fell on the thatch, without opinion, and by morning the place is a white page."',
    '[WAIT 2s]',
    '[AUTOPLAY off]',
    '[SCENE wm_impact_burning]',
  ),
  status: 'work',
});

// IMPACT A — the ledger of the fires. Gauges for the machine variables
// the event moves; a short TICK animates the deltas arriving, with IF
// guards so each variable stops at its target.
scenes.push({
  id: 'wm_impact_burning',
  name: 'Impact: The Ledger of the Fires',
  sceneType: 'AGENCY',
  dropId: dropId('wm_village'),
  stage: [...balloon('ib_sign', 'WHAT THE FIRE MOVED', 50, 8, { scale: 0.9 })],
  script: lines(
    '[GAUGE repression at 14,78 min=0 max=100 label="REPRESSION"]',
    '[GAUGE flareUps at 50,78 min=0 max=6 label="FLARE-UPS"]',
    '[GAUGE marginHeight at 86,78 min=0 max=100 label="MARGIN"]',
    '# the deltas arrive while you read; guards stop each at its target',
    '[TICK 300ms]',
    '[IF repression < 95]',
    '[SET repression = clamp(repression + 3, 0, 95)]',
    '[ENDIF]',
    '[IF flareUps < 5]',
    '[SET flareUps = flareUps + 1]',
    '[ENDIF]',
    '[IF marginHeight > 45]',
    '[SET marginHeight = clamp(marginHeight - 4, 45, 100)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "The ledger of what you watched. REPRESSION climbs toward its ceiling — the fires are the enforcement arm of the rent."',
    'Narrator: "FLARE-UPS climb with it. Burn a shire and every survivor is a future rising; repression manufactures its own demand."',
    'Narrator: "And THE MARGIN falls. The margin is the best land a free family can still work without paying a lord. Burn the free North, and there is nowhere left to stand outside the system."',
    'Narrator: "Henry George, eight centuries early: when the margin falls, wages fall with it — everywhere, for everyone. Rent captures the difference. That is what the fire was for."',
    '[CHOICE]',
    '- "See it feed the Machine" -> wm_machine',
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

// CUTSCENE B — The Book. Bureaucratic horror: quills, a ticker counting
// hides, one village entry written — and then revalued in one word.
scenes.push({
  id: 'wm_cut_book',
  name: 'Cutscene: The Book',
  sceneType: 'WITNESS',
  dropId: dropId('wm_scriptorium'),
  stage: [
    ...el('bk_orderic', 'orderic', 24, 63),
    ...balloon('bk_sign', 'THE SCRIPTORIUM, 1086', 50, 8, { scale: 0.9 }),
    ...balloon('bk_quills', 'QUILLS, SCRATCHING', 78, 22, { scale: 0.7 }),
    ...balloon('bk_ticker', 'THE SURVEY: 0 PLACES RECORDED', 50, 32, { scale: 0.9 }),
    ...balloon('bk_page', 'THE PAGE WAITS', 60, 52, { scale: 0.85 }),
  ],
  script: lines(
    '[AUTOPLAY on]',
    '# the ticker counts hides in the background for the whole scene',
    '[SET bk_count = 0]',
    '[TICK 400ms]',
    '[IF bk_count < 13418]',
    '[SET bk_count = clamp(bk_count + 331, 0, 13418)]',
    '[SET_TEXT bk_ticker "THE SURVEY: {bk_count} PLACES RECORDED"]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "No fire tonight. Candles, and the sound of quills. This is the other weapon."',
    '[WAIT 1500ms]',
    'Narrator: "Every hide, every holder, every ox, every mill, every man. The scratching does not stop for weather, mourning, or memory."',
    '[WAIT 1500ms]',
    '[SET_TEXT bk_page "TORP: 6 VILLEINS, 2 PLOUGHS, 1 MILL. VALUE, 40 SHILLINGS."]',
    'Narrator: "A clerk reaches a Yorkshire entry. A village. It had six families, two ploughs, a mill. It had a name; it still has a name — names are free."',
    '[WAIT 2s]',
    '[EFFECT gold_glow on bk_page]',
    '[SET_TEXT bk_page "TORP: VASTA."]',
    'Narrator: "Then the value, as the commissioners found it, seventeen years after the fires."',
    '[WAIT 2s]',
    'Narrator: "Vasta. Waste. One word, sixty times a page, in the neatest hand in Europe."',
    '[WAIT 1s]',
    'Narrator: "The torch did the taking. The Book does the keeping: every field valued, entered, and owed — forever, to the number. This is what forever looks like written down."',
    '[WAIT 1500ms]',
    '[AUTOPLAY off]',
    '[SCENE wm_impact_book]',
  ),
  status: 'work',
});

// IMPACT B — the ledger of the Book.
scenes.push({
  id: 'wm_impact_book',
  name: 'Impact: The Ledger of the Book',
  sceneType: 'AGENCY',
  dropId: dropId('wm_scriptorium'),
  stage: [...balloon('ik_sign', 'WHAT THE PEN MOVED', 50, 8, { scale: 0.9 })],
  script: lines(
    '[GAUGE greed at 14,78 min=0 max=100 label="GREED"]',
    '[GAUGE marginHeight at 50,78 min=0 max=100 label="MARGIN"]',
    '[GAUGE repression at 86,78 min=0 max=100 label="REPRESSION"]',
    '# the deltas arrive while you read; guards stop each at its target',
    '[TICK 300ms]',
    '[IF greed < 85]',
    '[SET greed = clamp(greed + 2, 0, 85)]',
    '[ENDIF]',
    '[IF marginHeight > 35]',
    '[SET marginHeight = clamp(marginHeight - 3, 35, 100)]',
    '[ENDIF]',
    '[IF repression < 70]',
    '[SET repression = clamp(repression + 1, 0, 70)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "The ledger of what you watched. GREED climbs — not appetite, but appetite made permanent: every acre assessed at what it might yield, and taxed to the assessment, drought or no."',
    'Narrator: "THE MARGIN falls again, and this time on parchment. When the Book says there is no free land, there is no free land — the record outranks the soil."',
    'Narrator: "And REPRESSION barely needs to move. That is the pen\'s discount: a survey collects what a garrison collects, at a fraction of the knights."',
    'Narrator: "George\'s law holds on vellum as on ash: rent captures the difference between the best land and the margin. Fix the margin in a book, and you fix wages everywhere — downward, forever."',
    '[CHOICE]',
    '- "See it feed the Machine" -> wm_machine',
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

// THE MACHINE, 1086 — the shared Georgist rig from machine-core.mjs,
// drama panel (gauges + the Single Tax lever), no endings, no autopilot.
// Commentary pool = william_reactions: while the economy ticks, the
// Narraton surfaces the painted vignettes above as witness commentary.
// Navigation: each vignette returns to its chooser (wmch_*), whose
// choices lead back to wm_hub and thence the court — that is the way out.
scenes.push(
  machineHubScene({
    id: 'wm_machine',
    name: 'The Machine, 1086',
    pool: RPOOL,
    panel: 'drama',
    endings: false,
    autopilot: false,
    newsExtra: [
      '[IF repression >= 90]',
      '[SET_TEXT news_ticker "THE NORTH IS QUIET — VASTA ON EVERY PAGE — WAGES {wages}"]',
      '[ENDIF]',
      '[IF greed >= 80]',
      '[SET_TEXT news_ticker "THE BOOK CLOSES — EVERY ACRE ASSESSED AT WHAT IT MIGHT YIELD"]',
      '[ENDIF]',
    ],
  }),
);

// ---- game ----------------------------------------------------------------

const game = {
  info: {
    title: 'HVB — William the Conqueror',
    author: 'Doug Sharp',
    styleGuide: null,
    // The full Georgist machine state (machine-core WORLD_BASE), with
    // era pre-seeds for 1086: conquest society — steep hierarchy, hard
    // repression, next to no schooling, land-hunger institutionalized.
    worldState: {
      ...WORLD_BASE,
      hierarchy: 90,
      repression: 60,
      education: 5,
      greed: 65,
      // chapter-local variables
      ash: 0, hides: 0, wave: 0, ruthless: 0, spared: 0,
      cb_fade: 0, bk_count: 0,
    },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'wm_court',
    enableAutosave: true,
  },
  // Core machine actors (billionaire/human/witness/narrator/lieutenant,
  // empty graphics — placeholder boxes) so the rig's stage elements
  // resolve; core SFX merged without duplicating ids.
  actors: [
    ...actors,
    ...CORE_ACTORS.filter((a) => !actors.some((x) => x.id === a.id)),
  ],
  scenes,
  drops,
  items: [],
  sfx: [
    ...sfx,
    ...CORE_SFX.filter((s) => !sfx.some((x) => x.id === s.id)),
  ],
  buttons: [],
  episodes: [
    {
      id: 'ep_william',
      name: 'Chapter 1: William the Conqueror',
      description: 'Conquest converted into a permanent rent system, 1066-1087. Sourced from HVB_RESEARCH.md.',
      sceneIds: scenes.map((s) => s.id),
      status: 'work',
    },
  ],
};

const outPath = resolve(root, 'public', 'hvb-william.json');
writeFileSync(outPath, JSON.stringify(game) + '\n', 'utf8');
const mb = (JSON.stringify(game).length / 1024 / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes, ${game.actors.length} actors, ${drops.length} drops)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-william.json');
