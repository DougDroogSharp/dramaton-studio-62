// Builds public/hvb-william.json — the standalone WILLIAM THE CONQUEROR
// (1066) chapter game of Humans vs Billionaires. Content sourced from
// docs/HVB_RESEARCH.md and docs/HVB_RESEARCH_2.md (Pass 2 dossier),
// Chapter 1 only. Disputed quotes stay framed as chronicler claims
// (Orderic Vitalis); verbatim-vs-reported flags follow the dossier.
// Lanfranc and Ealdred appear as voice-only speakers (no actor art).
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

const graphic = (id, pose, expression, image, angle = 0) =>
  image ? [{ id, pose, expression, angle, image }] : [];

// 8-direction walk set (majors only): Walk1/Walk2 at each compass
// angle; the engine flips the pair nearest the travel direction.
const WALK_ANGLES = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
const walkSet = (prefix) =>
  Object.entries(WALK_ANGLES).flatMap(([dir, angle]) => [
    ...graphic(`${prefix}_walk_${dir}1_g`, 'Walk1', 'Neutral', art('william', `${prefix}_walk_${dir}1.png`), angle),
    ...graphic(`${prefix}_walk_${dir}2_g`, 'Walk2', 'Neutral', art('william', `${prefix}_walk_${dir}2.png`), angle),
  ]);

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
    ...walkSet('william'),
  ]),
  mkActor('william_odo', 'Odo', [
    ...graphic('odo_g', 'Neutral', 'Neutral', art('william_odo.png')),
    ...graphic('odo_point_g', 'Pointing', 'Smug', art('william', 'odo_pointing_smug.png')),
  ]),
  mkActor('hereward', 'Hereward', [
    ...graphic('hereward_g', 'Neutral', 'Neutral', art('william', 'hereward.png')),
    ...graphic('hereward_attack_g', 'Attack', 'Determined', art('william', 'hereward_attack.png')),
  ]),
  mkActor('peasant', 'Aldric', [
    ...graphic('peasant_g', 'Neutral', 'Neutral', art('william', 'peasant.png')),
    ...walkSet('peasant'),
  ]),
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
    '[SET assizeVisits = 0]',
    '[SET epVisits = 0]',
    '[EFFECT gold_glow on c_william]',
    // The king walks the length of his own hall to hear it — an entrance
    // with a walk cycle (his 8-direction set; the engine picks east).
    '[ENTER c_william at 4,66]',
    '[MOVE c_william to 32,62 over 3s]',
    'Narrator: "HUMANS VS BILLIONAIRES — Chapter 1: WILLIAM THE CONQUEROR. Three years after Hastings, the conquest is still not paid for."',
    '[RANDOM]',
    'Odo: "Ill news, brother. The Danes have landed in the Humber. York has risen around Edgar Aetheling, and the garrison castles are ash."',
    '[OR]',
    'Odo: "Ill news, brother, and it came at a gallop: Danish masts in the Humber, York up around the Aetheling boy, and both your castles there burned to the sills."',
    '[OR]',
    'Odo (Pointing/Smug): "Ill news. Read the shape of it before the words: Danes in the Humber, English in York, and every garrison you paid for this year is smoke."',
    '[/RANDOM]',
    'William: "Twice I have raised castles at York. Twice the shire has burned them down around my men."',
    'Odo: "The North will not be held by castles alone, sire. The rebels eat from the same fields that feed the rebellion."',
    'William: "Then the fields themselves are the enemy\'s armory. There is a remedy for that, and every man in this hall knows its name."',
    'Narrator: "The order under consideration: a scorched-earth winter campaign across Yorkshire — villages, food stores, livestock. The chroniclers will call it the Harrying of the North."',
    '[RANDOM]',
    'Narrator: "Your choices will move the RUTHLESSNESS gauge. The gauge decides what kind of ending this king deserves."',
    '[OR]',
    'Narrator: "The gauge in the corner is called RUTHLESSNESS. It starts at {ruthless}. Every order you give writes to it, and at Rouen it will be read back to you."',
    '[OR]',
    'Narrator: "Watch the RUTHLESSNESS gauge. It is not a score. It is the total this king gets buried with."',
    '[/RANDOM]',
    '[CHOICE]',
    '- "Give the order — harry the North into famine" -> wm_order',
    '- "Refuse the order — hold the knights back" -> wm_refuse',
    '- "Voices of the Conquest — hear the witnesses" -> wm_hub',
    '- "The Assize and the Road — new episodes" -> wm_ep_hub',
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
    // Aldric flees into frame from the burning fields (two-frame walk
    // cycle: the runner flips his Walk1/Walk2 sprites during the MOVE)
    '[ENTER h_peasant at 98,64]',
    '[MOVE h_peasant to 72,64 over 4s]',
    'Narrator: "Norman columns move village to village. Crops, stores, and livestock burn so that nothing can feed a rebel — or anyone else."',
    'Aldric: "The seed corn too, lord? If the seed corn burns, there is no harvest next year. There is no year after that at all."',
    'William: "The North rebelled twice. It will not have the strength to rebel a third time."',
    // The king advances on the village — a south-east walk (the engine
    // picks his SE-facing walk pair from the 8-direction set)
    '[MOVE h_william to 44,72 over 3s]',
    'Aldric: "We did not rise, lord. We only lived here."',
    '[IF ruthless >= 2]',
    'William: "I gave this order with my own mouth, and I would give it again. Write that down, if any of you can write."',
    '[ELSE]',
    'Narrator: "You counseled mercy in the hall. The fires burn anyway. In this machine, one refusal changes the king\'s conscience, not the king\'s arithmetic."',
    '[ENDIF]',
    'Narrator: "Famine follows the fires through the winter. Orderic Vitalis — writing some fifty-five years after the event — will claim more than a hundred thousand dead; modern historians accept a catastrophe in the tens of thousands. One dissenter, Mark Hagger, argues it was no worse than other wars of the age; most scholars disagree with him."',
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
    // Aldric runs at the burning roof — a north-west walk across the frame
    '[MOVE p_peasant to 50,52 over 2s]',
    'Aldric: "Lord — the children are under that roof."',
    'William: "Then they had best come out of it."',
    '[RANDOM]',
    'Aldric: "Then let a man past. LET A MAN PAST."',
    '[OR]',
    'Aldric: "The door is barred from the outside, lord. Somebody barred it. Was that an order too, or just a man being thorough?"',
    '[OR]',
    'Aldric: "I have carried grain out of a burning byre. I know exactly how long I have. Move your horse."',
    '[/RANDOM]',
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
    // Aldric crosses to the king's stirrup — a west-facing walk
    '[MOVE sp_peasant to 40,63 over 2s]',
    '[RANDOM]',
    'Aldric: "God keep you, lord. God keep you."',
    '[OR]',
    'Aldric: "I will not thank you, lord, because you are giving me back what was already mine. But my daughter will thank you, and she is young enough to mean it."',
    '[OR]',
    'Aldric: "An experiment. Aye. Then let me be the one who writes down the result: the granary stood, the village paid, and nobody rose. Put that in your book when you get around to writing one."',
    '[/RANDOM]',
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
    // Aldric arrives at the diggings from off-frame, basket first
    '[ENTER m_peasant at 99,66]',
    '[MOVE m_peasant to 72,64 over 3s]',
    '[RANDOM]',
    'Narrator: "Where the houses stood, earth is heaped into a motte. English hands dig it; a Norman keep will crown it. Some five hundred castles rise in a generation — the conquest, poured in timber and soil."',
    '[OR]',
    'Narrator: "A motte is not architecture. It is a village turned inside out: the same soil, the same hands, rearranged into a thing that watches them. Some five hundred of these rise in a generation."',
    '[/RANDOM]',
    ...poseCmd('m_odo', 'william_odo', 'Pointing', 'Smug'),
    '[RANDOM]',
    'Odo: "You see the genius of it? The castle is not built to keep armies out. It is built to keep the rent coming in."',
    '[OR]',
    'Odo: "You are looking at it wrong, farmer. It is not a fort. It is a strongbox with a garrison living inside it, and your harvest is what it is a box FOR."',
    '[OR]',
    'Odo: "Count the arrow-slits, then count which way they point. Not at the road, farmer. At the FIELDS."',
    '[/RANDOM]',
    '[IF spared == 1]',
    'Aldric: "My village still stands, your grace. We paid our geld from a full granary. Does that please the king?"',
    'Odo: "It proves the king\'s point, farmer. A fed village pays better than a burned one. A pity the lesson came after the torch."',
    '[ENDIF]',
    '[IF ruthless >= 3]',
    'Aldric: "They make us dig the mound ourselves, over our own floors. My father\'s hearth is under my feet."',
    'Odo: "And your children\'s rent will keep the tower above it. That is what forever looks like, farmer."',
    '[ELSEIF ruthless <= 1]',
    'Odo: "The king hesitated once, they say. The castles did not. Stone does not need to be ruthless — only present."',
    '[ELSE]',
    'Aldric: "The mound goes up whatever the king felt about it that week. That is what I have learned this year: the tower does not care which way his conscience fell."',
    'Odo: "Now you are thinking like an administrator, farmer. Dig faster."',
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
    'Odo (Pointing/Smug): "And it has counted {hides} places so far this morning, at a clerk\'s wage. Show me a knight with that yield."',
    '[IF spared == 1]',
    'Orderic: "There is one village in the Yorkshire returns with a full granary and a paid geld. The commissioners queried it twice as an error."',
    'Odo: "Mercy always looks like an error in a ledger. That is why there is so little of it."',
    '[ELSE]',
    'Orderic: "Not one entry in the whole northern quire records a granary standing. I checked, your grace. I wanted to find one."',
    'Odo: "Then the columns are consistent. Consistency is the only virtue a book is capable of."',
    '[ENDIF]',
    '[IF ruthless >= 3]',
    'Orderic: "And page after page in the northern returns says only \'vasta.\' Waste. A word doing the work of ten thousand funerals."',
    '[ELSEIF ruthless >= 2]',
    'Orderic: "\'Vasta\' runs through the northern quires like a stammer, your grace. The clerks abbreviate it now. When a word gets an abbreviation, it has been written often enough."',
    '[ELSE]',
    'Orderic: "I keep my own tally beside theirs, your grace — the king\'s severities, one stroke each. It stands at {ruthless}. A monk\'s arithmetic, and it comforts not one widow."',
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
    'Orderic: "Decades later, in my Ecclesiastical History, I gave the dying king a speech. Understand what I am about to read to you: I wrote it. Historians like David Bates judge it my invention, not his words — the near-contemporary De Obitu Willelmi is far briefer, and confesses nothing."',
    'Orderic: "I have him say: \'I treated the native inhabitants of the kingdom with unreasonable severity... and caused the death of thousands by starvation and war, especially in Yorkshire.\'"',
    'Orderic: "And: \'In mad fury I descended on the English of the north like a raging lion.\' And: \'I tremble, my friends, when I reflect on the grievous sins which burden my conscience.\'"',
    '[IF ruthless >= 3]',
    'William: "If your speech is invented, monk, it is invented from true figures. I burned the seed corn. Kings are remembered by their totals, and mine reads {ruthless}."',
    '[ELSEIF spared == 1]',
    'William: "You will put words in my mouth, monk. Put this one in too: once — once — I passed a village by, and nothing broke. I have wondered about that ever since."',
    '[ELSE]',
    'William: "Invent carefully, monk. I hesitated in the hall and burned the shire anyway. There is no confession in Christendom shaped to fit a man who did the wrong thing slowly."',
    '[ENDIF]',
    'Narrator: "What is documented: on his deathbed he released prisoners and pardoned enemies, including his half-brother Odo. Then, Orderic reports, his attendants stripped the room and fled, leaving the body almost naked on the floor."',
    'Orderic: "The Anglo-Saxon Chronicle needed no invented speech. It wrote simply: \'Truly, in his time men had much oppression and many injuries.\'"',
    '[WAIT 1s]',
    '[IF ruthless >= 3]',
    '[CHOICE]',
    '- "To the funeral at Caen" -> wm_funeral',
    '[/CHOICE]',
    '[ELSE]',
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
    '[RANDOM]',
    'Narrator: "Final total on the gauge: RUTHLESSNESS {ruthless}. Run it again and choose differently — the machine will show you how little that changes, and exactly how much."',
    '[OR]',
    'Narrator: "You ended at RUTHLESSNESS {ruthless}. There is a lower number available. Whether the lower number buys anything is the question this chapter is actually asking."',
    '[/RANDOM]',
    '[CHOICE]',
    '- "Play the chapter again" -> wm_court',
    '- "The Assize and the Road" -> wm_ep_hub',
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
    // Aldric walks in from the forest edge at dusk
    '[ENTER co_peasant at 2,66]',
    '[MOVE co_peasant to 34,63 over 3s]',
    'Aldric: "My grandchildren keep pigs at the wood\'s edge, where the king\'s New Forest law says no commoner may. They go in anyway, at dusk. The wood does not report them."',
    'Orderic: "Every mercy you chose was small, and none of them stopped the conquest. But small mercies are how people remember that the law was once otherwise — and could be otherwise again."',
    'Narrator: "In 1217, a hundred and thirty years after William\'s death, the Charter of the Forest will be sealed: commoners\' rights to wood, pasture, and pannage restored — the first great clawback from the conquest machine."',
    'Aldric: "One granary they did not burn. One charter they could not refuse. It is not victory. It is seed corn."',
    'Orderic: "And seed corn, as any farmer in Yorkshire could have told the king, is the one thing you must never burn."',
    '[EFFECT gold_glow on co_peasant]',
    '[WAIT 1s]',
    '[RANDOM]',
    'Narrator: "Final total on the gauge: RUTHLESSNESS {ruthless}. The lowest number this chapter permits is not zero. Work out why, and you have understood the machine."',
    '[OR]',
    'Narrator: "You ended at RUTHLESSNESS {ruthless} — and the North still burned. Play it again if you want to prove the gauge wrong. It has been tried."',
    '[/RANDOM]',
    '[CHOICE]',
    '- "Play the chapter again" -> wm_court',
    '- "The Assize and the Road" -> wm_ep_hub',
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
      'Narrator: "The near-contemporary Ship List records some 776 vessels pledged for the crossing — Odo\'s hundred among them, and his brother Mortain\'s hundred and twenty. The fleet was a subscription: every hull a share in land not yet taken."',
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

// Per-event responder chooser. The factual intro is fixed; the "who
// speaks?" prompt is a RANDOM so a hub you revisit twenty times never
// greets you with the same sentence twice (the 1986 RNDSWITCH rule:
// every repeated reply gets variants or the world goes dead).
const CHOOSER_PROMPTS = [
  'Narrator: "Who speaks?"',
  'Narrator: "Six mouths were within earshot of that. Pick one."',
  'Narrator: "Same event, six vantage points. Whose account do you want on the record?"',
  'Narrator: "Every one of them was there, and every one of them tells it differently. That is not a flaw in the sources. That IS the sources."',
];

const chooserScene = (ev) => ({
  id: `wmch_${ev.id}`,
  name: `Voices: ${ev.name}`,
  sceneType: 'AGENCY',
  dropId: dropId(ev.drop[0], ev.drop[1]),
  stage: [...balloon(`wmch_${ev.id}_sign`, ev.sign, 50, 10, { scale: 0.9 })],
  script: lines(
    `Narrator: "${ev.intro.replace(/\s*Who speaks\?$/, '')}"`,
    '[RANDOM]',
    CHOOSER_PROMPTS.join('\n[OR]\n'),
    '[/RANDOM]',
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

// ==========================================================================
// EXPANSION LAYER — three data-driven families, all reachable from the
// Voices hub and all narraton-keyed (pool 'william_reactions'):
//   1. DUETS — two-character confrontation scenes, pairs x topics.
//   2. AFTERMATH CHAINS — that night / a season later / a generation later,
//      two perspectives on each of the four biggest events.
//   3. CHRONICLE — research incidents not yet staged (Revolt of the Earls,
//      Ely's fall, the Danes bought off, the 1085 geld, the oath ceremony,
//      the funeral at Caen, the Anglo-Saxon Chronicle's verdict...).
// Counterfactuals are flagged as such; disputed items stay chronicler-framed.
// ==========================================================================

// ---- 1. DUETS ------------------------------------------------------------

const DUET_PAIRS = [
  { id: 'wo', name: 'William & Odo', left: 'william_king', right: 'william_odo',
    desc: 'The king and his enforcer-bishop. Half-brothers, whole accomplices — until the arithmetic parts them.' },
  { id: 'worc', name: 'William & Orderic', left: 'william_king', right: 'orderic',
    desc: 'The king and the monk who will write him. These meetings happen only on the page — Orderic was born in 1075 — and the page admits it.' },
  { id: 'ha', name: 'Hereward & Aldric', left: 'hereward', right: 'peasant',
    desc: 'The rebel and the ploughman. One wants recruits; the other wants a harvest.' },
  { id: 'oo', name: 'Odo & Orderic', left: 'william_odo', right: 'orderic',
    desc: 'The patron and the scribe. One commissions the story; the other keeps writing the wrong one.' },
  { id: 'wh', name: 'William & Hereward', left: 'william_king', right: 'hereward',
    desc: 'The king and the outlaw. No chronicle records them meeting — so this stage does what chronicles do, and invents carefully.' },
  { id: 'ac', name: 'Aldric & the Village', left: 'peasant', right: 'crowd', rightOpts: { scale: 2.6 },
    desc: 'The ploughman and his neighbors. Every royal policy ends here, as an argument at the moot.' },
];

const DUETS = [
  // -- William x Odo --------------------------------------------------------
  { pair: 'wo', id: 'wm_duet_wo_survey', name: 'The Survey\'s Price', sign: 'WINCHESTER, 1085',
    drop: ['wm_hall', null], keys: { greed: { target: 80, scale: 35 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Odo: "Brother, the council balks at the survey. Commissioners for every shire, a second panel to check the first — the counting itself will cost a treasury."',
      'William: "And not counting costs me a kingdom a year. Every hide I cannot name is a hide some baron is quietly not paying on."',
      'Odo (Pointing/Smug): "Ah. So the book is not for the English at all. It is for OUR men — a leash written in Latin."',
      'William: "The English are already leashed. It is my tenants-in-chief who need reminding what they hold, and of whom."',
      'Odo: "Then the price is fair. A survey that frightens fewer than two hundred men has bought the whole island."',
      'Narrator: "The survey\'s deepest function, historians note, was exactly this: fixing what the king\'s own barons owed him. Extraction disciplines its middlemen first."',
    ] },
  { pair: 'wo', id: 'wm_duet_wo_church', name: 'The Church\'s Cut', sign: 'THE COURT, c.1080',
    drop: ['wm_hall', null], keys: { greed: { target: 75, scale: 40 }, repression: { target: 50, scale: 60 } },
    lines: [
      'William: "The Church holds a quarter of England, Odo. A QUARTER. I hold a fifth. Explain to me how the shepherd came to own more than the king."',
      'Odo: "Endowments, sire. Pious gifts. Penance — much of it yours. You bought absolution for Hastings by the hide, if you recall."',
      'William (Angry): "I recall Battle Abbey. I did not intend a precedent."',
      'Odo (Pointing/Smug): "Every gift to God passes through a bishop\'s hands, and hands are not frictionless. That is not corruption, brother. That is administration."',
      'William: "One day a king will do sums about your quarter, bishop. Pray it is not this one."',
      'Narrator: "It took four and a half centuries, but a king did the sums. The dissolution of the monasteries was Domesday\'s logic finally applied to Domesday\'s biggest winner."',
    ] },
  { pair: 'wo', id: 'wm_duet_wo_odo_fall', name: 'The Bishop Arrested', sign: 'THE ISLE OF WIGHT, 1082',
    drop: ['wm_hall', null], keys: { repression: { target: 70, scale: 40 }, greed: { target: 70, scale: 50 } },
    lines: [
      'Narrator: "1082. Odo — regent, richest man in England after the king — is caught recruiting knights for a private venture in Italy. Some said he meant to buy the papacy itself."',
      'William (Pointing/Angry): "You would strip my garrisons to make yourself Pope? MY knights, bishop, sworn on MY land?"',
      'Odo: "Every knight I fed was fed on my own revenues, sire. And a brother on Saint Peter\'s throne is worth more to you than—"',
      'William: "No man arrests a bishop, they told me. So mark the words: I do not arrest the Bishop of Bayeux. I arrest the Earl of Kent."',
      'Odo: "...You have been saving that sentence."',
      'William: "For years. Take him."',
      'Narrator: "The lawyer\'s trick is reported by the chroniclers. Domesday values the arrested earl\'s lands at some £3,000 across twenty-two counties — second only to the king\'s. Odo sat imprisoned at Rouen until William, dying, pardoned him — the machine forgiving its own component."',
    ] },
  { pair: 'wo', id: 'wm_duet_wo_geld', name: 'Six Shillings a Hide', sign: 'GLOUCESTER, CHRISTMAS 1085',
    drop: ['wm_hall', null], keys: { greed: { target: 85, scale: 30 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Odo: "A triple geld, brother? Six shillings on the hide, on land your own survey will mark waste? The North cannot pay it."',
      'William: "The Danes are fitting a fleet. Mercenaries cost silver, and the silver is in the land — where else has it ever been?"',
      'Odo: "In the land, sire, there is presently bark bread and buried children. You cannot tax ash twice."',
      'William (Pointing/Angry): "Then the survey will tell me precisely which acres are ash and which are hiding a mill. That is WHY there will be a survey, bishop. Grief is not an assessment."',
      'Narrator: "The great geld of 1085 and the Domesday inquest were twin instruments: the emergency tax, then the machine to make every future tax inescapable."',
    ] },
  { pair: 'wo', id: 'wm_duet_wo_castles', name: 'Who Pays for the Stone', sign: 'A CASTLERY, 1078',
    drop: ['wm_motte_drop', 'wm_hall'], keys: { repression: { target: 75, scale: 40 }, greed: { target: 65, scale: 50 } },
    lines: [
      'William: "The White Tower climbs too slowly. Stone from Caen, masons from Normandy — and the bill, Odo. Read me the bill again."',
      'Odo (Pointing/Smug): "Read it? Sire, the English are PAYING it. The geld funds the walls; the towns supply the labor by custom of burh-work. We have taught the country to build its own restraints."',
      'William: "And they do not refuse?"',
      'Odo: "Refuse whom? The castle is why no one refuses. It is a perfectly circular instrument — I have never admired anything more."',
      'Narrator: "Castle-work was among the burdens the Anglo-Saxon Chronicle listed bitterly under this reign: the conquered digging the conquest in deeper, at their own charge."',
    ] },
  { pair: 'wo', id: 'wm_duet_wo_trust', name: 'The Currency of Brothers', sign: 'ROUEN, 1087',
    drop: ['wm_rouen', 'wm_hall'], keys: { greed: { target: 60, scale: 50 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "September 1087. The dying king has pardoned nearly everyone — except, for days, one name."',
      'Odo: "The others are freed, brother. Morcar, Wulfnoth, even the thegns of the old risings. Only I still wear the chain. Your own blood."',
      'William (Sit/Sad): "Blood is why. A stranger\'s ambition is weather, Odo. A brother\'s is a wound. You will trouble my sons — I can pardon you and know it, both at once."',
      'Odo: "Yet you WILL pardon me."',
      'William: "The bishops insist mercy at the end outweighs the ledger. I have gambled my soul on worse arithmetic."',
      'Narrator: "He did pardon him — documented, unlike the speeches. And Odo did trouble his sons: within a year he led the rebellion of 1088 against William Rufus. The wound knew itself."',
    ] },

  // -- William x Orderic ----------------------------------------------------
  { pair: 'worc', id: 'wm_duet_worc_frame', name: 'The Monk Enters the Frame', sign: 'THE PAGE ITSELF',
    drop: ['wm_scriptorium', null], keys: { repression: { target: 60, scale: 50 }, greed: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "Understand the device before it speaks: Orderic Vitalis was born in 1075, nine years after Hastings. He never stood before this king. Every meeting here happens where all their meetings happened — on the page."',
      'Orderic: "You never granted me audience, sire. You were dead before my tonsure. And still I have spent my life in your company."',
      'William: "Then you are the worst kind of courtier, monk — one I cannot dismiss."',
      'Orderic: "Precisely so. The dead keep no doorwards. I walk in when I choose, and I bring my questions."',
      'William (Angry): "And your inventions. You will put a whole confession in my mouth."',
      'Orderic: "I will. And I will be honest enough that men nine centuries on can catch me doing it. Which of us, sire, dealt more fairly with posterity?"',
    ] },
  { pair: 'worc', id: 'wm_duet_worc_number', name: 'The Hundred Thousand', sign: 'THE PAGE: ON YORKSHIRE',
    drop: ['wm_village', null], keys: { repression: { target: 90, scale: 30 }, flareUps: { target: 4, scale: 5 } },
    lines: [
      'Orderic: "I wrote that more than a hundred thousand perished of the famine you made. Challenge the figure, sire. That is why I came."',
      'William: "It is too round, monk. Nothing true is that round. You counted rhetoric, not corpses."',
      'Orderic: "Granted — freely. The scholars after me will say tens of thousands and be nearer the mark. Now tell me what the correction buys you."',
      'William: "...Less than you would think."',
      'Orderic: "Less than nothing, sire. A man who quibbles the zeros concedes the deed. I made the number large because the deed was large. Amend my arithmetic; the graves keep their own."',
      'Narrator: "Orderic wrote this some fifty-five years after the fires. The historians\' consensus runs tens of thousands against his 100,000; Mark Hagger dissents that the Harrying was no worse than other conflicts of the age, and most of his colleagues dissent from the dissent. No historian runs it to zero."',
    ] },
  { pair: 'worc', id: 'wm_duet_worc_speech', name: 'The Borrowed Deathbed', sign: 'THE PAGE: ROUEN, REVISED',
    drop: ['wm_rouen', 'wm_scriptorium'], keys: { repression: { target: 70, scale: 45 }, greed: { target: 60, scale: 55 } },
    lines: [
      'William: "Read me the speech you gave me, monk. The one the scholars call your invention."',
      'Orderic: "\'I treated the native inhabitants with unreasonable severity... I am stained with the rivers of blood I have shed.\' Bates and the rest judge it mine, not yours. They judge rightly."',
      'William: "Then why write it? A false confession from a true king — your own Church calls that bearing false witness."',
      'Orderic: "Because you would never say it, and it needed saying, and the only mouth with authority to say it was yours. I stole your voice to tell your truth. I have done penance for the theft — never for the sentence."',
      'William (Sit/Sad): "...It is a good speech. That is the worst of it, monk. It is what I would have said, if I had been a man who said things."',
    ] },
  { pair: 'worc', id: 'wm_duet_worc_mother', name: 'The Half-Blood Chronicler', sign: 'THE PAGE: SHROPSHIRE, 1085',
    drop: ['wm_scriptorium', null], keys: { greed: { target: 55, scale: 60 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Orderic: "My father came with your conquest, a priest of Orleans. My mother was English. At ten they sent me to Normandy to be a monk, with no word of French in my mouth. I wept, and I wrote later that I felt an exile — like Joseph in Egypt."',
      'William: "And which half of you writes about me — the Norman or the English?"',
      'Orderic: "Both, sire. That is what makes me unbearable. The Norman half knows why you did it. The English half knows what it cost. Most men have the mercy of only one eye."',
      'William: "I made you, then. The conquest bred its own witness."',
      'Orderic: "Every machine does, sire. It is the one product no machine can help making."',
    ] },
  { pair: 'worc', id: 'wm_duet_worc_last', name: 'The Last Word', sign: 'THE PAGE: SAINT-EVROUL, c.1141',
    drop: ['wm_scriptorium', null], keys: { greed: { target: 60, scale: 55 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'William: "You outlived me by fifty years, monk. You had the last word by default. Do not preen about it."',
      'Orderic: "The last word is never held, sire, only borrowed. After me came the scholars who corrected me, and after them the scholars who corrected the corrections."',
      'William: "Then no one wins."',
      'Orderic: "The record wins. You built a book to fix every field forever; I built one to fix YOU. Yours is in the National Archives under glass. Mine is quoted every time a historian weighs your soul. We were the same kind of clerk, you and I."',
      'William (Angry): "I was a KING."',
      'Orderic: "You were an entry, sire. We are all entries. The only choice is who keeps the ledger."',
    ] },

  // -- Hereward x Aldric ------------------------------------------------------
  { pair: 'ha', id: 'wm_duet_ha_recruit', name: 'The Recruiter', sign: 'THE FEN EDGE, 1070',
    drop: ['wm_ely', null], keys: { repression: { target: 80, scale: 35 }, flareUps: { target: 4, scale: 5 } },
    lines: [
      'Hereward: "You have strong arms, farmer, and the king has burned your reasons to stay. The fen wants men. Come south with me."',
      'Aldric: "And who ploughs, if I carry a spear? My family did not stop eating when the king declared war on eating."',
      'Hereward (Attack/Determined): "The plough is what they tax, man! Every furrow you cut is a furrow cut FOR them. In the marsh, at least, your work feeds no Norman."',
      'Aldric: "In the marsh my children sleep on reeds and my wife learns widowhood in advance. You sell freedom, Hereward, but the price is everyone I have."',
      'Hereward: "The price of staying is the same, paid slower."',
      'Aldric: "Slower matters. Slower is where children grow up. That is a thing men without fields forget."',
    ] },
  { pair: 'ha', id: 'wm_duet_ha_bread', name: 'Bread and Banners', sign: 'THE FEN EDGE, 1070',
    drop: ['wm_ely', null], keys: { repression: { target: 85, scale: 30 }, flareUps: { target: 3, scale: 5 } },
    lines: [
      'Aldric: "Answer me one thing straight, before you preach again. When Ely wins — IF Ely wins — who holds my land after? You?"',
      'Hereward: "The rightful lords. The English lords."',
      'Aldric: "The English lords taxed me too, Hereward. Gently, the way a man milks his own cow — but do not stand in my burned yard and tell me the cow was free."',
      'Hereward (Attack/Determined): "There is a difference between a lord who shears you and a king who flays you!"',
      'Aldric: "Aye — and I know it better than you, for I am the skin. I will grant your difference. Grant me mine: neither of you has ever once asked the hands."',
      'Narrator: "The rebellion and the ploughman: allies against the machine, and not quite allies about what should replace it. This argument is older than both of them, and outlived both."',
    ] },
  { pair: 'ha', id: 'wm_duet_ha_price', name: 'What a Rising Costs', sign: 'A SAFE BARN, 1070',
    drop: ['wm_village', null], keys: { repression: { target: 85, scale: 30 }, flareUps: { target: 4, scale: 5 } },
    lines: [
      'Hereward: "I can promise you nothing but this: if you rise and lose, they take your life. If you kneel, they take everything else and leave you alive to inventory it."',
      'Aldric: "You say that like the choice is clean. My brother rose with the North. They did not take HIS life — they took his neighbors\'. The reprisal fell on everyone within a day\'s ride of his courage."',
      'Hereward: "That is the king\'s design, not mine. He prices rebellion in other men\'s families precisely so that men like you will say what you just said."',
      'Aldric: "...I know it. Knowing it does not unburn a village."',
      'Hereward (Attack/Determined): "No. But it tells you who lit it. Never let the arithmetic make you forget the arsonist."',
    ] },
  { pair: 'ha', id: 'wm_duet_ha_fen', name: 'The Offer of the Marsh', sign: 'THE FEN EDGE, WINTER 1070',
    drop: ['wm_ely', null], keys: { repression: { target: 90, scale: 30 }, flareUps: { target: 5, scale: 5 } },
    lines: [
      'Hereward: "Then not as a soldier. Bring the family whole — the fen feeds its own. Eels, fowl, fish. No geld collector has ever kept his boots dry past the second dyke."',
      'Aldric: "Refuge, then. Refuge I will think on. How many can the marsh feed, truly? Not forty. Not the whole Yorkshire road."',
      'Hereward: "...No. Not the whole road. I have turned men away, farmer. I count them at night, the turned-away. It is the one ledger I keep."',
      'Aldric: "Then you understand my staying better than you preach, fen-man. Somebody must grow the thing the marsh cannot."',
      'Hereward: "Grow it, then. And when the collector takes his cut — hide mine in the church, against the day."',
      'Narrator: "The fen as sanctuary is well-attested; its limits equally so. Every resistance is also a ration."',
    ] },
  { pair: 'ha', id: 'wm_duet_ha_after', name: 'After the Isle Fell', sign: 'A ROADSIDE, 1072',
    drop: ['wm_ely', null], keys: { repression: { target: 75, scale: 40 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Aldric: "So Ely fell. The monks showed them the causeway path, they say. Was it all for nothing, then — the year of the marsh?"',
      'Hereward: "The garrison would say so, those who kept their eyes. The king\'s clerks would say so; the isle is back in the rents. Ask me, I say something different."',
      'Aldric: "Say it, then."',
      'Hereward (Attack/Determined): "For one year, on one island, England was not conquered. That is now a true thing that happened, forever. They can hold the isle; they cannot make it always have been theirs."',
      'Aldric: "A year is not much, Hereward."',
      'Hereward: "It is one year more than despair predicted. Legends are seed corn too, farmer. Ask the ballad-men in two hundred years what grew."',
    ] },

  // -- Odo x Orderic ----------------------------------------------------------
  { pair: 'oo', id: 'wm_duet_oo_tapestry', name: 'The Tapestry Commission', sign: 'BAYEUX, c.1077',
    drop: ['wm_hall', null], keys: { greed: { target: 65, scale: 50 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Odo: "Seventy yards of embroidery, monk — the whole Conquest, stitched: the oath, the comet, the ships, the battle. And myself at the center, rallying the young men with my mace. I commissioned it; posterity will thank me."',
      'Orderic: "Posterity will STUDY it, your grace, which is not the same act. Seventy yards of the victor\'s case, worked — the needle-hands say — by ENGLISH seamstresses. Their stitching, your story."',
      'Odo (Pointing/Smug): "All stories are somebody\'s, little brother. I merely paid for mine in advance and in wool."',
      'Orderic: "And yet look closely at the margins — the borders where the small figures go. Dead men stripped of armor. A woman fleeing a burning house. Whoever stitched the margins filed a minority report."',
      'Odo: "...Decoration."',
      'Orderic: "Testimony, your grace. Sewn where the patron does not look. It is the oldest trick in my trade, and I did not teach it to them."',
      'Narrator: "The Bayeux Tapestry\'s Norman program and its ambiguous English-made margins are both real, and art historians still argue over what the borders mutter."',
    ] },
  { pair: 'oo', id: 'wm_duet_oo_pen', name: 'Who Owns the Story', sign: 'THE SCRIPTORIUM, c.1080',
    drop: ['wm_scriptorium', null], keys: { greed: { target: 60, scale: 55 }, repression: { target: 60, scale: 55 } },
    lines: [
      'Odo: "Your priory eats from Norman endowments, monk. Norman parchment, Norman candles, Norman patience. It would be graceful if the history reflected the diet."',
      'Orderic: "It reflects it constantly, your grace — every page I soften is the diet at work. I am not a free witness; I am a fed one. The best I can do is confess the feeding in the text."',
      'Odo (Pointing/Smug): "Then we understand each other. Write warmly of the king\'s piety, and your candles will multiply."',
      'Orderic: "And I DO write of his piety, for it was real. Then I write of Yorkshire, for it was real. Your grace, the trouble with buying a chronicler is that you only ever buy half."',
      'Odo: "Which half did I buy?"',
      'Orderic: "You will not know until you are dead. That is the arrangement. It has never once been renegotiated."',
    ] },
  { pair: 'oo', id: 'wm_duet_oo_penance', name: 'The Penance Tariff', sign: 'BATTLE ABBEY, c.1076',
    drop: ['wm_hall', null], keys: { greed: { target: 70, scale: 45 }, repression: { target: 50, scale: 60 } },
    lines: [
      'Orderic: "The bishops issued a penitential after Hastings, your grace — so much penance per man killed, so much per man struck. And the king discharged his share by building abbeys. Penance, paid in architecture."',
      'Odo: "Efficient, no? Battle Abbey stands where Harold fell: a prayer factory on the exact coordinates of the sin."',
      'Orderic: "A RECEIPT on the coordinates of the sin. Forgive me, but I have read the abbey\'s charters. Its endowed lands were taken from Englishmen. The apology is funded by the offense."',
      'Odo (Pointing/Smug): "All apologies are, little brother, if you audit them honestly. Contrition is a transfer like any other — the only question is who clears the payment."',
      'Orderic: "God clears the payment, your grace."',
      'Odo: "Then God has excellent collateral. A quarter of England, at last assessment."',
    ] },
  { pair: 'oo', id: 'wm_duet_oo_quarter', name: 'The Shepherd\'s Quarter', sign: 'THE SCRIPTORIUM, 1086',
    drop: ['wm_scriptorium', null], keys: { greed: { target: 80, scale: 35 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Orderic: "The survey is nearly copied, and I have read the totals. The Church — my Church, your grace — holds a quarter of the kingdom. We shepherds appear to own the sheep."',
      'Odo (Pointing/Smug): "And you say that as if it were a scandal rather than a stewardship. Who better to hold land than men sworn to poverty? We cannot even spend it on ourselves."',
      'Orderic: "No — we spend it on ourselves INSTITUTIONALLY, which is more durable. A greedy lord dies. A greedy abbey compounds."',
      'Odo: "Careful, monk. That sentence has a smell of the stake about it, three centuries early."',
      'Orderic: "It has the smell of the survey about it, your grace. I did not invent the totals. I only committed the indiscretion of adding them up."',
    ] },
  { pair: 'oo', id: 'wm_duet_oo_comet', name: 'The Comet as Editorial', sign: 'BAYEUX, c.1077',
    drop: ['wm_hall', null], keys: { greed: { target: 55, scale: 60 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Odo: "My favorite panel: the comet of 1066 blazing over Harold\'s coronation, and Harold flinching beneath it. ISTI MIRANT STELLA — these men marvel at the star. Heaven itself captioned our invasion."',
      'Orderic: "Heaven hung a light in the sky, your grace. The CAPTION is embroidery — yours. Had Harold won, the same comet would blaze over WILLIAM\'S ships in someone else\'s tapestry, and the marveling men would be Norman."',
      'Odo (Pointing/Smug): "Of course. That is what victory IS, monk: the exclusive license to interpret the weather."',
      'Orderic: "At last, your grace, we agree on a definition. I shall quote you — attributed, so the reader knows exactly which side explained the sky."',
      'Narrator: "Halley\'s Comet did appear in spring 1066; every party read it as an omen against the other. Omens are the medieval word for editorial."',
    ] },

  // -- William x Hereward ------------------------------------------------------
  { pair: 'wh', id: 'wm_duet_wh_parley', name: 'The Parley That Never Was', sign: 'NO PLACE. NO YEAR.',
    drop: ['wm_ely', null], keys: { repression: { target: 80, scale: 35 }, flareUps: { target: 4, scale: 5 } },
    lines: [
      'Narrator: "Flag this plainly: no chronicle records William and Hereward ever meeting. What follows is counterfactual — the conversation the sources leave a hole shaped like."',
      'William: "So. The famous fen-man. Smaller than the ballads."',
      'Hereward: "The ballads are yours too now, they tell me — your clerks write everything down. Bigger than the entries, then."',
      'William: "You held one wet island for one year. I hold everything else, forever. Why does the mismatch not humble you?"',
      'Hereward (Attack/Determined): "Because forever is your word, king, and words are the one ground you cannot garrison. Ask your own book: it says VASTA where it means \'here he won.\' Even your ledger flinches."',
      'William (Angry): "...I should have drained those fens."',
      'Hereward: "Aye. Your great-great-grandsons\' engineers will. And the ballads will still be about me."',
    ] },
  { pair: 'wh', id: 'wm_duet_wh_terms', name: 'The Price of an Oath', sign: 'NO PLACE. NO YEAR.',
    drop: ['wm_ely', null], keys: { repression: { target: 75, scale: 40 }, greed: { target: 65, scale: 50 } },
    lines: [
      'Narrator: "Counterfactual, again — though this one nearly happened: some traditions say Hereward eventually made peace and held land under William. The chroniclers disagree; the stage may choose."',
      'William: "Here are terms, fen-man. Swear, and hold your father\'s lands of me — of ME, mark — at a double relief. I have made this bargain with better men than you."',
      'Hereward: "With more OBEDIENT men than me. Tell me, what do the sworn men dream about, king? Do you know? Do you ask them?"',
      'William: "They dream of their acres, safe. That is the entire genius of the arrangement."',
      'Hereward (Attack/Determined): "They dream of the day the oath lapses. Every knee you buy is a lease, not a sale — you of all kings should read your own paper."',
      'William: "And yet they kneel."',
      'Hereward: "And yet I do not. Someone must hold the price of kneeling up where the kneelers can see it. That is my whole estate, king — and you cannot assess it."',
    ] },
  { pair: 'wh', id: 'wm_duet_wh_map', name: 'Roads and Marshes', sign: 'NO PLACE. NO YEAR.',
    drop: ['wm_ely', null], keys: { repression: { target: 70, scale: 45 }, flareUps: { target: 3, scale: 5 } },
    lines: [
      'Narrator: "A third invented meeting: two theories of England, given one stage."',
      'William: "England is roads, fen-man. Roads, fords, gates, tolls — the places where movement can be counted. Rule the counting-places and the rest follows."',
      'Hereward: "England is everything BETWEEN your counting-places. The marsh, the weald, the moor at night. You have conquered a diagram, king, and you mistake it for the country."',
      'William: "The diagram pays geld. Your between-places pay nothing."',
      'Hereward (Attack/Determined): "The between-places is where everything you cannot tax goes to live: songs, grudges, runaways, next year\'s rising. You have made it the freest ground in England. I merely moved there first."',
      'Narrator: "Forest law was, among other things, the crown\'s attempt to conquer the between-places. It manufactured outlaws for two centuries, and then it manufactured Robin Hood."',
    ] },
  { pair: 'wh', id: 'wm_duet_wh_legend', name: 'What History Keeps', sign: 'NO PLACE. AFTER BOTH.',
    drop: ['wm_ely', null], keys: { greed: { target: 55, scale: 60 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Narrator: "Last invention: both men dead, arguing over the estate that neither can hold — memory."',
      'William: "I got the Book, the Tower, the law-French in the law courts, the -villes and the -mounts on half the maps. What did you get, fen-man? A \'the.\' Hereward THE Wake — even your surname is folklore\'s charity."',
      'Hereward: "I got the part they tell children, king. You are the homework; I am the bedtime story. Ask any English child in nine centuries which of us they wanted to BE."',
      'William (Angry): "Wanting is not having. I HAD England."',
      'Hereward: "You had the deed to it. There is a thing under the deed that never conveyed, and it kept my name for a wonder and yours for a warning. Call it the freehold of the defeated."',
      'William: "...The Book has no column for that."',
      'Hereward (Attack/Determined): "No, king. That was always the point of me."',
    ] },

  // -- Aldric x the Village -----------------------------------------------------
  { pair: 'ac', id: 'wm_duet_ac_flee', name: 'Flee or Stay', sign: 'THE MOOT, WINTER 1069',
    drop: ['wm_village', null], keys: { repression: { target: 90, scale: 30 }, flareUps: { target: 4, scale: 5 } },
    lines: [
      'The Village: "The smoke is two valleys off, Aldric! South tonight, all of us, or we burn with the byres — put it to the moot!"',
      'Aldric: "And south to WHAT? The roads are already full of the burned-out. Winchester does not feed refugees; it counts them at the gates and turns the count away."',
      'The Village (Attack/Angry): "Better counted at a gate than charred in a doorway! You would have us wait for the torches out of STUBBORNNESS!"',
      'Aldric: "I would have us wait one day, with the wagons loaded and the children shod, and scouts on the ridge. Flight is a thing you can do exactly once. Spend it on the truth, not on the fear."',
      'The Village: "...One day, then. And Aldric — if the ridge lights a fire, we do not vote twice."',
      'Aldric: "If the ridge lights a fire, I will be the one carrying your grandmother. Load the wagons."',
    ] },
  { pair: 'ac', id: 'wm_duet_ac_seed', name: 'Under the Font', sign: 'THE CHURCH, BY NIGHT, 1069',
    drop: ['wm_village', null], keys: { repression: { target: 85, scale: 30 }, greed: { target: 60, scale: 55 } },
    lines: [
      'Aldric: "A third of the seed corn, under the church floor, tonight, before the knights come. Under the font — they do not dig where they were baptized."',
      'The Village: "It is sacrilege, Aldric. And if the priest talks—"',
      'Aldric: "The priest suggested it. Sacrilege is burning a granary in Advent; ask him. Now — whose hands are steady? We lift the stones, we do not scrape them."',
      'The Village (Attack/Angry): "And if they find it? The order says FORFEIT. They hang men over forfeit!"',
      'Aldric: "They hang men over nothing at all, neighbor; at least this rope would have a harvest in it. If the seed lives, the village lives, whatever burns above. That is the whole vote. Raise hands."',
      'Narrator: "No chronicle records this parish or this floor. Chronicles record what lords do. What villages did under their fonts is exactly the kind of fact that survives as absence — and as the villages that, somehow, sowed in spring."',
    ] },
  { pair: 'ac', id: 'wm_duet_ac_levy', name: 'The Castle Levy', sign: 'THE MOOT, 1070',
    drop: ['wm_motte_drop', 'wm_village'], keys: { repression: { target: 75, scale: 40 }, greed: { target: 60, scale: 55 } },
    lines: [
      'The Village: "The reeve posted it at the cross: every household sends a digger to the motte, or pays the fine in silver. Our backs or our coin — for THEIR tower!"',
      'Aldric: "Aye. And before anyone says the brave thing loudly: the last village that refused sent its diggers anyway, a month later, to a motte with a gibbet on it."',
      'The Village (Attack/Angry): "So we just DIG? Heap up the mound they will watch us from?"',
      'Aldric: "We dig slowly. We dig badly. We dig with every man mysteriously feeble and every basket a little small. There is a kind of no that looks like yes from a watchtower — it is the only no the moot can afford this year."',
      'The Village: "...My grandfather called that \'working like a conquered man.\'"',
      'Aldric: "Your grandfather was conquered, neighbor. The trick is to be conquered as expensively as possible."',
    ] },
  { pair: 'ac', id: 'wm_duet_ac_geldday', name: 'The Collector Is a Day Away', sign: 'THE MOOT, 1086',
    drop: ['wm_village', null], keys: { greed: { target: 85, scale: 30 }, repression: { target: 60, scale: 55 } },
    lines: [
      'The Village: "The geld collector sleeps at the hundred-court tonight and rides here tomorrow. Six shillings on the hide, and the book says we are worth more than we are!"',
      'Aldric: "Then tonight we decide together what tomorrow looks like, because he will ask us one by one, and one by one is how villages lose."',
      'The Village (Attack/Angry): "There IS no six shillings, Aldric! There is the plough-team and the winter pig and the roof!"',
      'Aldric: "So: the widow pays nothing — we cover her, split by hearths, as we did in my father\'s time. The pig goes to market at dawn, BEFORE he arrives, so it is coin and not confiscable pork. And no man volunteers a word about the mill."',
      'The Village: "He will see the mill, Aldric. It is in the book."',
      'Aldric: "Then he sees what the book says and not a stone more. Neighbors — the book is their weapon. Tonight, the moot is ours."',
    ] },
  { pair: 'ac', id: 'wm_duet_ac_forest', name: 'Into the Wood at Dusk', sign: 'THE FOREST EDGE, c.1080',
    drop: ['wm_ely', null], keys: { greed: { target: 70, scale: 45 }, repression: { target: 65, scale: 50 } },
    lines: [
      'The Village: "The verderer took Edwin\'s son for a hare, Aldric. A HARE. There is mast rotting under the oaks and our pigs are thin, and we stand at the fence like sheep staring at grass."',
      'Aldric: "The fence is real. So is the winter. So here is what my house does, and I say it aloud exactly once: we go in at dusk, by the charcoal path, two at a time, and the pigs eat fast."',
      'The Village (Attack/Angry): "And if the forest court takes YOUR son?"',
      'Aldric: "Then it takes him for feeding pigs, which is what the wood was FOR since before any king had a name. I will not teach my children that the law can redefine an oak. Let it catch us; it will not convince us."',
      'The Village: "...The whole vill, then. Two at a time. And no man sees his neighbor there."',
      'Narrator: "This quiet trespass, multiplied by every forest village for a century and a half, is what the Charter of the Forest finally wrote back into law in 1217. First the practice, then the right."',
    ] },
];

const duetScene = (d) => {
  const pair = DUET_PAIRS.find((p) => p.id === d.pair);
  return {
    id: d.id,
    name: `Duet: ${d.name}`,
    sceneType: 'WITNESS',
    dropId: dropId(d.drop[0], d.drop[1]),
    stage: [
      ...el(`${d.id}_l`, pair.left, 30, 62, pair.leftOpts || {}),
      ...el(`${d.id}_r`, pair.right, 70, 63, pair.rightOpts || {}),
      ...balloon(`${d.id}_sign`, d.sign, 50, 10, { scale: 0.8 }),
    ],
    script: lines(...d.lines, `[SCENE wm_duets_${d.pair}]`),
    narraton: { pool: RPOOL, keys: d.keys, repeatable: true },
    status: 'work',
  };
};

// Pair sub-hubs, then the duets hub.
for (const pair of DUET_PAIRS) {
  scenes.push({
    id: `wm_duets_${pair.id}`,
    name: `Duets: ${pair.name}`,
    sceneType: 'AGENCY',
    dropId: dropId('wm_hall'),
    stage: [
      ...el(`dp_${pair.id}_l`, pair.left, 30, 62, pair.leftOpts || {}),
      ...el(`dp_${pair.id}_r`, pair.right, 70, 63, pair.rightOpts || {}),
    ],
    script: lines(
      `Narrator: "${pair.desc}"`,
      '[RANDOM]',
      'Narrator: "Close the door and pick the argument."',
      '[OR]',
      'Narrator: "Two chairs, no witnesses, no chronicler taking dictation. Which conversation?"',
      '[OR]',
      'Narrator: "Set them at each other. The record is thinnest exactly where these two talked, which is why the stage is here at all."',
      '[/RANDOM]',
      '[CHOICE]',
      ...DUETS.filter((d) => d.pair === pair.id).map((d) => `- "${d.name}" -> ${d.id}`),
      '- "Back to the duets" -> wm_duets_hub',
      '[/CHOICE]',
    ),
    status: 'work',
  });
}
for (const d of DUETS) scenes.push(duetScene(d));

scenes.push({
  id: 'wm_duets_hub',
  name: 'Duets of the Conquest',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [...balloon('duets_hub_sign', 'DUETS: TWO VOICES, ONE MACHINE', 50, 10, { scale: 0.9 })],
  script: lines(
    '[RANDOM]',
    'Narrator: "Put two of them in a room and close the door. Where the chronicles record no such room, the stage says so out loud."',
    '[OR]',
    'Narrator: "History is mostly one voice at a time, edited. Put two in a room and the edits start arguing with each other. Where no such room existed, this stage admits it in the first line."',
    '[OR]',
    'Narrator: "Six pairings. Some of these meetings are documented, some are counterfactual, and every counterfactual one flags itself before it opens its mouth. That is the house rule."',
    '[/RANDOM]',
    '[CHOICE]',
    ...DUET_PAIRS.map((p) => `- "${p.name}" -> wm_duets_${p.id}`),
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ---- 2. AFTERMATH CHAINS ---------------------------------------------------
// For each of the four biggest events: two perspectives, three scenes each —
// that night / a season later / a generation later. The long tail of policy.

const CHAINS = [
  { ev: 'harrying', name: 'The Harrying',
    persps: [
      { key: 'aldric', label: 'the burned (Aldric)', actor: 'peasant', drop: ['wm_village', null],
        keys: { repression: { target: 90, scale: 30 }, flareUps: { target: 4, scale: 5 } },
        stages: [
          { sign: 'THAT NIGHT — WINTER 1069', lines: [
            'Aldric: "We are on the road with the wagon and the dark. Behind us the village is a red smudge under the cloud. My daughter keeps asking which of the fires is ours."',
            'Aldric: "I told her the middle one. I do not know. From a mile off, your whole life is just one of the fires."',
            'Narrator: "That night there were hundreds of such roads. The chronicles compress them into a sentence; the sentence took all winter to walk."',
          ] },
          { sign: 'A SEASON LATER — SPRING 1070', lines: [
            'Aldric: "Sowing time, and nothing to sow. We ate the seed in February — I have said that aloud once before and it did not get easier."',
            'Aldric: "The ones who stayed dig for roots where the granary stood. The ones who left send no word. There is a new word going round instead: the clerks\' word. Vasta."',
            'Narrator: "Famine\'s second year is crueler than its first: the first eats the food, the second eats the future. That is what burning seed corn buys."',
          ] },
          { sign: 'A GENERATION LATER — c.1100', lines: [
            'Aldric: "My grandson ploughs now — a tenant on land my father held free. He thinks the castle on the hill has always been there. He thinks the rent has always been the rent."',
            'Aldric: "That is the finished work, better than any garrison: not that they burned us, but that the children cannot imagine the field before the fire."',
            'Narrator: "The Harrying\'s last casualty was the memory of alternatives. When the survey\'s grandchildren paid their dues, they paid them as the order of nature."',
          ] } ] },
      { key: 'odo', label: 'the ledger (Odo)', actor: 'william_odo', drop: ['wm_hall', null],
        keys: { repression: { target: 85, scale: 35 }, greed: { target: 70, scale: 50 } },
        stages: [
          { sign: 'THAT NIGHT — THE COURT, 1069', lines: [
            'Odo: "The dispatches arrive by relay: York secured, the columns fanned out, the burning proceeding on schedule. The hall is quiet. Success of this kind does not produce toasts."',
            'Odo (Pointing/Smug): "I note for the record that no baron objected. Remember that, when they spend the next twenty years blaming only the king."',
            'Narrator: "Complicity by silence is the machine\'s cheapest component. It was fully staffed that night."',
          ] },
          { sign: 'A SEASON LATER — THE EXCHEQUER, 1070', lines: [
            'Odo: "Now the other column of the ledger: the northern geld is simply GONE. You cannot tax ash. Whole hundreds return nothing, and will return nothing for years."',
            'Odo: "We bought quiet and paid in revenue. I signed for it with the rest — but let no man call the Harrying cheap. It was the most expensive silence in Christendom."',
            'Narrator: "The regime\'s own arithmetic condemned the policy sooner than its conscience did. Waste pays no rent — the survey would spend pages proving it."',
          ] },
          { sign: 'A GENERATION LATER — THE AUDIT, c.1090', lines: [
            'Odo: "Two-thirds of Yorkshire still marked waste, seventeen years on — the king\'s own book says so, in the neatest hand in Europe. As an investment, the Harrying returned nothing but obedience."',
            'Odo (Pointing/Smug): "And obedience, I am obliged to report, turned out to be the product. The North never rose again. The ledger closes in the black, if you keep the dead off the books."',
            'Narrator: "Every extraction system learns this accounting: atrocity is a loss on every page except the one that matters to power. Keep your eye on which page they balance."',
          ] } ] } ] },
  { ev: 'domesday', name: 'Domesday',
    persps: [
      { key: 'aldric', label: 'the assessed (Aldric)', actor: 'peasant', drop: ['wm_village', null],
        keys: { greed: { target: 80, scale: 35 }, repression: { target: 55, scale: 60 } },
        stages: [
          { sign: 'THAT NIGHT — THE ASSESSMENT ARRIVES, 1086', lines: [
            'Aldric: "The commissioners came today. Every plough named, every ox, the mill, the meadow — and me, standing in my own yard, answering a stranger\'s Latin about my father\'s land."',
            'Aldric: "The priest says the entry cannot be changed, not ever. Tonight the village feels smaller — as if the writing-down of the thing took a part of the thing away."',
            'Narrator: "It did. What is assessed is owned differently forever after. The village learned in one afternoon what economists would need eight centuries to phrase."',
          ] },
          { sign: 'A SEASON LATER — THE COLLECTOR RETURNS, 1087', lines: [
            'Aldric: "The geld collector came back with the book\'s figure, and the book\'s figure does not know about the wet summer. \'Value: forty shillings.\' It was a dry-year number. He collects it in a wet year."',
            'Aldric: "I asked him: does the book ever come DOWN? He laughed. Not unkindly. The way you laugh at a child\'s question about death."',
            'Narrator: "A fixed assessment converts every bad harvest into debt. The book\'s permanence — its whole point — is precisely what made it merciless."',
          ] },
          { sign: 'A GENERATION LATER — THE GRANDSON\'S RENT, c.1110', lines: [
            'Aldric: "My grandson pays rent on land his grandfather owned. He pays it to the third Norman lord in a row, and the figure comes out of the same book, and no one alive remembers the field being free."',
            'Aldric: "That is what the counting was FOR. Not to know England. To make this exact morning — a boy, a ledger, a rent — feel like the weather."',
            'Narrator: "Domesday\'s entries were cited in English courts into the twentieth century. The boy\'s morning lasted, by conservative count, eight hundred years."',
          ] } ] },
      { key: 'orderic', label: 'the record (Orderic)', actor: 'orderic', drop: ['wm_scriptorium', null],
        keys: { greed: { target: 75, scale: 40 }, repression: { target: 55, scale: 60 } },
        stages: [
          { sign: 'THAT NIGHT — THE SHIRE COURT, 1086', lines: [
            'Orderic: "I watched the inquest sit: eight jurors sworn, half English, half French — the conquered made to certify the count of their own conquest, on oath, so that no man could later call the figures foreign."',
            'Orderic: "It was the cleverest thing I ever saw done with a Bible. The book would be unimpeachable because its victims had sworn to it."',
            'Narrator: "The sworn local juries are documented procedure. Extraction that co-signs its subjects is extraction that plans to last."',
          ] },
          { sign: 'A SEASON LATER — THE FAIR COPY, 1087', lines: [
            'Orderic: "One scribe — the scholars will one day prove it was mostly one hand — is condensing the returns at Winchester. The king died in September; the hand keeps writing. That taught me something I did not want to know."',
            'Orderic: "The book never needed the king. The king was the book\'s way of getting itself written."',
            'Narrator: "Great Domesday was largely written by a single scribe, and work continued around the king\'s death. Systems outlive the appetites that commission them — that is what makes them systems."',
          ] },
          { sign: 'A GENERATION LATER — THE CITATION, c.1110', lines: [
            'Orderic: "Already the phrase is proverbial: a dispute \'goes to the book,\' and from the book there is no appeal. Men who cannot read carry its entries in their heads like psalms."',
            'Orderic: "I have written thousands of pages and will be argued with forever. That volume ended arguments. God forgive me, some mornings I envy the clerk."',
            'Narrator: "By the 1170s the English themselves called it Domesday — judgment day — \'because its decisions, like those of the Last Judgement, are unalterable.\' The nickname is the review."',
          ] } ] } ] },
  { ev: 'forest', name: 'The Forest Law',
    persps: [
      { key: 'aldric', label: 'the fenced-out (Aldric)', actor: 'peasant', drop: ['wm_ely', null],
        keys: { greed: { target: 70, scale: 40 }, repression: { target: 60, scale: 50 } },
        stages: [
          { sign: 'THAT NIGHT — THE BOUNDS POSTED, c.1079', lines: [
            'Aldric: "The verderer rode the bounds today and the wood we have gleaned since Alfred\'s time is \'afforested.\' The oaks did not move. The law moved, and took the oaks with it."',
            'Aldric: "Tonight the village is doing what villages do: standing at the new invisible fence, teaching itself where the line runs. The pigs have not been told."',
            'Narrator: "Forest law criminalized custom itself — firewood, pannage, the hare in the pot. It is the purest case in the whole chapter: nothing was taken except the right to use."',
          ] },
          { sign: 'A SEASON LATER — THE FIRST COURT, c.1080', lines: [
            'Aldric: "The forest court sat at the hundred-oak. Edwin\'s boy, taken for a hare: fined past his worth, and worse threatened for a second offense. The justices read the tariff aloud — they WANT it repeated in the villages."',
            'Aldric: "It was repeated. Along with something else the justices did not intend: the path the charcoal burners use, after dusk, when the verderer sups."',
            'Narrator: "The court\'s penalties — mutilation in the harshest tellings, chronicler-reported — did the advertising. The dusk-paths did the resisting. Both institutions ran for a century and a half."',
          ] },
          { sign: 'A GENERATION LATER — THE OUTLAW\'S WOOD, c.1100', lines: [
            'Aldric: "My grandson knows three men living wild in the king\'s forest — outlawed over deer, feeding themselves on the king\'s own herd out of spite and hunger alike. The village leaves bread on certain stumps."',
            'Aldric: "And this summer, word out of the south: the second King William, shot dead by an arrow in his own New Forest. The greenwood\'s reply, men whisper. God\'s bag-limit."',
            'Narrator: "William Rufus died by arrow in the New Forest in 1100 — accident by every sober account, judgment by every village one. When a law manufactures outlaws, it also manufactures the audience for that whisper."',
          ] } ] },
      { key: 'william', label: 'the crown (William)', actor: 'william_king', drop: ['wm_hall', null],
        keys: { greed: { target: 70, scale: 45 }, repression: { target: 65, scale: 50 } },
        stages: [
          { sign: 'THAT NIGHT — THE DECLARATION, c.1079', lines: [
            'William: "Tonight I have made a forest. Not planted one — DECLARED one. The trees stood there already; what I created was the crime of touching them."',
            'William: "My clerks say no king of the English ever owned the green of the wood before. Good. Let the innovation bear my name with the rest."',
            'Narrator: "The royal forest was a Norman legal invention on English ground: jurisdiction as property. It is rent abstracted one full turn further than land itself."',
          ] },
          { sign: 'A SEASON LATER — THE COMPLAINTS, c.1080', lines: [
            'William: "The petitions come up through the sheriffs: villages plead ancient custom, monks plead their swine, widows plead the deadfall wood. I am told a king who loved God would relent."',
            'William (Angry): "The deer do not petition. That is what I like about the deer. DENIED — all of it. A right of use surrendered once is surrendered; a right of use defended once is a precedent."',
            'Narrator: "He understood commons better than the commoners\' own advocates: every use-right is a leak in the rent. Forest law was the caulking."',
          ] },
          { sign: 'A GENERATION LATER — THE CHRONICLE\'S LINE, c.1100', lines: [
            'William (Sit/Sad): "From wherever dead kings watch, I read my obituary in the English monks\' Chronicle. They wrote that I loved the tall deer as if I were their father."',
            'William: "They meant it as damnation, and it has the sound of tenderness. That is the most dangerous sentence ever written about me — it makes the fence sound like an embrace."',
            'Narrator: "The Chronicle\'s verse obituary is real and unsparing: the deer-line, the castles, the geld. A century of forest misery later, the Charter of 1217 began prying the fence back open."',
          ] } ] } ] },
  { ev: 'salisbury', name: 'The Salisbury Oath',
    persps: [
      { key: 'william', label: 'the crown (William)', actor: 'william_king', drop: ['wm_salisbury', null],
        keys: { greed: { target: 75, scale: 45 }, repression: { target: 65, scale: 60 } },
        stages: [
          { sign: 'THAT NIGHT — SALISBURY, 1 AUGUST 1086', lines: [
            'William: "It is done. Every landholder of any account in England knelt on one plain and swore to me over the heads of their own lords. The lawyers have no name yet for what I did today."',
            'William: "I will give them one: I made loyalty itself a tenancy. No man in England now holds so much as his honor except of the king."',
            'Narrator: "The Salisbury oath cut across the feudal chain — vassal\'s vassal bound directly to the crown. It is the constitutional moment of the whole machine: no ground, and now no allegiance, outside the system."',
          ] },
          { sign: 'A SEASON LATER — THE WRITS RUN, 1087', lines: [
            'William: "Already the writs run differently. A dispute between a tenant and his lord now ends \'saving the fealty owed the king\' — six words in every oath, like a clause of daylight I own."',
            'William: "My father held a duchy with a sword across his knees. I hold a kingdom with a sentence. Tell me which of us was the greater conqueror."',
            'Narrator: "The reservation of fealty to the king became standard in homage. Conquest had finished converting itself into boilerplate — the most durable material known to power."',
          ] },
          { sign: 'A GENERATION LATER — THE HEIRS SWEAR, c.1110', lines: [
            'William: "My son Henry takes homage now from men whose fathers knelt to me at Salisbury, and their sons will kneel to his. No one questions the form. The form has become the country."',
            'William: "Understand what was actually conquered in 1066. Not England — England was merely occupied. What was conquered was the FUTURE: every heir, swearing forward, forever."',
            'Narrator: "Tenures traceable to the Conquest settlement structured English landholding for centuries; its doctrine — all land held of the Crown — remains the formal root of English land law today. Forever was only barely an exaggeration."',
          ] } ] },
      { key: 'aldric', label: 'the ploughed-over (Aldric)', actor: 'peasant', drop: ['wm_village', null],
        keys: { greed: { target: 70, scale: 50 }, repression: { target: 60, scale: 55 } },
        stages: [
          { sign: 'THAT NIGHT — THE NEWS AT THE MOOT, 1086', lines: [
            'Aldric: "Word from the south: the lords rode to Salisbury and swore the land away over our heads — every acre held of the king, theirs and ours alike."',
            'Aldric: "The moot chewed on it and found the taste familiar. My rent climbs the same ladder it climbed yesterday. Only now the ladder has one top, and the top has a name."',
            'Narrator: "For the plough, the oath changed nothing that day — which is itself the finding. Constitutional revolutions at the top arrive at the bottom as continuity."',
          ] },
          { sign: 'A SEASON LATER — THE NEW LORD, 1087', lines: [
            'Aldric: "Our lord displeased the king and is gone — and here is the lesson: NOTHING HAPPENED. A new Norman sits in the hall by Michaelmas, the reeve reads the same book, the rent falls due the same day."',
            'Aldric: "Under the old English lords, a lord\'s fall shook his villages. Now lords slide in and out of the frame like painted panels. The frame is the king\'s. We are tenants of the frame."',
            'Narrator: "Interchangeable lordship is the oath\'s deepest gift to extraction: the system no longer depends on any particular extractor. George would recognize it instantly — the rent survives every landlord."',
          ] },
          { sign: 'A GENERATION LATER — FREE MEN, BOUND, c.1110', lines: [
            'Aldric: "The law my grandson lives under says he is a free man. The ledger he lives under says he is bound to the land, owes work-days, cannot leave without license. Both documents are correct. That is the trick of it."',
            'Aldric: "They never repealed our freedom. They just built a system where freedom had nowhere to stand. Ask the lawyers in eight hundred years what \'free market\' means; I suspect the trick will still be working."',
            'Narrator: "Post-Conquest law hardened many free English smallholders toward villeinage — free in name, bound in obligation. The chapter\'s thesis in one household: the margin did not close by decree; it closed by arithmetic."',
          ] } ] } ] },
];

for (const chain of CHAINS) {
  for (const p of chain.persps) {
    const stageNames = ['That Night', 'A Season Later', 'A Generation Later'];
    p.stages.forEach((st, i) => {
      const id = `wm_after_${chain.ev}_${p.key}_${i}`;
      const nextId = i < 2 ? `wm_after_${chain.ev}_${p.key}_${i + 1}` : null;
      scenes.push({
        id,
        name: `${chain.name} — ${p.label}: ${stageNames[i]}`,
        sceneType: 'WITNESS',
        dropId: dropId(p.drop[0], p.drop[1]),
        stage: [
          ...el(`${id}_el`, p.actor, 40, 62),
          ...balloon(`${id}_sign`, st.sign, 72, 10, { scale: 0.8 }),
        ],
        script: lines(
          ...st.lines,
          '[CHOICE]',
          ...(nextId ? [`- "${stageNames[i + 1]}" -> ${nextId}`] : []),
          '- "Back to the aftermaths" -> wm_after_hub',
          '[/CHOICE]',
        ),
        narraton: { pool: RPOOL, keys: p.keys, repeatable: true },
        status: 'work',
      });
    });
  }
}

scenes.push({
  id: 'wm_after_hub',
  name: 'Aftermaths',
  sceneType: 'AGENCY',
  dropId: dropId('wm_scriptorium', 'wm_hall'),
  stage: [...balloon('after_hub_sign', 'AFTERMATHS: THE LONG TAIL OF POLICY', 50, 10, { scale: 0.9 })],
  script: lines(
    '[RANDOM]',
    'Narrator: "An order is an evening\'s work. What it ordered goes on for generations. Four policies, two vantage points each: that night, a season later, a generation later."',
    '[OR]',
    'Narrator: "Policy is fast. Consequence is slow. Four orders, followed down three time-scales apiece — the night it happened, the season it bit, the generation that could no longer imagine otherwise."',
    '[OR]',
    'Narrator: "The chronicles give you the evening the order was signed. They almost never give you the spring. Here are the springs."',
    '[/RANDOM]',
    '[CHOICE]',
    ...CHAINS.flatMap((c) =>
      c.persps.map((p) => `- "${c.name} — ${p.label}" -> wm_after_${c.ev}_${p.key}_0`),
    ),
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ---- 3. CHRONICLE — uncovered research, staged ------------------------------

const RESEARCH = [
  { id: 'wm_x_earls1', name: 'The Bridal Feast Conspiracy', sign: 'EXNING, 1075',
    drop: ['wm_hall', null], left: ['william_odo', 30], right: ['orderic', 70],
    keys: { flareUps: { target: 3, scale: 5 }, repression: { target: 65, scale: 50 } },
    lines: [
      'Narrator: "1075. The Revolt of the Earls — the last serious rising of the reign, and it is not English at all. It is hatched by William\'s OWN earls, at a wedding."',
      'Orderic: "Ralph, Earl of East Anglia, weds against the king\'s wish, and at the bride-ale the cup goes round with treason in it: Ralph, Roger of Hereford — Norman and Breton blood — and, drawn in fatally, Waltheof, the last great English earl."',
      'Odo: "Mark the shape of it, monk: the machine\'s first true revolt came from its shareholders. The English rose because they had lost everything; the earls rose because they had merely gotten less than everything."',
      'Orderic: "The Chronicle preserved the taunt in verse: \'there was that bride-ale, the source of man\'s bale.\'"',
      'Narrator: "Greed inside the machine proved as combustible as grievance outside it. The revolt collapsed within months — the interesting part is what happened to each conspirator."',
      '[SCENE wm_x_earls2]',
    ] },
  { id: 'wm_x_earls2', name: 'Three Traitors, Three Prices', sign: 'WINCHESTER, 1076',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['orderic', 70],
    keys: { repression: { target: 75, scale: 40 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Narrator: "The revolt is crushed while William is still in Normandy — the system suppressing a rising without its king, which is its own grim milestone. Then the sentencing."',
      'William: "Ralph the Breton: fled abroad, beyond reach. Roger the Norman: prison and forfeiture — Norman blood buys a Norman price. Waltheof the Englishman: he came to me himself and confessed the whole plot before it ripened."',
      'Orderic: "And Waltheof alone went to the block — beheaded on a hill outside Winchester, the only earl you ever executed, and the only English one. Sire, even your own justices could see the pattern."',
      'William (Angry): "The pattern IS the sentence, monk. A Norman traitor is a rival. An English traitor is a precedent."',
      'Orderic: "The English took him for a martyr; miracles were reported at his tomb at Crowland. I record the miracles without vouching for them — and note that no miracles were required to see the double standard."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_danes1', name: 'The Fleet That Was Paid to Leave', sign: 'THE HUMBER, 1070',
    drop: ['wm_ely', null], left: ['william_king', 30], right: ['hereward', 70],
    keys: { greed: { target: 65, scale: 50 }, flareUps: { target: 3, scale: 5 } },
    lines: [
      'Narrator: "The Danish fleet that came for the 1069 rising winters in the Humber — the rebels\' great hope, the invasion that could reopen everything. William does not fight it."',
      'William: "Why would I fight a fleet whose price is written on its rigging? I sent envoys with silver. King Sweyn\'s men may plunder the coast on their way home — and go home they will."',
      'Hereward (Attack/Determined): "We held Ely expecting Danish axes beside ours. What arrived was the news that the axes had been PURCHASED — our allies bought off like a bad harvest, with the geld wrung out of us."',
      'William: "That is the beauty your kind never sees, fen-man. Your rising paid for its own betrayal. Extraction funds diplomacy; diplomacy cancels rebellion; rebellion justifies extraction. The wheel needs no sword at all some years."',
      'Narrator: "The Danes took the Danegeld and sailed, as Danes had before and would again. The North\'s last outside hope left with them — bought, not beaten."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_danes2', name: 'The Invasion Scare of 1085', sign: 'ENGLAND, 1085',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['william_odo', 70],
    keys: { greed: { target: 80, scale: 35 }, repression: { target: 65, scale: 50 } },
    lines: [
      'Narrator: "1085. Cnut IV of Denmark assembles a great fleet to invade England. William\'s response is the largest army ever brought into the kingdom — of mercenaries."',
      'William: "Hired men, in numbers the Chronicle calls beyond telling. And here is the order the shires will remember: the host is BILLETED on the landholders. Every lord feeds soldiers in proportion to his land."',
      'Odo (Pointing/Smug): "In proportion to his land. And how, sire, will you know each man\'s proportion — precisely, arguably, to the last hide?"',
      'William: "...You see it. The billeting demands an assessment; the assessment demands a survey. The Danish fleet never sails, but at Gloucester this Christmas I will commission the counting of England anyway."',
      'Narrator: "The Chronicle links the great host of 1085 and the deep speech at Gloucester that launched Domesday. The invasion never came; the invoice became permanent. Emergencies are how machines acquire new organs."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_geld', name: 'The Geld of 1084', sign: 'THE SHIRES, 1084',
    drop: ['wm_village', null], left: ['peasant', 30], right: ['crowd', 70, { scale: 2.6 }],
    keys: { greed: { target: 85, scale: 30 }, repression: { target: 60, scale: 55 } },
    lines: [
      'Aldric: "Six shillings on the hide this year — triple the custom. The reeve read it out and then read it out again, because no one at the moot would believe a number that size the first time."',
      'The Village (Attack/Angry): "Six shillings is the plough-team! Six shillings is the winter! What is left after six shillings is the NEXT tax\'s problem!"',
      'Aldric: "And note the year, neighbors, for the pattern is the whole lesson: first the great geld to find where the silver hides. Then, hard behind it, the commissioners — to make sure it can never hide again."',
      'Narrator: "The heavy geld of 1084 at six shillings the hide is on the record; the survey followed within two years. Tax first, then build the instrument that perfects the tax: the sequence is the signature of the machine."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_ely_fall1', name: 'The Monks Choose', sign: 'ELY ABBEY, 1071',
    drop: ['wm_ely', null], left: ['orderic', 30], right: ['hereward', 70],
    keys: { repression: { target: 80, scale: 35 }, greed: { target: 70, scale: 45 } },
    lines: [
      'Narrator: "How did the unassailable isle fall? Not to the causeway. The abbey of Ely held rich estates OUTSIDE the fens — and the king quietly took possession of every one."',
      'Orderic: "The choice put to the brothers was never spoken as a threat; it did not need to be. Keep faith with the rebels and lose the abbey\'s lands forever — or make peace, show the king a path, and keep Ely rich."',
      'Hereward (Attack/Determined): "We defended their island with our blood, and they sold the causeway path for their MANORS. Write that in your history, monk — the marsh never betrayed us. The landlords of the marsh did."',
      'Orderic: "I write it with shame, being myself a man fed by abbey lands: the siege of Ely was won by seizing rents. The Conqueror understood the Church because the Church, God pity us, was structured exactly like him."',
      'Narrator: "Property held hostage beat an impregnable position. Note the mechanism — it is the same one that ends most resistance in this game: not defeat. Foreclosure."',
      '[SCENE wm_x_ely_fall2]',
    ] },
  { id: 'wm_x_ely_fall2', name: 'The Garrison\'s Price', sign: 'THE ISLE OF ELY, 1071',
    drop: ['wm_ely', null], left: ['william_king', 30], right: ['hereward', 70],
    keys: { repression: { target: 85, scale: 30 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Narrator: "The king\'s men cross by the shown path. The isle that could not be stormed is simply walked into. Then the sentences."',
      'William: "The leaders: imprisonment. The commons of the garrison: let them keep their lives and lose what the law names — hands for some, eyes for others — and go where they will as the lesson they have become."',
      'Hereward: "Maimed and released. Not mercy — ADVERTISING. Every market town got a walking notice of what defiance costs, paid for out of other men\'s bodies."',
      'William: "You escaped into the mist, fen-man, so the chroniclers could not agree on your ending — pardoned in one tale, cut down in another, vanished in a third."',
      'Hereward (Attack/Determined): "Vanished is the true one, king. A legend\'s whole trade is to be unaccounted for. It is the one entry your book could never close."',
      'Narrator: "The mutilation of the Ely garrison is chronicle-reported; Hereward\'s end is genuinely unknown. Both facts have been doing their separate work ever since."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_oath', name: 'The Ceremony at Salisbury', sign: 'SALISBURY PLAIN, 1 AUGUST 1086',
    drop: ['wm_salisbury', null], left: ['william_king', 30], right: ['orderic', 70],
    keys: { greed: { target: 75, scale: 45 }, repression: { target: 65, scale: 60 } },
    lines: [
      'Narrator: "Lammas Day, 1086. The Chronicle\'s own words: there came to him \'all the land-holding men of any account throughout England, whosesoever men they were.\' Whosesoever men they were — the clause that changed the constitution."',
      'Orderic: "Picture the mechanics, for the record: hundreds of landholders, each kneeling, hands placed between the king\'s hands, swearing to be faithful to him AGAINST ALL OTHER MEN — including, and this is the blade in the velvet, against their own lords."',
      'William: "The old chain ran man to lord, lord to king, and a clever rebel could hide in the links. After Salisbury there are no links. Every hand in England has been between MY hands. I have shaken the whole kingdom, one man at a time."',
      'Orderic: "And the book of the survey lay finished in the same season — the count and the clasp, delivered together. I wrote once that they were two clasps of one collar. I have never improved on the sentence."',
      'Narrator: "Historians pair the oath with Domesday as the Conquest\'s administrative consummation: first know exactly what every man holds, then bind every holder directly to the crown. The machine\'s two hands, closing."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_rufus', name: 'An Arrow in the New Forest', sign: 'THE NEW FOREST, 2 AUGUST 1100',
    drop: ['wm_ely', null], left: ['orderic', 30], right: ['peasant', 70],
    keys: { flareUps: { target: 2, scale: 5 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "Foreshadow, thirteen years past the king\'s death. His son William Rufus, hunting in the New Forest his father emptied by law, takes an arrow through the chest. His companions abandon the body; a charcoal-burner carts it to Winchester."',
      'Orderic: "An accident, by every sober account — Walter Tirel\'s arrow glancing off a stag, they said, though Tirel spent his life denying he loosed it. But no chronicler could resist the geometry: a king of the forest law, dead in the forest, by the forest\'s own instrument."',
      'Aldric: "In the villages we were not sober about it at all. Two of the Conqueror\'s blood died in that forest — Richard the brother too, years before. We called it the wood keeping its own tally. You fence out the poor, but you cannot fence out arithmetic."',
      'Orderic: "The monks preached it as judgment upon the family for the churches and villages the afforestation displaced. I record the sermon and the skepticism together, as is my habit. The people, I note, required no sermon."',
      'Narrator: "The Rufus death is fact; the meaning is folklore — and the folklore is data. When a legal system is hated enough, even its accidents get entered on the other side of the ledger."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_funeral1', name: 'Ascelin\'s Claim', sign: 'SAINT-ETIENNE, CAEN, 1087',
    drop: ['wm_hall', null], left: ['orderic', 30], right: ['william_odo', 70],
    keys: { greed: { target: 85, scale: 30 }, repression: { target: 50, scale: 60 } },
    lines: [
      'Narrator: "The funeral at Caen, and the moment the whole chapter has been arguing toward. As the body is borne to the grave, a man steps out of the crowd and stops the rite."',
      'Orderic: "His name was Ascelin, son of Arthur. He cried out before the bishops that the ground of the grave itself was stolen — his father\'s house had stood on that spot, seized without payment when the king built the abbey. He forbade the burial IN GOD\'S NAME, over his father\'s land."',
      'Odo: "And there, before princes, the Church HALTED. Not for doctrine — for TITLE. The bishops questioned the neighbors, found the claim true, and counted out sixty shillings on the spot for the grave-plot alone, with more promised for the rest."',
      'Orderic: "Sixty shillings, at the graveside, to bury the man who had assessed every hide in England. The Conqueror\'s last transaction was a settlement out of court — with the son of a man he expropriated."',
      'Narrator: "Orderic and the other chroniclers report the scene in detail. Whatever they embellished, the shape is perfect beyond invention: the machine\'s founder could not enter the ground until the ground was paid for."',
      '[SCENE wm_x_funeral2]',
    ] },
  { id: 'wm_x_funeral2', name: 'The Stripped Chamber', sign: 'ROUEN AND CAEN, SEPTEMBER 1087',
    drop: ['wm_rouen', 'wm_hall'], left: ['orderic', 30], right: ['peasant', 70],
    keys: { greed: { target: 80, scale: 35 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Orderic: "Rewind three days, to Rouen, the moment the king stopped breathing. I wrote what the household did next: the attendants seized the arms, the plate, the linens, the royal furniture — and RAN. The body of the wealthiest man in Europe lay almost naked on the floor of a stripped room."',
      'Aldric: "So the men closest to him treated his deathbed exactly as his knights treated Yorkshire. Took what could be carried and left before the accounting."',
      'Orderic: "You have said in one sentence what I labored a page to imply. He built a kingdom where everything was worth precisely what could be extracted from it — and at the end, that valuation was applied to HIM."',
      'Aldric: "We had a word for it in the burned country, monk: harvest. Everything in its season, they used to tell us. Even kings, it seems, come into season."',
      'Narrator: "The looted deathbed, the graveside extortion, the coffin that would not fit: the chroniclers assembled William\'s ending into the medieval world\'s most complete parable of extraction. This game did not have to invent its moral. 1087 wrote it first."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_chronicle1', name: 'The Obituary in Verse', sign: 'PETERBOROUGH, AFTER 1087',
    drop: ['wm_scriptorium', null], left: ['orderic', 30], right: ['crowd', 70, { scale: 2.6 }],
    keys: { greed: { target: 70, scale: 45 }, repression: { target: 60, scale: 55 } },
    lines: [
      'Narrator: "The year the king dies, an English monk writes his obituary in the Anglo-Saxon Chronicle — in verse, in English, for English readers. It is the conquered\'s considered review of the Conqueror."',
      'Orderic: "Hear the indictment, item by item, as the monk arranged it: he had castles built and poor men hard oppressed. He took from his subjects many marks of gold, by weight and with little need. He made great protection for the deer, and blinded those who slew them — he loved the stags as dearly as though he had been their father."',
      'The Village: "THAT is our monk! Every line of it a thing done to US — the castles we dug, the geld we bled, the wood we lost! Someone wrote it DOWN!"',
      'Orderic: "And note the monk\'s scruple, which shames us all: he ALSO records the good — the peace, so that a man might travel unmolested with gold in his bosom. Then he lays the columns side by side and lets them argue. It is the most honest audit of a king ever made by a subject."',
      'Narrator: "The Peterborough Chronicle\'s verdict, written under Norman rule by men with everything to lose, survived nine centuries. Every regime learns it eventually: you can dispossess the literate, but they file a report."',
      '[SCENE wm_x_chronicle2]',
    ] },
  { id: 'wm_x_chronicle2', name: 'The Sentence That Outlived the System', sign: 'THE CHRONICLE, TO c.1154',
    drop: ['wm_scriptorium', null], left: ['orderic', 30], right: ['peasant', 70],
    keys: { greed: { target: 60, scale: 55 }, flareUps: { target: 1, scale: 5 } },
    lines: [
      'Orderic: "One sentence from that obituary has outlasted the castles it complained of: \'Truly, in his time men had much oppression and many injuries.\' Ten words. The monks kept the Chronicle going another seventy years under Norman lords, and never took them back."',
      'Aldric: "Ten words. The Domesday Book is two volumes and thirteen thousand places, and it never once says what anything FELT like. Your ten words carry what their two volumes buried."',
      'Orderic: "That is the division of labor at the end of every chapter of this kind, friend. Their book records what was taken. Ours records that it was WRONG to take it. Both books survived — and the strange mercy of history is that the second book is the one people believe."',
      'Aldric: "Then let the last word of the conquest be the conquered\'s: much oppression, and many injuries. Truly."',
      'Narrator: "The Anglo-Saxon Chronicle ran to 1154 — the longest act of documentary resistance in this whole game, and the direct ancestor of every witness, chronicler, and whistleblower in the chapters that follow. The machine builds its book. Someone always builds the other one."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_edgar', name: 'The Pensioned Pretender', sign: 'THE COURT, c.1086',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['orderic', 70],
    keys: { repression: { target: 55, scale: 60 }, greed: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "One loose end the machine handled with strange gentleness: Edgar Aetheling, last male heir of the House of Wessex — the boy the North rose for in 1069, the rightful king by English blood."',
      'William: "Twice he fled to Scotland, twice he was the banner of risings, and here he sits at my court — reconciled, pensioned, a pound of silver a day, hunting with my sons as if 1069 were a story about other men."',
      'Orderic: "Sire, men marvel that you never killed him. Waltheof went to the block for far less."',
      'William: "Waltheof was DANGEROUS, monk — an English earl with English lands and English love. Edgar is a claim with no army, and a claim on a pension is a claim retired. Kill him and every rebel for a century fights for his ghost. Feed him, and the ghost dines at my table where all England can see it grow fat and harmless."',
      'Orderic: "I record it as the reign\'s subtlest lesson, and its coldest: the machine does not fear the rightful heir. It fears the unassessed man. Legitimacy, like everything else in England, was simply bought at valuation."',
      'Narrator: "Edgar outlived William by nearly forty years, on the pension, in the record — the revolution that was never crushed because it was successfully SALARIED."',
      '[SCENE wm_chronicle_hub]',
    ] },

  // ---- Pass 2 dossier scenes (HVB_RESEARCH_2.md, Chapter 1) ----------------

  // The enterprise triple: banner -> Lillebonne -> the windbound fleet.
  { id: 'wm_x_banner', name: 'The Papal Banner', sign: 'ROME AND ROUEN, 1066',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['orderic', 70],
    keys: { greed: { target: 55, scale: 55 }, flareUps: { target: 1, scale: 5 } },
    lines: [
      'Narrator: "Before a single ship is built, the enterprise acquires its most valuable cargo: a consecrated banner from Pope Alexander II. Watch the two meters this one object moves."',
      'Orderic: "Lanfranc of Bec argued the case at Rome; Archdeacon Hildebrand — the future Gregory VII — pushed the decision through. Harold was arraigned in absence as an oath-breaker and a violator of sacred relics. No Englishman was heard."',
      'Lanfranc: "I did not ask the Holy See to bless a conquest, sire. I asked it to recognize a RIGHT. The distinction is everything: a conquest must be defended forever; a right defends itself."',
      'William: "One banner, and every sword in Christendom may serve me without sin, and every court in Christendom is closed to my victims in advance. Cheap at any price of penance."',
      'Narrator: "In the machine\'s terms: PRESTIGE up, REGULATION down — the referee blessed the acquisition before it happened. Moral cover is the cheapest insurance extraction ever buys. (The record wobbles: some scholars argue the banner was formally conferred only at Winchester, c.1070 — the receipt possibly backdated.)"',
      '[SCENE wm_x_lillebonne]',
    ] },
  { id: 'wm_x_lillebonne', name: 'The Council of Lillebonne', sign: 'LILLEBONNE, JANUARY 1066',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['william_odo', 70],
    keys: { greed: { target: 70, scale: 45 }, repression: { target: 45, scale: 60 } },
    lines: [
      'Narrator: "Lillebonne, January 1066. The barons of Normandy balk: no feudal duty obliges them to cross a sea. So William makes them an offer that is the Georgist seed of this whole chapter."',
      'Odo: "They will not sail for duty, brother. Duty ends at the water."',
      'William: "Then they will sail for LAND. English lands and English titles, to every man who brings ships and swords — and not lands for a lifetime, bishop. Lands for their heirs, and their heirs\' heirs, against all time."',
      'Odo (Pointing/Smug): "Ah. Not an army, then. A company of investors. And the adventurers of Brittany, Flanders, and France will subscribe alongside us the moment they hear the terms."',
      'Narrator: "They did. Hold the sequence in view, because every chapter of this game repeats it: conquest converted into property, property into rent, rent into perpetuity. The swords were the down payment; England\'s fields were the dividend; the payout schedule was FOREVER."',
      '[SCENE wm_x_shiplist]',
    ] },
  { id: 'wm_x_shiplist', name: 'The Windbound Month', sign: 'DIVES-SUR-MER TO ST-VALERY, 1066',
    drop: ['wm_salisbury', null], left: ['william_odo', 30], right: ['orderic', 70],
    keys: { greed: { target: 65, scale: 50 }, flareUps: { target: 1, scale: 5 } },
    lines: [
      'Narrator: "The fleet gathers at the mouth of the Dives by mid-August — and the wind refuses. For about a month the greatest speculation of the century sits at anchor, eating itself."',
      'Odo: "The Ship List will record the pledges: some 776 vessels promised. I subscribed one hundred; Mortain, our brother, one hundred and twenty. Seven to fourteen thousand men, the scholars will reckon, and every one of them eating stores we cannot replace."',
      'Orderic: "Say what it was, your grace: capital, committed. An invasion at anchor is a margin call every morning. Disband, and the promises of English land are waste paper; sail into the wrong wind, and the company drowns with its prospectus."',
      'Odo (Pointing/Smug): "So we moved the position to St-Valéry and lit candles to the local saint. Prayer, little monk, is what speculators call patience when the leverage is total."',
      'Narrator: "The wind turned at Michaelmas; the fleet crossed the night of 27-28 September and landed unopposed. Wace later counted 696 ships — chroniclers audit each other too. But the shape is exact: England was not just invaded. It was UNDERWRITTEN."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_bayeux', name: 'The Oath at Bayeux', sign: 'BAYEUX, c.1064',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['orderic', 70],
    keys: { greed: { target: 50, scale: 60 }, repression: { target: 45, scale: 60 } },
    lines: [
      'Narrator: "FLAG THIS SCENE BEFORE IT PLAYS: everything in it is Norman testimony. No English source corroborates the oath. This is the story the conquest told to license itself."',
      'Orderic: "The account I inherited runs so: Harold, shipwrecked and a guest, swore fealty to Duke William and promised him the crown — swearing, per the tradition, on the most sacred relics. The Tapestry stitches him mid-oath, a hand on each shrine."',
      'William: "And the better version, monk — the one told by firesides: my men HID the relics beneath the cloth, so the Saxon swore his everyday oath and only afterward saw what bones had witnessed it."',
      'Orderic: "Sire, observe what that story is. A tale in which the trick is the POINT — told with pride by the trickster\'s own party. The hidden-relics device is not evidence of Harold\'s guilt; it is a narrative device, and it confesses the whole method: manufacture the obligation, then enforce it as law."',
      'Narrator: "The oath was argued at Rome by Lanfranc and became the banner, the invasion\'s license. Whether it happened — and what Harold thought he swore, under what duress — the sources cannot say. The machine did not need it true. It needed it TOLD."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_crownfire', name: 'The Coronation Fire', sign: 'WESTMINSTER, 25 DECEMBER 1066',
    drop: ['wm_hall', null], left: ['orderic', 30], right: ['crowd', 70, { scale: 2.6 }],
    keys: { repression: { target: 70, scale: 40 }, flareUps: { target: 3, scale: 5 } },
    lines: [
      'Narrator: "Christmas Day, 1066. Ealdred, Archbishop of York — who crowned Harold in January — now crowns William in December. The rite is asked in two languages."',
      'Ealdred: "I put the question to the English in English; Geoffrey of Coutances put it to the Normans in French. Will you have this king? The abbey answered in both tongues at once — a roar of consent such as those walls had never held."',
      'The Village: "We shouted because the archbishop asked us to shout! In our own tongue, in our own church — for one breath it felt like a choosing!"',
      'Orderic: "The Norman guards outside knew neither language. They heard the roar, took it for assassination, and fired the houses around the abbey. The congregation fled the smoke; a handful of clergy hurried the rite to its end — while the king, I recorded, TREMBLED at the altar."',
      'Narrator: "Reported by Orderic, writing later — but the shape is the reign in miniature: consent, illegible to the enforcers, answered with fire; and at the center of the smoke, an anointed king shaking. He was crowned by a machine that could not tell cheering from rebellion, and never learned to."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_odo_trial', name: 'The Commissioner, Audited', sign: 'THE TRIAL OF THE EARL OF KENT, 1082',
    drop: ['wm_hall', null], left: ['william_king', 30], right: ['william_odo', 70],
    keys: { greed: { target: 75, scale: 40 }, repression: { target: 60, scale: 55 } },
    lines: [
      'Narrator: "Consider the defendant\'s portfolio. Bishop of Bayeux. Earl of Kent. One hundred ships at the crossing. Lands Domesday will value near £3,000 across twenty-two counties — second only to the king. And, most likely, the patron who commissioned the Bayeux Tapestry itself."',
      'William (Pointing/Angry): "The man who embroidered the conquest\'s advertisement stands accused of embezzling the conquest\'s proceeds. You defrauded the crown, bishop — MY crown, stitched by YOUR needleworkers."',
      'Odo: "Defrauded, sire, is an ungenerous word for a commission. Every system pays its administrators; I merely set my own rate."',
      'William: "That is exactly the crime. The rate is the ONE thing in England I did not delegate."',
      'Narrator: "Arrest, trial, prison at Rouen — the sentence the dying king reluctantly lifted. Odo died in 1097 en route to Crusade. Mark the lesson every chapter of this game repeats: the machine forgives its enemies before its auditors. Extraction can absorb any crime except skimming."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_barons', name: 'The Barons\' Ledger', sign: 'THE SPOILS, 1086',
    drop: ['wm_scriptorium', null], left: ['william_odo', 30], right: ['peasant', 70],
    keys: { greed: { target: 85, scale: 30 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "Open the book to the winners\' pages. Read what each man took — and, where the record kept it, whose it was."',
      'Odo: "Robert of Mortain, the king\'s half-brother: some 797 manors — the largest lay landholder in England after the king, for the price of 120 ships. Alan Rufus the Breton: the vast Honour of Richmond, above a thousand Domesday entries, third in the kingdom — much of it seized from Edith the Fair, Harold\'s widow."',
      'Odo (Pointing/Smug): "William fitzOsbern, the king\'s boyhood friend: Earl of Hereford, the Isle of Wight, co-regent of England — dead at Cassel in \'71, but the grant outlived the man, which is the entire point of grants. And Geoffrey de Mandeville: sheriff of London and Middlesex, among the ten richest in the book."',
      'Aldric: "And under de Mandeville\'s name, bishop? Read the smaller letters. The record itself remembers: his lands were taken from Esgar the Staller — an Englishman with a name, an office, and a family, who held them before your book existed to say otherwise."',
      'Odo: "The book does not say \'taken,\' farmer. The book says \'was held by\' and \'is held by.\' The passive voice is the most profitable clause in it."',
      'Narrator: "Every line of the ledger has an erased name under it. Domesday is a palimpsest: a conquest written over a country, in the neatest hand in Europe. And the ink is not dry yet — turn the page nine hundred years."',
      '[SCENE wm_x_grosvenor]',
    ] },
  { id: 'wm_x_penance', name: 'The Penance Tariff', sign: 'THE PENITENTIAL ORDINANCE, c.1070',
    drop: ['wm_hall', null], left: ['orderic', 30], right: ['william_king', 70],
    keys: { greed: { target: 60, scale: 50 }, repression: { target: 55, scale: 60 } },
    lines: [
      'Narrator: "Around 1070 the Church presents the victors with a bill. The Penitential Ordinance of Ermenfrid of Sion prices the conquest, sin by sin — read the tariff."',
      'Orderic: "\'Anyone who knows that he killed a man in the great battle must do penance for one year for each man that he killed.\' Wounding: forty days the wound. And the archers, whose kills no man could count: three Lents, flat rate. Even absolution, sire, had a volume discount."',
      'William: "A fair instrument, monk. My knights confessed, fasted, endowed churches. The books balanced."',
      'Orderic: "All the books but one. Read the ordinance end to end, sire: the duke who ORDERED the battle is nowhere assessed in it. The scholar Freeman would do your arithmetic eight centuries on — by the tariff\'s own logic, the commander owed some two thousand years of penance. The invoice was never sent."',
      'Narrator: "A moral system that prices every sin and exempts the principal shareholder is not a conscience — it is a subsidiary. The Church billed the workforce and comped the owner. Now watch what the owner built with the savings."',
      '[SCENE wm_x_prestige]',
    ] },
  { id: 'wm_x_prestige', name: 'The Prestige Machine', sign: 'BATTLE ABBEY AND THE COURT HISTORY',
    drop: ['wm_hall', null], left: ['william_odo', 30], right: ['orderic', 70],
    keys: { greed: { target: 65, scale: 50 }, repression: { target: 50, scale: 60 } },
    lines: [
      'Odo: "Battle Abbey, monk — founded on the field of Hastings itself, at papal instruction, as penance. And the high altar set, deliberately, on the exact spot where Harold fell. Approach the mercy-seat of God, and you kneel on the dead king."',
      'Orderic: "A penance that is also a trophy; a receipt that doubles as a monument. Your family had a gift for documents that say two things at once."',
      'Odo (Pointing/Smug): "Add the twin abbeys at Caen — bought, if we are being exact, as the price of a marriage the Church had forbidden. And the new cathedrals rising on English ground: Canterbury, Winchester, St Albans, York. Stone is prestige that cannot be argued with."',
      'Orderic: "And for the arguable part, there was Poitiers. William of Poitiers, the king\'s own chaplain, wrote the Gesta Guillelmi: Harold the perjurer, William the heir of God\'s designing. The scholars after me — Bates, Morris, van Houts — will file it where it belongs: under advertising."',
      'Narrator: "Tally the insulation: a banner from the Pope, a penance that exempted the principal, an abbey on the enemy\'s grave, a court history for the record. Prestige is not the machine\'s decoration. It is the machine\'s ARMOR — and it was itemized."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_lanfranc', name: 'The Kingdom\'s Lawyer', sign: 'CANTERBURY, 1070-1089',
    drop: ['wm_scriptorium', null], left: ['orderic', 30], right: ['william_king', 70],
    keys: { greed: { target: 55, scale: 55 }, repression: { target: 50, scale: 60 } },
    lines: [
      'Narrator: "One voice ran through every legal joint of the conquest: Lanfranc of Bec — the lawyer who argued William\'s case at Rome, then came to collect the fee."',
      'Lanfranc: "Archbishop of Canterbury, from 1070 — after we deposed the English incumbent by canon law, correctly. I make no apology for correctness. Everything this kingdom\'s new order did, it did in FORM."',
      'William: "Form is why I sent for him, monk. Any duke can win a battle. It takes a canonist to make the winnings inheritable."',
      'Lanfranc: "At Winchester in 1072 I settled Canterbury\'s primacy over York — one church, one head, as one kingdom, one king. And I rebuilt Canterbury cathedral on the model of my own St-Étienne at Caen. Let the English pray inside Norman geometry; the lesson repeats at every mass."',
      'Orderic: "Hear the design entire: the sword took the land, the book fixed the rent, and this man\'s law made both CANONICAL. Every machine in this game retains one of him. Most are not so candid about the invoice."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_ealdred', name: 'The Man Who Crowned Them Both', sign: 'YORK AND WESTMINSTER, 1066',
    drop: ['wm_hall', null], left: ['orderic', 30], right: ['crowd', 70, { scale: 2.6 }],
    keys: { repression: { target: 60, scale: 50 }, flareUps: { target: 2, scale: 6 } },
    lines: [
      'Narrator: "January 1066: Ealdred of York crowns Harold Godwinson. December 1066: the same hands, the same rite, crown William. One year, two kings, one archbishop."',
      'Ealdred: "Judge me after you have stood where I stood. The rite is not mine to withhold; it is England\'s continuity, and I am its custodian. I crowned the king the Witan chose. Then that king was dead on a ridge, and a duke with a papal banner held London — and I crowned again, in English, and made HIM swear first: to rule this people justly, as the best kings before him."',
      'The Village: "The old archbishop made the Frenchman swear in OUR rite before he gave him the crown! It was the last time anyone made that man promise anything!"',
      'Orderic: "He extracted the oath, addressed the people in their own tongue, and used what standing he had to soften what could be softened. He died in 1069 — the year the North burned, as if the office\'s last honest man could not survive the sight of what he had anointed."',
      'Narrator: "The institution survives every king it crowns; that is its power and its alibi. Ealdred\'s bargain — legitimacy in exchange for promises — is the oldest trade in this game. The promises were spent by spring. The legitimacy is still earning."',
      '[SCENE wm_chronicle_hub]',
    ] },
  { id: 'wm_x_grosvenor', name: 'The Rent Is Still Collected', sign: 'DOMESDAY TO MAYFAIR, 1086-2025',
    drop: ['wm_scriptorium', null], left: ['orderic', 30], right: ['peasant', 70],
    keys: { greed: { target: 80, scale: 40 }, repression: { target: 45, scale: 70 } },
    lines: [
      'Narrator: "Last entry in the Chronicle, and the spine of the whole game, made explicit. The question is simple: did the extraction of 1066 ever actually STOP?"',
      'Orderic: "Follow one thread. A kinsman of the Conqueror\'s circle, Gilbert le Grosveneur — \'the chief huntsman\' — comes over in 1066 and takes Cheshire lands. Six centuries on, a Grosvenor marries Mary Davies and her five hundred acres of swamp west of London. The swamp becomes Mayfair and Belgravia. The family still owns much of it."',
      'Aldric: "And the man at the end of the thread, monk? Name him. Names are the whole game."',
      'Orderic: "Hugh Grosvenor, seventh Duke of Westminster: £9.884 billion, fourteenth on the Rich List of 2025 — nine and a half centuries of rent, still compounding. And the pattern is not one family\'s luck: Alan Rufus died in 1093 holding £11,000 — over seven percent of England\'s entire national income, some £81 billion in today\'s terms; the scholars who computed it call him the richest Briton who ever lived. And the economists Clark and Cummins found Norman surnames — Darcy, Mandeville, Montgomery, Percy — STILL overrepresented at Oxford and Cambridge, a thousand years on."',
      'Aldric: "So when they tell my grandson\'s grandsons that it was all very long ago — the book, the fires, the oath — the answer is in the land registry. It is not history, neighbors. It is a LEASE. And it has never once expired."',
      'Narrator: "Conquest became property; property became rent; rent became a rich list with the conquest\'s surnames on it. That is why this chapter is first, and why Henry George haunts every one that follows: the fire went out in 1070. The RENT is being collected this morning."',
      '[SCENE wm_chronicle_hub]',
    ] },
];

for (const rx of RESEARCH) {
  scenes.push({
    id: rx.id,
    name: `Chronicle: ${rx.name}`,
    sceneType: 'WITNESS',
    dropId: dropId(rx.drop[0], rx.drop[1]),
    stage: [
      ...el(`${rx.id}_l`, rx.left[0], rx.left[1], 62, rx.left[2] || {}),
      ...el(`${rx.id}_r`, rx.right[0], rx.right[1], 63, rx.right[2] || {}),
      ...balloon(`${rx.id}_sign`, rx.sign, 50, 10, { scale: 0.8 }),
    ],
    script: lines(...rx.lines),
    narraton: { pool: RPOOL, keys: rx.keys, repeatable: true },
    status: 'work',
  });
}

scenes.push({
  id: 'wm_chronicle_hub',
  name: 'The Chronicle',
  sceneType: 'AGENCY',
  dropId: dropId('wm_scriptorium', 'wm_hall'),
  stage: [
    ...el('chron_hub_orderic', 'orderic', 30, 62),
    ...balloon('chron_hub_sign', 'THE CHRONICLE: WHAT ELSE THE RECORD HOLDS', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    '[RANDOM]',
    'Narrator: "The research holds more than the main stage could carry: the papal banner and the land-for-swords bargain, the windbound fleet, the coronation fire, the earls\' revolt, the barons\' ledger, the funeral — and the rent still being collected this morning. Orderic keeps the index."',
    '[OR]',
    'Orderic: "Back again. Good. There is more in the record than any stage can hold at once — banners bought at Rome, a fleet at anchor eating its own stores, an earl arrested on a technicality, a grave that had to be paid for. I keep the index. Choose."',
    '[OR]',
    'Orderic: "The index, then. I warn you as I warn every reader: some of these entries flatter my patrons, and I have marked which. The rest are simply what happened, as near as a fed witness can get to it."',
    '[/RANDOM]',
    '[CHOICE]',
    ...RESEARCH.filter((rx) => !['wm_x_earls2', 'wm_x_ely_fall2', 'wm_x_funeral2', 'wm_x_chronicle2', 'wm_x_lillebonne', 'wm_x_shiplist', 'wm_x_prestige'].includes(rx.id))
      .map((rx) => `- "${rx.name}" -> ${rx.id}`),
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

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
    '[RANDOM]',
    'Narrator: "Twenty-one years, ten turnings of the screw. Choose an event and hear how it landed — on the king, on his lieutenant, on the rebels, on the chronicler, on the people who ploughed."',
    '[OR]',
    'The Village: "You came back. Good. Ask us again — we have not run out of things that happened to us."',
    '[OR]',
    'Narrator: "Ten events, twenty-one years, and not one of them experienced the same way twice. Pick a turning of the screw."',
    '[OR]',
    'The Village (Attack/Angry): "Twenty-one years! Ask about ANY of them — we were under every single one!"',
    '[/RANDOM]',
    '[CHOICE]',
    ...EVENTS.map((ev) => `- "${ev.name}" -> wmch_${ev.id}`),
    '- "Duets — two voices, one machine" -> wm_duets_hub',
    '- "Aftermaths — the long tail of policy" -> wm_after_hub',
    '- "The Chronicle — what else the record holds" -> wm_chronicle_hub',
    '- "The Assize and the Road — the village episodes" -> wm_ep_hub',
    '- "Witness: The Burning of the North (cutscene)" -> wm_cut_burning',
    '- "Witness: The Book (cutscene)" -> wm_cut_book',
    '- "Enter the Machine" -> wm_machine',
    '- "Return to the court" -> wm_court',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ==========================================================================
// VILLAGE EPISODES — the machinery layer. Nineteen scenes built to
// exercise the newer script commands where they actually earn their keep:
//
//   * THE ASSIZE OF TORP — an in-scene questioning hub on [LABEL]/[GOTO].
//     The commissioner's bench is one scene you keep returning to; the
//     topics are satellites. Every backward GOTO is broken by an IF, and
//     every loop body contains a DIALOGUE (which yields), so nothing spins.
//   * THE ROAD NORTH — a walking episode. Aldric crosses four backdrops
//     with MOVE walk cycles, RANDOM roadside encounters, and ELSE-chained
//     outcomes keyed to ruthless/roadFood.
//   * RUMOR — the assessment number leaves the village, mutates in an
//     alehouse (rand()), and comes back to court as a different number.
//     All three scenes speak live {var} values out of characters' mouths.
//
// Chapter-local variables introduced here are declared in info.worldState
// below so every {interpolation} resolves from the first frame.
// ==========================================================================

// ---- 1. THE ASSIZE OF TORP -------------------------------------------------

// The bench. Re-entered from every topic scene: a forward GOTO skips the
// preamble on return visits, and the menu itself is an IF/ELSE pair of
// CHOICE blocks — the sign/resist options only appear once the return
// has enough in it to sign.
scenes.push({
  id: 'wm_ep_assize',
  name: 'The Assize of Torp',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('az_odo', 'william_odo', 28, 62),
    ...el('az_aldric', 'peasant', 72, 64),
    ...balloon('az_sign', 'THE HUNDRED COURT, 1086', 78, 10, { scale: 0.8 }),
    ...balloon('az_board', 'THE RETURN OF TORP', 50, 34, { scale: 0.85 }),
  ],
  script: lines(
    '# Return visits jump straight to the bench — forward GOTO, no loop.',
    '[IF assizeVisits > 0]',
    '[GOTO bench]',
    '[ENDIF]',
    '[SET geld = 0]',
    '[SET ploughs = 0]',
    '[SET mill = 0]',
    '[SET woodland = 0]',
    '[SET widowWaste = 0]',
    '[SET assizeAnswers = 0]',
    '[ENTER az_aldric at 99,66]',
    '[MOVE az_aldric to 72,64 over 3s]',
    'Narrator: "1086. The commissioners reach the hundred court. Every man of the vill is sworn; the jurors are half English, half French; and a second panel will come behind this one to check its work."',
    'Narrator: "Historical note before anyone speaks: the inquest panels were barons, bishops and clerks deliberately sent into shires where they held no land, so that no man audited his own rents. Odo of Bayeux really did preside at the great plea on Penenden Heath. The stage gives him this bench too."',
    'Odo (Pointing/Smug): "Stand where the clerk can see you, farmer, and understand the instrument before you resent it. I am not here to take anything today. I am here to write down what there IS."',
    'Aldric: "With respect, your grace, in my experience those are the same errand walking at different speeds."',
    'Odo: "...The clerk will not enter that. I will remember it."',
    '[LABEL bench]',
    '[SET assizeVisits = assizeVisits + 1]',
    '[SET_TEXT az_board "TORP — ASSESSED AT {geld} SHILLINGS — {ploughs} PLOUGH-TEAMS"]',
    '[RANDOM]',
    'Odo: "Next head. The book has an appetite and we are behind."',
    '[OR]',
    'Odo (Pointing/Smug): "The board reads {geld} shillings so far. It has further to climb, farmer, and you are the ladder."',
    '[OR]',
    'Odo: "Speak up. Every question I ask twice, the second panel asks a third time — and the third time is under oath, in front of your neighbours."',
    '[OR]',
    'Odo: "Value as it was in King Edward\'s day, value as it is, value as it might be. Three columns, farmer. Only one of them is history."',
    '[/RANDOM]',
    '[IF assizeAnswers >= 3]',
    'Aldric: "You have the teams, the mill, and the wood, your grace. That is the whole of us, written down in a hand I cannot read."',
    'Odo: "Then the return is fit to sign — or to be signed over your objection, which is administratively identical and personally much worse. Choose."',
    '[CHOICE]',
    '- "The plough-teams" -> wm_ep_assize_ploughs',
    '- "The mill" -> wm_ep_assize_mill',
    '- "The woodland" -> wm_ep_assize_wood',
    '- "The widow\'s hide" -> wm_ep_assize_widow',
    '- "Sign the return" -> wm_ep_assize_sign',
    '- "Refuse the figure" -> wm_ep_assize_resist',
    '- "Leave the court" -> wm_ep_hub',
    '[/CHOICE]',
    '[ELSE]',
    '[CHOICE]',
    '- "The plough-teams" -> wm_ep_assize_ploughs',
    '- "The mill" -> wm_ep_assize_mill',
    '- "The woodland" -> wm_ep_assize_wood',
    '- "The widow\'s hide" -> wm_ep_assize_widow',
    '- "Leave the court" -> wm_ep_hub',
    '[/CHOICE]',
    '[ENDIF]',
  ),
  status: 'work',
});

// The plough-teams: the haggle loop. A backward [GOTO haggle] broken by
// an IF on the round counter, RANDOM pressure from the bench, and an
// IF/ELSEIF/ELSE ladder giving Aldric a different answer each round.
scenes.push({
  id: 'wm_ep_assize_ploughs',
  name: 'Assize: The Plough-Teams',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azp_odo', 'william_odo', 28, 62),
    ...el('azp_aldric', 'peasant', 72, 64),
    ...balloon('azp_sign', 'HEAD ONE: THE PLOUGH-TEAMS', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[IF ploughs > 0]',
    '[GOTO already]',
    '[ENDIF]',
    '[SET haggle = 0]',
    'Odo: "Ploughs. How many teams work this vill?"',
    'Aldric: "Two, your grace."',
    '[LABEL haggle]',
    '[SET haggle = haggle + 1]',
    '[RANDOM]',
    'Odo (Pointing/Smug): "The reeve says three."',
    '[OR]',
    'Odo: "Your neighbour said three, on the book, with his hand on it."',
    '[OR]',
    'Odo: "In King Edward\'s day this vill returned three. Land does not forget how to be ploughed, farmer."',
    '[OR]',
    'Odo (Pointing/Smug): "Three. Say two again and I will write three and note that you disputed it, which helps you not at all and me a great deal."',
    '[/RANDOM]',
    '[IF haggle == 1]',
    'Aldric: "Two, your grace. The third team is an ox short since Candlemas and a plough with a cracked share is furniture."',
    '[ELSEIF haggle == 2]',
    'Aldric: "Then the reeve counted iron and I counted WORK. There is a plough-beam in my yard, aye. There is no beast fit to draw it, and there is no man in this hall who has ever pushed one."',
    '[ELSE]',
    'Aldric: "Write your three, then. But hear the thing you are actually writing: you are entering a team that does not exist, and the geld will come for it every year until my grandson dies. You are not recording a plough. You are INVENTING one, and taxing my house for the invention."',
    '[ENDIF]',
    '[IF haggle < 3]',
    '[GOTO haggle]',
    '[ENDIF]',
    '[SET ploughs = 3]',
    '[SET geld = geld + 18]',
    '[SET assizeAnswers = assizeAnswers + 1]',
    'Odo: "Three teams. Eighteen shillings on the head. Clerk — next."',
    'Narrator: "Domesday counted ploughs because ploughs were the medieval unit of productive capacity — the closest thing the eleventh century had to a machine-hours figure. Once a capacity is written down, it can be taxed whether or not it turns."',
    '[GOTO out]',
    '[LABEL already]',
    'Odo: "Entered already, farmer: {ploughs} teams, and the ink is not a conversation."',
    'Aldric: "I know it. I came back to look at the number again, the way a man keeps checking a wound."',
    '[LABEL out]',
    '[SCENE wm_ep_assize]',
  ),
  status: 'work',
});

scenes.push({
  id: 'wm_ep_assize_mill',
  name: 'Assize: The Mill',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azm_odo', 'william_odo', 28, 62),
    ...el('azm_aldric', 'peasant', 72, 64),
    ...balloon('azm_sign', 'HEAD TWO: THE MILL', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[IF mill > 0]',
    'Odo (Pointing/Smug): "The mill is entered, farmer. Twelve shillings, and the board says {geld}. Mills do not un-exist because you stare at the clerk."',
    'Aldric: "No. But a man likes to know exactly which of his neighbours the number came out of."',
    '[ELSE]',
    'Odo: "A mill. I can hear it from the road, so let us not begin with whether there is one."',
    'Aldric: "There is one. My father and four other men dug the leat for it in a wet October, and it grinds for the whole vill at a sixteenth."',
    'Odo (Pointing/Smug): "A sixteenth. Delightful. Do you know what a mill IS, farmer, in the language of this book? It is not a building. It is a place where every household in the vill must come, once a week, forever. It is a toll-gate that the water works for free."',
    'Aldric: "It is where we grind our corn, your grace."',
    'Odo: "It is where your corn can be COUNTED. That is why it is worth twelve shillings and your byre is worth nothing. Value follows the chokepoint. It always has."',
    '[SET mill = 1]',
    '[SET geld = geld + 12]',
    '[SET assizeAnswers = assizeAnswers + 1]',
    'Narrator: "Domesday records some six thousand mills in England. Within two centuries lords across Europe were suppressing hand-querns to force tenants to the seigneurial mill — the same logic, made explicit: own the bottleneck, and the harvest walks to you."',
    'Aldric: "Twelve shillings. We dug that leat. Nobody helped us dig it and everybody helps pay for it."',
    '[ENDIF]',
    '[SCENE wm_ep_assize]',
  ),
  status: 'work',
});

scenes.push({
  id: 'wm_ep_assize_wood',
  name: 'Assize: The Woodland',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azw_odo', 'william_odo', 28, 62),
    ...el('azw_aldric', 'peasant', 72, 64),
    ...balloon('azw_sign', 'HEAD THREE: THE WOODLAND', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[IF woodland > 0]',
    'Odo: "Woodland for {woodland} swine, entered. The oaks have not grown since this morning."',
    'Aldric: "The oaks have not done anything since before the Danes, your grace. It is the paperwork that keeps moving."',
    '[ELSE]',
    'Odo: "Woodland. The clerk wants it in swine — the book measures wood by how many pigs it will fatten on the mast."',
    '[RANDOM]',
    'Aldric: "Sixty swine, in a good acorn year. In a bad one, none, and the pigs eat what we would have eaten."',
    '[OR]',
    'Aldric: "Sixty, if the acorns come. Your book has no column for \'if the acorns come,\' which is the only column a farmer has."',
    '[/RANDOM]',
    'Odo (Pointing/Smug): "Sixty it is. Note the elegance, farmer — the book does not value the TREES. It values what the trees will feed. Everything in England is about to be described by what it yields to somebody."',
    'Aldric: "Then describe this: the wood is where we go in the bad years. Deadfall for the fire, mast for the pigs, hazel for the hurdles, and nobody counting. It is not a yield, your grace. It is the reason a bad year is a bad year instead of the last one."',
    'Odo: "That, farmer, is precisely the sort of thing the survey exists to abolish. Uncounted margin is untaxed margin. Clerk: woodland for sixty swine, six shillings."',
    '[SET woodland = 60]',
    '[SET geld = geld + 6]',
    '[SET assizeAnswers = assizeAnswers + 1]',
    'Narrator: "Woodland really was entered in Domesday as pannage for so many swine. Within a generation forest law would criminalize the same use it here merely prices — first the wood is assessed, then it is fenced."',
    '[ENDIF]',
    '[SCENE wm_ep_assize]',
  ),
  status: 'work',
});

scenes.push({
  id: 'wm_ep_assize_widow',
  name: 'Assize: The Widow\'s Hide',
  sceneType: 'AGENCY',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azv_odo', 'william_odo', 28, 62),
    ...el('azv_aldric', 'peasant', 72, 64),
    ...balloon('azv_sign', 'HEAD FOUR: THE WIDOW\'S HIDE', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[IF widowWaste != 0]',
    'Odo: "Aelfgyth\'s hide is settled, farmer, one way or the other. The book has short patience with second thoughts and none at all with third ones."',
    'Aldric: "I did not come back to change it. I came back to make sure I remembered what I said."',
    '[ELSE]',
    'Odo: "One hide unaccounted, held by a woman. Aelfgyth, widow. Sown or waste, farmer? You are sworn."',
    'Aldric: "...Her man went south with the levy and did not come back. She works it with a hoe and her sister\'s boy. It is sown. Barely."',
    'Odo (Pointing/Smug): "Then it is sown, and it is assessed, and she pays. Or — and I say this only because I am curious what you are made of — the vill swears it waste, the crown takes nothing, and every man here has perjured himself on relics for a widow\'s barley."',
    'Aldric: "You enjoy this."',
    'Odo: "I enjoy WATCHING it. There is a difference, and it is the only difference between me and the clerk."',
    'Narrator: "Under-declaration was real and so were its penalties: the second panel existed precisely to catch it. Choose what the vill swears."',
    '[CHOICE]',
    '- "Swear the hide waste — cover the widow" -> wm_ep_widow_waste',
    '- "Swear it sown — the truth, at her expense" -> wm_ep_widow_sown',
    '[/CHOICE]',
    '[ENDIF]',
    '[SCENE wm_ep_assize]',
  ),
  status: 'work',
});

scenes.push({
  id: 'wm_ep_widow_waste',
  name: 'Assize: Sworn Waste',
  sceneType: 'WITNESS',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azvw_aldric', 'peasant', 40, 63),
    ...el('azvw_odo', 'william_odo', 74, 62),
    ...balloon('azvw_sign', 'PERJURY, ON RELICS', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[SET widowWaste = 1]',
    '[SET assizeAnswers = assizeAnswers + 1]',
    'Aldric: "Waste. The vill swears it waste."',
    '[RANDOM]',
    'Odo: "The whole vill? In one breath? That is either a very poor hide or a very good village."',
    '[OR]',
    'Odo (Pointing/Smug): "Unanimous and instant. Farmer, when a jury agrees that fast, the clerk writes it down and the bishop makes a note."',
    '[/RANDOM]',
    'Aldric: "Write it down, then. And write this beside it, since you are so fond of what things ARE: that hide is not waste and we all know it, and it will be sown in March by a woman with a hoe, and the six shillings you did not get will be a coffin she does not need yet."',
    'Odo: "You understand you have sworn falsely before God on the bones of a saint."',
    'Aldric: "I understand I have sworn falsely before God on the bones of a saint. I expect God has been keeping a fuller ledger than you this winter, your grace, and I will take my chances in that court rather than this one."',
    'Narrator: "The board stands at {geld} shillings. One hide of it does not exist. That gap — the difference between what a place is and what a book says it is — is the only room a village ever gets, and it closes a little every survey."',
    '[SCENE wm_ep_assize]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 60, scale: 55 }, repression: { target: 50, scale: 60 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_ep_widow_sown',
  name: 'Assize: Sworn Sown',
  sceneType: 'WITNESS',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azvs_aldric', 'peasant', 40, 63),
    ...el('azvs_odo', 'william_odo', 74, 62),
    ...balloon('azvs_sign', 'THE TRUTH, AT HER EXPENSE', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[SET widowWaste = 2]',
    '[SET geld = geld + 6]',
    '[SET assizeAnswers = assizeAnswers + 1]',
    'Aldric: "Sown. It is sown. I will not put this whole vill under a false oath for one hide, and she would not ask me to."',
    'Odo: "Six shillings. Entered."',
    '[RANDOM]',
    'Aldric: "Now tell me the part you are enjoying, your grace. Say it out loud so the clerk hears it too."',
    '[OR]',
    'Aldric: "Go on. You have been waiting to say something. Say it."',
    '[/RANDOM]',
    'Odo (Pointing/Smug): "Only this: you did the honest thing, and the honest thing cost a widow her seed money, and it cost the crown nothing, and it cost YOU nothing. That is the finest machine ever built, farmer — the one where virtue and extraction pull the same rope."',
    'Aldric: "...I will carry her share myself. Split by hearths, as we did in my father\'s time."',
    'Odo: "Of course you will. And the book will not record that either, so in eight hundred years the only surviving fact will be that Aelfgyth paid. Good day."',
    'Narrator: "The board stands at {geld} shillings, and every one of them is true. This is the chapter\'s hardest sentence: a completely honest survey is still a machine for taking things."',
    '[SCENE wm_ep_assize]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 75, scale: 40 }, marginHeight: { target: 50, scale: 45 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_ep_assize_sign',
  name: 'Assize: The Return Signed',
  sceneType: 'WITNESS',
  dropId: dropId('wm_scriptorium', 'wm_hall'),
  stage: [
    ...el('azs_odo', 'william_odo', 28, 62),
    ...el('azs_aldric', 'peasant', 70, 64),
    ...el('azs_orderic', 'orderic', 50, 58),
    ...balloon('azs_sign', 'THE RETURN OF TORP, ENTERED', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[SET assizeSigned = 1]',
    '[EFFECT gold_glow on azs_sign]',
    'Odo: "Read it back, clerk, and then it is stone."',
    'Orderic: "TORP: land for {ploughs} plough-teams. One mill. Woodland, pannage for {woodland} swine. Value: {geld} shillings."',
    'Aldric: "{geld} shillings. Say it slower."',
    '[IF geld >= 40]',
    'Aldric: "Forty and more. Your grace, in a fat year this vill clears about that and eats the rest. You have not assessed what we have. You have assessed what we ARE, on our best day, and made the best day the rule."',
    '[ELSEIF geld >= 30]',
    'Aldric: "Thirty-odd. It can be paid in a good year and it will be demanded in every year. Nobody in this hall thinks that is the same thing, and every man in this hall is going to pretend it is."',
    '[ELSE]',
    'Aldric: "Lighter than I feared. Which means the second panel will come, and find the shortfall, and I will have this conversation again with a man who is not amused by me."',
    '[ENDIF]',
    'Odo (Pointing/Smug): "It is a fair figure, farmer, and \'fair\' is doing no work in that sentence. It is an ACCURATE figure. Accuracy is the whole product."',
    'Orderic: "And there is the sentence I came to write down. Your grace has just distinguished fairness from accuracy in a court of law, out loud, and no one flinched."',
    'Narrator: "A fixed assessment turns every bad harvest into arrears. The book\'s permanence — its entire purpose — is exactly what made it merciless. Domesday entries were still being cited in English courts in the twentieth century."',
    '[CHOICE]',
    '- "Out to the market cross" -> wm_rumor_cross',
    '- "Home, and the night arithmetic" -> wm_ep_reeve',
    '- "Back to the village episodes" -> wm_ep_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 85, scale: 30 }, repression: { target: 55, scale: 60 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_ep_assize_resist',
  name: 'Assize: The Figure Refused',
  sceneType: 'WITNESS',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('azr_odo', 'william_odo', 28, 62),
    ...el('azr_aldric', 'peasant', 66, 64),
    ...el('azr_crowd', 'crowd', 88, 66, { scale: 2.6 }),
    ...balloon('azr_sign', 'THE VILL DISPUTES THE RETURN', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[SET assizeSigned = 2]',
    '[EFFECT shake_all on stage]',
    'Aldric: "No. The vill disputes the figure. {geld} shillings on {ploughs} teams, one of which is a beam in my yard."',
    '[RANDOM]',
    'The Village (Attack/Angry): "DISPUTED! Say it to the clerk\'s face — DISPUTED!"',
    '[OR]',
    'The Village (Attack/Angry): "Let him write \'disputed\'! Let there be one word in that book we put there!"',
    '[OR]',
    'The Village: "We do not say we will not pay. We say the number is wrong. Those are different sentences and we want both in the record."',
    '[/RANDOM]',
    'Odo: "Noted. Entered. Dismissed. Farmer, hear how this works, because you have earned the truth: your dispute is now part of the entry. It has been RECORDED. And the figure stands."',
    '[IF ruthless >= 3]',
    'Odo (Pointing/Smug): "And be glad the bench is me. The man who burned Yorkshire is four days\' ride away and his tally of severities is {ruthless}. He does not hear disputes. He hears risings, and he answers them in one language."',
    '[ELSEIF ruthless >= 1]',
    'Odo: "The king has been merciful exactly once in living memory and it did not become a habit. Do not build a strategy on it."',
    '[ELSE]',
    'Odo: "You have a king who hesitated in his own hall, farmer, and the shire burned anyway. Draw the lesson: this bench is not where mercy lives. There is no such bench."',
    '[ENDIF]',
    'Orderic: "I record what the clerk wrote and what the clerk did not. He wrote the figure. He did not write that forty men said it was wrong, and stayed standing, and made a bishop say the word \'dismissed\' out loud in front of them."',
    'Narrator: "The dispute changed nothing and cost nothing, which is what makes it worth staging. The Anglo-Saxon Chronicle is one long version of exactly this move: you cannot stop the entry, so you file the objection, and you keep the objection alive for nine hundred years."',
    '[CHOICE]',
    '- "Out to the market cross" -> wm_rumor_cross',
    '- "The road north, then" -> wm_road_start',
    '- "Back to the village episodes" -> wm_ep_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { flareUps: { target: 3, scale: 5 }, repression: { target: 70, scale: 45 } }, repeatable: true },
  status: 'work',
});

// ---- 2. THE ROAD NORTH -----------------------------------------------------
// Four backdrops, four walks, RANDOM at every roadside, and an ending
// chained off what the road left in the pack.

scenes.push({
  id: 'wm_road_start',
  name: 'The Road North: Setting Out',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('rs_aldric', 'peasant', 20, 66),
    ...balloon('rs_sign', 'THE RIDGE ROAD, WINTER', 78, 10, { scale: 0.8 }),
    ...balloon('rs_pack', 'THE PACK', 50, 40, { scale: 0.75 }),
  ],
  script: lines(
    '[SET roadFood = 3]',
    '[SET roadMiles = 0]',
    '[SET roadLeg = 0]',
    '[IF ruthless >= 3]',
    '[SET roadHeat = 3]',
    '[ELSEIF ruthless >= 1]',
    '[SET roadHeat = 2]',
    '[ELSE]',
    '[SET roadHeat = 1]',
    '[ENDIF]',
    '[SET_TEXT rs_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    '[ENTER rs_aldric at 4,68]',
    'Narrator: "A walking episode. Aldric leaves the vill on foot and keeps going. The pack holds three days of bread; the road holds whatever it holds."',
    '[RANDOM]',
    'Aldric: "Three days of bread, a hoe, and a child\'s boots I have not the heart to leave. That is the whole estate. Feels lighter than it looked in the yard."',
    '[OR]',
    'Aldric: "You pack a house in the time it takes a smoke column to come over a ridge. What you take tells you what you actually believed you owned."',
    '[OR]',
    'Aldric: "Three days. I have counted it four times and it is still three days. The counting is a habit from the assize and I cannot put it down."',
    '[/RANDOM]',
    '[MOVE rs_aldric to 84,64 over 5s]',
    '[SET roadMiles = roadMiles + rand(4,9)]',
    '[SET_TEXT rs_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    'Narrator: "The road out of a burned country is not empty. It is the busiest place in England, and every person on it is going the same direction for the same reason."',
    '[CHOICE]',
    '- "On, over the moor" -> wm_road_moor',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'wm_road_moor',
  name: 'The Road North: The Moor',
  sceneType: 'WITNESS',
  dropId: dropId('wm_salisbury', 'wm_village'),
  stage: [
    ...el('rm_aldric', 'peasant', 14, 66),
    ...el('rm_crowd', 'crowd', 62, 64, { scale: 2.6 }),
    ...balloon('rm_sign', 'THE OPEN MOOR, DAY TWO', 78, 10, { scale: 0.8 }),
    ...balloon('rm_pack', 'THE PACK', 50, 38, { scale: 0.75 }),
  ],
  script: lines(
    '[SET roadLeg = roadLeg + 1]',
    '[SET roadMiles = roadMiles + rand(6,12)]',
    '[ENTER rm_aldric at 2,68]',
    '[MOVE rm_aldric to 44,66 over 4s]',
    '[SET_TEXT rm_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    'Narrator: "Open ground, no cover, and the wind doing the work the knights did not have to."',
    '[RANDOM]',
    '# encounter A — the shared loaf',
    'The Village: "You have bread. We can smell it. There are four of us and one is small."',
    'Aldric: "...Then there are five of us and one is small. Sit down out of the wind."',
    '[SET roadFood = roadFood - 1]',
    'Narrator: "He gives away a third of the pack in eleven seconds, having thought about it for none of them. Charity on a famine road is not a virtue. It is a protocol."',
    '[OR]',
    '# encounter B — the empty vill',
    'Narrator: "A vill by the track, roofs intact, doors open, nobody in it. Not burned. Just left."',
    'Aldric: "This is worse than the burned ones. The burned ones had an argument. This just... stopped."',
    'The Village: "There is a cat in the third house that will not come out. Somebody fed that cat two weeks ago."',
    '[OR]',
    '# encounter C — the knight on the road',
    'The Village (Attack/Angry): "Riders! Off the track, into the ling, DOWN—"',
    'Narrator: "Two horsemen pass at a walk, sixty yards off, looking at nothing. It takes a full minute. It is the longest minute in the episode and nothing whatever happens in it."',
    'Aldric: "That is the part nobody puts in the ballads. Mostly they do not even see you. You lie in wet heather with your hand over a child\'s mouth for a minute, and then it is over, and you get up, and you walk."',
    '[OR]',
    '# encounter D — the grain cart going the wrong way',
    'The Village: "A cart! Going NORTH! Loaded!"',
    'Aldric: "Loaded and guarded, neighbour. That is the garrison\'s grain, going up to men who are eating fine in the middle of this. Do not run at it. It is the only cart on this road and it is not for us."',
    '[SET roadFood = roadFood + 1]',
    'Narrator: "A sack goes over the tail-board anyway, because a carter is a man too and it is a long way to Durham. Nobody says anything. That is also documented behaviour, in the negative: the famine chronicles cannot explain how anyone at all survived."',
    '[/RANDOM]',
    '[SET_TEXT rm_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    '[MOVE rm_aldric to 92,64 over 4s]',
    '[CHOICE]',
    '- "On, past the new castle" -> wm_road_castle',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { repression: { target: 90, scale: 30 }, flareUps: { target: 4, scale: 5 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_road_castle',
  name: 'The Road North: Under the Motte',
  sceneType: 'WITNESS',
  dropId: dropId('wm_motte_drop', 'wm_village'),
  stage: [
    ...el('rc_aldric', 'peasant', 16, 66),
    ...el('rc_odo', 'william_odo', 70, 62),
    ...balloon('rc_sign', 'THE NEW CASTLERY, DAY FOUR', 78, 10, { scale: 0.8 }),
    ...balloon('rc_pack', 'THE PACK', 50, 38, { scale: 0.75 }),
  ],
  script: lines(
    '[SET roadLeg = roadLeg + 1]',
    '[SET roadMiles = roadMiles + rand(5,10)]',
    '[ENTER rc_aldric at 2,68]',
    '[MOVE rc_aldric to 40,66 over 4s]',
    '[SET_TEXT rc_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    'Narrator: "The road runs under a raw motte, the timber still pale. There is no way round it. Roads go where castles are; that is the entire design."',
    '[RANDOM]',
    'Odo (Pointing/Smug): "Halt. Where are you going, and with what?"',
    'Aldric: "South, your grace. With bread for {roadFood} days and nothing anybody wants."',
    'Odo: "Everybody wants bread, farmer. That is what makes it the tax."',
    '[OR]',
    'Odo: "You there. Can you dig?"',
    'Aldric: "I can dig, your grace. I have dug a mound over my own floor once already this year, so I have the experience."',
    'Odo (Pointing/Smug): "...The clerk will not enter that either. Pass on before I think about it."',
    '[OR]',
    'Narrator: "Nobody stops him. The gate is manned, the men are bored, and a thin man walking south with a hoe is not a threat, an asset, or an entry."',
    'Aldric: "Four days on this road and the worst moment is the one where a castle looks straight at me and decides I am not worth writing down."',
    '[/RANDOM]',
    '[IF roadHeat >= 3]',
    'Narrator: "The country he is walking through was harried at RUTHLESSNESS {ruthless}. There is no relief here, no almonry, no abbey with stores — the columns came through and the abbeys gave out their grain in the first month."',
    'Aldric: "Every door on this road was opened once, early, by somebody decent. Then it was empty and it stayed shut. Do not judge the shut doors. Judge the month that emptied them."',
    '[ELSEIF roadHeat == 2]',
    'Narrator: "The harrying reached here in a thinner form: some stores intact, some vills paying, the machine already back at work collecting from the survivors."',
    'Aldric: "Half-burned country is the strangest of all. There is a mill turning up that valley. It is grinding for somebody."',
    '[ELSE]',
    'Narrator: "The order came late here and light, and it shows: byres standing, smoke from chimneys, and a reeve on the track counting people as they pass."',
    'Aldric: "Standing roofs and a man with a tally stick. I cannot decide which of those two facts is the news."',
    '[ENDIF]',
    '[MOVE rc_aldric to 92,64 over 4s]',
    '[CHOICE]',
    '- "On, to the fen edge" -> wm_road_fen',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { repression: { target: 75, scale: 40 }, greed: { target: 65, scale: 50 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_road_fen',
  name: 'The Road North: The Fen Edge',
  sceneType: 'WITNESS',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('rf_aldric', 'peasant', 18, 66),
    ...el('rf_hereward', 'hereward', 68, 62),
    ...balloon('rf_sign', 'THE FEN EDGE, DAY SIX', 78, 10, { scale: 0.8 }),
    ...balloon('rf_pack', 'THE PACK', 50, 38, { scale: 0.75 }),
  ],
  script: lines(
    '[SET roadLeg = roadLeg + 1]',
    '[SET roadMiles = roadMiles + rand(7,14)]',
    '[ENTER rf_aldric at 2,68]',
    '[MOVE rf_aldric to 42,66 over 4s]',
    '[SET_TEXT rf_pack "PACK: {roadFood} DAYS OF BREAD — {roadMiles} MILES WALKED"]',
    'Narrator: "Where the road gives up and the water starts. A man is standing in it to the knee, doing something to a net, and has clearly been watching the road for some time."',
    'Hereward: "{roadMiles} miles of that behind you, by the look. Sit down before you fall down."',
    '[RANDOM]',
    'Aldric: "You are the fen-man. The one from the ballads that have not been written yet."',
    'Hereward (Attack/Determined): "I am a man with eels. The ballads can queue up behind supper."',
    '[OR]',
    'Aldric: "You have been watching that road a while."',
    'Hereward: "I watch it every day. Some days there are forty. Today there is you. I would rather the days with forty, and I would rather that less than you would think."',
    '[OR]',
    'Hereward: "Bread for {roadFood} days, is it? Then you left with three and you have been giving it away."',
    'Aldric: "How would you know that?"',
    'Hereward: "Because men who leave with three arrive with three or with none. Nobody arrives with what they started with unless nobody asked them."',
    '[/RANDOM]',
    '[IF roadFood <= 1]',
    'Hereward: "You are out. Do not argue with me about it — I have counted men in worse arithmetic than yours and I am always right and I hate it. Eels tonight. Fowl tomorrow. Then we talk about where you can actually go."',
    'Aldric: "I did not come to join anything."',
    'Hereward (Attack/Determined): "Nobody comes to join anything. They come because the alternative ran out. That is how every army in history got made, and it is why I trust none of them, mine included."',
    '[ELSEIF roadFood >= 4]',
    'Hereward: "And you are carrying MORE than you set out with. Somebody on that road was decent to you, or you were quick at a cart."',
    'Aldric: "A carter. He looked the other way while he did it, so it would not count."',
    'Hereward: "It counts. Write it down somewhere, farmer — the whole of the resistance in this shire is men looking the other way at exactly the right moment. There is no ballad in it and it is nine-tenths of the war."',
    '[ELSE]',
    'Hereward: "Bread for {roadFood} days and the fen in front of you. That is a real choice, which is more than most men on that road get. Take the night to have it."',
    '[ENDIF]',
    '[CHOICE]',
    '- "The end of the road" -> wm_road_end',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { repression: { target: 85, scale: 35 }, flareUps: { target: 5, scale: 5 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_road_end',
  name: 'The Road North: What the Road Left',
  sceneType: 'WITNESS',
  dropId: dropId('wm_ely'),
  stage: [
    ...el('re_aldric', 'peasant', 36, 63),
    ...el('re_orderic', 'orderic', 72, 62),
    ...balloon('re_sign', 'THE END OF THE WALKING', 50, 10, { scale: 0.8 }),
    ...balloon('re_pack', 'THE PACK', 78, 38, { scale: 0.75 }),
  ],
  script: lines(
    '[SET_TEXT re_pack "{roadMiles} MILES — {roadFood} DAYS OF BREAD LEFT"]',
    'Narrator: "{roadMiles} miles, six days, one man, one hoe. The chronicles compress this into a clause. The clause took a week to walk."',
    '[IF roadFood <= 0]',
    'Aldric: "Nothing left in the pack. I will say the thing nobody says: I am not brave, I am not defeated, I am HUNGRY, and hungry is a whole separate country that the songs leave out."',
    'Orderic: "I have written \'famine\' four hundred times. I have never once written what you just said. Say it again slower, friend, and I will get it right this time."',
    '[ELSEIF roadFood <= 2]',
    'Aldric: "A day and a bit in the pack, and a marsh in front of me that feeds its own. That is not survival, monk. That is a LOAN, and the fen will want it back in work."',
    'Orderic: "Every refuge in this chapter is a loan. The abbeys, the fen, the wood at dusk. It is still the only credit a burned man can get."',
    '[ELSE]',
    'Aldric: "Bread still in the pack at the end of it. Which means somebody on that road gave me more than they could spare, and I do not know which one of them it was, and I will be doing sums about that for the rest of my life."',
    'Orderic: "Then do them out loud where a monk can hear. That is how the only good half of the record ever got written."',
    '[ENDIF]',
    '[IF ruthless >= 3]',
    'Narrator: "Behind him: a shire harried at RUTHLESSNESS {ruthless}, two-thirds of it still marked vasta in the king\'s own book seventeen years on."',
    '[ELSEIF spared == 1]',
    'Narrator: "Behind him: one granary the column passed by, and a country that otherwise burned exactly as scheduled. One exception does not make a policy. It makes a witness."',
    '[ELSE]',
    'Narrator: "Behind him: a shire that burned whatever the king felt about it in the hall. The gauge reads {ruthless} and the smoke does not care."',
    '[ENDIF]',
    'Aldric: "One thing I have decided in {roadMiles} miles, and it is the only thing I have to show for them. They can take the harvest, the wood, the mill, and the count of my ploughs. They cannot take the direction I walk. It is a small freehold. It is the only one nobody in this game has managed to assess."',
    'Narrator: "Post-Conquest law spent the next two centuries closing exactly that gap — villeinage bound the tenant to the land and made leaving without licence an offence. He is right that it is the last free thing. He is early to notice, and the machine is already drafting."',
    '[CHOICE]',
    '- "To the market cross" -> wm_rumor_cross',
    '- "Back to the village episodes" -> wm_ep_hub',
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { marginHeight: { target: 45, scale: 40 }, repression: { target: 80, scale: 40 } }, repeatable: true },
  status: 'work',
});

// ---- 3. RUMOR — a number leaves the village and comes back wrong ------------

scenes.push({
  id: 'wm_rumor_cross',
  name: 'Rumor: The Market Cross',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('ru_aldric', 'peasant', 30, 64),
    ...el('ru_crowd', 'crowd', 70, 64, { scale: 2.6 }),
    ...balloon('ru_sign', 'THE MARKET CROSS', 50, 10, { scale: 0.8 }),
    ...balloon('ru_board', 'THE FIGURE', 50, 34, { scale: 0.8 }),
  ],
  script: lines(
    '[IF geld <= 0]',
    '# no assize run yet: seed the vill\'s figure from the historical mean',
    '[SET geld = 36]',
    '[SET ploughs = 3]',
    '[SET woodland = 60]',
    '[ENDIF]',
    '[SET_TEXT ru_board "TORP: {geld} SHILLINGS — {waste} IN A HUNDRED STILL WASTE"]',
    '[ENTER ru_aldric at 4,66]',
    '[MOVE ru_aldric to 30,64 over 3s]',
    'Narrator: "The commissioners ride out at noon. By evening the figure is at the cross, and a figure at a cross stops being a fact and starts being a career."',
    '[RANDOM]',
    'The Village: "What did they write, Aldric? Say the number."',
    '[OR]',
    'The Village (Attack/Angry): "The NUMBER, Aldric! We have been standing here since sext!"',
    '[OR]',
    'The Village: "Do not soften it. Nobody here has ever been helped by a softened number."',
    '[/RANDOM]',
    'Aldric: "{geld} shillings. Three plough-teams, one of them a beam in my yard. The mill at twelve. Wood for {woodland} swine at six."',
    'The Village (Attack/Angry): "{geld}! On THIS vill? In THIS year?"',
    'Aldric: "In this year. And hear the rest of it, because the rest is the part that matters: {waste} in every hundred acres north of us is still entered as vasta — waste — seventeen years after the fires. The book knows. The book WROTE IT DOWN. And the geld is {geld} anyway."',
    '[RANDOM]',
    'The Village: "Then the book is not for finding out what we have. It is for finding out what we can be made to give."',
    'Aldric: "Now you have it, neighbour. Now you have it exactly."',
    '[OR]',
    'The Village (Attack/Angry): "Seventeen years! Waste for SEVENTEEN YEARS and they can still count to {geld}!"',
    'Aldric: "They can count to anything. Counting is what they came for."',
    '[OR]',
    'The Village: "My father paid two and six on this same hide. TWO AND SIX."',
    'Aldric: "Your father paid an English lord who had to live down the lane from him. That is the entire difference and it is worth exactly {geld} minus two and six."',
    '[/RANDOM]',
    'Narrator: "Two-thirds of Yorkshire was still returned as waste in 1086; the geld went out regardless. Note the mechanism, because it recurs in every chapter of this game: the machine\'s own records document its damage, and the records do not slow the collection by one day."',
    '[CHOICE]',
    '- "Follow it into the alehouse" -> wm_rumor_alehouse',
    '- "Home, and the night arithmetic" -> wm_ep_reeve',
    '- "Back to the village episodes" -> wm_ep_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 80, scale: 35 }, flareUps: { target: 3, scale: 5 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_rumor_alehouse',
  name: 'Rumor: The Alehouse Multiplier',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('ra_crowd', 'crowd', 34, 64, { scale: 2.6 }),
    ...el('ra_hereward', 'hereward', 74, 62),
    ...balloon('ra_sign', 'THE ALEHOUSE, THREE HUNDREDS OVER', 50, 10, { scale: 0.8 }),
    ...balloon('ra_board', 'WHAT THEY SAY IT IS', 50, 34, { scale: 0.8 }),
  ],
  script: lines(
    '[SET rumorGeld = floor(geld * rand(2,4))]',
    '[SET_TEXT ra_board "THEY SAY: {rumorGeld} SHILLINGS. IT IS {geld}."]',
    'Narrator: "Three hundreds over, at the end of a week, with ale in it. Watch a true number become a useful one."',
    '[RANDOM]',
    'The Village (Attack/Angry): "{rumorGeld} shillings! On one vill! I had it from a man whose brother carts for the sheriff!"',
    '[OR]',
    'The Village (Attack/Angry): "They took {rumorGeld} off a place the size of ours, and they took the MILL, and they took a widow\'s hide off her while she stood there!"',
    '[OR]',
    'The Village: "{rumorGeld}. Say it quietly, it does not want to be shouted. {rumorGeld} shillings, and a man who disputed it, and what they did to him after."',
    '[/RANDOM]',
    'Hereward: "It was {geld}."',
    'The Village (Attack/Angry): "It was {rumorGeld}! Everybody says {rumorGeld}!"',
    'Hereward (Attack/Determined): "It was {geld}. I have the return from a clerk who owed me a fish. Now — do I correct you, or do I let {rumorGeld} do its work?"',
    '[RANDOM]',
    'Hereward: "Here is my trade, and I am not proud of it: a true number makes men pay. An exaggerated one makes men move. I have used both and I know exactly which one I am for."',
    '[OR]',
    'Hereward: "A rising runs on the wrong number more often than the right one. That is not a slander on the risen. It is a fact about how far a number has to travel to reach a man with an axe."',
    '[OR]',
    'Hereward: "The king has clerks to keep his figures exact across two hundred miles. I have ale and a road. Tell me which of us has the better distribution and I will tell you who wins the next fifty years."',
    '[/RANDOM]',
    '[IF rumorGeld >= geld * 3]',
    'Hereward: "Though {rumorGeld} is thick even for me. When the number gets absurd, the sheriff\'s man laughs at it in the market, and then everything ELSE we said gets laughed at too. Exaggeration is a loan against your own credibility, neighbours, and the interest is brutal."',
    '[ELSE]',
    'Hereward: "And {rumorGeld} is near enough to survive a sheriff\'s laugh, which is the only test a rumour has to pass. Let it run."',
    '[ENDIF]',
    'Narrator: "The true figure is {geld}. The travelling figure is {rumorGeld}. Both of them are now historical forces, and only one of them is a fact — which is the oldest problem in the trade and the reason this game shows its sources."',
    '[CHOICE]',
    '- "Follow it up to the hall" -> wm_rumor_hall',
    '- "Back to the village episodes" -> wm_ep_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { flareUps: { target: 4, scale: 5 }, greed: { target: 70, scale: 45 } }, repeatable: true },
  status: 'work',
});

scenes.push({
  id: 'wm_rumor_hall',
  name: 'Rumor: The Number Reaches the Hall',
  sceneType: 'WITNESS',
  dropId: dropId('wm_hall'),
  stage: [
    ...el('rh_william', 'william_king', 30, 62),
    ...el('rh_odo', 'william_odo', 70, 63),
    ...balloon('rh_sign', 'THE COURT, LATE 1086', 50, 10, { scale: 0.8 }),
  ],
  script: lines(
    '[IF rumorGeld <= 0]',
    '[SET rumorGeld = floor(geld * rand(2,4))]',
    '[ENDIF]',
    'Narrator: "It takes eleven days for a village number to reach a king, and it arrives wearing a different coat."',
    'Odo (Pointing/Smug): "Sire, the shires are muttering. The muttering says we assessed a vill at {rumorGeld} shillings and stripped a widow at the bench."',
    'William: "And did we?"',
    'Odo: "We assessed it at {geld}. The widow business is — approximately — true, depending on who was standing where. The number is a lie by a factor I would rather not say out loud in a hall with windows."',
    '[IF rumorGeld >= 100]',
    'William (Angry): "{rumorGeld}. There is no vill in England worth {rumorGeld} shillings and every man who repeats it knows there is not. THAT is what makes it dangerous, bishop. A lie nobody believes still gets carried, because carrying it is the point."',
    '[ELSEIF rumorGeld >= 60]',
    'William: "{rumorGeld} against a true {geld}. Near enough to be argued about, which is worse than being absurd. Absurd dies at market. Arguable travels."',
    '[ELSE]',
    'William: "{rumorGeld} against {geld}. Barely a rumour at all. Let it run and it will burn out in a hundred."',
    '[ENDIF]',
    '[RANDOM]',
    'Odo: "Shall I have the true return read out at the hundred courts? {geld}, in the clerk\'s own hand, publicly?"',
    'William: "And teach every vill in England that the crown answers rumours? No. Correct nothing. A king who corrects is a king who can be moved."',
    '[OR]',
    'Odo: "The remedy is straightforward, sire: hang the man who started it."',
    'William: "The man who started it is four hundred men who repeated it. You cannot hang a distribution, bishop. I have tried."',
    '[OR]',
    'Odo (Pointing/Smug): "Or we let {rumorGeld} stand, sire, and quietly assess the NEXT shire at {rumorGeld}. Men resist the new burden. They do not resist the one they already believe exists."',
    'William: "...Write that down. No — do not write that down. Remember it."',
    '[/RANDOM]',
    '[IF ruthless >= 3]',
    'William: "Besides. A shire that has watched its granaries burn does not need a rumour to hate me. Mine is a reign of {ruthless} severities and I have never once been slandered by a figure worse than the true one."',
    '[ELSE]',
    'William: "Mark the asymmetry, bishop, since you enjoy instruments. They must exaggerate to be heard. I have only to be accurate, and the accuracy is enforceable. That is not a rhetorical advantage. That is an ARMY."',
    '[ENDIF]',
    'Narrator: "Power owns the true number and the means to enforce it; everyone else owns the travelling one. Nine centuries later the asymmetry is unchanged, except that the travelling number now moves at the speed of light and the enforcement still moves at the speed of a sheriff."',
    '[CHOICE]',
    '- "Back to the village episodes" -> wm_ep_hub',
    '- "Back to the voices" -> wm_hub',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 85, scale: 30 }, repression: { target: 60, scale: 55 } }, repeatable: true },
  status: 'work',
});

// ---- 4. THE REEVE'S NIGHT ARITHMETIC ---------------------------------------

scenes.push({
  id: 'wm_ep_reeve',
  name: 'The Night Arithmetic',
  sceneType: 'WITNESS',
  dropId: dropId('wm_village'),
  stage: [
    ...el('nr_aldric', 'peasant', 46, 64),
    ...balloon('nr_sign', 'THE HEARTH, AFTER THE ASSIZE', 78, 10, { scale: 0.8 }),
    ...balloon('nr_sums', 'THE SUMS', 22, 36, { scale: 0.8 }),
  ],
  script: lines(
    '[IF geld <= 0]',
    '[SET geld = 36]',
    '[SET ploughs = 3]',
    '[ENDIF]',
    '[SET_TEXT nr_sums "OWED: {geld} SHILLINGS. TEAMS ON THE BOOK: {ploughs}."]',
    '[ENTER nr_aldric at 90,66]',
    '[MOVE nr_aldric to 46,64 over 3s]',
    'Narrator: "Nobody else awake. A man with a stick, a floor, and a number he cannot make come out."',
    '[RANDOM]',
    'Aldric (thinking): "{geld} shillings. Take the winter pig: that is eight. Take the barley over what we eat: six, seven if the price holds, and the price never holds."',
    '[OR]',
    'Aldric (thinking): "{geld}. I have done this four times tonight and got four answers, which means I am not doing arithmetic. I am doing hoping with numbers on it."',
    '[OR]',
    'Aldric (thinking): "The clerk did this sum in the time it takes to sharpen a quill. It has taken me since dark and I am the one who has to LIVE in the answer."',
    '[/RANDOM]',
    'Aldric (thinking): "Fifteen, sixteen with the fleeces. And {geld} owed. So the difference is the seed corn, every year, forever, and everybody at that bench knew it before I opened my mouth."',
    '[IF ruthless >= 3]',
    'Aldric: "And I know what the difference costs, because I have walked through what happens to a shire that eats its seed. I have seen a country of it. That was the king\'s doing at {ruthless} severities, and this is the same policy with a quill in its hand."',
    '[ELSEIF spared == 1]',
    'Aldric: "One village they passed by. Ours. And here is the joke the survivors do not tell: the vill that kept its granary is assessed HIGHER, because it had something to assess. Mercy is a rate too. I have said that all year and only tonight do I feel it."',
    '[ELSE]',
    'Aldric: "The king hesitated once in a hall two hundred miles from here. It is worth exactly nothing at this hearth, and I would still rather he hesitated than not. That is the whole of my politics and it fits on a tally stick."',
    '[ENDIF]',
    'Aldric (thinking): "Right. Then: the pig goes to market BEFORE the collector comes, so it is coin and not confiscable pork. The widow is covered by hearths. Nobody volunteers a word about the mill."',
    '[RANDOM]',
    'Aldric: "And I sleep four hours and get up and plough land the king has valued at more than it yields. That is not defeat, whatever it looks like from a horse. Defeat would be not ploughing."',
    '[OR]',
    'Aldric: "It does not come out. It has never once come out. And the ploughing happens anyway, which is the only thing about this century I would defend."',
    '[OR]',
    'Aldric: "My father did these sums by this fire under an English lord and they did not come out then either. That is worth knowing. It means the enemy is not the Normans. The enemy is the RENT, and it changes its accent whenever it needs to."',
    '[/RANDOM]',
    'Narrator: "Henry George, eight hundred years downstream, in one sentence: rent takes the difference between what the land yields and what it costs to live. Aldric has just derived it at a hearth with a stick, because it is not a theory. It is what the evening actually feels like."',
    '[CHOICE]',
    '- "Out to the market cross" -> wm_rumor_cross',
    '- "Back to the village episodes" -> wm_ep_hub',
    '- "Enter the Machine" -> wm_machine',
    '[/CHOICE]',
  ),
  narraton: { pool: RPOOL, keys: { greed: { target: 75, scale: 40 }, marginHeight: { target: 50, scale: 45 } }, repeatable: true },
  status: 'work',
});

// ---- the village-episodes hub ----------------------------------------------

scenes.push({
  id: 'wm_ep_hub',
  name: 'The Assize and the Road',
  sceneType: 'AGENCY',
  dropId: dropId('wm_village'),
  stage: [
    ...el('eph_aldric', 'peasant', 50, 64),
    ...balloon('eph_sign', 'THE VILLAGE EPISODES', 50, 10, { scale: 0.9 }),
  ],
  script: lines(
    '[SET epVisits = epVisits + 1]',
    '[RANDOM]',
    'Narrator: "Away from the hall and the fire. Three episodes at ground level: a bench where a village is written down, a road out of a burned country, and a number that leaves home and comes back a stranger."',
    '[OR]',
    'Aldric: "Kings get scenes. Villages get episodes — the bench, the road, and the week the number was in everybody\'s mouth. Take your pick."',
    '[OR]',
    'Narrator: "The chronicles are thin down here, so the sources get flagged as they arrive. What the record does hold at this altitude: plough-teams, mills, pannage for swine, and the word vasta, sixty times a page."',
    '[OR]',
    'Aldric: "Back again. Good. The bench is still sitting, the road is still there, and the number is still wrong three hundreds over."',
    '[/RANDOM]',
    '[IF assizeSigned == 1]',
    'Aldric: "And Torp stands assessed at {geld} shillings, signed. That does not come off."',
    '[ELSEIF assizeSigned == 2]',
    'Aldric: "And Torp stands assessed at {geld} shillings, disputed. The dispute is in the book. So is the figure."',
    '[ELSE]',
    'Aldric: "The commissioners are still sitting. Nothing is entered yet, which is the shortest-lived condition in England."',
    '[ENDIF]',
    '[CHOICE]',
    '- "The Assize of Torp — the commissioners\' bench" -> wm_ep_assize',
    '- "The Road North — six days on foot" -> wm_road_start',
    '- "The Market Cross — say the number" -> wm_rumor_cross',
    '- "The Night Arithmetic — a man, a stick, a floor" -> wm_ep_reeve',
    '- "Back to the voices" -> wm_hub',
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
      // village-episode variables (assize / road / rumor). Declared here
      // so every {interpolation} resolves from the very first frame,
      // whichever episode the Narraton drops you into.
      geld: 0, ploughs: 0, mill: 0, woodland: 0, widowWaste: 0,
      assizeVisits: 0, assizeAnswers: 0, assizeSigned: 0, haggle: 0,
      roadFood: 3, roadMiles: 0, roadLeg: 0, roadHeat: 1,
      rumorGeld: 0, epVisits: 0,
      // Two-thirds of Yorkshire was still returned 'vasta' in 1086.
      waste: 66,
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
      description: 'Conquest converted into a permanent rent system, 1066-1087. Sourced from HVB_RESEARCH.md and HVB_RESEARCH_2.md.',
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
