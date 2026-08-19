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

// ---- game ----------------------------------------------------------------

const game = {
  info: {
    title: 'HVB — William the Conqueror',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { ash: 0, hides: 0, wave: 0, ruthless: 0, spared: 0 },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'wm_court',
    enableAutosave: true,
  },
  actors,
  scenes,
  drops,
  items: [],
  sfx,
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
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes, ${actors.length} actors, ${drops.length} drops)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-william.json');
