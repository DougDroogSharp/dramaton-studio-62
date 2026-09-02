// Builds public/hvb-capone.json — the standalone KING OF CHICAGO /
// CAPONE (1920-1931) chapter game of Humans vs Billionaires, in the
// 1986 Amiga pixel-art style of Doug Sharp's King of Chicago.
// Dialogue and consequences drawn from docs/HVB_RESEARCH.md (Chapter 4).
//
// Art: node scripts/chapters/gen-capone.mjs   (needs dev server on :8080)
// Run: node scripts/chapters/build-capone.mjs
// Play: http://localhost:8080/theater?game=/hvb-capone.json
//
// Robust to missing art: any absent PNG simply drops out (actor loses
// its sprite, scene loses its backdrop) — the game still builds & runs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, balloon, actorEl, SFX,
  WORLD_BASE, ACTORS as CORE_ACTORS, SFX as CORE_SFX, machineHubScene,
} from '../machine-core.mjs';
import { buildStamp } from '../stamp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const art = (...rel) => {
  const p = resolve(root, 'art-demo', ...rel);
  if (!existsSync(p)) {
    console.warn(`  (missing art: ${rel.join('/')} — continuing without it)`);
    return null;
  }
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
};

// variants: [{ pose, expression, rel: [...path] }] — mid-scene sprites
// generated with the base sprite as identity reference. A missing PNG
// just drops the variant; [POSE] lines are guarded by poseCmd below.
const actor = (id, name, rel = null, variants = []) => {
  const graphics = [];
  const img = rel ? art(...rel) : null;
  if (img) graphics.push({ id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image: img });
  for (const v of variants) {
    const vimg = art(...v.rel);
    if (vimg) graphics.push({ id: `${id}_g_${v.pose}_${v.expression}`.toLowerCase(), pose: v.pose, expression: v.expression, angle: 0, image: vimg });
  }
  return { id, name, graphics, status: 'work' };
};

// Emit a [POSE] line only when the actor has that exact pose/expression
// graphic at angle 0 — the renderer needs an exact triple match.
// POSE targets the STAGE ELEMENT id, not the actor id.
const poseCmd = (elementId, actorId, pose, expression) => {
  const a = actors.find((x) => x.id === actorId);
  const hit = a?.graphics.some((g) => g.pose === pose && g.expression === expression && g.angle === 0);
  if (!hit) {
    console.warn(`  (no ${pose}/${expression} sprite for ${actorId} — POSE on ${elementId} skipped)`);
    return '';
  }
  return `[POSE ${elementId} pose=${pose} expression=${expression}]`;
};

const drops = [];
const drop = (id, name, ...rel) => {
  const img = art(...rel);
  if (img) drops.push({ id, name, image: img, status: 'work' });
  return img ? id : null;
};

const spr = (id, assetId, x, y, scale = 2.4) => ({
  ...actorEl(id, assetId, x, y, { scale }),
  pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
});

// ---- the three-door rule -------------------------------------------------
// House rule: no [CHOICE] ever offers more than three doors. Longer menus
// fan out into grouping scenes — each one a short beat with its own line
// of framing, then its own three doors. Nothing is cut; every outcome that
// used to sit in a ten-item list is still down there, one door deeper.
const MENU_MAX = 3;
const choice = (opts) => ['[CHOICE]', ...opts.filter(Boolean), '[/CHOICE]'];
const fanScene = (id, name, dropId, stage, framing, opts) => {
  if (opts.length > MENU_MAX) throw new Error(`${id}: ${opts.length} doors (max ${MENU_MAX})`);
  return {
    id, name, sceneType: 'AGENCY', dropId, stage,
    script: lines(...framing, ...choice(opts)),
    status: 'work',
  };
};

// ---------------------------------------------------------------- assets

const actors = [
  actor('capone', 'Capone', ['capone_boss.png'], [
    { pose: 'Pointing', expression: 'Angry', rel: ['capone', 'capone_point_angry.png'] },
    { pose: 'Wave', expression: 'Happy', rel: ['capone', 'capone_wave_happy.png'] },
    { pose: 'Sit', expression: 'Confused', rel: ['capone', 'capone_sit_confused.png'] },
  ]),
  actor('wilson', 'Wilson', ['capone_wilson.png'], [
    { pose: 'Closeup', expression: 'Determined', rel: ['capone', 'wilson_closeup_determined.png'] },
  ]),
  actor('torrio', 'Torrio', ['capone', 'capone_torrio.png'], [
    { pose: 'Lean', expression: 'Tired', rel: ['capone', 'torrio_lean_tired.png'] },
  ]),
  actor('ness', 'Ness', ['capone', 'capone_ness.png']),
  actor('workman', 'Workman', ['capone', 'capone_breadline.png']),
  actor('newsboy', 'Newsboy', ['capone', 'capone_newsboy.png']),
  actor('breadline', 'The Breadline', ['capone', 'capone_crowd_breadline.png']),
  actor('press', 'The Press', ['capone', 'capone_crowd_press.png']),
  // Voice-only secondary cast (Pass 2 research) — no sprites, they speak
  // off-stage the way the Narrator does.
  actor('irey', 'Irey'),
  actor('johnson', 'Johnson'),
  actor('shumway', 'Shumway'),
  actor('guzik', 'Guzik'),
  actor('narrator', 'Narrator'),
];

// Core Machine cast (empty graphics — the rig is balloons + placeholder
// actors) and core SFX: merge in whatever this chapter doesn't already have.
for (const a of CORE_ACTORS) {
  if (!actors.some((x) => x.id === a.id)) actors.push({ ...a, graphics: [] });
}
const sfx = [...SFX];
for (const s of CORE_SFX) {
  if (!sfx.some((x) => x.id === s.id)) sfx.push(s);
}

const dropLexington = drop('capone_lexington', 'Lexington Hotel Suite', 'capone', 'capone_lexington.png');
const dropSoup = drop('capone_soupkitchen', 'Capone Free Soup Kitchen', 'capone', 'capone_soupkitchen.png');
const dropGarage = drop('capone_garage', 'Clark Street Garage', 'capone_garage.png');
const dropCourt = drop('capone_courtroom', 'Federal Courtroom 1931', 'capone', 'capone_courtroom.png');
const dropCicero = drop('capone_cicero', 'Cicero Polling Place 1924', 'capone', 'capone_cicero.png');

// The two mood dials of the 1986 game, reborn: HEAT is police and
// public attention, RESPECT is standing inside the Outfit. Choices move
// both; the ending reads HEAT.
const GAUGES = [
  '[GAUGE heat at 8,12 min=0 max=100 label="HEAT"]',
  '[GAUGE respect at 8,22 min=0 max=100 label="RESPECT"]',
];

// ---------------------------------------------------------------- scenes

const scenes = [
  // 0 — CICERO, 1924: the Outfit learns to own an election.
  {
    id: 'cap_cicero',
    name: 'Cicero — Election Day 1924',
    sceneType: 'AGENCY',
    dropId: dropCicero,
    stage: [
      spr('st_cic_capone', 'capone', 32, 62),
      spr('st_cic_torrio', 'torrio', 70, 62),
    ],
    script: lines(
      ...GAUGES,
      'Narrator: "Cicero, Illinois. April Fools\' Day, 1924. Chicago went and elected itself a reform mayor, so the Outfit packed the whole circus and moved it to the suburbs. Today Cicero votes — on whether the town belongs to the people living in it or the organization that just moved in. Two dials ride with you through this story: HEAT, how hard the law and the front pages are staring at you. RESPECT, what the Outfit figures the man at the top is worth."',
      'Torrio: "Al. An election is a market with one product on the shelf. Buy it loud, buy it quiet, or let the customers carry it home. Three prices. Read the tags."',
      'Capone: "This town IS the operation, Johnny. The breweries, the Hawthorne, the wire rooms. Cicero votes wrong, we\'re commuters."',
      'Torrio: "Then choose. And remember the one thing I keep telling you — violence is overhead."',
      '[CHOICE]',
      '- "Price Cicero — the polls open at six" -> cap_cic_price',
      '- "Step into the back room — the whole record" -> cap_backroom',
      '- "Enter the Machine" -> cap_machine',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 0a — muscle: the historical election-day takeover, and its bill.
  {
    id: 'cap_cic_muscle',
    name: 'Cicero: The Muscle',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_cicm_capone', 'capone', 32, 62), spr('st_cicm_torrio', 'torrio', 70, 62)],
    script: lines(
      poseCmd('st_cicm_capone', 'capone', 'Pointing', 'Angry'),
      'Capone: "Every polling place gets a car and four boys. Any voter looks wobbly, he gets an escort and an education."',
      '[SET heat = heat + 15]',
      '[SET respect = respect + 10]',
      '[SET repression = repression + 15]',
      'Narrator: "Two hundred armed men worked the polls from open to close — ballots inspected, election judges run off, poll watchers driven to the county line and shown the scenery. Cicero voted the Outfit\'s way. The Crime Commission\'s Virgil Peterson would file it as one of the most disgraceful episodes in American municipal history. And by dusk the family had a bill of its own: Al\'s brother Frank, dead in a volley from plainclothes police outside a polling place."',
      'Torrio: "You bought the town, Al. The flowers alone ran twenty thousand. That is the word overhead, spelled out in roses."',
      'Narrator: "Cicero belonged to the organization. And every paper in Chicago could suddenly spell Capone."',
      '[SCENE cap_hawthorne]',
    ),
    status: 'work',
  },

  // 0b — money: quieter, cheaper, corrosive.
  {
    id: 'cap_cic_money',
    name: 'Cicero: The Envelope',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_cicq_capone', 'capone', 32, 62), spr('st_cicq_torrio', 'torrio', 70, 62)],
    script: lines(
      '[SET heat = heat + 5]',
      '[SET respect = respect + 5]',
      '[SET regulation = regulation - 15]',
      'Capone: "No cars, no bats. A precinct captain\'s got a mortgage same as anybody. Feed it."',
      'Narrator: "The envelopes went out a week ahead. Cicero\'s machine discovered it had admired the Outfit all along. The count came in right, and hardly anybody had to fall down a staircase."',
      'Torrio: "Cheap, quiet, repeatable. That is how a racket graduates into a government."',
      'Narrator: "The law in Cicero was a subscription now. The town was theirs — on paper, which is the strongest way to own anything."',
      '[SCENE cap_hawthorne]',
    ),
    status: 'work',
  },

  // 0c — restraint: history rolls on anyway, but the Outfit remembers.
  {
    id: 'cap_cic_stayout',
    name: 'Cicero: Hands Off',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_cics_capone', 'capone', 32, 62), spr('st_cics_torrio', 'torrio', 70, 62)],
    script: lines(
      '[SET respect = respect - 10]',
      'Capone: "Let \'em vote. We\'ll rent the winners Thursday."',
      'Narrator: "Cicero voted, more or less free. The Outfit still wound up with the Hawthorne, the wire rooms, and most of the winners\' evenings — money finds the door either way. But down in the ranks the soldiers muttered it over their beer: the big fellow blinked."',
      'Torrio: "Restraint reads as weakness to men who do their counting in calibers. Watch your lieutenants, Al."',
      '[SCENE cap_hawthorne]',
    ),
    status: 'work',
  },

  // 0.5 — THE HAWTHORNE, 1926: a thousand rounds, and three answers.
  {
    id: 'cap_hawthorne',
    name: 'The Hawthorne — September 1926',
    sceneType: 'AGENCY',
    dropId: dropCicero,
    stage: [
      balloon('haw_sign', 'HAWTHORNE HOTEL — CICERO', 50, 14, { zIndex: 4 }),
      spr('st_haw_capone', 'capone', 32, 62),
      spr('st_haw_torrio', 'torrio', 70, 62),
    ],
    script: lines(
      ...GAUGES,
      '[EFFECT shake_all on haw_sign]',
      'Narrator: "September 20, 1926. Eleven cars roll past the Hawthorne Hotel in broad daylight and rake it, methodical as a car wash — machine guns, car after car, better than a thousand rounds. When it ends: glass on every table, splinters where the lobby was, a bystander named Mrs. Freeman with flying debris in her eye. Capone, face down on the restaurant floor with his bodyguard on top of him, unhurt."',
      '[CLEAR_EFFECT shake_all from haw_sign]',
      poseCmd('st_haw_torrio', 'torrio', 'Lean', 'Tired'),
      'Torrio: "I retired the year they nearly settled me, Al. Look at this room. This is what the business looks like the day the overhead comes due."',
      'Capone: "Moran and Weiss shot up my town at lunch hour, Johnny. The whole street watched. Whatever I do next, the street watches that too."',
      'Torrio: "Then pick the show."',
      '[CHOICE]',
      '- "Answer in kind — settle it" -> cap_haw_retaliate',
      '- "Let Torrio broker the peace" -> cap_haw_negotiate',
      '- "Eat it — pay the bills, smile for the camera" -> cap_haw_absorb',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 0.5a — retaliation: Weiss, three weeks later.
  {
    id: 'cap_haw_retaliate',
    name: 'The Answer',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_hawr_capone', 'capone', 32, 62), spr('st_hawr_torrio', 'torrio', 70, 62)],
    script: lines(
      poseCmd('st_hawr_capone', 'capone', 'Pointing', 'Angry'),
      '[SET heat = heat + 20]',
      '[SET respect = respect + 15]',
      '[SET hawthorne = 1]',
      'Capone: "A thousand rounds through my windows? Fine. Somebody rents the room over the flower shop on State Street. And waits."',
      'Narrator: "Three weeks later Hymie Weiss crossed Superior Street toward Holy Name Cathedral and never reached the steps. The florist\'s window across the way had been rented by quiet men. Chicago read the signature at a glance. The cathedral\'s cornerstone still carries the chips."',
      'Torrio: "The street respects it. The street also files it, Al. A jury is just the street, remembering out loud."',
      '[SCENE cap_lexington]',
    ),
    status: 'work',
  },

  // 0.5b — the Sherman peace: October 1926, the amnesty that held a while.
  {
    id: 'cap_haw_negotiate',
    name: 'The Sherman Peace',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_hawn_capone', 'capone', 32, 62), spr('st_hawn_torrio', 'torrio', 70, 62)],
    script: lines(
      poseCmd('st_hawn_torrio', 'torrio', 'Lean', 'Tired'),
      '[SET heat = heat - 10]',
      '[SET respect = respect - 5]',
      'Torrio: "A room at the Hotel Sherman. Every gang at one table. Territories drawn on a map like railroads carving up a continent. Nobody shoots a customer of the peace."',
      'Narrator: "October 1926. The amnesty conference cut Chicago into markets, and for a while the trucks rolled unhijacked. Businessmen, dividing trade. The papers called it a treaty. Nobody got charged with a thing."',
      'Capone: "See, Johnny? I keep telling them I\'m a businessman. Today it was even true."',
      'Narrator: "Some of the soldiers figured the big fellow had bought his peace with prestige. Peace is like that. It always looks like somebody paid."',
      '[SCENE cap_lexington]',
    ),
    status: 'work',
  },

  // 0.5c — absorb it: the show of calm, the hospital bill.
  {
    id: 'cap_haw_absorb',
    name: 'The Calm Front',
    sceneType: 'WITNESS',
    dropId: dropCicero,
    stage: [spr('st_hawa_capone', 'capone', 32, 62), spr('st_hawa_torrio', 'torrio', 70, 62)],
    script: lines(
      poseCmd('st_hawa_capone', 'capone', 'Wave', 'Happy'),
      '[SET heat = heat - 5]',
      '[SET respect = respect + 10]',
      '[SET prestige = prestige + 5]',
      'Capone: "Reopen the restaurant tonight. Coffee for the reporters — the good coffee. And find the woman who caught the glass, Mrs. Freeman. Every hospital bill she\'s got is mine. The eye specialists too. All of it."',
      'Narrator: "He paid — thousands, said the papers — and stood in the shot-up doorway grinning for photographs. The message read two ways at once: nothing scares this man, and this man decides what Cicero costs."',
      'Torrio: "Generosity as armor. You bought the expensive lesson cheap, Al."',
      '[SCENE cap_lexington]',
    ),
    status: 'work',
  },

  // 1 — THE LEXINGTON SUITE: Torrio counsels; the player gives the order.
  {
    id: 'cap_lexington',
    name: 'The Lexington Suite',
    sceneType: 'AGENCY',
    dropId: dropLexington,
    stage: [
      spr('st_capone', 'capone', 32, 62),
      spr('st_torrio', 'torrio', 70, 62),
    ],
    script: lines(
      ...GAUGES,
      'Narrator: "Chicago, 1928. The Lexington Hotel, fourth floor — a suite the size of a city ward, cigar smoke thick enough to lean on. The Outfit grossed $105 million last year; Guinness will log it as the highest income any private citizen ever pulled down. The racket is rent, and the rent is due."',
      '[IF hawthorne == 1]',
      'Torrio: "Superior Street bought you two quiet years, Al. Quiet is not forgotten — the Hawthorne ledger still shows an open line, and Moran keeps books too."',
      '[ENDIF]',
      '[IF respect < 35]',
      'Torrio: "And mind your own house. The soldiers are saying the big fellow went soft. A boss whose men shrug is a boss on a clock."',
      '[ENDIF]',
      'Torrio: "Al. I built this thing on one rule: violence is overhead. Every bullet costs more than it buys. Run it like a business."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business. I supply a popular demand."',
      'Torrio: "Then decide like one. Moran\'s North Siders are hijacking your trucks. The aldermen got expensive. And half the speakeasies in the Loop are behind on protection."',
      'Capone: "The country wanted booze and I organized it. Why should I be called a public enemy?"',
      'Torrio: "You asked for my counsel. Here is the menu. Nothing on it is free."',
      '[CHOICE]',
      '- "Raise the rates — protection is rent" -> cap_order_rates',
      '- "Buy the alderman — corrode the law" -> cap_order_alderman',
      '- "Settle it with the North Side" -> cap_order_northside',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 1a — consequence: extortion as rent
  {
    id: 'cap_order_rates',
    name: 'Order: Raise the Rates',
    sceneType: 'WITNESS',
    dropId: dropLexington,
    stage: [spr('st_capone2', 'capone', 32, 62), spr('st_torrio2', 'torrio', 70, 62)],
    script: lines(
      '[SET rent = rent + 15]',
      '[SET repression = repression + 10]',
      '[SET heat = heat + 10]',
      '[SET respect = respect + 5]',
      poseCmd('st_capone2', 'capone', 'Pointing', 'Angry'),
      'Capone: "Every shop on the block pays to exist. Call it protection. Call it rent. Same thing."',
      'Narrator: "The enforcers made their rounds that week, polite as gas men reading a meter. Shopkeepers and unions paid for the privilege of staying open — the racket as rent, collected door to door. The ones who refused found out what the overhead was for."',
      'Torrio: "Money in. But every squeezed grocer is a witness, Al. Witnesses compound, like interest."',
      'Narrator: "And the North Side kept hijacking the trucks anyway. Some questions only ever get the one kind of answer in this town."',
      '[SCENE cap_garage]',
    ),
    status: 'work',
  },

  // 1b — consequence: corroding regulation
  {
    id: 'cap_order_alderman',
    name: 'Order: Buy the Alderman',
    sceneType: 'WITNESS',
    dropId: dropLexington,
    stage: [spr('st_capone3', 'capone', 32, 62), spr('st_torrio3', 'torrio', 70, 62)],
    script: lines(
      '[SET regulation = regulation - 20]',
      '[SET prestige = prestige + 5]',
      '[SET heat = heat - 5]',
      'Capone: "Every policeman in this town gets some of his bread and butter from the taxes I pay."',
      'Narrator: "The envelopes went out — police captains, aldermen, judges. Cicero had proved the method back in 1924: own the votes, own the officials, and the law turns into a line item. The citizens\' own taxes paid the police who looked the other way."',
      'Torrio: "Cheaper than bullets. But a bought law protects nobody — us included — the day Washington sends men who won\'t take the envelope."',
      'Narrator: "And the North Side was still out there, hijacking trucks. One entry left open on the ledger."',
      '[SCENE cap_garage]',
    ),
    status: 'work',
  },

  // 1c — consequence: the order that becomes the Massacre
  {
    id: 'cap_order_northside',
    name: 'Order: The North Side',
    sceneType: 'WITNESS',
    dropId: dropLexington,
    stage: [spr('st_capone4', 'capone', 32, 62), spr('st_torrio4', 'torrio', 70, 62)],
    script: lines(
      '[SET repression = repression + 20]',
      '[SET heat = heat + 25]',
      '[SET respect = respect + 10]',
      'Torrio: "Al. In \'26 they drove past the Hawthorne and put a thousand rounds through your windows. I know what settling means. I retired the day it nearly settled me."',
      poseCmd('st_capone4', 'capone', 'Pointing', 'Angry'),
      'Capone: "Then you know it never stays settled till somebody settles it."',
      'Narrator: "The order went to a hit squad in February 1929. Two of the men would dress as police. What happened next nailed an address into the history books: 2122 North Clark Street."',
      '[SCENE cap_garage]',
    ),
    status: 'work',
  },

  // 2 — THE GARAGE AFTERMATH: the wall and the silence.
  {
    id: 'cap_garage',
    name: 'Clark Street, February 14, 1929',
    sceneType: 'WITNESS',
    dropId: dropGarage,
    stage: [
      balloon('garage_wall', '2122 N. CLARK ST.', 50, 18, { zIndex: 2 }),
      balloon('squad_light_1', 'POLICE', 12, 30, { zIndex: 4 }),
      balloon('squad_light_2', 'POLICE', 88, 30, { zIndex: 4 }),
      spr('st_ness', 'ness', 74, 63),
    ],
    script: lines(
      '[EFFECT shake_all on garage_wall]',
      '[EFFECT electric_flare on squad_light_1]',
      '[EFFECT electric_flare on squad_light_2]',
      'Narrator: "St. Valentine\'s Day, 1929. Seven men of Moran\'s North Side Gang were lined up against this wall — Peter and Frank Gusenberg, James Clark, Adam Heyer, Reinhardt Schwimmer, Albert Weinshank, John May. Around seventy rounds. Two of the shooters wore police uniforms."',
      '[CLEAR_EFFECT shake_all from garage_wall]',
      'Narrator: "By the time the real police arrived there was nothing left to see but the brick and what the brick had stopped. This scene shows you the wall. The rest, Chicago already knows by heart."',
      'Ness: "Frank Gusenberg lived three hours. Sergeant Clarence Sweeney asked him who did it, and the report says he answered: no one — nobody shot me. Fourteen bullets in him. Some historians doubt he could have said anything at all. Reported words, not sworn ones — but true or invented, that sentence IS the code we\'re up against."',
      'Ness: "Capone was in Florida with an alibi you could frame and hang over the mantel. But everybody in this city can read a signature. Even one written in .45 caliber."',
      '[SET heat = heat + 15]',
      '[IF hawthorne == 1]',
      'Ness: "And this wall answers an older one. A thousand rounds through the Hawthorne, a florist\'s window on Superior Street, now Clark Street. This whole town keeps ledgers — even the kind written in brick."',
      '[ENDIF]',
      'Narrator: "The Chicago Crime Commission answered with a new kind of weapon: a list. April 24, 1930 — twenty-eight names, handed straight to the papers, and at the top, number one, Al Capone. The publicity that built him swung around and took aim."',
      'Narrator: "And a man who just made Public Enemy Number One needs the public to remember, fast, why it ever liked him."',
      '[SCENE cap_soupkitchen]',
    ),
    status: 'work',
  },

  // 3 — THE SOUP KITCHEN: prestige-laundering, live Tribune ticker.
  {
    id: 'cap_soupkitchen',
    name: 'The Soup Kitchen Spectacle',
    sceneType: 'AGENCY',
    dropId: dropSoup,
    stage: [
      balloon('soup_sign', 'FREE SOUP COFFEE AND DOUGHNUTS FOR THE UNEMPLOYED', 50, 12, { zIndex: 4 }),
      balloon('trib_ticker', 'CHICAGO TRIBUNE — LATEST', 50, 94, { zIndex: 5 }),
      spr('st_workman', 'workman', 24, 64),
      spr('st_capone5', 'capone', 62, 62),
      spr('st_newsboy', 'newsboy', 86, 68, 1.8),
    ],
    script: lines(
      ...GAUGES,
      '[GAUGE prestige at 8,32 min=0 max=100 label="PRESTIGE"]',
      '[EFFECT gold_glow on soup_sign]',
      '',
      '# The Tribune cycle: headlines rotate while prestige launders upward.',
      '[TICK 2500ms]',
      '[SET prestige = clamp(prestige + 1, 0, 100)]',
      '[SET newsIdx = newsIdx + 1]',
      '[IF newsIdx > 3]',
      '[SET newsIdx = 0]',
      '[ENDIF]',
      '[IF newsIdx == 0]',
      '[SET_TEXT trib_ticker "CAPONE FEEDS 5,000 ON THANKSGIVING — PRESTIGE {prestige}"]',
      '[ENDIF]',
      '[IF newsIdx == 1]',
      '[SET_TEXT trib_ticker "120,000 MEALS SERVED BY CAPONE FREE SOUP KITCHEN"]',
      '[ENDIF]',
      '[IF newsIdx == 2]',
      '[SET_TEXT trib_ticker "LINES FOR SOUP STRETCH PAST POLICE HEADQUARTERS"]',
      '[ENDIF]',
      '[IF newsIdx == 3]',
      '[SET_TEXT trib_ticker "\'I\'M A BUSINESSMAN,\' SAYS SCARFACE — PRESTIGE {prestige}"]',
      '[ENDIF]',
      '[/TICK]',
      '',
      'Narrator: "November 1930. 935 South State Street. Steam on the windows, stew on the air. The man the Crime Commission calls Public Enemy Number One opens a free soup kitchen — 2,200 fed a day, 5,000 on Thanksgiving. The breadline winds past police headquarters, which is not an accident."',
      poseCmd('st_capone5', 'capone', 'Wave', 'Happy'),
      'Newsboy: "Extra! Extra! Capone feeds five thousand! Read it in the Tribune!"',
      'Workman: "Two years I built Pullman cars. Built things you could ride in. Now the only man in Chicago with work for my hands is the one the police can\'t touch. You want me to hand back the soup?"',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am."',
      'Narrator: "An associate told a Chicago paper: he couldn\'t stand to see those poor devils starving, so the big boy decided to do it himself. The Tribune printed the meal count. Nobody printed what the soup was rinsing."',
      '[IF respect >= 60]',
      'Workman: "Say what you want — the man\'s own boys eat here too. In this town he\'s the closest thing to a mayor that ever answered the door."',
      '[ENDIF]',
      '[IF respect < 60]',
      'Workman: "The wall on Clark Street is still standing, mister. A bowl of soup don\'t wash brick."',
      '[ENDIF]',
      'Narrator: "Watch the gauge climb. Charity comes cheap when the till is rent. But Public Enemy Number One is a title that demands an answer — and downtown, a quieter arithmetic is already running the other way. So: what does the big fellow do with the label?"',
      '[CHOICE]',
      '- "Open the kitchen wider — ladle for the cameras" -> cap_pe_kitchen',
      '- "Feed the press — give them the interviews" -> cap_pe_press',
      '- "Lie low — Palm Island till it cools off" -> cap_pe_lielow',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 3a — lean into the charity.
  {
    id: 'cap_pe_kitchen',
    name: 'Answer: The Ladle',
    sceneType: 'WITNESS',
    dropId: dropSoup,
    stage: [spr('st_pek_capone', 'capone', 55, 62), spr('st_pek_workman', 'workman', 24, 64)],
    script: lines(
      poseCmd('st_pek_capone', 'capone', 'Wave', 'Happy'),
      '[SET heat = heat - 10]',
      '[SET respect = respect + 5]',
      '[SET prestige = prestige + 10]',
      'Capone: "Three shifts a day. Nobody asks a name, nobody preaches a sermon, nobody stands in line behind a photographer. And get the Tribune the meal counts. Exact figures — they love exact figures."',
      'Narrator: "An associate told a Chicago paper the big boy couldn\'t stand to see those poor devils starving. 120,000 meals made the headline. The Crime Commission\'s list stayed printed — but for one whole season, the breadline argued back."',
      'Workman: "I know what the soup is for, mister. I ate it anyway. That\'s the whole Depression in one bowl."',
      '[SCENE cap_wilson]',
    ),
    status: 'work',
  },

  // 3b — court the papers.
  {
    id: 'cap_pe_press',
    name: 'Answer: The Interviews',
    sceneType: 'WITNESS',
    dropId: dropSoup,
    stage: [spr('st_pep_capone', 'capone', 55, 62), spr('st_pep_newsboy', 'newsboy', 84, 68, 1.8)],
    script: lines(
      '[SET heat = heat + 10]',
      '[SET respect = respect + 5]',
      '[SET prestige = prestige + 5]',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am. Print that."',
      'Capone: "And print this: I\'ve been made an issue and I\'m not complaining. But why don\'t they go after all those bankers who took the savings of thousands of poor people and lost them in bank failures?"',
      'Newsboy: "Extra! Scarface says he\'s a public benefactor! Washington takes the paper too, mister!"',
      'Narrator: "Every quotable line went up like a flare over the Lexington. The public grinned. The Bureau of Internal Revenue underlined. A man who explains his income to reporters has just explained it to the government."',
      '[SCENE cap_wilson]',
    ),
    status: 'work',
  },

  // 3c — vanish south.
  {
    id: 'cap_pe_lielow',
    name: 'Answer: Palm Island',
    sceneType: 'WITNESS',
    dropId: dropSoup,
    stage: [spr('st_pel_capone', 'capone', 55, 62)],
    script: lines(
      '[SET heat = heat - 20]',
      '[SET respect = respect - 10]',
      'Capone: "Miami. Fishing, sunshine, no photographs. Chicago can cool off without my face in the frame."',
      'Narrator: "The estate at 93 Palm Island: high walls, a dock, one telephone. The Chicago papers went a season without a Capone headline — and the soldiers went a season without laying eyes on the boss. Absence lowers the temperature and the loyalty at exactly the same rate."',
      '[SCENE cap_wilson]',
    ),
    status: 'work',
  },

  // 4 — WILSON'S OFFICE: the ledgers close in.
  {
    id: 'cap_wilson',
    name: "Wilson's Office",
    sceneType: 'WITNESS',
    dropId: null,
    stage: [
      balloon('ledger_stack', 'LEDGERS — HAWTHORNE SMOKE SHOP', 50, 32, { zIndex: 2 }),
      spr('st_wilson', 'wilson', 30, 63),
      spr('st_ness2', 'ness', 72, 63),
    ],
    script: lines(
      '[SET evidence = 0]',
      '[GAUGE evidence at 8,20 min=0 max=100 label="EVIDENCE"]',
      '',
      '# The case grows on its own clock; the ledger swells as it closes in.',
      '[BIND ledger_stack.scale to 0.7 + evidence / 45]',
      '[BIND ledger_stack.opacity to 0.4 + evidence / 160]',
      '[TICK 900ms]',
      '[SET evidence = clamp(evidence + 3, 0, 100)]',
      '[/TICK]',
      '',
      'Narrator: "October 18, 1928. On Elmer Irey\'s desk at the Treasury Intelligence Unit, a file opens — quietly, the way the dangerous things open. From it, 1929 to 1931, Special Agent Frank J. Wilson works under death threats, tracing a fortune built never to leave a mark: a syndicate the Crime Commission reckoned at sixty million dollars a year, net. In 1927 the Supreme Court ruled that even illegal income is taxable. Capone has never filed a return in his life."',
      poseCmd('st_wilson', 'wilson', 'Closeup', 'Determined'),
      'Wilson: "One seized ledger, Hawthorne Smoke Shop. Net profits, initialed. Cashier\'s checks, endorsed by his men. Two bookkeepers — Shumway, Reis — who kept those columns and can read them to a jury, provided we keep them breathing. He never opened a bank account in his life. Doesn\'t matter. A net worth is a confession written in arithmetic."',
      'Ness: "My squad\'s been taking his breweries apart all year. Every still we axe cuts the cash flow. But raids make headlines, Frank. Your ledgers make a sentence."',
      'Wilson: "The man spends a quarter million a year. Suits. Hotels. Miami. Spending is income made visible. Watch the stack grow. He fell afoul of the one law that doesn\'t care whose bread the policeman eats."',
      'Narrator: "The Secret Six bankroll the investigation. The same Tribune that printed his meal counts now sets his indictment in type: T-MEN TRACE THE MONEY. The ledger closes in, page by patient page."',
      '[SCENE cap_jury]',
    ),
    status: 'work',
  },

  // 5 — THE JURY MOMENT: the fix that history tried and lost.
  {
    id: 'cap_jury',
    name: 'The Jury List — October 1931',
    sceneType: 'AGENCY',
    dropId: dropCourt,
    stage: [
      balloon('jury_card', 'UNITED STATES v. ALPHONSE CAPONE', 50, 20, { zIndex: 3 }),
      spr('st_jury_capone', 'capone', 34, 63),
      spr('st_jury_torrio', 'torrio', 70, 63),
    ],
    script: lines(
      ...GAUGES,
      'Narrator: "Federal court, Chicago, October 1931. Twenty-two counts of tax evasion. The night before trial, a list arrives at the Lexington: names and addresses, the entire jury venire. In this town, somebody always sells a list."',
      poseCmd('st_jury_torrio', 'torrio', 'Lean', 'Tired'),
      'Torrio: "Al. Every fix you ever bought was a city fix. This is federal. Judge Wilkerson doesn\'t eat in Chicago restaurants. I\'m tired of saying it: sometimes the cheapest move on the board is the straight one."',
      'Capone: "Twenty-two counts, Johnny. Lawyers lose. Lists don\'t."',
      '[CHOICE]',
      '- "Work the list — buy the jury" -> cap_jury_fix',
      '- "Trust the lawyers — play it straight" -> cap_jury_trust',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 5a — the historical attempt: bought, discovered, swapped.
  {
    id: 'cap_jury_fix',
    name: 'The Fix',
    sceneType: 'WITNESS',
    dropId: dropCourt,
    stage: [spr('st_jf_capone', 'capone', 34, 63), spr('st_jf_wilson', 'wilson', 70, 63)],
    script: lines(
      '[SET juryBribe = 1]',
      '[SET heat = heat + 15]',
      'Narrator: "The boys went out with the list — a favor here, an envelope there, a friendly reminder of who owns which block. By the weekend, ten of the first dozen names were warm to the touch."',
      poseCmd('st_jf_wilson', 'wilson', 'Closeup', 'Determined'),
      'Wilson: "We got the same list. Informant inside the Outfit. I carried it to Judge Wilkerson myself. He read it once and said: bring your case as planned. Leave the rest to me."',
      'Narrator: "So the fix was in — and so was the counter-fix. Nobody at the Lexington knew yet that the merchandise had already been returned."',
      '[SCENE cap_verdict]',
    ),
    status: 'work',
  },

  // 5b — the straight play.
  {
    id: 'cap_jury_trust',
    name: 'The Straight Play',
    sceneType: 'WITNESS',
    dropId: dropCourt,
    stage: [spr('st_jt_capone', 'capone', 34, 63), spr('st_jt_torrio', 'torrio', 70, 63)],
    script: lines(
      '[SET juryBribe = 0]',
      '[SET heat = heat - 5]',
      '[SET respect = respect - 5]',
      'Capone: "Burn the list. The lawyers cost what a battleship costs — let \'em earn it."',
      'Narrator: "The lawyers tried the deal first — a negotiated plea, two and a half years. Wilkerson threw it out from the bench, on the record: it is utterly impossible to bargain with a Federal court. The trial would be real, in front of whatever twelve citizens fate saw fit to seat."',
      'Torrio: "Then it\'s arithmetic against arithmetic now, Al. And theirs is written down."',
      '[SCENE cap_verdict]',
    ),
    status: 'work',
  },

  // 6 — THE VERDICT: October 17, 1931 — the fall lands per your HEAT.
  {
    id: 'cap_verdict',
    name: 'The Verdict — October 17, 1931',
    sceneType: 'WITNESS',
    dropId: dropCourt,
    stage: [
      balloon('verdict_card', 'UNITED STATES v. ALPHONSE CAPONE', 50, 20, { zIndex: 3 }),
      spr('st_capone6', 'capone', 34, 63),
      spr('st_wilson2', 'wilson', 70, 63),
    ],
    script: lines(
      ...GAUGES,
      '[EFFECT gold_glow on verdict_card]',
      '[IF juryBribe == 1]',
      'Narrator: "First morning of trial. Judge Wilkerson turns to the bailiff, casual as a man ordering lunch: Judge Woodward has a jury in his courtroom. Go bring me his entire panel, and take him mine. The bought jury walked out one door as twelve strangers walked in the other. The fix died sitting in its chair."',
      '[ENDIF]',
      '[IF juryBribe == 0]',
      'Narrator: "First morning of trial. Twelve strangers in the box — small-town men, farmers, a hardware clerk. Nobody owned them. Which meant nobody could save him from them."',
      '[ENDIF]',
      poseCmd('st_capone6', 'capone', 'Sit', 'Confused'),
      'Wilson: "No tommy gun in evidence. No witness to any wall. Just returns never filed, and a net worth no honest income explains."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I called it a business. Prohibition made nothing but trouble."',
      'Narrator: "He watches it go the way water leaves a sink — slowly, then all at once. October 17, 1931. Guilty on the tax counts. The man who grossed $105 million in a single year, brought down not by bullets but by bookkeeping."',
      'Wilson: "Rent leaves receipts. It always leaves receipts."',
      '[IF heat >= 60]',
      '[SCENE cap_end_alcatraz]',
      '[ENDIF]',
      '[IF heat < 60]',
      '[SCENE cap_end_palm]',
      '[ENDIF]',
    ),
    status: 'work',
  },

  // 7a — ENDING: high heat. The government makes an example.
  {
    id: 'cap_end_alcatraz',
    name: 'Ending: The Rock',
    sceneType: 'WITNESS',
    dropId: dropCourt,
    stage: [
      balloon('alc_card', 'ALCATRAZ — REGISTER No. 85', 50, 20, { zIndex: 3 }),
      spr('st_alc_capone', 'capone', 40, 63),
    ],
    script: lines(
      ...GAUGES,
      'Narrator: "October 24, 1931: eleven years, a $50,000 fine, $215,000 in back taxes — the stiffest tax sentence on record, because the government wanted the loudest man in America to fall loud. Your HEAT saw to that. Every headline, every retaliation, every bought juror went into evidence."',
      poseCmd('st_alc_capone', 'capone', 'Sit', 'Confused'),
      'Narrator: "Atlanta first, where he still ran things through the mail. So in 1934 they put him on the train with the barred windows, bound for the new island prison in San Francisco Bay. No newspapers. No favors. Cell, workshop, laundry. Register number 85."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "The Rock took the empire out of him; the illness took the rest. Released 1939, mind failing, dead at Palm Island in January 1947. Repeal had already drained the market that built him, back in 1933. The precedent — that criminal income is taxable — outlived every soul in this story."',
      'Narrator: "THE RACKET AS RENT, THE SOUP AS PRESTIGE, THE LEDGER AS THE END. Run it cooler and see what changes — and what refuses to."',
      '[CHOICE]',
      '- "Back to Cicero, 1924 — run it again" -> cap_cicero',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // 7b — ENDING: managed heat. History still collects — quietly.
  {
    id: 'cap_end_palm',
    name: 'Ending: Palm Island',
    sceneType: 'WITNESS',
    dropId: dropCourt,
    stage: [
      balloon('palm_card', '93 PALM ISLAND, FLORIDA', 50, 20, { zIndex: 3 }),
      spr('st_palm_capone', 'capone', 40, 63),
    ],
    script: lines(
      ...GAUGES,
      'Narrator: "Guilty all the same — history does not bend on the counts. But you kept the HEAT down, and the fall lands soft: the sentence served mostly in Atlanta, the transfer petitions granted, the parole board unhostile. Nobody needs to make an example of a man the front pages half forgot."',
      'Narrator: "Released in November 1939. The white house on Palm Island: the dock, the bathrobe, the fishing rod with no hook that nobody mentions. The illness he\'d carried since his twenties takes him apart gently — by the end, the doctors said, he had the reasoning of a twelve-year-old."',
      'Capone: "I\'m retired. I told them for years I was just a businessman. Now it\'s finally true — nobody wants a thing from me but a wave off the dock."',
      'Narrator: "Dead in January 1947, in bed, the family around him. The Outfit he built never missed a payment that week — which tells you it was never really about him. The precedent that criminal income is taxable outlived every soul in this story."',
      'Narrator: "THE RACKET AS RENT, THE SOUP AS PRESTIGE, THE LEDGER AS THE END. Run it hotter and see how the same fall lands harder."',
      '[CHOICE]',
      '- "Back to Cicero, 1924 — run it again" -> cap_cicero',
      '[/CHOICE]',
    ),
    status: 'work',
  },
];

// ---- Cicero's three doors ------------------------------------------------
// The opening used to hand you ten. Now it hands you three: price the
// election, open the back room, or go stand inside the engine.

scenes.push(fanScene(
  'cap_cic_price', 'Cicero — Name the Price', dropCicero,
  [spr('cic_pr_capone', 'capone', 32, 62), spr('cic_pr_torrio', 'torrio', 70, 62)],
  [
    'Torrio: "Three tags, Al. Loud, quiet, or nothing. The loud one you pay twice — once at the polls and once in the papers, and the papers charge interest."',
    'Capone: "Frank says the boys can be on the street by six."',
    'Torrio: "Frank says. Frank\'s twenty-eight years old and he thinks a shotgun is an argument."',
  ],
  [
    '- "Flood the polls with muscle" -> cap_cic_muscle',
    '- "Buy the precinct captains, quiet" -> cap_cic_money',
    '- "Let Cicero vote — just this once" -> cap_cic_stayout',
  ],
));

scenes.push(fanScene(
  'cap_backroom', 'The Back Room', dropLexington,
  [balloon('cap_backroom_sign', 'THE BACK ROOM — LEXINGTON HOTEL', 50, 10, { zIndex: 4 })],
  [
    'Narrator: "Fourth floor of the Lexington. A card table, two chairs nobody sits in, and eleven years of Chicago stacked up in folders that never made the trial."',
    'Narrator: "Everything the main story walked past is in this room. Take your time. The election waits — elections always wait."',
  ],
  [
    '- "Voices of Chicago — hear the witnesses" -> cap_voices',
    '- "The files — duets, aftermaths, the record" -> cap_files',
    '- "Two reels, and the door back to 1924" -> cap_reels',
  ],
));

scenes.push(fanScene(
  'cap_reels', 'Two Reels', dropGarage,
  [balloon('cap_reels_sign', 'TWO REELS — NO CHOICES IN THEM', 50, 10, { zIndex: 4 })],
  [
    'Narrator: "Two reels, cut from what people swore they saw. No choices in either one. That is the point of them — some mornings the city didn\'t get a vote."',
  ],
  [
    '- "Clark Street, 10:30 AM" -> cap_cut_clark',
    '- "The Rate Goes Up" -> cap_cut_rate',
    '- "Return to Cicero, 1924" -> cap_cicero',
  ],
));

scenes.push(fanScene(
  'cap_files', 'The Files', dropLexington,
  [balloon('cap_files_sign', 'THE FILES — THREE FOLDERS', 50, 10, { zIndex: 4 })],
  [
    'Narrator: "Three folders on the table. Duets are the conversations. Aftermaths are the bills that came due later. The Record is what nobody entered in evidence."',
  ],
  [
    '- "Duets — two voices at a table" -> cap_duets',
    '- "Aftermaths — what it cost later" -> cap_aftermaths',
    '- "The Record — the uncovered files" -> cap_record',
  ],
));

// ==========================================================================
// REACTION LAYER — "Voices of Chicago": ~100 episode vignettes.
// Data-driven: REVENTS x RESPONDERS, plus stance variants on the biggest
// events (the street's fear vs gratitude at the soup kitchen; the press
// cynical vs sensational; etc.). Every vignette carries narraton metadata
// (pool 'capone_reactions') keyed to the gauges that event moves, so the
// campaign machine can later select them as commentary. First-pass prose
// for Doug to edit; verbatim Capone quotes per HVB_RESEARCH.md Chapter 4.
// Acting tags used only where sprites exist: Capone (Pointing/Angry),
// (Wave/Happy), (Sit/Confused); Torrio (Lean/Tired); Wilson
// (Closeup/Determined). Everyone else speaks untagged.
// ==========================================================================

const RPOOL = 'capone_reactions';

const REVENTS = [
  { id: 'handover', name: 'Torrio Hands Over the Outfit', sign: 'THE HANDOVER — MARCH 1925',
    dropId: dropLexington,
    intro: 'March 1925. Johnny Torrio, shot damn near dead on his own front steps, retires and hands the whole Outfit to a 26-year-old. Who speaks?',
    keys: { respect: { target: 50, scale: 40 }, heat: { target: 20, scale: 40 } } },
  { id: 'cicero', name: 'The Cicero Election', sign: 'CICERO — ELECTION DAY 1924',
    dropId: dropCicero,
    intro: 'April 1, 1924. Gunmen work the Cicero polls open to close; the town votes the Outfit\'s way; Frank Capone is dead by dusk. Who speaks?',
    keys: { heat: { target: 35, scale: 40 }, respect: { target: 50, scale: 50 } } },
  { id: 'hawthorne', name: 'The Hawthorne Shooting', sign: 'THE HAWTHORNE — SEPTEMBER 1926',
    dropId: dropCicero,
    intro: 'September 20, 1926. Eleven cars rake the Hawthorne Hotel with a thousand rounds at lunch hour; Capone walks out of the glass without a scratch. Who speaks?',
    keys: { heat: { target: 55, scale: 40 }, repression: { target: 45, scale: 40 } } },
  { id: 'rates', name: 'The Protection Rates', sign: 'PROTECTION — THE RACKET AS RENT',
    dropId: dropLexington,
    intro: 'The enforcers work the block door to door: every shop pays for the privilege of existing. Protection, rent — same arithmetic, different hat. Who speaks?',
    keys: { rent: { target: 15, scale: 20 }, repression: { target: 40, scale: 40 } } },
  { id: 'cityhall', name: 'The Buying of City Hall', sign: 'CITY HALL — BOUGHT AND PAID',
    dropId: dropLexington,
    intro: 'Envelopes to police captains, to aldermen, to judges. The law turns into a line item on somebody\'s ledger. Who speaks?',
    keys: { regulation: { target: 10, scale: 30 }, prestige: { target: 45, scale: 50 } } },
  { id: 'massacre', name: 'The Clark Street Massacre', sign: 'CLARK STREET — FEBRUARY 14, 1929',
    dropId: dropGarage,
    intro: 'St. Valentine\'s Day, 1929. Seven men against a garage wall, around seventy rounds, two of the shooters dressed as police. Chicago changes its mind about its favorite outlaw. Who speaks?',
    keys: { heat: { target: 75, scale: 30 }, repression: { target: 55, scale: 40 } } },
  { id: 'enemy', name: 'Public Enemy No. 1', sign: 'PUBLIC ENEMY NUMBER ONE — 1930',
    dropId: dropLexington,
    intro: 'April 24, 1930. The Chicago Crime Commission publishes its list — twenty-eight names, Capone at the top. The publicity that built him swings around and takes aim. Who speaks?',
    keys: { heat: { target: 70, scale: 40 }, prestige: { target: 30, scale: 50 } } },
  { id: 'soup', name: 'The Soup Kitchen', sign: 'THE SOUP KITCHEN — NOVEMBER 1930',
    dropId: dropSoup,
    intro: 'November 1930. 935 South State Street: free soup, coffee, and doughnuts, 2,200 a day, and the breadline winds right past police headquarters. Who speaks?',
    keys: { prestige: { target: 65, scale: 35 }, heat: { target: 50, scale: 60 } } },
  { id: 'jury', name: 'The Jury Swap', sign: 'THE JURY SWAP — OCTOBER 1931',
    dropId: dropCourt,
    intro: 'October 1931. The bought jury list reaches Judge Wilkerson — who swaps his entire panel for Judge Woodward\'s on the first morning, like a man trading hats. Who speaks?',
    keys: { heat: { target: 65, scale: 40 }, evidence: { target: 80, scale: 40 } } },
  { id: 'verdict', name: 'The Verdict', sign: 'GUILTY — OCTOBER 17, 1931',
    dropId: dropCourt,
    intro: 'October 17, 1931. Guilty on the tax counts. Eleven years. The king of Chicago, brought down by bookkeeping. Who speaks?',
    keys: { evidence: { target: 100, scale: 40 }, heat: { target: 60, scale: 50 } } },
];

const RESPONDERS = [
  { key: 'capone', actorId: 'capone', label: 'Capone', scale: 2.4 },
  { key: 'torrio', actorId: 'torrio', label: 'Torrio', scale: 2.4 },
  { key: 'wilson', actorId: 'wilson', label: 'Wilson', scale: 2.4 },
  { key: 'ness', actorId: 'ness', label: 'Ness', scale: 2.4 },
  { key: 'workman', actorId: 'workman', label: 'The Workman', scale: 2.4 },
  { key: 'newsboy', actorId: 'newsboy', label: 'The Newsboy', scale: 1.8 },
  { key: 'breadline', actorId: 'breadline', label: 'The breadline, en masse', scale: 2.6 },
  { key: 'press', actorId: 'press', label: 'The press, en masse', scale: 2.6 },
];

// Stance variants: [stanceKey, choiceLabel]. The base vignette for these
// event/responder pairs ends in a chooser instead of a plain return.
const RVARIANTS = {
  hawthorne: { press: [['cynical', 'The cynics\' desk'], ['sensational', 'The front page']] },
  massacre: {
    breadline: [['fearful', 'The fear in the line'], ['hardened', 'The hard shrug in the line']],
    press: [['cynical', 'The cynics\' desk'], ['sensational', 'The front page']],
  },
  enemy: {
    breadline: [['fearful', 'The fear in the line'], ['admiring', 'The admiration in the line']],
    press: [['cynical', 'The cynics\' desk'], ['sensational', 'The front page']],
  },
  soup: {
    workman: [['fearful', 'What the bowl costs'], ['grateful', 'Who showed up for winter']],
    breadline: [['fearful', 'The fear in the line'], ['grateful', 'The gratitude in the line']],
    press: [['cynical', 'The cynics\' desk'], ['sensational', 'The front page']],
  },
  verdict: {
    breadline: [['relieved', 'The relief in the line'], ['wary', 'The wariness in the line']],
    press: [['cynical', 'The cynics\' desk'], ['sensational', 'The front page']],
  },
};

const RVOICES = {
  handover: {
    capone: [
      'Capone: "They put five bullets in Johnny at his own front door and he lived anyway. He called me to the hospital bed and handed me a city. Just like that."',
      'Capone (Wave/Happy): "Twenty-six years old. Some guys inherit a store."',
      'Capone: "It\'s a business, like Johnny always said. I just run it with the radio on."',
    ],
    torrio: [
      'Torrio: "Five bullets is a memo, Al. It says: retire."',
      'Torrio (Lean/Tired): "I built the syndicate like a railroad — territories, schedules, dividends. I handed him a timetable. He heard a throne."',
    ],
    wilson: [
      'Wilson: "1925. The biggest business in Illinois changes hands and not one piece of paper moves."',
      'Wilson: "That absence is itself an entry. It told me where to look."',
    ],
    ness: [
      'Ness: "Torrio was smarter than Capone and half as famous. That\'s why he died old, in bed, in Brooklyn."',
      'Ness: "The day Al took over, the volume went up. Loud is good for us. Loud leaves marks."',
    ],
    workman: [
      'Workman: "New boss on the South Side. On my street the beer changed hands, not the price. That\'s all a coronation ever meant down here."',
      'Workman: "They say the young one smiles more. The collectors don\'t."',
    ],
    newsboy: [
      'Newsboy: "Extra! Torrio quits! Young Scarface takes the Outfit!"',
      'Newsboy: "Sold out three editions on his face alone. That scar moves papers, mister. Better than a war."',
    ],
    breadline: [
      'The Breadline: "Torrio\'s out. The kid with the scar is in."',
      'The Breadline: "Bosses come and go. The rent stays. The rent always stays."',
    ],
    press: [
      'The Press: "Mr. Capone! Is it true Torrio left you everything?"',
      'The Press: "Twenty-six and running a syndicate. Page one doesn\'t care if it\'s a crime story or a business story. It\'s both, and it\'s ours."',
    ],
  },

  cicero: {
    capone: [
      'Capone: "Cicero voted right. Ask anybody who watched \'em vote. Plenty watched."',
      'Capone (Pointing/Angry): "They killed my brother Frank at a polling place. Whatever Cicero cost us — we paid more. Write that in your book."',
    ],
    torrio: [
      'Torrio: "An election bought with muscle stays bought for exactly one term. Then you buy it again. Muscle never goes on sale."',
      'Torrio (Lean/Tired): "Frank\'s funeral carried twenty thousand dollars of flowers. Violence is overhead, Al. I keep the receipts."',
    ],
    wilson: [
      'Wilson: "Election day 1924 made Cicero a subsidiary. Subsidiaries don\'t file returns either."',
      'Wilson: "You can\'t subpoena a ballot box. You can follow what it bought."',
    ],
    ness: [
      'Ness: "Voters walked to the booth between two gunmen. That was the Cicero franchise."',
      'Ness: "Before my badge, that one. We studied it anyway: how to buy a town in one afternoon, cash and carry."',
    ],
    workman: [
      'Workman: "I voted in Cicero that day. A fellow leaned on the booth and asked, real friendly, was I sure."',
      'Workman: "I was sure. He was surer."',
    ],
    newsboy: [
      'Newsboy: "Extra! Cicero votes at gunpoint! Frank Capone dead!"',
      'Newsboy: "Cops in plain clothes, gangsters in cop cars — some days the captions write themselves, mister. Some days they shoot each other."',
    ],
    breadline: [
      'The Breadline: "They say Cicero voted. Cicero got voted, more like."',
      'The Breadline: "Whoever wins, the beer truck still comes Tuesday."',
    ],
    press: [
      'The Press: "Election judges driven off, poll watchers escorted to the county line, one Capone dead by dark. Slow news day otherwise."',
      'The Press: "The wire wants two hundred words on democracy in Cicero. Make it a hundred. There\'s less of it than that."',
    ],
  },

  hawthorne: {
    capone: [
      'Capone: "A thousand rounds and they never touched me. Write that down exactly like I said it."',
      'Capone: "I paid Mrs. Freeman\'s hospital bills — every last one, the eye specialists too. My town, my glass, my bill."',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Eleven cars, broad daylight, machine guns. This is the ledger, Al, the day the overhead comes due."',
      'Torrio: "They nearly settled me in \'25. I retired. Note which one of us keeps getting shot at."',
    ],
    wilson: [
      'Wilson: "A thousand rounds fired and no charges filed. Cicero\'s law was a wholly owned subsidiary by then."',
      'Wilson: "Hospital bills paid in cash. Thousands. No receipt requested. Generosity is spending, and spending is income. I wrote it down."',
    ],
    ness: [
      'Ness: "A war over beer routes, fought with Thompsons through a hotel lobby at high noon."',
      'Ness: "Nobody talked. Nobody got charged. That silence is the thing we\'re really up against."',
    ],
    workman: [
      'Workman: "I was two blocks off when it started. It went on so long men quit ducking and started counting."',
      'Workman: "Glass in the street like ice in September. Next morning: business as usual, sweep your own sidewalk."',
    ],
    newsboy: [
      'Newsboy: "Extra! Booze war bullets rake the Hawthorne! A thousand rounds!"',
      'Newsboy: "Scarface walks away clean! Read all about it!"',
    ],
    breadline: [
      'The Breadline: "A thousand bullets in Cicero and not one arrest."',
      'The Breadline: "When they shoot at each other, we\'re the ones standing between."',
    ],
    press: [
      'The Press: "Mr. Capone! Who shot up your hotel? Any names for the record?"',
      'The Press: "He smiled and ordered us coffee. Twenty men with notebooks, and not one of us left with a fact."',
    ],
    press_cynical: [
      'The Press: "A thousand rounds, zero indictments. Cicero justice. We ought to print it as a box score."',
      'The Press: "He pays a bystander\'s hospital bill and we all write it up warm. The cheapest press agent in America is a machine gun that misses."',
    ],
    press_sensational: [
      'The Press: "ELEVEN CARS OF DEATH! Hold page one!"',
      'The Press: "Get the shot-up lobby — glass, coffee cups, bullet holes in the plaster. That picture sells five editions."',
    ],
  },

  rates: {
    capone: [
      'Capone: "Every shop on the block pays to exist. Call it protection. Call it rent. Same thing."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business."',
    ],
    torrio: [
      'Torrio: "Rent is the perfect racket. It collects itself monthly, it never sleeps, and it never testifies."',
      'Torrio (Lean/Tired): "But every squeezed grocer is a witness on layaway, Al. Witnesses compound, like interest."',
    ],
    wilson: [
      'Wilson: "Protection leaves no contract. It leaves frightened bookkeeping — the same sum missing, the same week, block after block after block."',
      'Wilson: "A pattern is testimony that can\'t be intimidated."',
    ],
    ness: [
      'Ness: "The grocer pays. The union pays. The laundry pays. The ones who don\'t pay meet the overhead."',
      'Ness: "You can raid a brewery. Tell me how you raid fear."',
    ],
    workman: [
      'Workman: "My cousin runs a lunch counter. Every month a fellow in a good coat lifts an envelope off him, polite as a deacon passing the plate."',
      'Workman: "Cousin calls him the second landlord. The first one only owns the building."',
    ],
    newsboy: [
      'Newsboy: "Even my corner pays, mister! A nickel a week for the privilege of standing on it!"',
      'Newsboy: "Extra! Racket squeeze hits the Loop! Nobody quoted by name — nobody ever is!"',
    ],
    breadline: [
      'The Breadline: "Everybody on the block pays. The barber, the baker, the undertaker."',
      'The Breadline: "You pay to work, you pay to eat, and now you pay to be left alone. That last one\'s the priciest."',
    ],
    press: [
      'The Press: "We ran a series on the rackets. Twelve shopkeepers talked — anonymously. The thirteenth had a fire."',
      'The Press: "Protection is the one story where every last source begs you not to print it."',
    ],
  },

  cityhall: {
    capone: [
      'Capone: "Every policeman in this town gets some of his bread and butter from the taxes I pay."',
      'Capone (Wave/Happy): "I don\'t break the law in Chicago. I rent it, by the month, and I never miss a payment."',
    ],
    torrio: [
      'Torrio: "An envelope is cheaper than a bullet and quieter than both. Corruption is the only overhead that pays you a dividend back."',
      'Torrio: "But a bought law protects nobody — including us — when Washington sends men who don\'t take the envelope."',
    ],
    wilson: [
      'Wilson: "We assumed every city officer was already on the payroll. So we came at it from outside the city."',
      'Wilson: "You can buy an alderman. The tax code has no address to send the envelope to."',
    ],
    ness: [
      'Ness: "I picked eleven men the Outfit couldn\'t buy. Took me months. Eleven — out of thousands."',
      'Ness: "They offered two thousand a week to look the other way. The papers called us Untouchable after that. We just called it Tuesday."',
    ],
    workman: [
      'Workman: "My taxes pay the cop on the corner. Capone pays him more. Guess whose corner it is."',
      'Workman: "Two fees on every permit in this town. Only one of them comes with a receipt."',
    ],
    newsboy: [
      'Newsboy: "The alderman rides around in a car the Outfit bought him! Everybody knows and nobody prints it!"',
      'Newsboy: "City Hall, mister? That\'s just the Lexington with a flag stuck on it."',
    ],
    breadline: [
      'The Breadline: "The law\'s for sale, and we\'re not the ones bidding."',
      'The Breadline: "Complain to the alderman? He\'s ahead of you in the other line. The paying one."',
    ],
    press: [
      'The Press: "We can name six captains and two judges on the pad. Legal won\'t clear a single one."',
      'The Press: "The story isn\'t that City Hall got bought. The story is how cheap it went."',
    ],
  },

  massacre: {
    capone: [
      'Capone: "I was in Florida. Ask anybody. Ask the sun, it saw me."',
      'Capone (Sit/Confused): "They put my name on that wall anyway. The country wanted booze and I organized it — why should I be called a public enemy?"',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Seven men against a wall. Twenty years I taught him violence is overhead — and there\'s the entire lesson, in one photograph, for free."',
      'Torrio: "After Clark Street there was no more business. Only heat. Heat forever after."',
    ],
    wilson: [
      'Wilson: "Not one witness would speak. So the case came down to me and the arithmetic."',
      'Wilson (Closeup/Determined): "Seven dead men moved the public, and the public moved Washington. My ledgers just arrived on time."',
    ],
    ness: [
      'Ness: "Frank Gusenberg took fourteen bullets and — the report says — told Sergeant Sweeney nobody shot him. Maybe he never said it. Either way that\'s the code — and that\'s why it had to be taxes."',
      'Ness: "Two of the shooters wore police uniforms. Think about what that does to a city. Every uniform on every corner turns into a question."',
    ],
    workman: [
      'Workman: "I walked past that garage a hundred times, never gave it a look. Now the whole street walks on the other side."',
      'Workman: "Seven men, and the papers printed where each one stood. No soup ever made washes that brick."',
    ],
    newsboy: [
      'Newsboy: "Extra! Seven slain in Clark Street garage! Killers dressed as cops!"',
      'Newsboy: "Sold out by nine and felt lousy doing it. First time that ever happened to me, mister."',
    ],
    breadline: [
      'The Breadline: "Seven against a wall. On a Thursday morning, before lunch."',
      'The Breadline: "Say the name low. Better yet, say nothing at all."',
    ],
    breadline_fearful: [
      'The Breadline: "If they\'ll do that to their own kind, what do you figure a man in a soup line is worth?"',
      'The Breadline: "Eyes on your bowl. Don\'t see anything. Nobody saw anything."',
    ],
    breadline_hardened: [
      'The Breadline: "Gangsters shooting gangsters. Sad — and not one of those seven ever stood in this line."',
      'The Breadline: "Winter kills more of us in a week than Thompsons killed of them. Where\'s our headline?"',
    ],
    press: [
      'The Press: "The photographers beat the cleanup crew. Those plates ended something. The fun went out of the gangster story that morning."',
      'The Press: "Public Enemy was born on Clark Street. We just typed it up."',
    ],
    press_cynical: [
      'The Press: "Ten years we sold these men as colorful. Colorful, right up to the wall."',
      'The Press: "Every desk in town knew who ordered it by lunchtime. Not one of us can hang the name on a fact."',
    ],
    press_sensational: [
      'The Press: "MASSACRE! Biggest crime story since the Fair — remake page one, remake all of it!"',
      'The Press: "Wall photo runs eight columns. Warn the engravers and double the print run."',
    ],
  },

  enemy: {
    capone: [
      'Capone: "Public Enemy Number One. It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am."',
    ],
    torrio: [
      'Torrio: "A list. No warrant, no charge, no court — just a ranking. And it cut him deeper than any indictment yet."',
      'Torrio (Lean/Tired): "I told him from the start: be rich quietly. Number One is a headline, and a headline is heat with a byline."',
    ],
    wilson: [
      'Wilson: "The Commission\'s list carried no legal weight. It carried something better. Permission. Juries stopped smiling at him."',
      'Wilson: "Publicity built the man. Same tool took him apart."',
    ],
    ness: [
      'Ness: "The city that cheered him at the ballpark stuck him on top of a wanted list. Chicago finally read its own arithmetic."',
      'Ness: "A title like that makes helping him embarrassing. Embarrassment closes more doors than warrants ever did."',
    ],
    workman: [
      'Workman: "Public Enemy Number One — and half my street still tips a cap when the car rolls by."',
      'Workman: "Other half crosses over. That\'s the whole town in one block: two halves of one street."',
    ],
    newsboy: [
      'Newsboy: "Extra! Public Enemy Number One! Capone tops the list!"',
      'Newsboy: "He bought a paper off me once, tipped a whole dollar. Now his face IS the paper."',
    ],
    breadline: [
      'The Breadline: "Number One. They went and made him champion of something after all."',
      'The Breadline: "Lists downtown, soup down here. Two cities, one man."',
    ],
    breadline_fearful: [
      'The Breadline: "Don\'t stand near a name like that, not even in a breadline. Names like that splash."',
      'The Breadline: "When the law finally comes for him, it comes down this street first. It always comes down this street first."',
    ],
    breadline_admiring: [
      'The Breadline: "Enemy of who? Nobody standing in this line, that\'s for certain."',
      'The Breadline: "He feeds five thousand. City Hall serves speeches. Go on and rank that."',
    ],
    press: [
      'The Press: "Mr. Capone, any comment on the list? — He says he\'s a businessman. Again. Same words, same order."',
      'The Press: "The Commission understands us perfectly. A ranking is a story every single day of the week."',
    ],
    press_cynical: [
      'The Press: "We built Scarface out of ink, and now we act shocked at the size of him."',
      'The Press: "Public Enemy Number One — a title we\'ll sell a million papers denouncing."',
    ],
    press_sensational: [
      'The Press: "Run the whole list with mugshots! Readers eat a league table with a spoon!"',
      'The Press: "PUBLIC ENEMY NUMBER ONE across eight columns. That\'s not a headline, that\'s a poster."',
    ],
  },

  soup: {
    capone: [
      'Capone (Wave/Happy): "Nobody asks a name, nobody preaches a sermon. Three shifts a day — and get the Tribune the meal counts."',
      'Capone: "They call me a public enemy. Go count the bowls. Then go count what City Hall\'s serving."',
    ],
    torrio: [
      'Torrio: "Charity is the cheapest prestige on the market. Soup costs pennies. The headline is free."',
      'Torrio (Lean/Tired): "But mark it, Al — the paper printing your meal counts is the paper that prints your indictment. You cannot launder heat forever."',
    ],
    wilson: [
      'Wilson: "The kitchen fed 2,200 a day, in cash, and not one book of it survived. Even his charity was structured like a getaway."',
      'Wilson (Closeup/Determined): "I counted it anyway. Soup is spending. Spending is income."',
    ],
    ness: [
      'Ness: "The line runs right past police headquarters. That\'s no accident. That\'s a billboard with a queue attached."',
      'Ness: "Feed a man with one hand and it gets awful hard to raid him with the other. He knew to the penny what he was buying."',
    ],
    workman: [
      'Workman: "Two years I built Pullman cars. Now the only man in Chicago with work for my hands runs the rackets."',
      'Workman: "I know what the soup is for. I ate it anyway. That\'s the whole Depression in one bowl."',
    ],
    workman_fearful: [
      'Workman: "You take the bowl, you nod, and you don\'t ask what paid for it."',
      'Workman: "A man who owns your dinner owns a piece of you. I felt it go on the first spoonful."',
    ],
    workman_grateful: [
      'Workman: "Hoover gave me a speech about corners being turned. Capone gave me beef stew, hot, no sermon."',
      'Workman: "Judge a man by winter, mister. He\'s the only one who showed up for this one."',
    ],
    newsboy: [
      'Newsboy: "Extra! Capone feeds five thousand on Thanksgiving!"',
      'Newsboy: "Soup line don\'t buy papers, mister. But the swells buy two apiece to read about it."',
    ],
    breadline: [
      'The Breadline: "Free soup, free coffee, free doughnuts. No questions, no sermon."',
      'The Breadline: "The line runs past police headquarters. Nobody in it laughs at that anymore."',
    ],
    breadline_fearful: [
      'The Breadline: "Eat fast, thank nobody, and remember whose ladle that is."',
      'The Breadline: "The wall on Clark Street is still standing. We eat with our caps down."',
    ],
    breadline_grateful: [
      'The Breadline: "The churches ran dry back in October. This kitchen never has."',
      'The Breadline: "Call him whatever you want downtown. Down here he\'s the man with the stew."',
    ],
    press: [
      'The Press: "Public Enemy Number One opens a soup kitchen. Copy desk fought over the headline for a solid hour."',
      'The Press: "120,000 meals — the Tribune counted every one. Nobody counted what the counting was worth to him."',
    ],
    press_cynical: [
      'The Press: "He breaks the town and then feeds its casualties. The feeding runs page one. The breaking runs inside, next to the truss ads."',
      'The Press: "The best press agent in America is a ladle."',
    ],
    press_sensational: [
      'The Press: "SCARFACE SANTA! Get a man in that line with a camera before the competition does!"',
      'The Press: "Thanksgiving, five thousand fed — that\'s a picture page and every one of you knows it."',
    ],
  },

  jury: {
    capone: [
      'Capone (Sit/Confused): "Twenty-two counts. Lawyers lose, lists don\'t — that\'s what I said, out loud, to Johnny. Then the judge traded the whole room out from under me."',
      'Capone: "Every fix I ever bought in my life was a city fix. Nobody in Chicago sells the federal building."',
    ],
    torrio: [
      'Torrio: "I told him. Wilkerson doesn\'t eat in Chicago restaurants. Some men can\'t hear the word no until a bailiff says it."',
      'Torrio (Lean/Tired): "The list cost money. The fix cost more. The swap turned the whole outlay into a donation."',
    ],
    wilson: [
      'Wilson (Closeup/Determined): "Our informant brought me the same list. I carried it to the judge myself. He read it once and said: bring your case. Leave the rest to me."',
      'Wilson: "The fix was in. So was the counter-fix. Ours was legal."',
    ],
    ness: [
      'Ness: "Wilkerson borrowed Judge Woodward\'s entire panel. One jury out, another in, first morning, two minutes flat."',
      'Ness: "Ten years of buying Chicago, beaten by one man who wasn\'t for sale and had the authority to shuffle the deck."',
    ],
    workman: [
      'Workman: "They say he bought the jury and the judge swapped it out like a man changing a flat."',
      'Workman: "First courtroom story I ever heard where I laughed at the right end of it."',
    ],
    newsboy: [
      'Newsboy: "Extra! Jury switched! Capone fix foiled by federal judge!"',
      'Newsboy: "Farmers and hardware clerks in the box now, mister. Go try buying a man who never heard of you."',
    ],
    breadline: [
      'The Breadline: "He bought twelve men, and the judge bought them right back with a wave of his hand."',
      'The Breadline: "So there IS one room in this town money can\'t rent. Took us eleven years to find it."',
    ],
    press: [
      'The Press: "The swap took two minutes and unmade seven years of fixes. Best courtroom lead any of us will ever get to write."',
      'The Press: "You could watch it land on him. He looked at the new twelve like a man reading a menu in a language he never studied."',
    ],
  },

  verdict: {
    capone: [
      'Capone (Sit/Confused): "Guilty. Not on beer. Not on anything with blood in it. On arithmetic."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Eleven years, for paperwork he never filed. I retired on time, Al. That was the whole trick, start to finish."',
      'Torrio: "The Outfit won\'t miss a payment tomorrow morning. Remember that when they tell you one man was the machine."',
    ],
    wilson: [
      'Wilson: "No tommy gun in evidence. No witness to any wall. Returns never filed, and a net worth no honest income explains."',
      'Wilson (Closeup/Determined): "Rent leaves receipts. It always leaves receipts."',
    ],
    ness: [
      'Ness: "Two years we axed his breweries, and the sentence came out of an accountant\'s briefcase. I can live with that. The point was the fall, not the byline."',
      'Ness: "Eleven years. The loudest man in America, shut up by arithmetic."',
    ],
    workman: [
      'Workman: "They got him. Not for the wall. Not for Cicero. For taxes. TAXES!"',
      'Workman: "Soup kitchen ran on a while after. Fewer photographers. Same stew."',
    ],
    newsboy: [
      'Newsboy: "Extra! Capone guilty! Eleven years! Read all about it!"',
      'Newsboy: "Biggest EXTRA since the Armistice, mister. Went home with empty bags and full pockets."',
    ],
    breadline: [
      'The Breadline: "Guilty, says the radio. The line shuffled up one place, same as ever."',
      'The Breadline: "They took the king of Chicago. The rent, they left right where it was."',
    ],
    breadline_relieved: [
      'The Breadline: "So the big ones CAN fall. Took the whole federal government to do it — but they fall."',
      'The Breadline: "Maybe the cop on the corner works for us again. Maybe."',
    ],
    breadline_wary: [
      'The Breadline: "Outfit\'s still on the corner this morning. Same corner, same coats, same hour."',
      'The Breadline: "They jailed the name. The business never missed a delivery."',
    ],
    press: [
      'The Press: "Guilty on the tax counts, October 17, 1931. Every desk in town had the ending written except his."',
      'The Press: "Felled not by bullets but by accounting. Somebody\'s typing that exact line right now in every city room in America."',
    ],
    press_cynical: [
      'The Press: "Seven dead on Clark Street, and the charge that stuck was arithmetic. Print the irony gently — it\'s carrying eleven years on its back."',
      'The Press: "We spent a decade selling his face. This week we sell his fall. Circulation never takes a side."',
    ],
    press_sensational: [
      'The Press: "GUILTY! ELEVEN YEARS! Clear page one, clear page two, clear the whole week!"',
      'The Press: "Get the shot of him leaving the courtroom — the big fellow, small. That photo travels around the world twice."',
    ],
  },
};

// ---- vignette generator --------------------------------------------------

const vignetteId = (ev, resp, stance) =>
  `capv_${ev.id}_${resp.key}${stance ? `_${stance}` : ''}`;

const vignetteScene = (ev, resp, stance) => {
  const voiceKey = stance ? `${resp.key}_${stance}` : resp.key;
  const voice = RVOICES[ev.id]?.[voiceKey];
  if (!voice) throw new Error(`missing voice: ${ev.id}/${voiceKey}`);
  const id = vignetteId(ev, resp, stance);
  const variants = !stance ? RVARIANTS[ev.id]?.[resp.key] : null;
  const tail = variants
    ? [
        '[CHOICE]',
        ...variants.map(([vKey, vLabel]) => `- "${vLabel}" -> ${vignetteId(ev, resp, vKey)}`),
        `- "Back to the witnesses" -> capch_${ev.id}`,
        '[/CHOICE]',
      ]
    : [`[SCENE capch_${ev.id}]`];
  return {
    id,
    name: `${ev.name} — ${resp.label}${stance ? ` (${stance})` : ''}`,
    sceneType: 'WITNESS',
    dropId: ev.dropId,
    stage: [
      spr(`${id}_el`, resp.actorId, 42, 62, resp.scale),
      balloon(`${id}_sign`, ev.sign, 76, 10, { zIndex: 4 }),
    ],
    script: lines(...voice, ...tail),
    narraton: { pool: RPOOL, keys: ev.keys, repeatable: true },
    status: 'work',
  };
};

// Per-event responder chooser. Eight witnesses will not fit through three
// doors, so the chooser asks WHICH SIDE OF THE STREET first — the men who
// ran it, the men who came for it, the city that paid for it — and each
// side opens onto its own short list. Every witness still speaks.
const RGROUPS = [
  { key: 'outfit', label: 'The men who ran it', who: ['capone', 'torrio'],
    framing: ['Narrator: "Two men owned this one. The one who did it, and the old man who taught him how."'] },
  { key: 'law', label: 'The men who came for it', who: ['wilson', 'ness'],
    framing: ['Narrator: "The government sent Chicago two kinds of men. One brought an axe. One brought a pencil. Guess which one landed him."'] },
  { key: 'street', label: 'The city underneath', who: ['workman', 'newsboy'],
    framing: ['Narrator: "Under every dollar of it, somebody standing on a sidewalk at the wrong hour. Ask one of them."'],
    more: { key: 'crowd', label: 'The crowd and the papers' } },
  { key: 'crowd', label: 'The crowd and the papers', who: ['breadline', 'press'], nested: true,
    framing: ['Narrator: "Nobody speaks for a crowd. A crowd speaks anyway — in the line, and on page one, and the two of them rarely agree."'] },
];

const respByKey = Object.fromEntries(RESPONDERS.map((r) => [r.key, r]));

const chooserScene = (ev) => ({
  id: `capch_${ev.id}`,
  name: `Voices: ${ev.name}`,
  sceneType: 'AGENCY',
  dropId: ev.dropId,
  stage: [balloon(`capch_${ev.id}_sign`, ev.sign, 50, 10, { zIndex: 4 })],
  script: lines(
    `Narrator: "${ev.intro}"`,
    ...choice(RGROUPS.filter((g) => !g.nested).map((g) => `- "${g.label}" -> capchg_${ev.id}_${g.key}`)),
  ),
  status: 'work',
});

const chooserGroupScenes = (ev) =>
  RGROUPS.map((g) => fanScene(
    `capchg_${ev.id}_${g.key}`, `Voices: ${ev.name} — ${g.label}`, ev.dropId,
    [balloon(`capchg_${ev.id}_${g.key}_sign`, ev.sign, 50, 10, { zIndex: 4 })],
    g.framing,
    [
      ...g.who.map((k) => `- "${respByKey[k].label}" -> ${vignetteId(ev, respByKey[k], null)}`),
      g.more
        ? `- "${g.more.label}" -> capchg_${ev.id}_${g.more.key}`
        : '- "Back to the events" -> cap_voices',
    ],
  ));

let vignetteCount = 0;
for (const ev of REVENTS) {
  scenes.push(chooserScene(ev));
  scenes.push(...chooserGroupScenes(ev));
  for (const resp of RESPONDERS) {
    scenes.push(vignetteScene(ev, resp, null));
    vignetteCount++;
    for (const [vKey] of RVARIANTS[ev.id]?.[resp.key] ?? []) {
      scenes.push(vignetteScene(ev, resp, vKey));
      vignetteCount++;
    }
  }
}

// The episodes hub — linked from the opening Cicero scene.
scenes.push({
  id: 'cap_voices',
  name: 'Voices of Chicago',
  sceneType: 'AGENCY',
  dropId: dropSoup,
  stage: [
    spr('cap_voices_crowd', 'breadline', 50, 62, 2.6),
    balloon('cap_voices_sign', 'VOICES OF CHICAGO, 1924-1931', 50, 10, { zIndex: 4 }),
  ],
  script: lines(
    'Narrator: "Eleven years, ten turns of the screw. Chicago tells it in three acts and never once agrees with itself. Pick an act and hear where it landed — on the boss, on the old man who taught him, on the lawmen, on the newsboy, on the breadline, on the press."',
    '[CHOICE]',
    '- "The rise — 1924 to 1926" -> capg_rise',
    '- "The business — the rate, the pad, the wall" -> capg_business',
    '- "The fall — 1930 to 1931" -> capg_fall',
    '[/CHOICE]',
  ),
  status: 'work',
});

// The three acts. Nothing was dropped from the old sixteen-item list —
// it was sorted into the order Chicago actually lived it.
const evById = Object.fromEntries(REVENTS.map((e) => [e.id, e]));
const evDoor = (id) => `- "${evById[id].name}" -> capch_${id}`;

scenes.push(fanScene(
  'capg_rise', 'Voices: The Rise', dropCicero,
  [balloon('capg_rise_sign', 'THE RISE — 1924 TO 1926', 50, 10, { zIndex: 4 })],
  ['Narrator: "Two years to go from somebody\'s bodyguard to somebody\'s problem. A stolen election, a handed-over empire, and a thousand rounds through a hotel window at lunch."'],
  [evDoor('cicero'), evDoor('handover'), evDoor('hawthorne')],
));

scenes.push(fanScene(
  'capg_business', 'Voices: The Business', dropLexington,
  [balloon('capg_business_sign', 'THE BUSINESS — RENT, PAD, AND WALL', 50, 10, { zIndex: 4 })],
  ['Narrator: "This is the part nobody films. A rate on every door, an envelope for every badge, and a garage wall when a customer forgets which of those two he owes."'],
  [evDoor('rates'), evDoor('cityhall'), evDoor('massacre')],
));

scenes.push(fanScene(
  'capg_fall', 'Voices: The Fall', dropSoup,
  [balloon('capg_fall_sign', 'THE FALL — 1930 TO 1931', 50, 10, { zIndex: 4 })],
  ['Narrator: "The publicity that built him turns around and takes aim. He answers with soup. It buys him a winter, and not one day more."'],
  [evDoor('enemy'), evDoor('soup'), '- "The courthouse, October 1931" -> capg_court'],
));

scenes.push(fanScene(
  'capg_court', 'Voices: The Courthouse', dropCourt,
  [balloon('capg_court_sign', 'THE COURTHOUSE — OCTOBER 1931', 50, 10, { zIndex: 4 })],
  ['Narrator: "Twelve bought names on a list, and a judge who traded his whole panel like a man swapping hats. Then the arithmetic. Chicago never saw it coming, because Chicago was watching the guns."'],
  [evDoor('jury'), evDoor('verdict'), '- "Back to the back room" -> cap_backroom'],
));

console.log(`Reaction layer: ${vignetteCount} vignettes across ${REVENTS.length} events (+ ${REVENTS.length} choosers + 1 hub).`);

// ==========================================================================
// CUTSCENES — non-interactive witness reels ([AUTOPLAY on] … [AUTOPLAY off]),
// each landing on an IMPACT scene that animates the Georgist variables the
// event moved, then offers the door into THE MACHINE.
// ==========================================================================

// The four Machine-facing gauges shown on every impact scene.
const IMPACT_GAUGES = [
  '[GAUGE greed at 8,12 min=0 max=100 label="RENT-AS-GREED"]',
  '[GAUGE repression at 8,22 min=0 max=100 label="REPRESSION"]',
  '[GAUGE regulation at 8,32 min=0 max=100 label="REGULATION"]',
  '[GAUGE prestige at 8,42 min=0 max=100 label="PRESTIGE"]',
];

// Animated delta: compute a target once, then step toward it on the tick.
// dir: +1 rises, -1 falls. Guarded so the tick idles once arrived.
const impactStep = (varName, targetVar, dir) => [
  `[IF ${varName} ${dir > 0 ? '<' : '>'} ${targetVar}]`,
  `[SET ${varName} = clamp(${varName} ${dir > 0 ? '+' : '-'} 1, 0, 100)]`,
  '[ENDIF]',
];

// CUTSCENE A — Clark Street, 10:30 AM. The garage, empty. Aftermath only:
// the wall and the names; no bodies, no gore.
scenes.push({
  id: 'cap_cut_clark',
  name: 'Cutscene: Clark Street, 10:30 AM',
  sceneType: 'WITNESS',
  dropId: dropGarage,
  stage: [
    balloon('ccl_wall', '2122 N. CLARK ST.', 50, 18, { zIndex: 2 }),
    balloon('ccl_light1', 'POLICE', 10, 30, { zIndex: 4 }),
    balloon('ccl_light2', 'POLICE', 90, 30, { zIndex: 4 }),
    spr('ccl_newsboy', 'newsboy', 4, 70, 1.8),
  ],
  script: lines(
    '[AUTOPLAY on]',
    '# police-light flicker on both lamps; the newsboy crosses the frame',
    '[EFFECT electric_flare on ccl_light1]',
    '[EFFECT electric_flare on ccl_light2]',
    '[MOVE ccl_newsboy to 96,70 over 8s]',
    'Newsboy: "Extra! Extra! Massacre on North Clark Street! Seven dead in a garage! Extra!"',
    '[WAIT 1500ms]',
    'Narrator: "Clark Street. February 14, 1929. Half past ten in the morning. The garage stands empty now — trucks gone, the dog still barking, the coffee on the stove gone cold in its pot."',
    '[WAIT 1500ms]',
    '[EFFECT shake_all on ccl_wall]',
    'Narrator: "For about ten seconds, this was the loudest room in America. Around seventy rounds."',
    '[WAIT 1200ms]',
    '[CLEAR_EFFECT shake_all from ccl_wall]',
    'Narrator: "Nothing to see here but brick, and what the brick stopped. No bodies in this telling. Only the wall — and seven names, read at the speed a city read them."',
    '[WAIT 1500ms]',
    'Narrator: "Peter Gusenberg."',
    '[WAIT 1500ms]',
    'Narrator: "Frank Gusenberg."',
    '[WAIT 1500ms]',
    'Narrator: "James Clark."',
    '[WAIT 1500ms]',
    'Narrator: "Adam Heyer."',
    '[WAIT 1500ms]',
    'Narrator: "Reinhardt Schwimmer."',
    '[WAIT 1500ms]',
    'Narrator: "Albert Weinshank."',
    '[WAIT 1500ms]',
    'Narrator: "John May."',
    '[WAIT 2s]',
    'Narrator: "Two of the shooters wore police uniforms. Hold onto that. The wall will hold it with you."',
    '[WAIT 1500ms]',
    '[AUTOPLAY off]',
    '[SCENE cap_impact_clark]',
  ),
  status: 'work',
});

// CUTSCENE B — The Rate Goes Up. Protection-rent: a sign ticks the weekly
// rate upward while the narrator does the Georgist arithmetic of the block.
scenes.push({
  id: 'cap_cut_rate',
  name: 'Cutscene: The Rate Goes Up',
  sceneType: 'WITNESS',
  dropId: dropSoup,
  stage: [
    balloon('ccr_sign', 'PROTECTION — $25 A WEEK', 50, 14, { zIndex: 4 }),
    spr('ccr_breadline', 'breadline', 38, 62, 2.6),
  ],
  script: lines(
    '[AUTOPLAY on]',
    '[SET_TEXT ccr_sign "PROTECTION — $25 A WEEK"]',
    'Narrator: "One block of South State Street. Count the doors: a grocer, a barber, a lunch counter, a laundry, a funeral parlor. Every one of them already pays a landlord for the ground under the floorboards."',
    '[WAIT 1500ms]',
    'Narrator: "Then a second landlord shows up — one who never bought the ground, never built a thing on it. His title deed is the memory of a brick wall on Clark Street."',
    '[WAIT 1500ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $40 A WEEK"]',
    'Narrator: "The rate goes up. Notice what did NOT change: the grocer sells no more bread, the barber cuts no more hair. Nothing got produced. Something only got collected."',
    '[WAIT 1800ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $60 A WEEK"]',
    'Narrator: "Henry George had a name for a payment that buys no goods, no labor, no improvement — a payment made purely for permission to exist in a place. He called it rent. The Outfit calls it protection. Same arithmetic, different collector, better hat."',
    '[WAIT 1800ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $85 A WEEK"]',
    'Narrator: "The rate climbs to whatever the block can bear, minus what the block needs to keep breathing. That margin, priced by force. Every dollar above it flows uphill and produces nothing whatsoever on the way."',
    '[WAIT 1800ms]',
    'Narrator: "And the breadline stands still. It always stands still. The line is what this arithmetic looks like from underneath."',
    '[WAIT 1500ms]',
    '[AUTOPLAY off]',
    '[SCENE cap_impact_rate]',
  ),
  status: 'work',
});

// IMPACT — Clark Street: repression up, prestige down, regulation corroded.
scenes.push({
  id: 'cap_impact_clark',
  name: 'Impact: What the Wall Did',
  sceneType: 'AGENCY',
  dropId: dropGarage,
  stage: [balloon('icl_sign', 'CLARK STREET — THE LEDGER MOVES', 55, 10, { zIndex: 4 })],
  script: lines(
    ...IMPACT_GAUGES,
    '# targets computed once; the 300ms tick walks each needle there',
    '[SET iclRepT = clamp(repression + 18, 0, 100)]',
    '[SET iclPrsT = clamp(prestige - 12, 0, 100)]',
    '[SET iclRegT = clamp(regulation - 8, 0, 100)]',
    '[SET iclGrdT = clamp(greed + 5, 0, 100)]',
    '[TICK 300ms]',
    impactStep('repression', 'iclRepT', +1),
    impactStep('prestige', 'iclPrsT', -1),
    impactStep('regulation', 'iclRegT', -1),
    impactStep('greed', 'iclGrdT', +1),
    '[/TICK]',
    'Narrator: "Watch the needles move. REPRESSION climbs: the massacre is the collection department of the racket, doing its work out in public — the force that keeps the rate collectible."',
    'Narrator: "The racket IS rent. Not a figure of speech: permission to exist on a block, priced by force. George wrote that rent takes whatever labor produces above bare survival. The Thompson gun is just the deed of title, typed loud."',
    'Narrator: "REGULATION falls, because two of the shooters wore police uniforms — a law corroded so far by envelopes that its own costume works as camouflage. And PRESTIGE goes down with it: the city loved its outlaw right up to the photograph of that wall."',
    'Narrator: "Every variable that just moved is a pipe in a bigger engine. You can watch that engine run."',
    '[CHOICE]',
    '- "See it feed the Machine" -> cap_machine',
    '- "Back" -> cap_cicero',
    '[/CHOICE]',
  ),
  status: 'work',
});

// IMPACT — The Rate: rent-as-greed up, regulation corroded, prestige bought.
scenes.push({
  id: 'cap_impact_rate',
  name: 'Impact: The Second Landlord',
  sceneType: 'AGENCY',
  dropId: dropSoup,
  stage: [balloon('icr_sign', 'THE RATE — THE LEDGER MOVES', 55, 10, { zIndex: 4 })],
  script: lines(
    ...IMPACT_GAUGES,
    '[SET icrGrdT = clamp(greed + 15, 0, 100)]',
    '[SET icrRegT = clamp(regulation - 10, 0, 100)]',
    '[SET icrPrsT = clamp(prestige + 5, 0, 100)]',
    '[SET icrRepT = clamp(repression + 8, 0, 100)]',
    '[TICK 300ms]',
    impactStep('greed', 'icrGrdT', +1),
    impactStep('regulation', 'icrRegT', -1),
    impactStep('prestige', 'icrPrsT', +1),
    impactStep('repression', 'icrRepT', +1),
    '[/TICK]',
    'Narrator: "RENT-AS-GREED climbs. Protection is rent in George\'s exact sense — a charge for permission to exist in a place, set not by what the payer receives but by what the collector can pull out of him before he breaks."',
    'Narrator: "REGULATION falls as the envelopes go out: the alderman, the captain, the judge. A law on the pad never lowers the rate. It BECOMES part of the rate — a second line on the same bill."',
    'Narrator: "And a thin slice of the take comes back downhill as soup. PRESTIGE, bought retail. Charity comes cheap when the till is rent."',
    'Narrator: "Repression to hold the block, greed to price it, regulation dissolved to keep it legal-ish, prestige to keep it liked. Four pipes. One engine."',
    '[CHOICE]',
    '- "See it feed the Machine" -> cap_machine',
    '- "Back" -> cap_cicero',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ==========================================================================
// EXPANSION — three new families off the hub:
//   DUETS         — two voices at a table, four beats each (7 x 4 = 28).
//   AFTERMATHS    — that night / months later / years later, four events
//                   x two perspectives (20).
//   THE RECORD    — uncovered research staged as exhibits (26, two drawers;
//                   the second drawer is the Pass 2 deep-dive material).
// Chain heads and standalone exhibits carry Narraton metadata in the
// 'capone_reactions' pool so the Machine can pull them as commentary.
// Acting tags only where sprites exist (Capone Pointing/Angry, Wave/Happy,
// Sit/Confused; Torrio Lean/Tired; Wilson Closeup/Determined); everyone
// else speaks untagged. Aftermath, never gore. Short lines, 1986 mood.
// ==========================================================================

const xsign = (id, text) => balloon(`${id}_sign`, text, 50, 10, { zIndex: 4 });
const xtwo = (id, a, b, sa = 2.4, sb = 2.4) =>
  [spr(`${id}_a`, a, 32, 62, sa), spr(`${id}_b`, b, 70, 62, sb)];
const xone = (id, a, s = 2.4) => [spr(`${id}_a`, a, 42, 62, s)];

// WITNESS-scene shell. narr (optional): narraton keys for the pool.
const xw = (id, name, dropId, stage, script, narr = null) => ({
  id, name, sceneType: 'WITNESS', dropId, stage, script: lines(...script),
  ...(narr ? { narraton: { pool: RPOOL, keys: narr, repeatable: true } } : {}),
  status: 'work',
});

const EXPANSION = [

  // ------------------------------------------------------------ hubs (3)
  {
    id: 'cap_duets',
    name: 'Duets — Two Voices at a Table',
    sceneType: 'AGENCY',
    dropId: dropLexington,
    stage: [xsign('cap_duets', 'DUETS — TWO VOICES AT A TABLE'),
      spr('cap_duets_a', 'capone', 32, 62), spr('cap_duets_b', 'torrio', 70, 62)],
    script: lines(
      'Narrator: "Two chairs, one subject, no referee. Some of these conversations history actually staged. Some it never dared — those are flagged. Three rooms, and every table is still set."',
      '[CHOICE]',
      '- "The Outfit\'s own tables" -> capd_g_outfit',
      '- "The tables the government sat at" -> capd_g_law',
      '- "The tables out on the street" -> capd_g_street',
      '[/CHOICE]',
    ),
    status: 'work',
  },
  {
    id: 'cap_aftermaths',
    name: 'Aftermaths — What It Cost Later',
    sceneType: 'AGENCY',
    dropId: dropGarage,
    stage: [xsign('cap_aftermaths', 'AFTERMATHS — THAT NIGHT / MONTHS / YEARS')],
    script: lines(
      'Narrator: "Every event runs on three clocks: that night, months later, years later. Four events, two witnesses apiece, and not one of them got to skip the waiting. Pick the year you want to be standing in."',
      '[CHOICE]',
      '- "Cicero, 1924 — the bill for the election" -> capa_g_cicero',
      '- "The wall, 1929 — the bill for the wall" -> capa_g_wall',
      '- "The soup and the sentence" -> capa_g_late',
      '[/CHOICE]',
    ),
    status: 'work',
  },
  {
    id: 'cap_record',
    name: 'The Record — Uncovered Files',
    sceneType: 'AGENCY',
    dropId: dropCourt,
    stage: [xsign('cap_record', 'THE RECORD — UNCOVERED FILES'),
      spr('cap_record_a', 'wilson', 42, 62)],
    script: lines(
      'Narrator: "The files the main story walked right past. Entered here as exhibits, without objection. Three sections, and a second drawer under the first one."',
      '[CHOICE]',
      '- "The law of it" -> capr_g_law',
      '- "The rooms, and the men in them" -> capr_g_rooms',
      '- "After the party" -> capr_g_after',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // ------------------------------------------- DUET 1: Retire Like Me (4)
  xw('capd_retire_1', 'Duet: Retire Like Me — I', dropLexington,
    [xsign('capd_retire_1', 'THE LEXINGTON — AFTER HOURS'), ...xtwo('capd_retire_1', 'capone', 'torrio')],
    [
      'Narrator: "After hours at the Lexington. Two chairs, one bottle of the good import, the ashtray filling up. The oldest argument the Outfit owns."',
      'Torrio (Lean/Tired): "Brooklyn, Al. A house, a garden, a wife who quits listening for cars."',
      'Capone: "You sound like a travel agent, Johnny."',
      'Torrio: "I sound like a man five bullets couldn\'t finish. That makes me the house expert on timing."',
      '[SCENE capd_retire_2]',
    ], { respect: { target: 50, scale: 40 }, heat: { target: 40, scale: 50 } }),
  xw('capd_retire_2', 'Duet: Retire Like Me — II', dropLexington,
    xtwo('capd_retire_2', 'capone', 'torrio'),
    [
      'Capone: "Walk away from what? A hundred million a year? This city knows my NAME, Johnny."',
      'Torrio: "The city knew Colosimo\'s name too. I stood at his funeral. Big Jim had lovely flowers."',
      'Capone (Pointing/Angry): "Colosimo wouldn\'t move with the times. I AM the times."',
      'Torrio: "The times end, Al. Mine did. I was standing right there the day they ended."',
      '[SCENE capd_retire_3]',
    ]),
  xw('capd_retire_3', 'Duet: The Empire Argument', dropLexington,
    xtwo('capd_retire_3', 'capone', 'torrio'),
    [
      'Capone: "You built a railroad and then jumped off it. I\'m building an empire. Empires got no door marked EXIT."',
      'Torrio (Lean/Tired): "That\'s the flaw in empires, Al. Not the selling point."',
      'Capone: "Rome lasted."',
      'Torrio: "Rome delegated. You sign every single thing with your face."',
      'Narrator: "The bottle drops an inch. Neither man moves the other one inch. Neither ever will."',
      '[SCENE capd_retire_4]',
    ]),
  xw('capd_retire_4', 'Duet: Retire Like Me — IV', dropLexington,
    xtwo('capd_retire_4', 'capone', 'torrio'),
    [
      'Torrio: "Last offer. Come to Brooklyn. Buy the house next to mine. Grow figs badly for thirty years."',
      'Capone (Wave/Happy): "Send me a postcard, Johnny."',
      'Torrio: "I\'ll send you a lawyer. You\'ll need him sooner than the postcard."',
      'Narrator: "Torrio retired in 1925 and died in a barber chair in 1957 — of old age, which in this business counts as a triumph with a parade. Capone got six more years of empire. Then the arithmetic caught up."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 2: The Interview That Never Happened (4)
  xw('capd_interview_1', 'Duet: The Interview That Never Happened — I', dropLexington,
    [xsign('capd_interview_1', 'A MEETING THE RECORD DOES NOT CONTAIN'), ...xtwo('capd_interview_1', 'capone', 'wilson')],
    [
      'Narrator: "Flag this one counterfactual: it never happened. Frank Wilson hunted Al Capone for three years through paper and never once sat down across from him with the ledgers open. Stage it anyway. Some arguments have earned a room."',
      'Capone (Wave/Happy): "Coffee? I own the coffee. I own the cups. I own the fella who brings it."',
      'Wilson: "You own nothing, Mr. Capone. That is my entire case. Nothing is in your name — no account, no deed, not this suite, not that cup."',
      'Capone: "A careful man keeps a clean signature."',
      'Wilson: "A clean signature and a quarter million a year in spending. The gap between those two numbers is where I live."',
      '[SCENE capd_interview_2]',
    ], { evidence: { target: 60, scale: 40 }, prestige: { target: 50, scale: 50 } }),
  xw('capd_interview_2', 'Duet: The Businessman Lines', dropLexington,
    xtwo('capd_interview_2', 'capone', 'wilson'),
    [
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand."',
      'Wilson (Closeup/Determined): "Businessmen file returns. I have read every return you never filed. They are very short."',
      'Capone: "The country wanted booze and I organized it. Why should I be called a public enemy?"',
      'Wilson: "I don\'t call you anything. I add you up."',
      '[SCENE capd_interview_3]',
    ]),
  xw('capd_interview_3', 'Duet: The Threats', dropLexington,
    xtwo('capd_interview_3', 'capone', 'wilson'),
    [
      'Capone (Pointing/Angry): "You know what happens to men who add me up?"',
      'Wilson: "I do. The death threats came to my hotel. I changed hotels and kept adding."',
      'Narrator: "That much is true. Wilson worked the case under threat of murder, in a locked room, at night, with the shade pulled. The invented part of this scene is only the coffee."',
      'Capone (Sit/Confused): "What do you WANT, Wilson? Everybody wants something. That\'s my whole business, knowing what."',
      'Wilson: "A number, Mr. Capone. Your number. And I already have it."',
      '[SCENE capd_interview_4]',
    ]),
  xw('capd_interview_4', 'Duet: The Ledger Answers', dropLexington,
    xtwo('capd_interview_4', 'capone', 'wilson'),
    [
      'Wilson: "Hawthorne Smoke Shop. Net profits, initialed. Cashier\'s checks endorsed by your own men. A ledger a raid picked up in 1926 that sat in a drawer unread until it got to me."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business."',
      'Wilson (Closeup/Determined): "Then we agree at last. A business keeps books. Yours kept mine."',
      'Narrator: "The interview never happened. The verdict happened regardless — which tells you which of these two men needed the meeting."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 3: Raids vs Receipts (4)
  xw('capd_methods_1', 'Duet: Raids vs Receipts — I', null,
    [xsign('capd_methods_1', 'TWO FEDERAL METHODS, ONE TARGET'), ...xtwo('capd_methods_1', 'wilson', 'ness')],
    [
      'Ness: "Hit the brewery on South Wabash last night. Steel ram on a flatbed, straight through the doors like a can opener. Nineteen trucks, seized."',
      'Wilson: "How many years does a truck testify to?"',
      'Ness: "It isn\'t about testimony, Frank. It\'s cash flow. Every barrel we axe, the Outfit earns less."',
      'Wilson: "And every barrel makes a headline. A headline warns a man to go hide his paper."',
      '[SCENE capd_methods_2]',
    ], { evidence: { target: 70, scale: 40 }, regulation: { target: 20, scale: 40 } }),
  xw('capd_methods_2', 'Duet: The Envelope Returned', null,
    xtwo('capd_methods_2', 'wilson', 'ness'),
    [
      'Ness: "They offered my men two thousand a week to look the other way. My men threw it back through the window. The papers called us Untouchable."',
      'Wilson (Closeup/Determined): "Nobody offers an accountant anything. We are invisible. That is the entire method."',
      'Ness: "Invisible never scared anybody."',
      'Wilson: "Neither does scared, Eliot. Frightened men hide their books. Bored men file them. I want him bored."',
      '[SCENE capd_methods_3]',
    ]),
  xw('capd_methods_3', 'Duet: Pressure and Paper', null,
    xtwo('capd_methods_3', 'wilson', 'ness'),
    [
      'Ness: "You think my raids are theater."',
      'Wilson: "I think your raids are pressure, and pressure is useful. A raided man spends faster, moves his money clumsier, trusts fewer clerks with it. Clumsy is legible."',
      'Ness: "So my ram feeds your ledger."',
      'Wilson: "Every method in this building feeds the ledger. The ledger is the only thing a jury will ever lay eyes on."',
      '[SCENE capd_methods_4]',
    ]),
  xw('capd_methods_4', 'Duet: Who Gets the Credit', null,
    xtwo('capd_methods_4', 'wilson', 'ness'),
    [
      'Ness: "Eleven years, and every count was yours. You know what my squad got him? Five thousand dollars, contempt of court. A footnote in small type."',
      'Wilson: "Your footnote cut his income in half while I counted the half that was left. Take the win, Eliot."',
      'Narrator: "History took Ness\'s legend and Wilson\'s arithmetic and mixed the two up permanently. The receipts convicted him. The raids sold the movie."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 4: Buying the Headline (4)
  xw('capd_headline_1', 'Duet: Buying the Headline — I', dropSoup,
    [xsign('capd_headline_1', 'A CORNER ON SOUTH STATE STREET'),
      spr('capd_headline_1_a', 'capone', 32, 62), spr('capd_headline_1_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "Extra! Public Enemy Number One! — oh. Uh. Morning, Mr. Capone."',
      'Capone (Wave/Happy): "Morning, kid. How\'s the paper moving today?"',
      'Newsboy: "Your face sells everything, mister. Good days and bad days both."',
      'Capone: "Give me the stack. All of it."',
      '[SCENE capd_headline_2]',
    ], { prestige: { target: 60, scale: 40 }, heat: { target: 45, scale: 50 } }),
  xw('capd_headline_2', 'Duet: The Whole Stack', dropSoup,
    [spr('capd_headline_2_a', 'capone', 32, 62), spr('capd_headline_2_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "The whole stack? Mister, that\'s two hundred papers."',
      'Capone: "And a dollar for the empty bag. No kid should stand out all day under a headline like that."',
      'Newsboy: "Buying \'em don\'t un-print \'em, Mr. Capone. There\'s a truck brings two hundred more at noon."',
      'Capone (Sit/Confused): "Yeah. There\'s always a truck at noon."',
      '[SCENE capd_headline_3]',
    ]),
  xw('capd_headline_3', 'Duet: Both Editions', dropSoup,
    [spr('capd_headline_3_a', 'capone', 32, 62), spr('capd_headline_3_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "Can I ask you a thing, mister? My ma says you feed people. My pop says you shoot people. Which paper\'s got it right?"',
      'Capone: "Both editions, kid. Same publisher."',
      'Narrator: "That is the only wholly honest line in this scene, and we invented it. The real ones are worse."',
      '[SCENE capd_headline_4]',
    ]),
  xw('capd_headline_4', 'Duet: The Noon Truck', dropSoup,
    [spr('capd_headline_4_a', 'capone', 32, 62), spr('capd_headline_4_b', 'newsboy', 70, 66, 1.8)],
    [
      'Capone: "Keep the change. Buy your ma something she wouldn\'t buy herself."',
      'Newsboy: "You tip like the headline\'s true, mister."',
      'Narrator: "He walked off with two hundred copies of his own name under his arm. The noon truck came at noon. It always does. You cannot corner a market in ink — the one lesson he learned slower than any other in his life."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 5: The Old Fox and the Young Lawman (4)
  xw('capd_fox_1', 'Duet: The Old Fox — I', null,
    [xsign('capd_fox_1', 'A RAILWAY PLATFORM, POINTS EAST'), ...xtwo('capd_fox_1', 'torrio', 'ness')],
    [
      'Narrator: "Another meeting the record doesn\'t show: the man who built the Outfit and the man sent to break it, on a platform between trains. We\'ll grant it the length of one cigarette."',
      'Ness: "Johnny Torrio. You\'re supposed to be in Brooklyn."',
      'Torrio: "I\'m supposed to be dead, officer. Brooklyn is the compromise."',
      'Ness: "Agent. Ness. Prohibition Bureau."',
      'Torrio (Lean/Tired): "I know exactly who you are. I still read the papers I used to own."',
      '[SCENE capd_fox_2]',
    ], { heat: { target: 50, scale: 50 }, respect: { target: 40, scale: 50 } }),
  xw('capd_fox_2', 'Duet: The Thirst Stays', null,
    xtwo('capd_fox_2', 'torrio', 'ness'),
    [
      'Ness: "You built the thing I\'m taking apart. That doesn\'t trouble you any?"',
      'Torrio: "Young man, I built a delivery service for a thirst the law itself invented. Take it apart, with my blessing. The thirst stays. Somebody bolts it back together by Thursday."',
      'Ness: "That\'s a tired man\'s excuse."',
      'Torrio: "It is a tired man\'s inventory."',
      '[SCENE capd_fox_3]',
    ]),
  xw('capd_fox_3', 'Duet: One True Thing', null,
    xtwo('capd_fox_3', 'torrio', 'ness'),
    [
      'Ness: "Al Capone. Give me one true thing about the man."',
      'Torrio (Lean/Tired): "He was the finest second-in-command I ever had, and the worst first. Some men are engines. Never put an engine behind the wheel."',
      'Ness: "And you?"',
      'Torrio: "I was a timetable. Timetables get to retire."',
      '[SCENE capd_fox_4]',
    ]),
  xw('capd_fox_4', 'Duet: What Breaks', null,
    xtwo('capd_fox_4', 'torrio', 'ness'),
    [
      'Ness: "If I ever get him — really get him, all the way — what breaks?"',
      'Torrio: "Nothing, agent. That is the answer nobody wants to carry home. The Outfit is not a man. The Outfit is a rent, and rents outlive their collectors."',
      'Narrator: "The eastbound took the old fox back to his garden. History records no such platform. It records the rent, still collecting, decades after both men were in the ground."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 6: Taking the Soup (4)
  xw('capd_takesoup_1', 'Duet: Taking the Soup — I', dropSoup,
    [xsign('capd_takesoup_1', 'FREE SOUP COFFEE AND DOUGHNUTS'),
      spr('capd_takesoup_1_a', 'workman', 32, 62), spr('capd_takesoup_1_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "First time in this line. Got my collar up like somebody I know might walk by."',
      'The Breadline: "Every man in this line keeps his collar up, friend. Nobody\'s looking. That\'s the one mercy in the whole arrangement."',
      'Workman: "Two years at Pullman. I BUILT things. Now I\'m standing in a queue for a gangster\'s stew."',
      'The Breadline: "The stew don\'t ask where you worked. Move up."',
      '[SCENE capd_takesoup_2]',
    ], { prestige: { target: 55, scale: 40 }, rent: { target: 20, scale: 30 } }),
  xw('capd_takesoup_2', 'Duet: What It Costs', dropSoup,
    [spr('capd_takesoup_2_a', 'workman', 32, 62), spr('capd_takesoup_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "What\'s it cost? Something always costs."',
      'The Breadline: "No sermon, no name at the door, no fee. That\'s the sales pitch, and here\'s the trouble — it\'s true."',
      'Workman: "Then what\'s he get out of it?"',
      'The Breadline: "He gets you standing right here thinking well of him. Cheaper than a lawyer, louder than a billboard."',
      '[SCENE capd_takesoup_3]',
    ]),
  xw('capd_takesoup_3', 'Duet: The Catechism', dropSoup,
    [spr('capd_takesoup_3_a', 'workman', 32, 62), spr('capd_takesoup_3_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "My kid asked who pays for the soup. I said a rich man. She asked was he good. I said eat your soup."',
      'The Breadline: "That\'s the entire catechism, friend. Every man in this line has recited it."',
      'Workman: "Being grateful to a man like that — it sits in the chest like a swallowed stone."',
      'The Breadline: "It\'s February. A stone is the warmest thing most of us are carrying."',
      '[SCENE capd_takesoup_4]',
    ]),
  xw('capd_takesoup_4', 'Duet: A Line, Not a Jury', dropSoup,
    [spr('capd_takesoup_4_a', 'workman', 32, 62), spr('capd_takesoup_4_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "They ever put him on trial, what do we say? That he fed us?"',
      'The Breadline: "We say nothing at all. We\'re a line, not a jury."',
      'Narrator: "In October 1931 a jury of farmers and hardware clerks did the saying instead. The kitchen ran on a while longer, quieter, and shut its doors in the spring of 1932. The line re-formed at the churches — less stew, fewer photographers, same men."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 7: Public Enemy at the Mirror (4)
  xw('capd_mirror_1', 'Duet: The Mirror — 2 A.M.', dropLexington,
    [xsign('capd_mirror_1', 'THE LEXINGTON — 2 A.M.'),
      balloon('capd_mirror_1_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }),
      spr('capd_mirror_1_a', 'capone', 42, 62)],
    [
      'Narrator: "Two in the morning at the Lexington. The bodyguards are out in the hall. The only company left in the room is a mirror and a radio, and neither one of them is on the payroll."',
      'Narrator: "The radio, softly: —named by the Chicago Crime Commission as Public Enemy Number One, the hoodlum Alphonse Capone—"',
      'Capone (Pointing/Angry): "Hoodlum. I employ more men than the stockyards."',
      'Narrator: "The mirror declines to argue the point."',
      '[SCENE capd_mirror_2]',
    ], { heat: { target: 70, scale: 40 }, prestige: { target: 40, scale: 50 } }),
  xw('capd_mirror_2', 'Duet: The Goat', dropLexington,
    [balloon('capd_mirror_2_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_2', 'capone')],
    [
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "The radio: —lines at the Capone soup kitchen stretched past police headquarters again today—"',
      'Capone (Wave/Happy): "You hear that? Five thousand on Thanksgiving. Go ask the LINE who the enemy is."',
      'Narrator: "The radio, not listening: —in Washington, the Treasury declined to comment on the Capone investigation—"',
      '[SCENE capd_mirror_3]',
    ]),
  xw('capd_mirror_3', 'Duet: Say It Back', dropLexington,
    [balloon('capd_mirror_3_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_3', 'capone')],
    [
      'Capone (Sit/Confused): "Declined to comment. That\'s the noise a trap makes right before it\'s a trap."',
      'Capone: "I\'m a businessman. Say it back to me, mirror. Somebody in this room ought to say it back."',
      'Narrator: "The mirror shows a heavy man in silk pajamas, alone at two in the morning, rehearsing his defense to a piece of furniture."',
      '[SCENE capd_mirror_4]',
    ]),
  xw('capd_mirror_4', 'Duet: Nobody Turns It Off', dropLexington,
    [balloon('capd_mirror_4_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_4', 'capone')],
    [
      'Narrator: "The radio: —repeating tonight\'s headline: PUBLIC ENEMY NUMBER ONE—"',
      'Capone: "Turn it off."',
      'Narrator: "Nobody turns it off. The bodyguards are out in the hall, and a man does not cross his own suite twice in one night on account of a radio."',
      'Narrator: "So he let it play. That is the whole scene — and the closest thing to a confession the Lexington ever heard out of him."',
      '[SCENE cap_duets]',
    ]),

  // ============ AFTERMATH CHAINS — Cicero: the family (3) ============
  xw('capa_cic_fam_1', 'Cicero, That Night — the Family', dropCicero,
    [xsign('capa_cic_fam_1', 'APRIL 1, 1924 — THAT NIGHT'), ...xtwo('capa_cic_fam_1', 'capone', 'torrio')],
    [
      'Narrator: "Election night in Cicero. The town is won. In a front parlor with the curtains shut, the family sits with the winning and with the price: Frank Capone, shot dead by plainclothes police outside a polling place, aged 29."',
      'Capone: "They\'ll say he drew first. Twenty plainclothes men with shotguns, and MY BROTHER drew first."',
      'Torrio (Lean/Tired): "Tonight you say nothing, Al. Tonight you sit with your mother."',
      'Capone: "Cicero\'s ours, Johnny. We won it."',
      'Torrio: "Yes. Notice how it tastes."',
      '[SCENE capa_cic_fam_2]',
    ], { respect: { target: 55, scale: 40 }, heat: { target: 35, scale: 40 } }),
  xw('capa_cic_fam_2', 'Cicero, Months Later — the Family', dropCicero,
    xtwo('capa_cic_fam_2', 'capone', 'torrio'),
    [
      'Narrator: "Months later. The funeral is already a legend: twenty thousand dollars of flowers, and every shop in Cicero shuttered two hours out of respect — ordered respect, but shuttered all the same."',
      'Capone: "Every saloon in Cicero closed down for Frank. You know what closes a saloon in Cicero? NOTHING. Nothing on this earth closes them. They closed."',
      'Torrio: "Fear closes them, Al. Try not to bank that as love."',
      'Narrator: "The polling places that cost Frank his life delivered their majorities right on schedule, every election after. The town stayed bought for a solid decade."',
      '[SCENE capa_cic_fam_3]',
    ]),
  xw('capa_cic_fam_3', 'Cicero, Years Later — the Family', dropCicero,
    xone('capa_cic_fam_3', 'capone'),
    [
      'Narrator: "Years later. Palm Island, the 1940s. The mind going soft, the empire gone entirely, the visitors down to a trickle."',
      'Capone (Sit/Confused): "Frank was the gentle one. Everybody had it backwards — they figured me for the businessman and Frank for the gun. Backwards. All of it backwards."',
      'Narrator: "By then he tended the story like a garden, moving the stones around. Some days Frank died at the polls. Some days Frank was coming by for dinner."',
      'Narrator: "Cicero, for the record, is still there. The election of 1924 is a plaque nobody ever put up."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Cicero: the town (2) -------------------
  xw('capa_cic_town_1', 'Cicero, That Night — the Town', dropCicero,
    [spr('capa_cic_town_1_a', 'workman', 32, 62), spr('capa_cic_town_1_b', 'breadline', 70, 62, 2.6)],
    [
      'Narrator: "Election night, seen out a kitchen window on 22nd Street. The cars with no plates on them are finally parked."',
      'Workman: "We voted. That\'s what the radio\'s going to say. There were men at that booth wearing coats too heavy for April."',
      'Workman: "Wife asked me who won. I said: they did. She asked who\'s they. I said: don\'t ask that on a night the cars are out."',
      'The Breadline: "Every porch light on the block went dark by nine. A town learns fast what it\'s better off not seeing."',
      '[SCENE capa_cic_town_2]',
    ], { regulation: { target: 15, scale: 35 }, repression: { target: 40, scale: 40 } }),
  xw('capa_cic_town_2', 'Cicero, Years Later — the Town', dropCicero,
    [spr('capa_cic_town_2_a', 'workman', 32, 62), spr('capa_cic_town_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Narrator: "Years later. The Hawthorne got shot up in \'26, the Outfit moved its flag back into Chicago, the papers went looking for a fresher story. Cicero stayed governed."',
      'Workman: "You can live a whole entire life in a bought town. You pay rent twice and you vote once, and the once doesn\'t count for anything."',
      'Workman: "My kid wrote a school report: CICERO, GATEWAY TO THE WEST. Not one word of it was a lie, and not one word of it was the truth."',
      'The Breadline: "In a bought town, the breadline is the opposition party. Nobody buys us. Nobody\'s ever had to."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Massacre: the city desk (3) -------------------
  xw('capa_mas_press_1', 'The Massacre, That Night — the City Desk', dropGarage,
    [xsign('capa_mas_press_1', 'FEBRUARY 14, 1929 — THAT NIGHT'), ...xone('capa_mas_press_1', 'press', 2.6)],
    [
      'The Press: "Nobody went home. Composing room set SEVEN SLAIN in three different sizes and the editor kept hollering bigger."',
      'The Press: "A photographer came back shaking so hard he couldn\'t light his own cigarette, and his plates were the story of the century. We ran them. God help us, we measured them for columns first."',
      'Narrator: "Aftermath only, here as everywhere in this telling: the wall, the chalk, the hats still hanging on their hooks. The pictures did the rest to the country\'s stomach."',
      '[SCENE capa_mas_press_2]',
    ], { heat: { target: 75, scale: 30 }, prestige: { target: 30, scale: 50 } }),
  xw('capa_mas_press_2', 'The Massacre, Months Later — the City Desk', dropGarage,
    xone('capa_mas_press_2', 'press', 2.6),
    [
      'The Press: "The fun went out of the gangster story. That\'s the phrase that went around the desk that spring, and it was exact."',
      'The Press: "Ten years he was colorful copy — the soup, the quips, the fedora at that angle. After Clark Street, every column we\'d run read like an accessory after the fact."',
      'Narrator: "In 1930 the Crime Commission handed every desk in America a new noun: Public Enemy. It fit an eight-column line, and it fit the mood exactly."',
      '[SCENE capa_mas_press_3]',
    ]),
  xw('capa_mas_press_3', 'The Massacre, Years Later — the City Desk', dropGarage,
    xone('capa_mas_press_3', 'press', 2.6),
    [
      'The Press: "The garage came down eventually. Souvenir men sold off the bricks — the actual bricks, numbered, with a certificate."',
      'The Press: "We printed the address of that wall more times than we printed the names of the seven. Ask the copy desk to name them today. Then go ask the wall."',
      'Narrator: "Peter Gusenberg. Frank Gusenberg. James Clark. Adam Heyer. Reinhardt Schwimmer. Albert Weinshank. John May. The paper of record, finally catching up."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Massacre: the street (2) -------------------
  xw('capa_mas_street_1', 'The Massacre, That Night — the Street', dropGarage,
    [spr('capa_mas_street_1_a', 'workman', 32, 62), spr('capa_mas_street_1_b', 'breadline', 70, 62, 2.6)],
    [
      'The Breadline: "Radio said seven. The corner said say nothing."',
      'Workman: "I walked home the long way. Everybody walked home the long way. Clark Street got real wide that night."',
      'The Breadline: "The dog in that garage barked till morning. Whole block heard it. Not one man went to look twice."',
      '[SCENE capa_mas_street_2]',
    ], { repression: { target: 60, scale: 40 }, heat: { target: 70, scale: 40 } }),
  xw('capa_mas_street_2', 'The Massacre, Years Later — the Street', dropGarage,
    [spr('capa_mas_street_2_a', 'workman', 32, 62), spr('capa_mas_street_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "Years, you\'d point it out to visitors — there, that garage, right there. Then you\'d feel cheap for pointing."',
      'The Breadline: "The ones who lined men up against a wall — most of them got walls of their own, one at a time. The street kept score. The street always keeps score."',
      'Narrator: "Aftermath as geography: a plain brick building, then a parking lot, then a lawn. Cities heal by forgetting, and they forget by paving."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Soup kitchen: the workman (3) -------------------
  xw('capa_soup_work_1', 'The Soup, That Night — the Workman', dropSoup,
    [xsign('capa_soup_work_1', 'NOVEMBER 1930 — THAT NIGHT'), ...xone('capa_soup_work_1', 'workman')],
    [
      'Workman: "First night after my first bowl. Slept clean through without the hunger dream. First time in a month."',
      'Workman: "Woke at three anyway, out of pure habit. Laid there doing the arithmetic — whose beef, whose bread, whose ladle."',
      'Workman: "Fell back asleep in the middle of the sum. The stomach outvotes the arithmetic every single time."',
      '[SCENE capa_soup_work_2]',
    ], { prestige: { target: 65, scale: 35 }, rent: { target: 15, scale: 30 } }),
  xw('capa_soup_work_2', 'The Soup, Months Later — the Workman', dropSoup,
    xone('capa_soup_work_2', 'workman'),
    [
      'Workman: "The line turned into a job. Same faces, same hour, same spot. We nod at each other like men clocking in."',
      'Workman: "October, a fellow came running down the line hollering GUILTY, ELEVEN YEARS. The line didn\'t cheer and it didn\'t cry. It shuffled up one place, same as every other day."',
      '[SCENE capa_soup_work_3]',
    ]),
  xw('capa_soup_work_3', 'The Soup, Years Later — the Workman', dropSoup,
    xone('capa_soup_work_3', 'workman'),
    [
      'Narrator: "The kitchen closed in April 1932 — the man in prison, the associates unsentimental, unemployment still climbing on the day the doors shut. The soup was never for the hunger. The hunger just happened to be standing where the need was. The churches took the line back, at church portions."',
      'Workman: "Got work in 1936. WPA. Government soup, you could call it. I ate that too, and I didn\'t apologize for it either."',
      'Workman: "You want the honest accounting? He fed me a winter. It bought him nothing in the end. And it fed me a winter. Both entries stand."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Soup kitchen: the proprietor (2) -------------------
  xw('capa_soup_cap_1', 'The Soup, That Night — the Proprietor', dropSoup,
    [xsign('capa_soup_cap_1', 'NOVEMBER 1930 — THAT NIGHT'), ...xone('capa_soup_cap_1', 'capone')],
    [
      'Capone (Wave/Happy): "Get the Tribune the meal count. Twenty-two hundred. And nobody preaches in my kitchen — a man can eat a bowl of stew without a sermon riding on top of it."',
      'Narrator: "That night the count went to the Tribune, and the Tribune printed it, and somewhere downtown a man named Wilson cut the article out with scissors and filed it in a folder marked SPENDING."',
      '[SCENE capa_soup_cap_2]',
    ], { prestige: { target: 70, scale: 35 }, heat: { target: 55, scale: 50 } }),
  xw('capa_soup_cap_2', 'The Soup, Years Later — the Proprietor', dropSoup,
    xone('capa_soup_cap_2', 'capone'),
    [
      'Narrator: "Alcatraz mess hall, the mid-1930s. Register 85 eats what every man eats: no menu, no photographers, no count phoned in to the Tribune."',
      'Capone (Sit/Confused): "I fed five thousand men on a Thanksgiving. Ask anybody. Ask the Tribune, they counted."',
      'Narrator: "The man on the next bench didn\'t look up from his tray. On the Rock, everybody used to be somebody, and the soup is exactly the same for all of them."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Verdict: the convict (3) -------------------
  xw('capa_ver_cap_1', 'The Verdict, That Night — Cook County Jail', dropCourt,
    [xsign('capa_ver_cap_1', 'OCTOBER 17, 1931 — THAT NIGHT'), ...xone('capa_ver_cap_1', 'capone')],
    [
      'Narrator: "The night of the verdict. Cook County Jail. The suite at the Lexington stands empty, the suit hangs on a hanger, and the man is in a cell a bribed guard can furnish but cannot open."',
      'Capone (Sit/Confused): "Eleven years. For paperwork."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "Down the block, the night edition was already moving. He could hear the newsboys through the window when the wind sat right. Some nights the wind sat right."',
      '[SCENE capa_ver_cap_2]',
    ], { evidence: { target: 90, scale: 40 }, heat: { target: 60, scale: 50 } }),
  xw('capa_ver_cap_2', 'The Verdict, Later — Register 85', dropCourt,
    [balloon('capa_ver_cap_2_card', 'ALCATRAZ — REGISTER No. 85', 50, 18, { zIndex: 3 }), ...xone('capa_ver_cap_2', 'capone')],
    [
      'Narrator: "Atlanta first, where money still bought a few small comforts. Then August 1934: the train with the barred windows, the bay, the Rock."',
      'Capone: "I\'m Al Capone."',
      'Narrator: "The guard wrote 85 and pointed down the corridor. That was the whole exchange — and the whole sentence in miniature. The name confiscated. The number issued."',
      'Narrator: "Cell, workshop, laundry. He mopped floors. Other men set his value now, and the figure came out low."',
      '[SCENE capa_ver_cap_3]',
    ]),
  xw('capa_ver_cap_3', 'The Verdict, Years Later — Palm Island, 1947', dropCourt,
    [balloon('capa_ver_cap_3_card', '93 PALM ISLAND — JANUARY 1947', 50, 18, { zIndex: 3 }), ...xone('capa_ver_cap_3', 'capone')],
    [
      'Narrator: "Palm Island, January 1947. Released in \'39, the illness eating away at the mind for years — by the end, the doctors said, the reasoning of a twelve-year-old boy."',
      'Capone (Sit/Confused): "Johnny\'s coming to dinner. Johnny Torrio. And Frank. Set two more places, go on."',
      'Narrator: "Nobody corrected him. The dock, the bathrobe, the fishing rod nobody ever mentions. He died in bed on January 25, the family around him, aged 48."',
      'Narrator: "The Outfit did not miss a payment that week. Let the record show he was mourned, and the rent was collected, and neither fact laid a finger on the other."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Verdict: the accountant (2) -------------------
  xw('capa_ver_wil_1', 'The Verdict, That Night — the Accountant', null,
    [xsign('capa_ver_wil_1', 'OCTOBER 17, 1931 — THAT NIGHT'), ...xone('capa_ver_wil_1', 'wilson')],
    [
      'Wilson: "Night of the verdict I checked out of my hotel under my own name. First time in two years. A small pleasure. I recommend it."',
      'Wilson (Closeup/Determined): "People wanted a celebration. I filed the workpapers. The case was never against a man. It was against a gap in a column — and the column closed."',
      '[SCENE capa_ver_wil_2]',
    ], { evidence: { target: 95, scale: 30 }, regulation: { target: 40, scale: 50 } }),
  xw('capa_ver_wil_2', 'The Verdict, Years Later — the Precedent', null,
    xone('capa_ver_wil_2', 'wilson'),
    [
      'Narrator: "Years later. Wilson went on to run the Secret Service, chase counterfeiters, and die in bed — the accountant\'s ending, earned in full."',
      'Wilson: "The thing that outlived every one of us is a single sentence of law: illegal income is taxable. Sullivan, 1927. Every ambitious prosecutor since has kept it in the top drawer, sharpened."',
      'Wilson: "They still say bullets couldn\'t get him and arithmetic did. Close. PATIENCE did. Arithmetic was only how the patience kept score."',
      '[SCENE cap_aftermaths]',
    ]),

  // ================== THE RECORD — uncovered files (12) ==================
  xw('capr_sullivan_1', 'The Record: U.S. v. Sullivan — I', dropCourt,
    [xsign('capr_sullivan_1', 'SUPREME COURT — MAY 16, 1927'), ...xone('capr_sullivan_1', 'wilson')],
    [
      'Narrator: "Washington, 1927. A South Carolina bootlegger named Manly Sullivan argues he cannot be taxed on illegal income — filing a return would incriminate him, and the Fifth Amendment forbids exactly that."',
      'Narrator: "Justice Oliver Wendell Holmes, 86 years old and unimpressed, disposes of the argument in a few dry pages: gains from illicit traffic are income, and the Fifth is not a license to file nothing at all."',
      'Wilson: "Read it again. Slower. That ruling is a key, and somewhere out in Chicago there is a lock."',
      '[SCENE capr_sullivan_2]',
    ], { evidence: { target: 50, scale: 50 }, regulation: { target: 30, scale: 50 } }),
  xw('capr_sullivan_2', 'The Record: U.S. v. Sullivan — II', dropCourt,
    xone('capr_sullivan_2', 'wilson'),
    [
      'Wilson (Closeup/Determined): "Before Sullivan, a criminal fortune was out of reach — you cannot tax what the law refuses to look at. After Sullivan, every dollar is visible to the Treasury, no matter how it was earned."',
      'Wilson: "Capone never filed a return in his life. Before 1927 that was caution. After 1927 it was twenty-two counts, sitting there waiting for a clerk with a typewriter."',
      'Narrator: "The most important gunfire in this whole story was a pen in Washington, and it made no sound whatsoever."',
      '[SCENE cap_record]',
    ]),

  xw('capr_lunch', 'The Record: The Lunch Counter', dropCicero,
    [xsign('capr_lunch', 'HAWTHORNE RESTAURANT — AFTER THE GUNS'), ...xone('capr_lunch', 'capone')],
    [
      'Narrator: "September 20, 1926, ten minutes after. The eleventh car is gone. The Hawthorne\'s lunch counter is a beach of glass. Coffee still steaming in cups whose saucers got shot out from under them."',
      'Narrator: "Capone climbs off the floor where his bodyguard threw him. Outside, a bystander — Mrs. Freeman, her little boy in the car with her — has been hurt by flying debris. Her eye is going to need specialists."',
      'Capone: "Every bill. The specialists too. And the shops up and down the block — every window, every splinter, paid off by Friday."',
      'Narrator: "He paid. Thousands. Aftermath, itemized: the glazier\'s invoice deployed as public relations. And it WORKED, which is the part worth studying."',
      '[SCENE cap_record]',
    ], { heat: { target: 55, scale: 40 }, prestige: { target: 45, scale: 50 } }),

  xw('capr_adonis', 'The Record: The Adonis Social Club', null,
    [xsign('capr_adonis', 'BROOKLYN — DECEMBER 26, 1925'), ...xone('capr_adonis', 'ness')],
    [
      'Narrator: "Brooklyn, the night after Christmas, 1925. Capone is back east on a family visit. At the Adonis Social Club the lights go out in the middle of a party, and when they come up again the White Hand gang is short its entire leadership — Peg-Leg Lonergan among the dead."',
      'Ness: "Capone was in that room. Arrested, questioned, released by morning. Not one witness in the whole borough could recall a single detail about the loudest thing that happened to them all year."',
      'Narrator: "No charges. Not then, not ever. File it as the East Coast rehearsal: the lights, the silence afterward, the code holding tight. Chicago would get the finished performance."',
      '[SCENE cap_record]',
    ], { repression: { target: 50, scale: 40 }, heat: { target: 45, scale: 50 } }),

  xw('capr_frank_1', 'The Record: Frank Capone — I', dropCicero,
    [xsign('capr_frank_1', 'CICERO — APRIL 1, 1924'), ...xtwo('capr_frank_1', 'capone', 'torrio')],
    [
      'Narrator: "Election day, Cicero, late afternoon. A squad of Chicago police in plain clothes — sent into a town nowhere near their jurisdiction, in unmarked cars, carrying shotguns — meets Frank Capone near a polling place on 22nd Street."',
      'Narrator: "The police say he drew. The volley is not in dispute. Frank Capone — the Outfit\'s smooth front man, the brother with the banker\'s manners and the quiet suits — dies in the street at 29."',
      'Capone (Pointing/Angry): "Plain clothes. Unmarked cars. No badges showing anywhere. You tell me what you\'d call that, if a man like us did it."',
      '[SCENE capr_frank_2]',
    ], { heat: { target: 35, scale: 40 }, respect: { target: 50, scale: 40 } }),
  xw('capr_frank_2', 'The Record: Frank Capone — II', dropCicero,
    xtwo('capr_frank_2', 'capone', 'torrio'),
    [
      'Narrator: "The funeral: a silver-plated casket, twenty thousand dollars in flowers, every saloon in Cicero dark for two hours by order. The coroner\'s jury found the police acted in the line of duty. Not one officer was charged with anything."',
      'Torrio (Lean/Tired): "Mark the exchange rate, Al. One election, one brother. The books say Cicero came cheap. The books lie by leaving things out."',
      'Narrator: "Al buried the gentle brother and kept the town. That was the bargain — and nobody who signed it ever said the price out loud again."',
      '[SCENE cap_record]',
    ]),

  xw('capr_plea', 'The Record: The Plea Wilkerson Threw Out', dropCourt,
    [xsign('capr_plea', 'SUMMER 1931 — THE BARGAIN'), ...xtwo('capr_plea', 'capone', 'wilson')],
    [
      'Narrator: "June 1931. The deal is done and every paper in town has it: Capone pleads guilty, serves about two and a half years, and the government gets spared a trial it might lose. He hands out smiles on the courthouse steps like cigars."',
      'Narrator: "July 30. Judge James Wilkerson, from the bench, verbatim in the record: it is time for somebody to impress upon the defendant that it is utterly impossible to bargain with a Federal court. And again: the parties to a criminal case may not stipulate as to the judgment to be entered."',
      'Capone (Sit/Confused): "They SHOOK on it. In this town a handshake IS the paper."',
      'Wilson: "That is the town, Mr. Capone. This is a courtroom that doesn\'t eat in it."',
      'Narrator: "So the plea came back out, the trial went forward, the jury got swapped, and the counts ran their course. The last fix he ever bought was the one that never existed."',
      '[SCENE cap_record]',
    ], { evidence: { target: 85, scale: 40 }, heat: { target: 55, scale: 50 } }),

  xw('capr_raids_1', 'The Record: The Brewery Raids — I', null,
    [xsign('capr_raids_1', 'SOUTH WABASH — 5 A.M.'), ...xone('capr_raids_1', 'ness')],
    [
      'Narrator: "1930. A ten-ton flatbed with a steel ram bolted to the front idles in the dark outside a warehouse full of beer. Behind the wheel, a federal agent twenty-seven years old, name of Eliot Ness."',
      'Ness: "Through the doors at five sharp. Nineteen trucks, forty-five thousand gallons, seized before anybody\'s coffee went cold. We photographed every drop of it and smiled for nobody."',
      'Narrator: "Raid after raid, brewery after brewery — the Outfit\'s cash flow trimmed back by an axe blade wearing a badge."',
      '[SCENE capr_raids_2]',
    ], { regulation: { target: 25, scale: 40 }, evidence: { target: 60, scale: 50 } }),
  xw('capr_raids_2', 'The Record: The Brewery Raids — II', null,
    xone('capr_raids_2', 'ness'),
    [
      'Ness: "They tried money first. An envelope left on the car seat — two thousand a week, per man. My men handed it back out the window without slowing down. A reporter caught it. UNTOUCHABLES."',
      'Ness: "You want the honest ledger? We never convicted him on a count that stuck to the sentence. What we took was the money that fed the fixes — and we made honesty look employable in a town that had plain forgotten what it looked like."',
      'Narrator: "Legend inflated the squad later; the movies inflated the legend past all recognition. The gallons were real. So was the returned envelope — which, in 1930 Chicago, is by far the more improbable object."',
      '[SCENE cap_record]',
    ]),

  xw('capr_mcgurn', 'The Record: McGurn — an Aftermath', null,
    [xsign('capr_mcgurn', 'MILWAUKEE AVENUE — FEBRUARY 1936'), ...xone('capr_mcgurn', 'press', 2.6)],
    [
      'Narrator: "February 1936, a second-floor bowling alley on Milwaukee Avenue, minutes past midnight — seven years, damn near to the hour, after Clark Street. Machine Gun Jack McGurn, the massacre\'s suspected stage manager, bowls his last frame."',
      'Narrator: "Aftermath only, as always in this telling: the pins still standing, the alley gone quiet, and beside him a nickel comic valentine — a joke card about hard times, left there by men who wanted the date noticed."',
      'The Press: "Nobody charged, naturally. The story wrote its own headline: the massacre reaching forward seven years to collect its author. Filed under: the street keeps score."',
      '[SCENE cap_record]',
    ], { repression: { target: 65, scale: 40 }, heat: { target: 50, scale: 60 } }),

  xw('capr_repeal_1', 'The Record: Repeal — I', null,
    [xsign('capr_repeal_1', 'DECEMBER 5, 1933 — 5:32 P.M.'),
      spr('capr_repeal_1_a', 'newsboy', 32, 66, 1.8), spr('capr_repeal_1_b', 'workman', 70, 62)],
    [
      'Narrator: "December 5, 1933. Utah ratifies, the wire flashes, and at 5:32 Eastern the Twenty-first Amendment repeals the Eighteenth. Prohibition ends the same way it began — with a signature and a lot of noise."',
      'Newsboy: "Extra! PROHIBITION DEAD! Legal liquor by Christmas! ...Extra? Anybody?"',
      'Narrator: "He\'s hollering it down a street where the speakeasy door already stands open. Nobody inside but chairs up on tables. The password WAS the product. The product is legal now. The door is just a door."',
      '[SCENE capr_repeal_2]',
    ], { greed: { target: 40, scale: 50 }, prestige: { target: 35, scale: 50 } }),
  xw('capr_repeal_2', 'The Record: Repeal — II', null,
    [spr('capr_repeal_2_a', 'newsboy', 32, 66, 1.8), spr('capr_repeal_2_b', 'workman', 70, 62)],
    [
      'Workman: "Fourteen years they charged us triple for the privilege of a locked door and a password. Now the tavern on the corner sells it with a license in the window. Taxed. Boring. Wonderful."',
      'Narrator: "The black market that grossed the Outfit a hundred and five million dollars in one year drained out like a tub with the plug pulled. The empire\'s founding commodity turned into a line at the grocery."',
      'Narrator: "The Outfit shrugged and moved deeper into the rackets that never needed Prohibition in the first place — the unions, the wire, the rent. The lesson, one last time: outlaw a thirst and you print money for gunmen. Legalize it, and the gunmen go back to collecting rent. The rent was always the business."',
      '[SCENE cap_record]',
    ]),

  // ============ THE RECORD, SECOND DRAWER — Pass 2 exhibits (14+hub) ============
  {
    id: 'cap_record2',
    name: 'The Record — The Second Drawer',
    sceneType: 'AGENCY',
    dropId: dropCourt,
    stage: [xsign('cap_record2', 'THE RECORD — THE SECOND DRAWER'),
      spr('cap_record2_a', 'wilson', 42, 62)],
    script: lines(
      'Narrator: "The deeper files. Sources named, doubts flagged where the floor gets thin. Entered as exhibits, objections noted in the margin. Sorted three ways, because fifteen at once is not a drawer, it is a landslide."',
      '[CHOICE]',
      '- "The numbers" -> capr2_g_numbers',
      '- "The government\'s men" -> capr2_g_men',
      '- "The stories, the doubts, and the door" -> capr2_g_story',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  xw('capr_peterson', 'The Record: Cicero, Entered by the Commission', dropCicero,
    [xsign('capr_peterson', 'THE COMMISSION\'S VERDICT ON 1924'), ...xone('capr_peterson', 'press', 2.6)],
    [
      'Narrator: "Exhibit: the Chicago Crime Commission\'s own file on election day, Cicero, 1924. Roughly two hundred armed men working the polls. Judges kidnapped, ballots handled, voters walked inside and shown how to decide."',
      'The Press: "Virgil Peterson, the Commission\'s director, wrote the sentence that stuck: one of the most disgraceful episodes in American municipal history. We quote it every anniversary. Nobody has improved on it in a hundred years of trying."',
      'Narrator: "What the muscle bought that day was not a mayor. It was the GROUND — every brewery, every wire room, every saloon license in a town where the law now rented its office FROM the Outfit. File under: repression, in the service of rent."',
      '[SCENE cap_record2]',
    ], { repression: { target: 60, scale: 40 }, rent: { target: 20, scale: 30 } }),

  xw('capr_sixty', 'The Record: The Sixty Million', dropLexington,
    [xsign('capr_sixty', 'NET PROFITS — THE COMMISSION\'S ESTIMATE'), ...xone('capr_sixty', 'wilson')],
    [
      'Narrator: "Exhibit: the number itself. The Chicago Crime Commission put the syndicate\'s net profits in the late twenties at sixty million dollars a year. Gross revenue guesses ran to a hundred million and kept going."',
      'Guzik: "Net, gross — the reporters never once knew the difference. Sixty was the keep. Rest was overhead. Beer, trucks, wages, envelopes. Mostly envelopes."',
      'Wilson (Closeup/Determined): "Sixty million a year, and not one dollar of it filed anywhere. That gap is not a secret. It is a STRUCTURE. My job was to survey it."',
      'Narrator: "Greed, measured to the dollar: the hoard was the whole point, and the hoard is exactly what the arithmetic finally got its hands on."',
      '[SCENE cap_record2]',
    ], { greed: { target: 80, scale: 30 }, evidence: { target: 45, scale: 50 } }),

  xw('capr_irey', 'The Record: Irey\'s Desk', dropCourt,
    [xsign('capr_irey', 'TREASURY INTELLIGENCE UNIT — OCT 18, 1928'), ...xone('capr_irey', 'wilson')],
    [
      'Narrator: "Washington, October 18, 1928. Elmer Irey, chief of the Treasury\'s Intelligence Unit, opens the Capone file — four months ahead of Clark Street, back when the papers still found the man charming."',
      'Irey: "I don\'t care what Chicago finds charming. A man with no income has bought himself a Florida estate. Somebody bring me the arithmetic."',
      'Wilson: "He handed it to me. Three years of it. My 1933 report rebuilt the entire cash operation after the fact — how the money moved, room to room, hand to hand, never once brushing a bank account with his name on it."',
      'Narrator: "Regulation\'s counter-machine has a start date, and it is earlier than the legend admits. The legend starts with the massacre. The file starts with a desk in Washington and a man who wasn\'t charmed."',
      '[SCENE cap_record2]',
    ], { evidence: { target: 40, scale: 40 }, regulation: { target: 30, scale: 40 } }),

  xw('capr_books_1', 'The Record: The Bookkeepers — I', dropCourt,
    [xsign('capr_books_1', 'SHUMWAY & REIS — THE FLIPPED LEDGERS'), ...xone('capr_books_1', 'wilson')],
    [
      'Narrator: "Exhibit: two men nobody ever photographed. Leslie Shumway kept the ledgers at the Hawthorne Smoke Shop. Fred Reis endorsed the cashier\'s checks that moved the profits along. Between the pair of them, they could read the empire out loud, column by column."',
      'Shumway: "I wrote down what I was told to write down, in columns, in my own hand. That\'s the trouble with a good bookkeeper, mister. The hand is identifiable."',
      'Wilson: "I found Shumway at a dog track in Florida and gave him a choice: witness or defendant. Reis got the same two doors. Both of them picked the door where they keep breathing."',
      '[SCENE capr_books_2]',
    ], { evidence: { target: 70, scale: 35 }, heat: { target: 55, scale: 50 } }),
  xw('capr_books_2', 'The Record: The Bookkeepers — II', dropCourt,
    xone('capr_books_2', 'wilson'),
    [
      'Narrator: "Both men went under federal protection — moved, guarded, kept clear of the streets where the Outfit\'s memory runs long. Witness protection before anybody had invented the phrase, improvised on the spot for two clerks."',
      'Shumway: "They kept me alive so I could say four words: those are the books. I said them. After that the arithmetic took over and none of it was mine anymore."',
      'Wilson (Closeup/Determined): "Every empire of rent runs on clerks. Gunmen are replaceable — you hire more on a Tuesday. The man who knows which column is which is the load-bearing wall."',
      '[SCENE cap_record2]',
    ]),

  xw('capr_lieutenants', 'The Record: The Rehearsal Convictions', dropCourt,
    [xsign('capr_lieutenants', 'NITTI — GUZIK — RALPH: 1930'), ...xone('capr_lieutenants', 'wilson')],
    [
      'Narrator: "Exhibit: 1930, the year the method got its rehearsal. Frank Nitti, the Enforcer — tax conviction. Jake Greasy Thumb Guzik, the money man — tax conviction. Ralph Bottles Capone, the brother — tax conviction. Three lieutenants, one statute, before the government ever said the name Al out loud in a courtroom."',
      'Guzik: "They practiced on us. I ran the money and they read my own deposits back to me like a bedtime story. I did my time. I was back at the same desk when I got out."',
      'Wilson: "Every case taught us something. Ralph taught us they keep records under other names. Guzik taught us the checks come back endorsed. By the time we typed the big indictment, the typewriter knew the road."',
      'Narrator: "Regulation learns by doing it over. The Outfit watched three men fall to paper and still believed the fourth was made of something different. That is what prestige does to a man\'s eyesight."',
      '[SCENE cap_record2]',
    ], { regulation: { target: 35, scale: 40 }, evidence: { target: 55, scale: 40 } }),

  xw('capr_johnson', 'The Record: For the United States', dropCourt,
    [xsign('capr_johnson', 'GEORGE E. Q. JOHNSON — U.S. ATTORNEY'), ...xone('capr_johnson', 'wilson')],
    [
      'Narrator: "Exhibit: the man who signed the indictments. George E. Q. Johnson, United States Attorney for the Northern District of Illinois — gray, precise, and incorruptible in a market where everything else came with a price sheet."',
      'Johnson: "Twenty-two counts of tax evasion. I will not dress it up as a crusade. It is a filing. The government of the United States is a clerk with a very long memory, and the clerk has finally been given his afternoon."',
      'Wilson: "Irey found the trail, I walked it, Johnson turned it into a case. Three bureaucrats in gray suits. The papers wanted a gunfight and what they got was a docket number."',
      '[SCENE cap_record2]',
    ], { regulation: { target: 40, scale: 40 }, prestige: { target: 35, scale: 50 } }),

  xw('capr_jurors', 'The Record: Twelve Names in the Paper', dropCourt,
    [xsign('capr_jurors', 'THE JURY, PUBLISHED'), ...xone('capr_jurors', 'press', 2.6)],
    [
      'Narrator: "Exhibit, out of the National Archives: during the trial, Chicago newspapers printed the names, addresses, and occupations of all twelve jurors. Farmers, a hardware dealer, small-town men — findable by anybody with a nickel and a streetcar transfer."',
      'The Press: "We printed it because it was news. Don\'t look at this desk like that. Every reader in Chicago knew exactly what those addresses were FOR — and we sold that understanding at street price, two cents."',
      'Narrator: "Twelve men convicted him anyway. Addresses in print, in a town where the last fellow to defy the Outfit in public had needed flowers. The verdict is the exhibit. The nerve is the footnote nobody ever signed."',
      '[SCENE cap_record2]',
    ], { heat: { target: 60, scale: 40 }, regulation: { target: 35, scale: 50 } }),

  xw('capr_bankers', 'The Record: The Bankers Quote', dropCourt,
    [xsign('capr_bankers', 'COURTHOUSE STEPS — 1931'), ...xone('capr_bankers', 'capone')],
    [
      'Narrator: "Exhibit: verbatim, widely reported, spoken before sentencing. Reporters packed on the courthouse steps, pencils up."',
      'Capone: "I\'ve been made an issue and I\'m not complaining. But why don\'t they go after all those bankers who took the savings of thousands of poor people and lost them in bank failures?"',
      'Narrator: "File it honest: that is deflection, and it is also the best sentence he ever spoke in his life — because the crowd on those steps had bank books too, emptied ones. The prestige machine could still fire on the way down."',
      'Capone (Wave/Happy): "Print it straight, boys. That one writes itself."',
      '[SCENE cap_record2]',
    ], { prestige: { target: 45, scale: 40 }, heat: { target: 65, scale: 50 } }),

  xw('capr_bunk', 'The Record: The Bunk Quote', dropLexington,
    [xsign('capr_bunk', 'AN ATTRIBUTION — FLAGGED'), ...xone('capr_bunk', 'capone')],
    [
      'Narrator: "Exhibit, flagged: attributed, possibly apocryphal — the National Archives itself hangs the doubt on this one. The line every history book repeats anyway:"',
      'Capone (Sit/Confused): "The income tax law is a lot of bunk. The government can\'t collect legal taxes from illegal money."',
      'Narrator: "Maybe he said it. Maybe a rewrite man said it for him at eleven at night on a slow Tuesday. Either way, the Supreme Court had already answered it back in 1927, in Sullivan — and THAT answer, unlike the quote, sits verbatim in the record."',
      'Narrator: "Keep both files open. This chapter runs on the gap between what got said and what got reported. So did he."',
      '[SCENE cap_record2]',
    ], { greed: { target: 75, scale: 40 }, prestige: { target: 50, scale: 50 } }),

  xw('capr_milk', 'The Record: The Milk Legend', dropSoup,
    [xsign('capr_milk', 'A DISPUTED FILE'), ...xone('capr_milk', 'workman')],
    [
      'Narrator: "Exhibit, flagged disputed: the story that Capone pushed for expiration dates on milk bottles to protect Chicago\'s schoolchildren. Popular, warm, and unverified — historians have gone looking for the floor under it and come back empty."',
      'Workman: "My street told that one like gospel. The milk, the soup, the twenty-dollar bills to widows. And you notice nobody ever told a story about the protection rates. Legends only grow on the sunny side of the ledger."',
      'Narrator: "That is the finding, and it earns its folder: the prestige machine never needed TRUE stories. It needed REPEATABLE ones. This one is still repeating, a century on — which makes it the machine\'s most durable product."',
      '[SCENE cap_record2]',
    ], { prestige: { target: 60, scale: 35 } }),

  xw('capr_persona', 'The Record: The Prestige Machine', dropLexington,
    [xsign('capr_persona', 'THE MANUFACTURE OF A BENEFACTOR'), ...xtwo('capr_persona', 'capone', 'press', 2.4, 2.6)],
    [
      'Narrator: "Exhibit: the machine itself. Capone courted reporters as carefully as he courted aldermen — the Hearst papers ran him as color, the Runyon-era columnists ran him as character. He styled himself a public benefactor. A Robin Hood with a good tailor."',
      'Capone (Wave/Happy): "I give the public what the public wants and the papers what the papers want. Same principle. Different product."',
      'The Press: "He returned calls. He fed deadlines. He was the only racketeer in America with a press strategy — and for ten solid years that strategy worked on us, because WE were the market it was priced for."',
      'Narrator: "The soup at 935 South State — 2,200 a day, five thousand on a Thanksgiving, 120,000 meals in a Tribune headline — was this machine\'s finest hour. It shut down in April 1932 with unemployment still climbing. The PR had cleared. The hunger hadn\'t. Prestige, itemized."',
      '[SCENE cap_record2]',
    ], { prestige: { target: 70, scale: 30 }, greed: { target: 70, scale: 50 } }),

  xw('capr_georgist', 'The Record: Cicero as Rent', dropCicero,
    [xsign('capr_georgist', 'THE CLAIM ITSELF — TERRITORY AS TITLE'), ...xone('capr_georgist', 'torrio')],
    [
      'Narrator: "Exhibit: the theory of this whole chapter, stated once, in plain English. What the Outfit took in Cicero was not a business. It was a CLAIM — territorial, exclusive, enforced. Every shop paid for permission to exist on that ground. That is not profit. That is rent."',
      'Torrio (Lean/Tired): "A brewery you have to run. A territory runs itself — you stand on it and hold out your hat. I taught Al that difference. He learned it better than I wanted him to."',
      'Narrator: "The claim needed one valve stuck open to hold: Big Bill Thompson in City Hall — a mayor who kept Capone\'s picture on the wall — with the graft running downhill through aldermen and precinct captains and patrolmen on the beat. Regulation was never defeated in Chicago. It was LEASED."',
      'Narrator: "That is the machine in one town: seize the ground, price the permission to live on it, pay the referee. The Machine hub will run you that same engine with the labels peeled off."',
      '[SCENE cap_record2]',
    ], { rent: { target: 25, scale: 25 }, regulation: { target: 10, scale: 30 } }),

  xw('capr_sweeney', 'The Record: Sergeant Sweeney\'s Report', dropGarage,
    [xsign('capr_sweeney', 'REPORTED WORDS — A CAUTION'), ...xone('capr_sweeney', 'ness')],
    [
      'Narrator: "Exhibit: the most quoted sentence in this entire story, and the least certain one in it. Frank Gusenberg, fourteen wounds, alive three hours. Sergeant Clarence Sweeney at the bedside, asking who did the shooting."',
      'Ness: "The report gives the answer everybody knows: no one — nobody shot me. Some historians doubt a man in that condition said anything at all. Those words are reported, not recorded. There is a difference, and this office is built on top of it."',
      'Narrator: "So the file carries both truths at once. If he said it, that is the code talking through a dying man. If he never said it, that is Chicago writing the line it needed — which is the code again, one step further back."',
      'Ness: "Either way: no witness, no charge, no trial, seven dead men. That silence is verbatim. You can go ahead and quote the silence."',
      '[SCENE cap_record2]',
    ], { repression: { target: 60, scale: 35 }, heat: { target: 70, scale: 40 } }),
];

scenes.push(...EXPANSION);
console.log(`Expansion: ${EXPANSION.length} scenes (4 hubs, 28 duet beats, 20 aftermath beats, 26 record exhibits in two drawers).`);

// ---- expansion fan-out ---------------------------------------------------
// The three folders used to open onto ten- and fifteen-item lists. Now each
// opens onto three doors, and the long lists live one beat deeper. Every
// duet, every aftermath, every exhibit is still down there.

const FANOUT = [
  fanScene('capd_g_outfit', 'Duets — The Outfit\'s Tables', dropLexington,
    [xsign('capd_g_outfit', 'THE OUTFIT\'S OWN TABLES'),
      spr('capd_g_outfit_a', 'capone', 32, 62), spr('capd_g_outfit_b', 'torrio', 70, 62)],
    ['Narrator: "Three tables where the business talked to itself. Nobody at these takes notes, and nobody needs to."'],
    [
      '- "Capone & Torrio — retire like me" -> capd_retire_1',
      '- "Torrio & Ness — the old fox and the young lawman" -> capd_fox_1',
      '- "Capone & the mirror — Public Enemy, 2 A.M." -> capd_mirror_1',
    ]),

  fanScene('capd_g_law', 'Duets — The Government\'s Tables', dropCourt,
    [xsign('capd_g_law', 'THE TABLES THE GOVERNMENT SAT AT'),
      spr('capd_g_law_a', 'wilson', 32, 62), spr('capd_g_law_b', 'ness', 70, 62)],
    ['Narrator: "Two tables the government set. One of them history never let happen — that one is flagged, and it is the better conversation."'],
    [
      '- "Capone & Wilson — the interview that never happened" -> capd_interview_1',
      '- "Wilson & Ness — raids vs receipts" -> capd_methods_1',
      '- "Close the folder" -> cap_files',
    ]),

  fanScene('capd_g_street', 'Duets — The Street\'s Tables', dropSoup,
    [xsign('capd_g_street', 'THE TABLES OUT ON THE STREET'),
      spr('capd_g_street_a', 'newsboy', 32, 66, 1.8), spr('capd_g_street_b', 'workman', 70, 62)],
    ['Narrator: "No tablecloths on these. A curb, a soup line, and whatever the city says when it thinks the boss is out of earshot."'],
    [
      '- "Capone & the Newsboy — buying the headline" -> capd_headline_1',
      '- "The Workman & the Breadline — taking the soup" -> capd_takesoup_1',
      '- "Close the folder" -> cap_files',
    ]),

  fanScene('capa_g_cicero', 'Aftermaths — Cicero, 1924', dropCicero,
    [xsign('capa_g_cicero', 'CICERO — THE BILL FOR THE ELECTION')],
    ['Narrator: "The town voted the way it was told to. The receipt came in two copies: one to a family, one to a whole municipality that woke up owned."'],
    [
      '- "Cicero — the family" -> capa_cic_fam_1',
      '- "Cicero — the town that got bought" -> capa_cic_town_1',
      '- "Close the folder" -> cap_files',
    ]),

  fanScene('capa_g_wall', 'Aftermaths — The Wall, 1929', dropGarage,
    [xsign('capa_g_wall', 'THE WALL — THE BILL FOR FEBRUARY 14')],
    ['Narrator: "Seven men and seventy rounds bought one photograph. The photograph did more damage to the Outfit than every raid Ness ever staged."'],
    [
      '- "The massacre — the city desk" -> capa_mas_press_1',
      '- "The massacre — the street" -> capa_mas_street_1',
      '- "Close the folder" -> cap_files',
    ]),

  fanScene('capa_g_late', 'Aftermaths — Soup and Sentence', dropSoup,
    [xsign('capa_g_late', 'THE SOUP AND THE SENTENCE')],
    ['Narrator: "Two thousand two hundred bowls a day, and eleven years at the end of them. Ask a man who stood in that line what it was worth. Then ask the man who paid for it."'],
    [
      '- "The soup kitchen — the workman" -> capa_soup_work_1',
      '- "The soup kitchen — the proprietor" -> capa_soup_cap_1',
      '- "The verdict, 1931" -> capa_g_verdict',
    ]),

  fanScene('capa_g_verdict', 'Aftermaths — The Verdict', dropCourt,
    [xsign('capa_g_verdict', 'THE VERDICT — OCTOBER 17, 1931')],
    ['Narrator: "Guilty on the tax counts. Two men left that courtroom changed — the one in handcuffs, and the one who had spent six years adding."'],
    [
      '- "The verdict — the convict" -> capa_ver_cap_1',
      '- "The verdict — the accountant" -> capa_ver_wil_1',
      '- "Close the folder" -> cap_files',
    ]),

  fanScene('capr_g_law', 'The Record — The Law of It', dropCourt,
    [xsign('capr_g_law', 'THE RECORD — THE LAW OF IT'), spr('capr_g_law_a', 'wilson', 42, 62)],
    ['Narrator: "Three files about the machinery of the law itself: a ruling that made the whole case possible, a plea a judge refused to take, and the raids everybody remembers instead."'],
    [
      '- "U.S. v. Sullivan, 1927 — the ruling" -> capr_sullivan_1',
      '- "The plea Wilkerson threw out, 1931" -> capr_plea',
      '- "The brewery raids" -> capr_raids_1',
    ]),

  fanScene('capr_g_rooms', 'The Record — The Rooms', dropCicero,
    [xsign('capr_g_rooms', 'THE RECORD — THE ROOMS AND THE MEN')],
    ['Narrator: "Three addresses. A lunch counter, a social club, and a Cicero street on election day. Two of them still had the glass swept up by morning."'],
    [
      '- "The Hawthorne lunch counter, 1926" -> capr_lunch',
      '- "The Adonis Social Club, 1925" -> capr_adonis',
      '- "Frank Capone — April 1, 1924" -> capr_frank_1',
    ]),

  fanScene('capr_g_after', 'The Record — After the Party', dropLexington,
    [xsign('capr_g_after', 'THE RECORD — AFTER THE PARTY')],
    ['Narrator: "What was left when the beer went legal and the shooters got old. Spoiler: the rent kept collecting itself, exactly as before."'],
    [
      '- "McGurn, 1936 — an aftermath" -> capr_mcgurn',
      '- "Repeal, 1933 — the empty speakeasy" -> capr_repeal_1',
      '- "The next drawer, or the door out" -> capr_g_out',
    ]),

  fanScene('capr_g_out', 'The Record — The Door', dropCourt,
    [xsign('capr_g_out', 'THE RECORD — DOWN, OR OUT')],
    ['Narrator: "Under this drawer there is another one. Fourteen more files, sources named, doubts flagged. Or you can put the folder back on the table and go be twenty-five years old in Cicero again."'],
    [
      '- "The second drawer — fourteen more files" -> cap_record2',
      '- "Back to the files" -> cap_files',
      '- "Return to Cicero, 1924" -> cap_cicero',
    ]),

  fanScene('capr2_g_numbers', 'The Second Drawer — The Numbers', dropLexington,
    [xsign('capr2_g_numbers', 'THE SECOND DRAWER — THE NUMBERS')],
    ['Narrator: "Sixty million a year, and not one dollar of it filed anywhere. Two exhibits on the size of the hole, and one on the desk where somebody finally started measuring it."'],
    [
      '- "The sixty million" -> capr_sixty',
      '- "Irey\'s desk — October 18, 1928" -> capr_irey',
      '- "Back to the first drawer" -> cap_record',
    ]),

  fanScene('capr2_g_men', 'The Second Drawer — The Government\'s Men', dropCourt,
    [xsign('capr2_g_men', 'THE SECOND DRAWER — THE GOVERNMENT\'S MEN')],
    ['Narrator: "Nobody remembers their names. They are the reason there is a verdict to remember."'],
    [
      '- "George E.Q. Johnson, for the United States" -> capr_johnson',
      '- "The bookkeepers: Shumway & Reis" -> capr_books_1',
      '- "The courthouse names" -> capr2_g_court',
    ]),

  fanScene('capr2_g_court', 'The Second Drawer — The Courthouse Names', dropCourt,
    [xsign('capr2_g_court', 'THE SECOND DRAWER — COURTHOUSE NAMES')],
    ['Narrator: "The rehearsal convictions that taught the government the case would hold, and the twelve men whose names ran in a newspaper before they ever ran in a docket."'],
    [
      '- "Nitti, Guzik, Ralph — the rehearsal convictions" -> capr_lieutenants',
      '- "Twelve names in the paper" -> capr_jurors',
      '- "Back to the first drawer" -> cap_record',
    ]),

  fanScene('capr2_g_story', 'The Second Drawer — Stories and Doubts', dropSoup,
    [xsign('capr2_g_story', 'THE SECOND DRAWER — STORIES AND DOUBTS')],
    ['Narrator: "Now the soft floor. What Chicago said about itself, what Capone said that he probably never said, and the claim this whole chapter rests on."'],
    [
      '- "Cicero, on the record" -> capr2_g_cicero',
      '- "Quotes, legends, and one milk truck" -> capr2_g_quotes',
      '- "The prestige machine, and the door" -> capr2_g_out',
    ]),

  fanScene('capr2_g_cicero', 'The Second Drawer — Cicero on the Record', dropCicero,
    [xsign('capr2_g_cicero', 'THE SECOND DRAWER — CICERO ON THE RECORD')],
    ['Narrator: "Three files on one town. A commission\'s verdict, a sergeant\'s report, and the argument that the whole thing was a landlord collecting."'],
    [
      '- "Cicero, entered by the Commission" -> capr_peterson',
      '- "Sergeant Sweeney\'s report" -> capr_sweeney',
      '- "Cicero as rent — the claim itself" -> capr_georgist',
    ]),

  fanScene('capr2_g_quotes', 'The Second Drawer — Quotes and Legends', dropLexington,
    [xsign('capr2_g_quotes', 'THE SECOND DRAWER — QUOTES AND LEGENDS')],
    ['Narrator: "Three things everybody knows he said. One he said, one he maybe said, and one he could not possibly have done. Chicago never checked, and neither did the movies."'],
    [
      '- "The bankers quote — courthouse steps" -> capr_bankers',
      '- "The bunk quote — an attribution" -> capr_bunk',
      '- "The milk legend — a disputed file" -> capr_milk',
    ]),

  fanScene('capr2_g_out', 'The Second Drawer — The Door', dropSoup,
    [xsign('capr2_g_out', 'THE SECOND DRAWER — THE DOOR')],
    ['Narrator: "One file left: how a man who priced a whole city got himself photographed ladling soup. Then the stairs back up."'],
    [
      '- "The prestige machine" -> capr_persona',
      '- "Back to the first drawer" -> cap_record',
      '- "Return to Cicero, 1924" -> cap_cicero',
    ]),
];

scenes.push(...FANOUT);
console.log(`Fan-out: ${FANOUT.length} grouping scenes so no [CHOICE] shows more than ${MENU_MAX} doors.`);

// ==========================================================================
// THE MACHINE, 1929 — the shared Georgist rig, seeded with Chicago's
// numbers. The vignette pool doubles as its Narraton commentary.
// ==========================================================================

scenes.push(machineHubScene({
  id: 'cap_machine',
  name: 'The Machine, 1929',
  pool: RPOOL,
  panel: 'drama',
  endings: false,
  autopilot: false,
  buttons: ['cap_machine_back'],
  intro: {
    gateVar: 'capMachineIntro',
    line: 'Here is Chicago, 1929, rebuilt as an engine. The Outfit is the rent siphon. The breadline is the margin. The envelopes are the regulation valve, stuck wide open. Greed sits exactly where Capone left it. Now pull the one lever the era never pulled — and listen: the Voices of Chicago cut in whenever the needles swing.',
  },
}));

const game = {
  info: {
    frame: 'amiga',
    title: 'HVB — King of Chicago',
    author: 'Doug Sharp',
    styleGuide: null,
    // WORLD_BASE gives the Machine its full Georgist rig; the chapter's
    // own dials layer on top; then the 1929 Chicago pre-seed wins:
    // greed 75 (the rate), repression 60 (the wall), regulation 15
    // (the envelopes), prestige 65 (the soup).
    worldState: {
      ...WORLD_BASE,
      evidence: 0, newsIdx: 0, rent: 0, heat: 20, respect: 40,
      hawthorne: 0, juryBribe: 0, capMachineIntro: 0,
      greed: 75, repression: 60, regulation: 15, prestige: 65,
    },
    // Which build this is. Stamped, never hand-edited -- see scripts/stamp.mjs.
    ...buildStamp(),
    gameMode: 'INTERACTIVE',
    titleSceneId: 'cap_cicero',
    enableAutosave: true,
  },
  actors,
  scenes,
  drops,
  items: [],
  sfx,
  buttons: [
    {
      id: 'cap_machine_back', name: 'Back to Chicago', label: 'CHICAGO',
      x: 40, y: 4, width: 12, height: 6,
      targetSceneId: 'cap_cicero', status: 'work',
    },
  ],
  episodes: [
    {
      id: 'ep_capone',
      name: 'King of Chicago (1920-1931)',
      description: 'Capone chapter of Humans vs Billionaires: Cicero 1924 to the verdict of 1931. HEAT and RESPECT track your choices; two codas wait at the end — the Rock, or the quiet decline at Palm Island.',
      sceneIds: scenes.map((s) => s.id),
      status: 'work',
    },
  ],
};

const outPath = resolve(root, 'public', 'hvb-capone.json');
writeFileSync(outPath, JSON.stringify(game) + '\n', 'utf8');
const mb = (JSON.stringify(game).length / 1024 / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes, ${drops.length} drops)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-capone.json');
