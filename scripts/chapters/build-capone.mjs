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
      'Narrator: "Cicero, Illinois. April 1, 1924. Chicago elected a reform mayor, so the Outfit moved to the suburbs. Today Cicero votes — on whether it belongs to its citizens or to the organization. Two dials will follow you through this story: HEAT, how hard the law and the public are looking at you. RESPECT, how the Outfit rates the man at the top."',
      'Torrio: "Al. An election is just a market with one product. You can buy it loud, buy it quiet, or let the customers have it. Each price is different."',
      'Capone: "This town is the whole operation, Johnny. Breweries, the Hawthorne, the wire rooms. If Cicero votes wrong, we\'re commuters."',
      'Torrio: "Then choose. And remember what I keep telling you — violence is overhead."',
      '[CHOICE]',
      '- "Flood the polls with muscle" -> cap_cic_muscle',
      '- "Buy the precinct captains quietly" -> cap_cic_money',
      '- "Let Cicero vote — this once" -> cap_cic_stayout',
      '- "Voices of Chicago — hear the witnesses" -> cap_voices',
      '- "Duets — two voices at a table" -> cap_duets',
      '- "Aftermaths — what it cost later" -> cap_aftermaths',
      '- "The Record — the uncovered files" -> cap_record',
      '- "Witness: Clark Street, 10:30 AM" -> cap_cut_clark',
      '- "Witness: The Rate Goes Up" -> cap_cut_rate',
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
      'Capone: "Every polling place gets a car and four men. Voters who look undecided get walked in and shown how to decide."',
      '[SET heat = heat + 15]',
      '[SET respect = respect + 10]',
      '[SET repression = repression + 15]',
      'Narrator: "Gunmen worked the polls all day — ballots inspected, election judges driven off, poll watchers escorted out of town. Cicero voted the Outfit\'s way. By evening the family had a bill of its own: Al\'s brother Frank, dead in a volley from plainclothes police outside a polling place."',
      'Torrio: "You bought the town, Al. The flowers alone cost twenty thousand. That is what overhead means."',
      'Narrator: "Cicero belonged to the organization. And every paper in Chicago now knew the name Capone."',
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
      'Capone: "No cars, no bats. Precinct captains have mortgages like everybody else."',
      'Narrator: "The envelopes went out a week early. Cicero\'s machine discovered it had always admired the Outfit. The count came in right, and hardly anyone had to be pushed down a staircase."',
      'Torrio: "Cheap, quiet, repeatable. That is how a racket becomes a government."',
      'Narrator: "The law in Cicero was now a subscription service. The town was theirs — on paper, which is the strongest way to own anything."',
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
      'Capone: "Let them vote. We\'ll rent the winners afterward."',
      'Narrator: "Cicero voted, more or less freely. The Outfit still ended up with the Hawthorne, the wire rooms, and most of the winners\' evenings — money finds the door either way. But inside the organization, the soldiers muttered: the big fellow blinked."',
      'Torrio: "Restraint reads as weakness to men who only count calibers. Watch your lieutenants, Al."',
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
      'Narrator: "September 20, 1926. Eleven cars roll past the Hawthorne Hotel in broad daylight and rake it with more than a thousand rounds. Machine guns, methodical, car after car. When it ends: glass on every table, splinters where the lobby was, a bystander — Mrs. Freeman — hit in the eye by flying debris. Capone, face down on a restaurant floor, unhurt."',
      '[CLEAR_EFFECT shake_all from haw_sign]',
      poseCmd('st_haw_torrio', 'torrio', 'Lean', 'Tired'),
      'Torrio: "I retired the year they nearly settled me, Al. Look at this room. This is what the business looks like when the overhead comes due."',
      'Capone: "Moran and Weiss just shot up my town in daylight, Johnny. The whole street was watching. Whatever I do next, the street sees it."',
      'Torrio: "Then pick what they see."',
      '[CHOICE]',
      '- "Answer in kind — settle it" -> cap_haw_retaliate',
      '- "Let Torrio broker a peace" -> cap_haw_negotiate',
      '- "Absorb it — pay the bills, play it calm" -> cap_haw_absorb',
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
      'Capone: "A thousand rounds through my windows? Then somebody rents the room over the flower shop on State Street and waits."',
      'Narrator: "Three weeks later Hymie Weiss crossed Superior Street toward Holy Name Cathedral and did not reach the steps. The florist\'s window over the way had been rented by quiet men. Chicago read the signature. The cathedral\'s cornerstone still carries the chips."',
      'Torrio: "The street respects it. The street also remembers it, Al. Remembering is what juries are for."',
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
      'Torrio: "A room at the Hotel Sherman. Every gang at one table. Territories on a map, like railroads dividing a continent. Nobody shoots a customer of the peace."',
      'Narrator: "October 1926. The amnesty conference carved Chicago into markets, and for a while the trucks rolled unhijacked. Businessmen, dividing trade. The papers called it a treaty; nobody was charged with anything."',
      'Capone: "See, Johnny? I always said I was a businessman. Today it was even true."',
      'Narrator: "Some of the soldiers thought the big fellow had paid for peace with prestige. Peace is like that."',
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
      'Capone: "Reopen the restaurant tonight. Coffee for the reporters. And find the woman who caught the glass — Mrs. Freeman. Every hospital bill she has is mine. All of it, the eye specialists too."',
      'Narrator: "He paid — thousands, the papers said — and stood in the shot-up doorway smiling for photographs. The message read two ways at once: nothing frightens this man, and this man decides what Cicero costs."',
      'Torrio: "Generosity as armor. You learned the expensive lesson cheap, Al."',
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
      'Narrator: "Chicago, 1928. The Lexington Hotel, fourth floor. The Outfit grossed $105 million last year — Guinness will record it as the highest income a private citizen ever took in. The racket is rent, and the rent is due."',
      '[IF hawthorne == 1]',
      'Torrio: "Superior Street bought you two quiet years, Al. Quiet is not the same as forgotten — the Hawthorne ledger still has an open line, and Moran keeps books too."',
      '[ENDIF]',
      '[IF respect < 35]',
      'Torrio: "And mind your own house. The soldiers think the big fellow has gone soft. A boss whose men shrug is a boss on a clock."',
      '[ENDIF]',
      'Torrio: "Al. I built this thing on one rule: violence is overhead. Every bullet costs more than it buys. Handle it like a business."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business. I supply a popular demand."',
      'Torrio: "Then decide like a businessman. Moran\'s North Siders are hijacking your trucks. The aldermen are getting expensive. And every speakeasy in the Loop is behind on its protection."',
      'Capone: "The country wanted booze and I organized it. Why should I be called a public enemy?"',
      'Torrio: "You asked for my counsel. Here are your choices. None of them is free."',
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
      'Narrator: "The enforcers went out that week. Shopkeepers and unions paid for the privilege of staying open — the racket as rent, collected door to door. The ones who refused found out what the overhead was for."',
      'Torrio: "Money in. But every squeezed grocer is a witness, Al. And witnesses add up."',
      'Narrator: "The North Side kept hijacking the trucks anyway. Some questions only ever get one kind of answer in this town."',
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
      'Narrator: "The envelopes went out — police captains, aldermen, judges. Cicero had already shown the method in 1924: control the votes, control the officials, and the law becomes a line item. The citizens\' own taxes paid the police who looked away."',
      'Torrio: "Cheaper than bullets. But a bought law protects nobody — including us — when Washington sends men who don\'t take the envelope."',
      'Narrator: "And the North Side was still out there, hijacking trucks. The ledger had one entry left to settle."',
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
      'Capone: "Then you know it never stays settled until somebody settles it."',
      'Narrator: "The order went to a hit squad in February 1929. Two of the men would wear police uniforms. What happened next put an address into the history books: 2122 North Clark Street."',
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
      'Narrator: "By the time the real police arrived there was nothing to see but the brick and what the brick had stopped. This scene shows you the wall. The rest, Chicago already knows."',
      'Ness: "Frank Gusenberg lived long enough to be asked who did it. Fourteen bullets in him, and the man told the officers — nobody shot me. He died without another word. That\'s the code we\'re up against."',
      'Ness: "Capone was in Florida with an alibi you could frame. But everyone in this city can read a signature, even written in .45 caliber."',
      '[SET heat = heat + 15]',
      '[IF hawthorne == 1]',
      'Ness: "And this wall answers an older one. A thousand rounds through the Hawthorne, a florist\'s window on Superior Street, and now Clark Street. Ledgers everywhere in this town — even the kind written in brick."',
      '[ENDIF]',
      'Narrator: "The Chicago Crime Commission answered with a new kind of list. In 1930 they named Al Capone Public Enemy Number One. The publicity that built him began to turn."',
      'Narrator: "And a man who has become Public Enemy Number One needs the public to remember why they liked him."',
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
      'Narrator: "November 1930. 935 South State Street. The man the Crime Commission calls Public Enemy Number One opens a free soup kitchen — 2,200 fed a day, 5,000 on Thanksgiving. The breadline winds past police headquarters."',
      poseCmd('st_capone5', 'capone', 'Wave', 'Happy'),
      'Newsboy: "Extra! Extra! Capone feeds five thousand! Read it in the Tribune!"',
      'Workman: "Two years I built Pullman cars. Now the only man in Chicago with a job for my hands is the one the police can\'t touch. You want me to refuse the soup?"',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am."',
      'Narrator: "An associate told a Chicago paper: he couldn\'t stand to see those poor devils starving, so the big boy decided to do it himself. The Tribune printed the meal count. Nobody printed what the soup was laundering."',
      '[IF respect >= 60]',
      'Workman: "Say what you want — the man\'s own boys eat here too. In this town he\'s the closest thing to a mayor that answers the door."',
      '[ENDIF]',
      '[IF respect < 60]',
      'Workman: "The wall on Clark Street is still standing, mister. A bowl of soup don\'t wash brick."',
      '[ENDIF]',
      'Narrator: "Watch the gauge. Charity is cheap when the till is rent. But Public Enemy Number One is a title that demands an answer. Downtown, a quieter arithmetic is already running the other way. What does the big fellow do with the label?"',
      '[CHOICE]',
      '- "Open the kitchen wider — ladle for the cameras" -> cap_pe_kitchen',
      '- "Feed the press — give the interviews" -> cap_pe_press',
      '- "Lie low — Palm Island till it cools" -> cap_pe_lielow',
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
      'Capone: "Three shifts a day. Nobody asks a name, nobody preaches a sermon, nobody waits behind a photographer. And get the Tribune the meal counts."',
      'Narrator: "An associate told a Chicago paper the big boy couldn\'t stand to see those poor devils starving. 120,000 meals made the headline. The Crime Commission\'s list stayed printed, but for a season the breadline argued back."',
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
      'Newsboy: "Extra! Scarface says he\'s a public benefactor! Washington reads the papers too, mister!"',
      'Narrator: "Every quotable line was a flare over the Lexington. The public grinned; the Bureau of Internal Revenue underlined. A man who explains his income to reporters has explained it to the government."',
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
      'Capone: "Miami. Fishing, sunshine, and no photographs. Chicago can cool off without me in the frame."',
      'Narrator: "The estate at 93 Palm Island: high walls, a dock, a telephone. The Chicago papers went a season without a Capone headline — and the soldiers went a season without seeing the boss. Absence lowers the temperature and the loyalty at the same rate."',
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
      'Narrator: "1929 to 1931. IRS Special Agent Frank J. Wilson works under death threats, tracing a fortune that was never supposed to leave a mark. In 1927 the Supreme Court ruled that even illegal income is taxable. Capone has never filed a return."',
      poseCmd('st_wilson', 'wilson', 'Closeup', 'Determined'),
      'Wilson: "A seized ledger from the Hawthorne Smoke Shop. Net profits, initialed. Cashier\'s checks endorsed by his men. He never opened a bank account in his life — and it doesn\'t matter. A net worth is a confession written in arithmetic."',
      'Ness: "My squad\'s been taking his breweries apart all year. Every still we axe cuts the cash flow. But raids make headlines, Frank. Your ledgers make a sentence."',
      'Wilson: "The man spends a quarter million a year — suits, hotels, Miami. Spending is income made visible. Watch the stack grow. He fell for the one law that doesn\'t care whose bread the policeman eats."',
      'Narrator: "The Secret Six bankroll the investigation. The Tribune that printed his meal counts now prints his indictment: T-MEN TRACE THE MONEY. The ledger closes in."',
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
      'Narrator: "Federal court, Chicago, October 1931. Indicted on twenty-two counts of tax evasion. The night before trial, a list arrives at the Lexington: the names and addresses of the entire jury venire. Someone always sells a list."',
      poseCmd('st_jury_torrio', 'torrio', 'Lean', 'Tired'),
      'Torrio: "Al. Every fix you ever bought was a city fix. This is federal. Judge Wilkerson doesn\'t eat in Chicago restaurants. I\'m tired of saying it: sometimes the cheapest move is the straight one."',
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
      'Narrator: "The men went out with the list — a favor here, an envelope there, a reminder of who owns the block. By the weekend, ten of the first dozen names were friendly."',
      poseCmd('st_jf_wilson', 'wilson', 'Closeup', 'Determined'),
      'Wilson: "We got the same list, from an informant inside the Outfit. I took it to Judge Wilkerson myself. He read it once and said: bring your case as planned. Leave the rest to me."',
      'Narrator: "The fix was in — and so was the counter-fix. Nobody at the Lexington knew yet that the purchase had already been returned."',
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
      'Capone: "Burn the list. If the lawyers are as expensive as they look, let them earn it."',
      'Narrator: "The lawyers tried the deal first — a negotiated plea, two and a half years. Wilkerson threw it out from the bench: the court makes no bargains with defendants. The trial would be real, in front of whatever twelve citizens fate seated."',
      'Torrio: "Then it\'s arithmetic against arithmetic now, Al. Theirs is written down."',
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
      'Narrator: "First morning of trial. Judge Wilkerson turns to the bailiff, almost bored: Judge Woodward has a jury in his courtroom. Go bring me his entire panel, and take him mine. The bought jury walked out one door as twelve strangers walked in the other. The fix died in its chair."',
      '[ENDIF]',
      '[IF juryBribe == 0]',
      'Narrator: "First morning of trial. Twelve strangers in the box — small-town men, farmers, a hardware clerk. No one owned them, which meant no one could save him from them."',
      '[ENDIF]',
      poseCmd('st_capone6', 'capone', 'Sit', 'Confused'),
      'Wilson: "No tommy gun in evidence. No witness to any wall. Just returns never filed, and a net worth no honest income explains."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I called it a business. Prohibition made nothing but trouble."',
      'Narrator: "He watches it slip away the way water leaves a sink — slowly, then all at once. October 17, 1931. Guilty on the tax counts. The man who grossed $105 million in a single year, felled not by bullets but by accounting."',
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
      'Narrator: "Eleven years and a $50,000 fine — the stiffest tax sentence to date, because the government wanted the loudest man in America to fall loudly. Your HEAT saw to that: every headline, every retaliation, every bought juror was an exhibit."',
      poseCmd('st_alc_capone', 'capone', 'Sit', 'Confused'),
      'Narrator: "Atlanta first, where he still ran things through the mail. So in 1934 they put him on the train with the barred windows to the new island prison in San Francisco Bay. No newspapers. No favors. Cell, workshop, laundry. Register number 85."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "The Rock took the empire out of him; illness took the rest. Released 1939, mind failing, dead at Palm Island in January 1947. In 1933, repeal had already drained the market that built him. The precedent — that criminal income is taxable — outlived everyone in this story."',
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
      'Narrator: "Guilty all the same — history does not bend on the counts. But you kept the HEAT down, and the fall lands quieter: the sentence served mostly in Atlanta, the transfer petitions granted, the parole board unhostile. No example needed to be made of a man the front pages had half forgotten."',
      'Narrator: "Released in November 1939. The white house on Palm Island: the dock, the bathrobe, the fishing rod with no hook that nobody mentions. The illness he\'d carried since his twenties dismantles him gently — by the end, doctors said, he had the reasoning of a twelve-year-old."',
      'Capone: "I\'m retired. I told them for years I was just a businessman. Now it\'s finally true — nobody wants anything from me but a wave from the dock."',
      'Narrator: "Dead in January 1947, in bed, with the family around him. The Outfit he built went on without missing a payment — which tells you it was never really about him. The precedent that criminal income is taxable outlived everyone in this story."',
      'Narrator: "THE RACKET AS RENT, THE SOUP AS PRESTIGE, THE LEDGER AS THE END. Run it hotter and see how the same fall lands harder."',
      '[CHOICE]',
      '- "Back to Cicero, 1924 — run it again" -> cap_cicero',
      '[/CHOICE]',
    ),
    status: 'work',
  },
];

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
    intro: 'March 1925. Johnny Torrio, shot nearly dead at his own front door, retires and hands the whole Outfit to a 26-year-old. Who speaks?',
    keys: { respect: { target: 50, scale: 40 }, heat: { target: 20, scale: 40 } } },
  { id: 'cicero', name: 'The Cicero Election', sign: 'CICERO — ELECTION DAY 1924',
    dropId: dropCicero,
    intro: 'April 1, 1924. Gunmen work the Cicero polls all day; the town votes the Outfit\'s way; Frank Capone is dead by dusk. Who speaks?',
    keys: { heat: { target: 35, scale: 40 }, respect: { target: 50, scale: 50 } } },
  { id: 'hawthorne', name: 'The Hawthorne Shooting', sign: 'THE HAWTHORNE — SEPTEMBER 1926',
    dropId: dropCicero,
    intro: 'September 20, 1926. Eleven cars rake the Hawthorne Hotel with a thousand rounds in broad daylight; Capone walks out unhurt. Who speaks?',
    keys: { heat: { target: 55, scale: 40 }, repression: { target: 45, scale: 40 } } },
  { id: 'rates', name: 'The Protection Rates', sign: 'PROTECTION — THE RACKET AS RENT',
    dropId: dropLexington,
    intro: 'The enforcers go door to door: every shop on the block pays to exist. Protection, rent — same thing. Who speaks?',
    keys: { rent: { target: 15, scale: 20 }, repression: { target: 40, scale: 40 } } },
  { id: 'cityhall', name: 'The Buying of City Hall', sign: 'CITY HALL — BOUGHT AND PAID',
    dropId: dropLexington,
    intro: 'Envelopes to police captains, aldermen, judges. The law becomes a line item. Who speaks?',
    keys: { regulation: { target: 10, scale: 30 }, prestige: { target: 45, scale: 50 } } },
  { id: 'massacre', name: 'The Clark Street Massacre', sign: 'CLARK STREET — FEBRUARY 14, 1929',
    dropId: dropGarage,
    intro: 'St. Valentine\'s Day, 1929. Seven men against a garage wall, around seventy rounds, two shooters in police uniforms. Chicago changes its mind. Who speaks?',
    keys: { heat: { target: 75, scale: 30 }, repression: { target: 55, scale: 40 } } },
  { id: 'enemy', name: 'Public Enemy No. 1', sign: 'PUBLIC ENEMY NUMBER ONE — 1930',
    dropId: dropLexington,
    intro: '1930. The Chicago Crime Commission publishes its list, Capone at the top. The publicity that built him begins to turn. Who speaks?',
    keys: { heat: { target: 70, scale: 40 }, prestige: { target: 30, scale: 50 } } },
  { id: 'soup', name: 'The Soup Kitchen', sign: 'THE SOUP KITCHEN — NOVEMBER 1930',
    dropId: dropSoup,
    intro: 'November 1930. 935 South State Street: free soup, coffee, and doughnuts, 2,200 a day, and the breadline winds past police headquarters. Who speaks?',
    keys: { prestige: { target: 65, scale: 35 }, heat: { target: 50, scale: 60 } } },
  { id: 'jury', name: 'The Jury Swap', sign: 'THE JURY SWAP — OCTOBER 1931',
    dropId: dropCourt,
    intro: 'October 1931. The bought jury list reaches Judge Wilkerson — who trades his entire panel for Judge Woodward\'s on the first morning. Who speaks?',
    keys: { heat: { target: 65, scale: 40 }, evidence: { target: 80, scale: 40 } } },
  { id: 'verdict', name: 'The Verdict', sign: 'GUILTY — OCTOBER 17, 1931',
    dropId: dropCourt,
    intro: 'October 17, 1931. Guilty on the tax counts. Eleven years. The king of Chicago, felled by accounting. Who speaks?',
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
      'Capone: "They shot Johnny five times at his own front door and he lived. He called me to the hospital bed and handed me a city."',
      'Capone (Wave/Happy): "Twenty-six years old. Some men inherit a store."',
      'Capone: "It\'s a business, like he always said. I just run it louder."',
    ],
    torrio: [
      'Torrio: "Five bullets is a memo, Al. It says: retire."',
      'Torrio (Lean/Tired): "I built the syndicate like a railroad — territories, schedules, dividends. I handed him a timetable. He heard a throne."',
    ],
    wilson: [
      'Wilson: "1925. The biggest business in Illinois changes hands and no paper moves."',
      'Wilson: "That absence is itself an entry. It told me where to look."',
    ],
    ness: [
      'Ness: "Torrio was smarter than Capone and half as famous. That\'s why he died old, in bed."',
      'Ness: "The day Al took over, the volume went up. Loud is good for us. Loud leaves marks."',
    ],
    workman: [
      'Workman: "New boss on the South Side. On my street the beer changed hands, not the price."',
      'Workman: "They say the young one smiles more. The collectors don\'t."',
    ],
    newsboy: [
      'Newsboy: "Extra! Torrio quits! Young Scarface takes the Outfit!"',
      'Newsboy: "I sold out three editions on his face alone. That scar sells papers, mister."',
    ],
    breadline: [
      'The Breadline: "Torrio\'s out. The kid with the scar is in."',
      'The Breadline: "Bosses come and go. The rent stays. It always stays."',
    ],
    press: [
      'The Press: "Mr. Capone! Is it true Torrio left you everything?"',
      'The Press: "Twenty-six and running a syndicate. Page one doesn\'t care if it\'s a crime story or a business story. It\'s both."',
    ],
  },

  cicero: {
    capone: [
      'Capone: "Cicero voted right. Ask anybody who watched them vote."',
      'Capone (Pointing/Angry): "They killed my brother Frank at a polling place. Whatever Cicero cost us, we paid more."',
    ],
    torrio: [
      'Torrio: "An election bought with muscle stays bought for exactly one term. Then you buy it again."',
      'Torrio (Lean/Tired): "Frank\'s funeral carried twenty thousand dollars of flowers. Violence is overhead, Al. I keep the receipts."',
    ],
    wilson: [
      'Wilson: "Election day 1924 made Cicero a subsidiary. Subsidiaries don\'t file returns either."',
      'Wilson: "You can\'t subpoena a ballot box. You can follow what it bought."',
    ],
    ness: [
      'Ness: "Voters walked to the booth between two gunmen. That was the Cicero franchise."',
      'Ness: "Before my badge, that one. We studied it anyway: how a town gets bought in an afternoon."',
    ],
    workman: [
      'Workman: "I voted in Cicero that day. A fellow leaned on the booth and asked, friendly, was I sure."',
      'Workman: "I was sure. He was surer."',
    ],
    newsboy: [
      'Newsboy: "Extra! Cicero votes at gunpoint! Frank Capone dead!"',
      'Newsboy: "Cops in plain clothes, gangsters in cop cars — some days the captions write themselves, mister."',
    ],
    breadline: [
      'The Breadline: "They say Cicero voted. Cicero was voted, more like."',
      'The Breadline: "Whoever wins, the beer truck still comes Tuesday."',
    ],
    press: [
      'The Press: "Election judges driven off, poll watchers escorted to the county line, one Capone dead by dark."',
      'The Press: "The wire wants two hundred words on democracy in Cicero. Make it a hundred. There\'s less of it than that."',
    ],
  },

  hawthorne: {
    capone: [
      'Capone: "A thousand rounds and they didn\'t touch me. Write that down exactly."',
      'Capone: "I paid Mrs. Freeman\'s hospital bills — every one, the eye specialists too. My town, my glass, my bill."',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Eleven cars, broad daylight, machine guns. This is what the ledger looks like when the overhead comes due."',
      'Torrio: "They nearly settled me in \'25. I retired. Note which of us keeps getting shot at."',
    ],
    wilson: [
      'Wilson: "A thousand rounds fired and no charges filed. Cicero\'s law was a wholly owned subsidiary by then."',
      'Wilson: "Hospital bills paid in cash, thousands, no receipt requested. Generosity is spending, and spending is income. I wrote it down."',
    ],
    ness: [
      'Ness: "A war over beer routes, fought with Thompsons through a hotel lobby at noon."',
      'Ness: "Nobody talked. Nobody was charged. That silence is the thing we\'re really up against."',
    ],
    workman: [
      'Workman: "I was two blocks off when it started. It went on so long men stopped ducking and started counting."',
      'Workman: "Glass in the street like ice in September. Next morning: business as usual."',
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
      'The Press: "He smiled and ordered us coffee. Twenty men with notebooks, and nobody left with a fact."',
    ],
    press_cynical: [
      'The Press: "A thousand rounds, zero indictments. Cicero justice. We should print the box score."',
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
      'Torrio: "Rent is the perfect racket. It collects itself monthly and never testifies."',
      'Torrio (Lean/Tired): "But every squeezed grocer is a witness on layaway, Al. Witnesses compound like interest."',
    ],
    wilson: [
      'Wilson: "Protection leaves no contract. It leaves frightened bookkeeping — the same sum missing, the same week, block after block."',
      'Wilson: "A pattern is testimony that can\'t be intimidated."',
    ],
    ness: [
      'Ness: "The grocer pays. The union pays. The laundry pays. The ones who refuse meet the overhead."',
      'Ness: "You can raid a brewery. How do you raid fear?"',
    ],
    workman: [
      'Workman: "My cousin runs a lunch counter. Every month a man in a good coat takes an envelope off him, polite as a deacon."',
      'Workman: "Cousin calls him the second landlord. The first one only owns the building."',
    ],
    newsboy: [
      'Newsboy: "Even my corner pays, mister! A nickel a week to sell the news on it!"',
      'Newsboy: "Extra! Racket squeeze hits the Loop! Nobody quoted by name!"',
    ],
    breadline: [
      'The Breadline: "Everybody on the block pays. The barber, the baker, the undertaker."',
      'The Breadline: "You pay to work, you pay to eat, and now you pay to be left alone."',
    ],
    press: [
      'The Press: "We ran a series on the rackets. Twelve shopkeepers talked — anonymously. The thirteenth had a fire."',
      'The Press: "Protection is the one story where every source begs you not to print it."',
    ],
  },

  cityhall: {
    capone: [
      'Capone: "Every policeman in this town gets some of his bread and butter from the taxes I pay."',
      'Capone (Wave/Happy): "I don\'t break the law in Chicago. I rent it."',
    ],
    torrio: [
      'Torrio: "An envelope is cheaper than a bullet and quieter than both. Corruption is the only overhead that pays a dividend."',
      'Torrio: "But a bought law protects nobody — including us — when Washington sends men who don\'t take the envelope."',
    ],
    wilson: [
      'Wilson: "We assumed every city officer was already on the payroll. So we came from outside the city."',
      'Wilson: "You can buy an alderman. The tax code has no address to send the envelope to."',
    ],
    ness: [
      'Ness: "I picked eleven men the Outfit couldn\'t buy. It took months. Eleven, out of thousands."',
      'Ness: "They offered two thousand a week to look away. The papers called us Untouchable after that."',
    ],
    workman: [
      'Workman: "My taxes pay the cop on the corner. Capone pays him more. Guess whose corner it is."',
      'Workman: "Two fees for every permit in this town. Only one comes with a receipt."',
    ],
    newsboy: [
      'Newsboy: "The alderman rides in a car the Outfit gave him! Everybody knows and nobody prints it!"',
      'Newsboy: "City Hall, mister? That\'s just the Lexington with a flag on it."',
    ],
    breadline: [
      'The Breadline: "The law\'s for sale, and we\'re not the ones buying."',
      'The Breadline: "Complain to the alderman? He\'s ahead of you in the other line — the paying one."',
    ],
    press: [
      'The Press: "We can name six captains and two judges on the pad. Legal won\'t clear one of them."',
      'The Press: "The story isn\'t that City Hall was bought. It\'s that the price was so low."',
    ],
  },

  massacre: {
    capone: [
      'Capone: "I was in Florida. Ask anybody. Ask the sun."',
      'Capone (Sit/Confused): "They put my name on that wall anyway. The country wanted booze and I organized it — why should I be called a public enemy?"',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Seven men against a wall. Twenty years I taught that violence is overhead — and there\'s the whole lesson in one photograph."',
      'Torrio: "After Clark Street there was no more business. Only heat, forever after."',
    ],
    wilson: [
      'Wilson: "No witness would speak, so the case fell to me and the arithmetic."',
      'Wilson (Closeup/Determined): "Seven dead men moved the public, and the public moved Washington. My ledgers just arrived on time."',
    ],
    ness: [
      'Ness: "Frank Gusenberg took fourteen bullets and told the officers nobody shot him. That\'s the code — and that\'s why it had to be taxes."',
      'Ness: "Two of the shooters wore police uniforms. Think what that does to a city. A uniform becomes a question."',
    ],
    workman: [
      'Workman: "I walked past that garage a hundred times. Now the whole street walks on the other side."',
      'Workman: "Seven men, and the papers printed where each one stood. No soup washes that brick."',
    ],
    newsboy: [
      'Newsboy: "Extra! Seven slain in Clark Street garage! Police impersonated!"',
      'Newsboy: "Sold every paper by nine and felt bad doing it. First time that ever happened, mister."',
    ],
    breadline: [
      'The Breadline: "Seven against a wall, on a Thursday morning."',
      'The Breadline: "Say the name low. Better: say nothing at all."',
    ],
    breadline_fearful: [
      'The Breadline: "If they\'ll do that to their own kind, what\'s a man in a soup line to them?"',
      'The Breadline: "Eyes on your bowl. Don\'t see anything. Nobody saw anything."',
    ],
    breadline_hardened: [
      'The Breadline: "Gangsters shooting gangsters. Sad — but none of the seven ever stood in this line."',
      'The Breadline: "Winter kills more of us every week than Thompsons killed of them. Where\'s our headline?"',
    ],
    press: [
      'The Press: "The photographers got there before the cleanup. Those pictures ended something. The fun went out of the gangster story."',
      'The Press: "Public Enemy was born on Clark Street. We just typed it."',
    ],
    press_cynical: [
      'The Press: "For ten years we made these men colorful. Colorful, right up until the wall."',
      'The Press: "Every desk in town knew who ordered it by lunch. Not one of us can print the name over a fact."',
    ],
    press_sensational: [
      'The Press: "MASSACRE! Biggest crime story since the Fair — remake page one!"',
      'The Press: "The wall photo runs eight columns. Warn the engravers and double the print run."',
    ],
  },

  enemy: {
    capone: [
      'Capone: "Public Enemy Number One. It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am."',
    ],
    torrio: [
      'Torrio: "A list. No warrant, no charge — just a ranking. And it hurt him worse than any indictment yet."',
      'Torrio (Lean/Tired): "I always told him: be rich quietly. Number One is a headline, and headlines are heat."',
    ],
    wilson: [
      'Wilson: "The Commission\'s list carried no legal weight. It carried something better — permission. Juries stopped smiling at him."',
      'Wilson: "Publicity built the man. The same tool took him apart."',
    ],
    ness: [
      'Ness: "The city that cheered him at the ballpark put him top of a wanted list. Chicago finally read its own arithmetic."',
      'Ness: "A title like that makes helping him embarrassing. Embarrassment closes more doors than warrants."',
    ],
    workman: [
      'Workman: "Public Enemy Number One — and half my street still tips their cap when the car goes by."',
      'Workman: "The other half crosses over. That\'s the whole town now: two halves of one street."',
    ],
    newsboy: [
      'Newsboy: "Extra! Public Enemy Number One! Capone tops the list!"',
      'Newsboy: "He bought a paper off me once, tipped a dollar. Now his face IS the paper."',
    ],
    breadline: [
      'The Breadline: "Number One. They made him a champion of something after all."',
      'The Breadline: "Lists downtown, soup down here. Different city, same man."',
    ],
    breadline_fearful: [
      'The Breadline: "Don\'t stand near his name, even in a breadline. Names like that splash."',
      'The Breadline: "When the law finally comes for him, it\'ll come down this street first."',
    ],
    breadline_admiring: [
      'The Breadline: "Enemy of who? Not of anybody standing in this line."',
      'The Breadline: "He feeds five thousand and City Hall feeds speeches. Rank that."',
    ],
    press: [
      'The Press: "Mr. Capone, any comment on the list? — He says he\'s a businessman. Again."',
      'The Press: "The Commission understands us perfectly. A ranking is a story every single day."',
    ],
    press_cynical: [
      'The Press: "We built Scarface out of ink, and now we\'re shocked at the size of him."',
      'The Press: "Public Enemy Number One — a title we\'ll sell papers denouncing."',
    ],
    press_sensational: [
      'The Press: "Run the whole list with mugshots! Readers love a league table!"',
      'The Press: "PUBLIC ENEMY NUMBER ONE across eight columns. That\'s not a headline, that\'s a poster."',
    ],
  },

  soup: {
    capone: [
      'Capone (Wave/Happy): "Nobody asks a name, nobody preaches a sermon. Three shifts a day — and get the Tribune the meal counts."',
      'Capone: "They call me a public enemy. Count the bowls, then count what City Hall serves."',
    ],
    torrio: [
      'Torrio: "Charity is the cheapest prestige on the market. The soup costs pennies. The headline is free."',
      'Torrio (Lean/Tired): "But mark it, Al — the paper printing your meal counts is printing your indictment. You can\'t launder heat forever."',
    ],
    wilson: [
      'Wilson: "The kitchen fed 2,200 a day, in cash, with no books that survived. Even his charity was structured like a getaway."',
      'Wilson (Closeup/Determined): "I counted it anyway. Soup is spending, and spending is income."',
    ],
    ness: [
      'Ness: "The line goes past police headquarters. That\'s not an accident. That\'s a billboard."',
      'Ness: "Feed a man with one hand and it gets very hard to raid you with the other. He knew exactly what he was buying."',
    ],
    workman: [
      'Workman: "Two years I built Pullman cars. Now the only man in Chicago with a job for my hands runs the rackets."',
      'Workman: "I know what the soup is for. I ate it anyway. That\'s the whole Depression in one bowl."',
    ],
    workman_fearful: [
      'Workman: "You take the bowl, you nod, you don\'t ask what pays for it."',
      'Workman: "A man who owns your dinner owns a little of you. I felt it go with the first spoonful."',
    ],
    workman_grateful: [
      'Workman: "Hoover gave me a speech about corners being turned. Capone gave me beef stew, hot."',
      'Workman: "Judge a man by winter, mister. He\'s the only one who showed up for it."',
    ],
    newsboy: [
      'Newsboy: "Extra! Capone feeds five thousand on Thanksgiving!"',
      'Newsboy: "The soup line buys no papers — but the swells buy two each to read about it."',
    ],
    breadline: [
      'The Breadline: "Free soup, coffee, and doughnuts. No questions. No sermon."',
      'The Breadline: "The line goes past police headquarters. Nobody in it laughs at that anymore."',
    ],
    breadline_fearful: [
      'The Breadline: "Eat fast, thank nobody, remember whose ladle it is."',
      'The Breadline: "The wall on Clark Street is still standing. We eat with our caps down."',
    ],
    breadline_grateful: [
      'The Breadline: "The churches ran out in October. This kitchen never has."',
      'The Breadline: "Call him what you want downtown. Down here he\'s the man with the stew."',
    ],
    press: [
      'The Press: "Public Enemy Number One opens a soup kitchen. The copy desk fought over the headline for an hour."',
      'The Press: "120,000 meals — the Tribune counted. Nobody counted what the counting was worth to him."',
    ],
    press_cynical: [
      'The Press: "He breaks the town and feeds its casualties. The feeding runs page one. The breaking runs inside."',
      'The Press: "The best press agent in America is a ladle."',
    ],
    press_sensational: [
      'The Press: "SCARFACE SANTA! Get a man in that line with a camera before the competition does!"',
      'The Press: "Thanksgiving, five thousand fed — that\'s a picture page and you know it."',
    ],
  },

  jury: {
    capone: [
      'Capone (Sit/Confused): "Twenty-two counts. Lawyers lose, lists don\'t — that\'s what I said. Then the judge traded the whole room."',
      'Capone: "Every fix I ever bought was a city fix. Nobody sold me the federal building."',
    ],
    torrio: [
      'Torrio: "I told him: Wilkerson doesn\'t eat in Chicago restaurants. Some men can\'t hear the word no until a bailiff says it."',
      'Torrio (Lean/Tired): "The list cost money. The fix cost more. The swap made both a donation."',
    ],
    wilson: [
      'Wilson (Closeup/Determined): "Our informant brought the same list to me. I took it to the judge myself. He read it once and said: bring your case. Leave the rest to me."',
      'Wilson: "The fix was in. So was the counter-fix. Ours was legal."',
    ],
    ness: [
      'Ness: "Wilkerson borrowed Judge Woodward\'s entire panel — one jury out, another in, first morning, two minutes."',
      'Ness: "Ten years of buying Chicago, beaten by one man who wasn\'t for sale and had the power to shuffle."',
    ],
    workman: [
      'Workman: "They say he bought the jury and the judge swapped it like changing a tire."',
      'Workman: "First courtroom story I ever heard where I laughed at the right end of it."',
    ],
    newsboy: [
      'Newsboy: "Extra! Jury switched! Capone fix foiled by federal judge!"',
      'Newsboy: "Farmers and hardware clerks in the box now, mister. Try buying a man who never heard of you."',
    ],
    breadline: [
      'The Breadline: "He bought twelve men, and the judge bought them back with a wave of his hand."',
      'The Breadline: "So there IS a room in this town money can\'t rent. Took eleven years to find it."',
    ],
    press: [
      'The Press: "The swap took two minutes and unmade seven years of fixes. Best courtroom lead any of us will ever write."',
      'The Press: "You could see it land on him. He looked at the new twelve like a man reading a menu in the wrong language."',
    ],
  },

  verdict: {
    capone: [
      'Capone (Sit/Confused): "Guilty. Not on beer, not on anything with blood in it. On arithmetic."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
    ],
    torrio: [
      'Torrio (Lean/Tired): "Eleven years for unfiled paperwork. I retired on time, Al. That was the whole trick, all along."',
      'Torrio: "The Outfit won\'t miss a payment tomorrow. Remember that when they write that one man was the machine."',
    ],
    wilson: [
      'Wilson: "No tommy gun in evidence. No witness to any wall. Returns never filed, and a net worth no honest income explains."',
      'Wilson (Closeup/Determined): "Rent leaves receipts. It always leaves receipts."',
    ],
    ness: [
      'Ness: "We axed his breweries for two years, and the sentence came out of an accountant\'s briefcase. I can live with that. The point was the fall, not the credit."',
      'Ness: "Eleven years. The loudest man in America, silenced by arithmetic."',
    ],
    workman: [
      'Workman: "They got him. Not for the wall, not for Cicero. For taxes. Taxes!"',
      'Workman: "The soup kitchen ran on a while after. Fewer photographers. Same stew."',
    ],
    newsboy: [
      'Newsboy: "Extra! Capone guilty! Eleven years! Read all about it!"',
      'Newsboy: "Biggest EXTRA since the Armistice, mister. I went home with empty bags and full pockets."',
    ],
    breadline: [
      'The Breadline: "Guilty, says the radio. The line shuffled forward same as ever."',
      'The Breadline: "They took the king of Chicago. The rent, they left."',
    ],
    breadline_relieved: [
      'The Breadline: "So the big ones can fall. Took the government to do it — but they can fall."',
      'The Breadline: "Maybe the cop on the corner works for us again. Maybe."',
    ],
    breadline_wary: [
      'The Breadline: "The Outfit\'s still on the corner this morning. Same corner, same coats."',
      'The Breadline: "They jailed the name. The business never missed a delivery."',
    ],
    press: [
      'The Press: "Guilty on the tax counts, October 17, 1931. Every desk had the ending written except his."',
      'The Press: "Felled not by bullets but by accounting. Somebody\'s typing that line right now in every city room in America."',
    ],
    press_cynical: [
      'The Press: "Seven dead on Clark Street, and the charge that stuck was arithmetic. Print the irony gently. It\'s carrying eleven years."',
      'The Press: "We spent a decade selling his face. This week we sell his fall. Circulation never takes a side."',
    ],
    press_sensational: [
      'The Press: "GUILTY! ELEVEN YEARS! Clear page one, clear page two, clear the week!"',
      'The Press: "Get the shot of him leaving the courtroom — the big fellow, small. That photo goes around the world."',
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

// Per-event responder chooser.
const chooserScene = (ev) => ({
  id: `capch_${ev.id}`,
  name: `Voices: ${ev.name}`,
  sceneType: 'AGENCY',
  dropId: ev.dropId,
  stage: [balloon(`capch_${ev.id}_sign`, ev.sign, 50, 10, { zIndex: 4 })],
  script: lines(
    `Narrator: "${ev.intro}"`,
    '[CHOICE]',
    ...RESPONDERS.map((r) => `- "${r.label}" -> ${vignetteId(ev, r, null)}`),
    '- "Back to the events" -> cap_voices',
    '[/CHOICE]',
  ),
  status: 'work',
});

let vignetteCount = 0;
for (const ev of REVENTS) {
  scenes.push(chooserScene(ev));
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
    'Narrator: "Eleven years, ten turnings of the screw. Choose an event and hear how it landed — on the boss, on his mentor, on the lawmen, on the newsboy, on the breadline, on the press."',
    '[CHOICE]',
    ...REVENTS.map((ev) => `- "${ev.name}" -> capch_${ev.id}`),
    '- "Witness: Clark Street, 10:30 AM" -> cap_cut_clark',
    '- "Witness: The Rate Goes Up" -> cap_cut_rate',
    '- "Duets — two voices at a table" -> cap_duets',
    '- "Aftermaths — what it cost later" -> cap_aftermaths',
    '- "The Record — the uncovered files" -> cap_record',
    '- "Return to Cicero, 1924" -> cap_cicero',
    '[/CHOICE]',
  ),
  status: 'work',
});

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
    'Narrator: "Clark Street. February 14, 1929. Half past ten in the morning. The garage is empty now — the trucks gone, the dog still barking, the coffee on the stove gone cold."',
    '[WAIT 1500ms]',
    '[EFFECT shake_all on ccl_wall]',
    'Narrator: "For about ten seconds this was the loudest room in America. Around seventy rounds."',
    '[WAIT 1200ms]',
    '[CLEAR_EFFECT shake_all from ccl_wall]',
    'Narrator: "There is nothing to see here but a brick wall, and what the brick stopped. No bodies in this telling. Only the wall — and seven names, read at the speed a city read them."',
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
    'Narrator: "Two of the shooters wore police uniforms. Hold that thought. The wall will hold it with you."',
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
    'Narrator: "A block of South State Street. Count the doors: a grocer, a barber, a lunch counter, a laundry, a funeral parlor. Each one already pays a landlord for the ground under its floor."',
    '[WAIT 1500ms]',
    'Narrator: "Then a second landlord arrives — one who never bought the ground. His title deed is the memory of the wall on Clark Street."',
    '[WAIT 1500ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $40 A WEEK"]',
    'Narrator: "The rate goes up. Notice what did not change: the grocer sells no more bread, the barber cuts no more hair. Nothing was produced. Something was only collected."',
    '[WAIT 1800ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $60 A WEEK"]',
    'Narrator: "Henry George had a name for a payment that buys no goods, no labor, no improvement — a payment made simply for permission to exist in a place. He called it rent. The Outfit calls it protection. Same arithmetic, different collector."',
    '[WAIT 1800ms]',
    '[SET_TEXT ccr_sign "PROTECTION — $85 A WEEK"]',
    'Narrator: "The rate rises to whatever the block can bear minus what the block needs to survive — the margin, priced by force. Every dollar above the margin flows uphill and produces nothing on the way."',
    '[WAIT 1800ms]',
    'Narrator: "And the breadline stands still. It always stands still. The line is what the arithmetic looks like from below."',
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
    'Narrator: "Watch the needles. REPRESSION climbs: the massacre is the collection arm of the racket, shown in public — the force that keeps the rate collectible."',
    'Narrator: "The racket IS rent. Not a metaphor: permission to exist on a block, priced by force. George wrote that rent takes what labor produces above bare survival. The Thompson gun is just the deed of title."',
    'Narrator: "REGULATION falls, because two of the shooters wore police uniforms — the law corroded so far by envelopes that its own costume works as camouflage. And PRESTIGE falls with it: the city liked its outlaw right up until the photograph of the wall."',
    'Narrator: "Every variable that just moved is a pipe in a larger engine. You can watch that engine run."',
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
    'Narrator: "RENT-AS-GREED climbs. Protection is rent in George\'s exact sense — a charge for permission to exist in a place, set not by what the payer gets but by what the collector can extract before the payer breaks."',
    'Narrator: "REGULATION falls as the envelopes go out: the alderman, the captain, the judge. A law on the pad does not lower the rate — it becomes part of the rate, a second line on the same bill."',
    'Narrator: "And a slice of the take comes back downhill as soup — PRESTIGE, purchased retail. Charity is cheap when the till is rent."',
    'Narrator: "Repression to hold the block, greed to price it, regulation dissolved to keep it legal-ish, prestige to keep it liked. Four pipes, one engine."',
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
//   THE RECORD    — uncovered research staged as exhibits (12).
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
      'Narrator: "Two chairs, one subject. Some of these conversations history staged. Some it never dared — those are flagged. Pick a table."',
      '[CHOICE]',
      '- "Capone & Torrio — retire like me" -> capd_retire_1',
      '- "Capone & Wilson — the interview that never happened" -> capd_interview_1',
      '- "Wilson & Ness — raids vs receipts" -> capd_methods_1',
      '- "Capone & the Newsboy — buying the headline" -> capd_headline_1',
      '- "Torrio & Ness — the old fox and the young lawman" -> capd_fox_1',
      '- "The Workman & the Breadline — taking the soup" -> capd_takesoup_1',
      '- "Capone & the mirror — Public Enemy, 2 A.M." -> capd_mirror_1',
      '- "Aftermaths — what it cost later" -> cap_aftermaths',
      '- "The Record — the uncovered files" -> cap_record',
      '- "Return to Cicero, 1924" -> cap_cicero',
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
      'Narrator: "Every event has three clocks: that night, months later, years later. Four events, two witnesses each. Choose where to stand."',
      '[CHOICE]',
      '- "Cicero — the family" -> capa_cic_fam_1',
      '- "Cicero — the town that got bought" -> capa_cic_town_1',
      '- "The massacre — the city desk" -> capa_mas_press_1',
      '- "The massacre — the street" -> capa_mas_street_1',
      '- "The soup kitchen — the workman" -> capa_soup_work_1',
      '- "The soup kitchen — the proprietor" -> capa_soup_cap_1',
      '- "The verdict — the convict" -> capa_ver_cap_1',
      '- "The verdict — the accountant" -> capa_ver_wil_1',
      '- "Duets — two voices at a table" -> cap_duets',
      '- "The Record — the uncovered files" -> cap_record',
      '- "Return to Cicero, 1924" -> cap_cicero',
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
      'Narrator: "Files the main story stepped past. Entered as exhibits, without objection."',
      '[CHOICE]',
      '- "U.S. v. Sullivan, 1927 — the ruling" -> capr_sullivan_1',
      '- "The Hawthorne lunch counter, 1926" -> capr_lunch',
      '- "The Adonis Social Club, 1925" -> capr_adonis',
      '- "Frank Capone — April 1, 1924" -> capr_frank_1',
      '- "The plea Wilkerson threw out, 1931" -> capr_plea',
      '- "The brewery raids" -> capr_raids_1',
      '- "McGurn, 1936 — an aftermath" -> capr_mcgurn',
      '- "Repeal, 1933 — the empty speakeasy" -> capr_repeal_1',
      '- "Duets — two voices at a table" -> cap_duets',
      '- "Aftermaths — what it cost later" -> cap_aftermaths',
      '- "Return to Cicero, 1924" -> cap_cicero',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // ------------------------------------------- DUET 1: Retire Like Me (4)
  xw('capd_retire_1', 'Duet: Retire Like Me — I', dropLexington,
    [xsign('capd_retire_1', 'THE LEXINGTON — AFTER HOURS'), ...xtwo('capd_retire_1', 'capone', 'torrio')],
    [
      'Narrator: "After hours at the Lexington. Two chairs, one bottle of the good import. The oldest argument the Outfit owns."',
      'Torrio (Lean/Tired): "Brooklyn, Al. A house, a garden, a wife who stops listening for cars."',
      'Capone: "You sound like a travel agent, Johnny."',
      'Torrio: "I sound like a man five bullets couldn\'t finish. That makes me an expert on timing."',
      '[SCENE capd_retire_2]',
    ], { respect: { target: 50, scale: 40 }, heat: { target: 40, scale: 50 } }),
  xw('capd_retire_2', 'Duet: Retire Like Me — II', dropLexington,
    xtwo('capd_retire_2', 'capone', 'torrio'),
    [
      'Capone: "Walk away from what? A hundred million a year? The city knows my name."',
      'Torrio: "The city knew Colosimo\'s name. I stood at his funeral. Big Jim had lovely flowers."',
      'Capone (Pointing/Angry): "Colosimo wouldn\'t move with the times. I AM the times."',
      'Torrio: "The times end, Al. Mine did. I was there when they ended."',
      '[SCENE capd_retire_3]',
    ]),
  xw('capd_retire_3', 'Duet: The Empire Argument', dropLexington,
    xtwo('capd_retire_3', 'capone', 'torrio'),
    [
      'Capone: "You built a railroad and jumped off it. I\'m building an empire. Empires don\'t have a door marked EXIT."',
      'Torrio (Lean/Tired): "That\'s the flaw in empires, Al. Not a feature."',
      'Capone: "Rome lasted."',
      'Torrio: "Rome delegated. You sign everything with your face."',
      'Narrator: "The bottle goes down an inch. Neither man moves the other. Neither ever will."',
      '[SCENE capd_retire_4]',
    ]),
  xw('capd_retire_4', 'Duet: Retire Like Me — IV', dropLexington,
    xtwo('capd_retire_4', 'capone', 'torrio'),
    [
      'Torrio: "Last offer. Come to Brooklyn. Buy the house next to mine. Grow figs badly."',
      'Capone (Wave/Happy): "Send me a postcard, Johnny."',
      'Torrio: "I\'ll send you a lawyer. You\'ll need him sooner."',
      'Narrator: "Torrio retired in 1925 and died in a barber chair in 1957 — of old age, which in this business counts as a triumph. Capone got six more years of empire. Then the arithmetic."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 2: The Interview That Never Happened (4)
  xw('capd_interview_1', 'Duet: The Interview That Never Happened — I', dropLexington,
    [xsign('capd_interview_1', 'A MEETING THE RECORD DOES NOT CONTAIN'), ...xtwo('capd_interview_1', 'capone', 'wilson')],
    [
      'Narrator: "Flag this scene counterfactual: it never happened. Frank Wilson hunted Al Capone for three years through paper and never once sat across from him with the ledgers open. Stage it anyway. Some arguments deserve a room."',
      'Capone (Wave/Happy): "Coffee? I own the coffee. I own the cups."',
      'Wilson: "You don\'t own anything, Mr. Capone. That\'s my whole case. Nothing is in your name — no account, no deed, not this suite."',
      'Capone: "A careful man keeps a clean signature."',
      'Wilson: "A clean signature and a quarter million a year in spending. The gap between them is where I live."',
      '[SCENE capd_interview_2]',
    ], { evidence: { target: 60, scale: 40 }, prestige: { target: 50, scale: 50 } }),
  xw('capd_interview_2', 'Duet: The Businessman Lines', dropLexington,
    xtwo('capd_interview_2', 'capone', 'wilson'),
    [
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand."',
      'Wilson (Closeup/Determined): "Businessmen file returns. I\'ve read every return you never filed. They\'re very short."',
      'Capone: "The country wanted booze and I organized it. Why should I be called a public enemy?"',
      'Wilson: "I don\'t call you anything. I add you up."',
      '[SCENE capd_interview_3]',
    ]),
  xw('capd_interview_3', 'Duet: The Threats', dropLexington,
    xtwo('capd_interview_3', 'capone', 'wilson'),
    [
      'Capone (Pointing/Angry): "You know what happens to men who add me up?"',
      'Wilson: "Yes. I got the death threats. I moved hotels and kept adding."',
      'Narrator: "That much is true: Wilson worked the case under threat of murder, in a locked room, at night. The counterfactual here is only the coffee."',
      'Capone (Sit/Confused): "What do you want, Wilson? Everybody wants something. That\'s my whole business."',
      'Wilson: "A number, Mr. Capone. Your number. And I already have it."',
      '[SCENE capd_interview_4]',
    ]),
  xw('capd_interview_4', 'Duet: The Ledger Answers', dropLexington,
    xtwo('capd_interview_4', 'capone', 'wilson'),
    [
      'Wilson: "Hawthorne Smoke Shop. Net profits, initialed. Cashier\'s checks endorsed by your men. A ledger a raid took in 1926 that nobody read until me."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business."',
      'Wilson (Closeup/Determined): "Then we agree. Business keeps books. Yours kept mine."',
      'Narrator: "The interview never happened. The verdict happened anyway — which tells you which of the two men needed the meeting."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 3: Raids vs Receipts (4)
  xw('capd_methods_1', 'Duet: Raids vs Receipts — I', null,
    [xsign('capd_methods_1', 'TWO FEDERAL METHODS, ONE TARGET'), ...xtwo('capd_methods_1', 'wilson', 'ness')],
    [
      'Ness: "We hit the brewery on South Wabash last night. Steel ram on a flatbed, straight through the doors. Nineteen trucks, seized."',
      'Wilson: "How many years does a truck testify to?"',
      'Ness: "It\'s not about testimony, Frank. It\'s cash flow. Every barrel we axe, the Outfit earns less."',
      'Wilson: "And every barrel makes a headline. Headlines warn a man to hide his paper."',
      '[SCENE capd_methods_2]',
    ], { evidence: { target: 70, scale: 40 }, regulation: { target: 20, scale: 40 } }),
  xw('capd_methods_2', 'Duet: The Envelope Returned', null,
    xtwo('capd_methods_2', 'wilson', 'ness'),
    [
      'Ness: "They offered my men two thousand a week to look away. My men threw it back. The papers called us Untouchable."',
      'Wilson (Closeup/Determined): "Nobody offers an accountant anything. We\'re invisible. That\'s the whole method."',
      'Ness: "Invisible doesn\'t scare anyone."',
      'Wilson: "Neither does scared. Frightened men hide. Bored men file. I want him bored."',
      '[SCENE capd_methods_3]',
    ]),
  xw('capd_methods_3', 'Duet: Pressure and Paper', null,
    xtwo('capd_methods_3', 'wilson', 'ness'),
    [
      'Ness: "You think the raids were theater."',
      'Wilson: "I think the raids were pressure, and pressure is useful. A man being raided spends faster, moves money clumsier, trusts fewer clerks. Clumsy is legible."',
      'Ness: "So my ram feeds your ledger."',
      'Wilson: "Every method in this building feeds the ledger. The ledger is the only thing the jury will ever see."',
      '[SCENE capd_methods_4]',
    ]),
  xw('capd_methods_4', 'Duet: Who Gets the Credit', null,
    xtwo('capd_methods_4', 'wilson', 'ness'),
    [
      'Ness: "Eleven years, and the counts were yours. You know what my squad got him? Five thousand dollars, contempt of court. A footnote."',
      'Wilson: "Your footnote cut his income in half while I counted the other half. Take the win, Eliot."',
      'Narrator: "History took Ness\'s legend and Wilson\'s arithmetic and mostly confused the two. The receipts convicted him. The raids sold the movie."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 4: Buying the Headline (4)
  xw('capd_headline_1', 'Duet: Buying the Headline — I', dropSoup,
    [xsign('capd_headline_1', 'A CORNER ON SOUTH STATE STREET'),
      spr('capd_headline_1_a', 'capone', 32, 62), spr('capd_headline_1_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "Extra! Public Enemy Number One! — oh. Morning, Mr. Capone."',
      'Capone (Wave/Happy): "Morning, kid. How\'s the paper selling?"',
      'Newsboy: "Your face sells everything, mister. Good days and bad."',
      'Capone: "Give me the stack. All of it."',
      '[SCENE capd_headline_2]',
    ], { prestige: { target: 60, scale: 40 }, heat: { target: 45, scale: 50 } }),
  xw('capd_headline_2', 'Duet: The Whole Stack', dropSoup,
    [spr('capd_headline_2_a', 'capone', 32, 62), spr('capd_headline_2_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "The whole stack? That\'s two hundred papers."',
      'Capone: "And a dollar for the empty bag. A man shouldn\'t stand all day under a headline like that."',
      'Newsboy: "Buying them don\'t un-print them, Mr. Capone. There\'s a truck brings more at noon."',
      'Capone (Sit/Confused): "Yeah. There\'s always a truck at noon."',
      '[SCENE capd_headline_3]',
    ]),
  xw('capd_headline_3', 'Duet: Both Editions', dropSoup,
    [spr('capd_headline_3_a', 'capone', 32, 62), spr('capd_headline_3_b', 'newsboy', 70, 66, 1.8)],
    [
      'Newsboy: "Can I ask you something, mister? My ma says you feed people. My pop says you shoot people. Which paper\'s right?"',
      'Capone: "Both editions, kid. Same publisher."',
      'Narrator: "It is the only wholly honest quote in this scene, and it is invented. The real ones are worse."',
      '[SCENE capd_headline_4]',
    ]),
  xw('capd_headline_4', 'Duet: The Noon Truck', dropSoup,
    [spr('capd_headline_4_a', 'capone', 32, 62), spr('capd_headline_4_b', 'newsboy', 70, 66, 1.8)],
    [
      'Capone: "Keep the change. Buy your ma something."',
      'Newsboy: "You tip like the headline\'s true, mister."',
      'Narrator: "He walked off with two hundred copies of his own name. The noon truck came at noon. It always does. You cannot corner a market in ink — a lesson he learned slower than any in his life."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 5: The Old Fox and the Young Lawman (4)
  xw('capd_fox_1', 'Duet: The Old Fox — I', null,
    [xsign('capd_fox_1', 'A RAILWAY PLATFORM, POINTS EAST'), ...xtwo('capd_fox_1', 'torrio', 'ness')],
    [
      'Narrator: "Another meeting the record doesn\'t show: the man who built the Outfit and the man sent to break it, on a platform between trains. Grant it the length of one cigarette."',
      'Ness: "Johnny Torrio. You\'re supposed to be in Brooklyn."',
      'Torrio: "I\'m supposed to be dead, officer. Brooklyn is the compromise."',
      'Ness: "Agent. Ness. Prohibition Bureau."',
      'Torrio (Lean/Tired): "I know who you are. I read the papers I used to own."',
      '[SCENE capd_fox_2]',
    ], { heat: { target: 50, scale: 50 }, respect: { target: 40, scale: 50 } }),
  xw('capd_fox_2', 'Duet: The Thirst Stays', null,
    xtwo('capd_fox_2', 'torrio', 'ness'),
    [
      'Ness: "You built the thing I\'m taking apart. That doesn\'t trouble you?"',
      'Torrio: "Young man, I built a delivery service for a thirst the law invented. Take it apart. The thirst stays. Someone reassembles it by Thursday."',
      'Ness: "That\'s a tired man\'s excuse."',
      'Torrio: "It\'s a tired man\'s inventory."',
      '[SCENE capd_fox_3]',
    ]),
  xw('capd_fox_3', 'Duet: One True Thing', null,
    xtwo('capd_fox_3', 'torrio', 'ness'),
    [
      'Ness: "Al Capone. Give me one true thing about him."',
      'Torrio (Lean/Tired): "He was the best second-in-command I ever had, and the worst first. Some men are engines. Never make an engine the driver."',
      'Ness: "And you?"',
      'Torrio: "I was a timetable. Timetables retire."',
      '[SCENE capd_fox_4]',
    ]),
  xw('capd_fox_4', 'Duet: What Breaks', null,
    xtwo('capd_fox_4', 'torrio', 'ness'),
    [
      'Ness: "If I ever get him — really get him — what breaks?"',
      'Torrio: "Nothing, agent. That\'s the answer nobody wants. The Outfit isn\'t a man. It\'s a rent, and rents outlive their collectors."',
      'Narrator: "The train east took the old fox back to his garden. History records no such platform. It records the rent, still collecting, decades after both men were gone."',
      '[SCENE cap_duets]',
    ]),

  // --------------------------- DUET 6: Taking the Soup (4)
  xw('capd_takesoup_1', 'Duet: Taking the Soup — I', dropSoup,
    [xsign('capd_takesoup_1', 'FREE SOUP COFFEE AND DOUGHNUTS'),
      spr('capd_takesoup_1_a', 'workman', 32, 62), spr('capd_takesoup_1_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "First time in this line. I keep my collar up like somebody might know me."',
      'The Breadline: "Everybody in this line keeps the collar up, friend. Nobody\'s looking. That\'s the one mercy of it."',
      'Workman: "Two years at Pullman. I built things. Now I\'m queueing for a gangster\'s stew."',
      'The Breadline: "The stew don\'t ask where you worked. Move up."',
      '[SCENE capd_takesoup_2]',
    ], { prestige: { target: 55, scale: 40 }, rent: { target: 20, scale: 30 } }),
  xw('capd_takesoup_2', 'Duet: What It Costs', dropSoup,
    [spr('capd_takesoup_2_a', 'workman', 32, 62), spr('capd_takesoup_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "Does it cost anything? There\'s always a cost."',
      'The Breadline: "No sermon, no name at the door, no fee. That\'s the sales pitch and it\'s true."',
      'Workman: "Then what does he get?"',
      'The Breadline: "He gets you standing here, thinking well of him. Cheaper than a lawyer, better than a billboard."',
      '[SCENE capd_takesoup_3]',
    ]),
  xw('capd_takesoup_3', 'Duet: The Catechism', dropSoup,
    [spr('capd_takesoup_3_a', 'workman', 32, 62), spr('capd_takesoup_3_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "My kid asked who pays for the soup. I said a rich man. She asked if he was good. I said eat your soup."',
      'The Breadline: "That\'s the whole catechism, friend. Every man in this line has said it."',
      'Workman: "Gratitude to a man like that — it sits in the chest like a stone."',
      'The Breadline: "It\'s winter. Stones are warm compared."',
      '[SCENE capd_takesoup_4]',
    ]),
  xw('capd_takesoup_4', 'Duet: A Line, Not a Jury', dropSoup,
    [spr('capd_takesoup_4_a', 'workman', 32, 62), spr('capd_takesoup_4_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "If they ever put him on trial, what do we say? He fed us?"',
      'The Breadline: "We say nothing. We\'re a line, not a jury."',
      'Narrator: "In October 1931 a jury of farmers and clerks said it instead. The kitchen ran a while longer, quieter, and closed in the spring of 1932. The line re-formed at the churches, which had less stew and fewer photographers."',
      '[SCENE cap_duets]',
    ]),

  // ------------------- DUET 7: Public Enemy at the Mirror (4)
  xw('capd_mirror_1', 'Duet: The Mirror — 2 A.M.', dropLexington,
    [xsign('capd_mirror_1', 'THE LEXINGTON — 2 A.M.'),
      balloon('capd_mirror_1_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }),
      spr('capd_mirror_1_a', 'capone', 42, 62)],
    [
      'Narrator: "Two in the morning at the Lexington. The bodyguards are in the hall. The only company left is the mirror and the radio, and neither one works for him."',
      'Narrator: "The radio, softly: —named by the Chicago Crime Commission as Public Enemy Number One, the hoodlum Alphonse Capone—"',
      'Capone (Pointing/Angry): "Hoodlum. I employ more men than the stockyards."',
      'Narrator: "The mirror declines to argue."',
      '[SCENE capd_mirror_2]',
    ], { heat: { target: 70, scale: 40 }, prestige: { target: 40, scale: 50 } }),
  xw('capd_mirror_2', 'Duet: The Goat', dropLexington,
    [balloon('capd_mirror_2_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_2', 'capone')],
    [
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "The radio: —lines at the Capone soup kitchen stretched past police headquarters again today—"',
      'Capone (Wave/Happy): "Hear that? Five thousand on Thanksgiving. Ask the line who the enemy is."',
      'Narrator: "The radio, not listening: —in Washington, the Treasury declined to comment on the Capone investigation—"',
      '[SCENE capd_mirror_3]',
    ]),
  xw('capd_mirror_3', 'Duet: Say It Back', dropLexington,
    [balloon('capd_mirror_3_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_3', 'capone')],
    [
      'Capone (Sit/Confused): "Declined to comment. That\'s the sound a trap makes before it\'s a trap."',
      'Capone: "I\'m a businessman. Say it back to me, mirror. Somebody in this room should say it back."',
      'Narrator: "The mirror shows a heavy man in silk pajamas, alone at two in the morning, rehearsing his defense to a piece of furniture."',
      '[SCENE capd_mirror_4]',
    ]),
  xw('capd_mirror_4', 'Duet: Nobody Turns It Off', dropLexington,
    [balloon('capd_mirror_4_radio', 'RADIO — ALL-NIGHT', 76, 24, { zIndex: 4 }), ...xone('capd_mirror_4', 'capone')],
    [
      'Narrator: "The radio: —repeating tonight\'s headline: PUBLIC ENEMY NUMBER ONE—"',
      'Capone: "Turn it off."',
      'Narrator: "Nobody turns it off. The bodyguards are in the hall, and a man doesn\'t cross his own suite twice in one night for a radio."',
      'Narrator: "He let it play. That is the whole scene, and the closest thing to a confession the Lexington ever heard."',
      '[SCENE cap_duets]',
    ]),

  // ============ AFTERMATH CHAINS — Cicero: the family (3) ============
  xw('capa_cic_fam_1', 'Cicero, That Night — the Family', dropCicero,
    [xsign('capa_cic_fam_1', 'APRIL 1, 1924 — THAT NIGHT'), ...xtwo('capa_cic_fam_1', 'capone', 'torrio')],
    [
      'Narrator: "Election night in Cicero. The town is won. In a front parlor, the family sits with the winning and the cost: Frank Capone, shot dead by plainclothes police outside a polling place, aged 29."',
      'Capone: "They\'ll say he drew first. Twenty plainclothes men, and my brother drew first."',
      'Torrio (Lean/Tired): "Tonight you say nothing, Al. Tonight you sit with your mother."',
      'Capone: "Cicero\'s ours, Johnny. We won."',
      'Torrio: "Yes. Notice how it tastes."',
      '[SCENE capa_cic_fam_2]',
    ], { respect: { target: 55, scale: 40 }, heat: { target: 35, scale: 40 } }),
  xw('capa_cic_fam_2', 'Cicero, Months Later — the Family', dropCicero,
    xtwo('capa_cic_fam_2', 'capone', 'torrio'),
    [
      'Narrator: "Months later. The funeral is already legend: twenty thousand dollars of flowers, and Cicero\'s shops shuttered two hours in respect — ordered respect, but shuttered all the same."',
      'Capone: "Every saloon in Cicero closed for Frank. You know what closes a saloon in Cicero? Nothing. Nothing closes them. They closed."',
      'Torrio: "Fear closes them, Al. Try not to bank it as love."',
      'Narrator: "The polling places that cost Frank his life delivered their majorities on schedule, every election after. The town stayed bought for a decade."',
      '[SCENE capa_cic_fam_3]',
    ]),
  xw('capa_cic_fam_3', 'Cicero, Years Later — the Family', dropCicero,
    xone('capa_cic_fam_3', 'capone'),
    [
      'Narrator: "Years later. Palm Island, the 1940s. The mind going, the empire gone, the visitors few."',
      'Capone (Sit/Confused): "Frank was the gentle one. Everybody said it backwards — they thought I was the businessman and Frank was the gun. It was backwards."',
      'Narrator: "He tended the story like a garden by then, moving the stones around. Some days Frank died at the polls. Some days Frank was still coming to dinner."',
      'Narrator: "Cicero, for the record, is still there. The election of 1924 is a plaque nobody put up."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Cicero: the town (2) -------------------
  xw('capa_cic_town_1', 'Cicero, That Night — the Town', dropCicero,
    [spr('capa_cic_town_1_a', 'workman', 32, 62), spr('capa_cic_town_1_b', 'breadline', 70, 62, 2.6)],
    [
      'Narrator: "Election night, seen from a kitchen window on 22nd Street. The cars with no plates are finally parked."',
      'Workman: "We voted. That\'s what the radio will say. There were men at the booth with coats too heavy for April."',
      'Workman: "My wife asked who won. I said: they did. She asked who\'s they. I said: don\'t ask that on a night the cars are out."',
      'The Breadline: "Every porch light on the block went dark by nine. A town learns fast what not to see."',
      '[SCENE capa_cic_town_2]',
    ], { regulation: { target: 15, scale: 35 }, repression: { target: 40, scale: 40 } }),
  xw('capa_cic_town_2', 'Cicero, Years Later — the Town', dropCicero,
    [spr('capa_cic_town_2_a', 'workman', 32, 62), spr('capa_cic_town_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Narrator: "Years later. The Hawthorne got shot up in 1926, the Outfit moved its flag back to Chicago, the papers moved on. Cicero stayed governed."',
      'Workman: "You can live a whole life in a bought town. You pay rent twice and vote once, and the once doesn\'t count."',
      'Workman: "My kid did a school report: CICERO, GATEWAY TO THE WEST. Not one word in it was a lie, and not one word in it was the truth."',
      'The Breadline: "In a bought town, the breadline is the opposition party. Nobody buys us. Nobody has to."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Massacre: the city desk (3) -------------------
  xw('capa_mas_press_1', 'The Massacre, That Night — the City Desk', dropGarage,
    [xsign('capa_mas_press_1', 'FEBRUARY 14, 1929 — THAT NIGHT'), ...xone('capa_mas_press_1', 'press', 2.6)],
    [
      'The Press: "Nobody went home. The composing room set SEVEN SLAIN three different sizes and the editor kept saying bigger."',
      'The Press: "A photographer came back shaking, and his plates were the story of the century. We ran them. God help us, we measured them for columns first."',
      'Narrator: "Aftermath only, here as everywhere: the wall, the chalk, the hats still on their hooks. The pictures did the rest to the country\'s stomach."',
      '[SCENE capa_mas_press_2]',
    ], { heat: { target: 75, scale: 30 }, prestige: { target: 30, scale: 50 } }),
  xw('capa_mas_press_2', 'The Massacre, Months Later — the City Desk', dropGarage,
    xone('capa_mas_press_2', 'press', 2.6),
    [
      'The Press: "The fun went out of the gangster story. That\'s the phrase that went around the desk, and it was exact."',
      'The Press: "For ten years he was colorful copy — the soup, the quips, the fedora. After Clark Street, every column read like an accessory after the fact."',
      'Narrator: "In 1930 the Crime Commission handed the desks a new noun: Public Enemy. It fit an eight-column line, and it fit the mood."',
      '[SCENE capa_mas_press_3]',
    ]),
  xw('capa_mas_press_3', 'The Massacre, Years Later — the City Desk', dropGarage,
    xone('capa_mas_press_3', 'press', 2.6),
    [
      'The Press: "The garage came down eventually. Souvenir men sold the bricks — the actual bricks, numbered."',
      'The Press: "We printed the address of the wall more often than the names of the seven. Ask the copy desk to name them today. Then ask the wall."',
      'Narrator: "Peter Gusenberg. Frank Gusenberg. James Clark. Adam Heyer. Reinhardt Schwimmer. Albert Weinshank. John May. The paper of record, catching up."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Massacre: the street (2) -------------------
  xw('capa_mas_street_1', 'The Massacre, That Night — the Street', dropGarage,
    [spr('capa_mas_street_1_a', 'workman', 32, 62), spr('capa_mas_street_1_b', 'breadline', 70, 62, 2.6)],
    [
      'The Breadline: "The radio said seven. The corner said don\'t say anything."',
      'Workman: "I walked home the long way. Everybody walked home the long way. Clark Street got wide that night."',
      'The Breadline: "The dog in that garage barked till morning. The whole block heard it. Nobody went to look twice."',
      '[SCENE capa_mas_street_2]',
    ], { repression: { target: 60, scale: 40 }, heat: { target: 70, scale: 40 } }),
  xw('capa_mas_street_2', 'The Massacre, Years Later — the Street', dropGarage,
    [spr('capa_mas_street_2_a', 'workman', 32, 62), spr('capa_mas_street_2_b', 'breadline', 70, 62, 2.6)],
    [
      'Workman: "For years you\'d point it out to visitors — there, that garage. Then you\'d feel cheap for pointing."',
      'The Breadline: "The ones who lined men up against a wall — mostly they got walls of their own, one by one. The street kept score. The street always keeps score."',
      'Narrator: "Aftermath as geography: a plain brick building, then a parking lot, then a lawn. Cities heal by forgetting, and forget by paving."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Soup kitchen: the workman (3) -------------------
  xw('capa_soup_work_1', 'The Soup, That Night — the Workman', dropSoup,
    [xsign('capa_soup_work_1', 'NOVEMBER 1930 — THAT NIGHT'), ...xone('capa_soup_work_1', 'workman')],
    [
      'Workman: "First night after my first bowl. Slept without the hunger dream, first time in a month."',
      'Workman: "Woke at three anyway, out of habit. Lay there doing the arithmetic — whose beef, whose bread, whose ladle."',
      'Workman: "Fell back asleep mid-sum. The stomach outvotes the arithmetic every time."',
      '[SCENE capa_soup_work_2]',
    ], { prestige: { target: 65, scale: 35 }, rent: { target: 15, scale: 30 } }),
  xw('capa_soup_work_2', 'The Soup, Months Later — the Workman', dropSoup,
    xone('capa_soup_work_2', 'workman'),
    [
      'Workman: "The line got to be a job. Same faces, same hour. We nod like men clocking in."',
      'Workman: "October, a fellow ran down the line yelling GUILTY, ELEVEN YEARS. The line didn\'t cheer and didn\'t cry. It shuffled up one place, same as ever."',
      '[SCENE capa_soup_work_3]',
    ]),
  xw('capa_soup_work_3', 'The Soup, Years Later — the Workman', dropSoup,
    xone('capa_soup_work_3', 'workman'),
    [
      'Narrator: "The kitchen closed in April 1932 — the man in prison, the associates unsentimental. The churches took the line back, at church portions."',
      'Workman: "Got work in 1936, WPA. Government soup, you could call it, and I ate that too."',
      'Workman: "You want the honest accounting? He fed me a winter, and it bought him nothing in the end, and it fed me a winter. Both entries stand."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Soup kitchen: the proprietor (2) -------------------
  xw('capa_soup_cap_1', 'The Soup, That Night — the Proprietor', dropSoup,
    [xsign('capa_soup_cap_1', 'NOVEMBER 1930 — THAT NIGHT'), ...xone('capa_soup_cap_1', 'capone')],
    [
      'Capone (Wave/Happy): "Get the Tribune the meal count. Twenty-two hundred. And nobody preaches in my kitchen — a man can eat without a sermon."',
      'Narrator: "That night the count went to the Tribune, and the Tribune printed it, and somewhere downtown a man named Wilson clipped the article for a folder marked SPENDING."',
      '[SCENE capa_soup_cap_2]',
    ], { prestige: { target: 70, scale: 35 }, heat: { target: 55, scale: 50 } }),
  xw('capa_soup_cap_2', 'The Soup, Years Later — the Proprietor', dropSoup,
    xone('capa_soup_cap_2', 'capone'),
    [
      'Narrator: "Alcatraz mess hall, the mid-1930s. Register 85 eats what everyone eats: no menu, no photographers, no count to the Tribune."',
      'Capone (Sit/Confused): "I fed five thousand men on a Thanksgiving. Ask anybody. Ask the Tribune."',
      'Narrator: "The man on the next bench didn\'t look up. On the Rock, everybody used to be somebody, and the soup is the same for all of them."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Verdict: the convict (3) -------------------
  xw('capa_ver_cap_1', 'The Verdict, That Night — Cook County Jail', dropCourt,
    [xsign('capa_ver_cap_1', 'OCTOBER 17, 1931 — THAT NIGHT'), ...xone('capa_ver_cap_1', 'capone')],
    [
      'Narrator: "The night of the verdict, Cook County Jail. The suite at the Lexington stands empty; the suit is on a hanger; the man is in a cell that a bribed guard can improve but not open."',
      'Capone (Sit/Confused): "Eleven years. For paperwork."',
      'Capone: "It seems like I\'m all the government talks about. They\'ve got to have a goat, and I\'m it."',
      'Narrator: "Down the block, the night edition was already selling. He could hear the newsboys through the window if the wind sat right. Some nights the wind sat right."',
      '[SCENE capa_ver_cap_2]',
    ], { evidence: { target: 90, scale: 40 }, heat: { target: 60, scale: 50 } }),
  xw('capa_ver_cap_2', 'The Verdict, Later — Register 85', dropCourt,
    [balloon('capa_ver_cap_2_card', 'ALCATRAZ — REGISTER No. 85', 50, 18, { zIndex: 3 }), ...xone('capa_ver_cap_2', 'capone')],
    [
      'Narrator: "Atlanta first, where money still worked a little. Then August 1934: the train with the barred windows, the bay, the Rock."',
      'Capone: "I\'m Al Capone."',
      'Narrator: "The guard wrote 85 and pointed down the corridor. That was the entire exchange, and the entire sentence in miniature: the name confiscated, the number issued."',
      'Narrator: "Cell, workshop, laundry. He mopped floors. Other men decided what he was worth now, and the number came out low."',
      '[SCENE capa_ver_cap_3]',
    ]),
  xw('capa_ver_cap_3', 'The Verdict, Years Later — Palm Island, 1947', dropCourt,
    [balloon('capa_ver_cap_3_card', '93 PALM ISLAND — JANUARY 1947', 50, 18, { zIndex: 3 }), ...xone('capa_ver_cap_3', 'capone')],
    [
      'Narrator: "Palm Island, January 1947. Released in 1939, the illness eating the mind for years — by the end, the doctors said, the reasoning of a twelve-year-old."',
      'Capone (Sit/Confused): "Johnny\'s coming to dinner. Johnny Torrio. And Frank. Set two more places."',
      'Narrator: "Nobody corrected him. The dock, the bathrobe, the fishing rod nobody mentions. He died in bed on January 25, the family around him, aged 48."',
      'Narrator: "The Outfit did not miss a payment that week. The record should show he was mourned, and the rent was collected, and neither fact touched the other."',
      '[SCENE cap_aftermaths]',
    ]),

  // ------------------- Verdict: the accountant (2) -------------------
  xw('capa_ver_wil_1', 'The Verdict, That Night — the Accountant', null,
    [xsign('capa_ver_wil_1', 'OCTOBER 17, 1931 — THAT NIGHT'), ...xone('capa_ver_wil_1', 'wilson')],
    [
      'Wilson: "The night of the verdict I checked out of my hotel under my own name, first time in two years. Small pleasure. I recommend it."',
      'Wilson (Closeup/Determined): "People wanted a celebration. I filed the workpapers. The case was never against a man. It was against a gap in a column, and the column closed."',
      '[SCENE capa_ver_wil_2]',
    ], { evidence: { target: 95, scale: 30 }, regulation: { target: 40, scale: 50 } }),
  xw('capa_ver_wil_2', 'The Verdict, Years Later — the Precedent', null,
    xone('capa_ver_wil_2', 'wilson'),
    [
      'Narrator: "Years later. Wilson went on to run the Secret Service, chase counterfeiters, and die in bed — the accountant\'s ending, earned."',
      'Wilson: "The thing that outlived us all is a sentence of law: illegal income is taxable. Sullivan, 1927. Every ambitious prosecutor since has kept it in the top drawer."',
      'Wilson: "They still say bullets couldn\'t get him and arithmetic did. Close. Patience did. Arithmetic was just how the patience kept score."',
      '[SCENE cap_aftermaths]',
    ]),

  // ================== THE RECORD — uncovered files (12) ==================
  xw('capr_sullivan_1', 'The Record: U.S. v. Sullivan — I', dropCourt,
    [xsign('capr_sullivan_1', 'SUPREME COURT — MAY 16, 1927'), ...xone('capr_sullivan_1', 'wilson')],
    [
      'Narrator: "Washington, 1927. A South Carolina bootlegger named Manly Sullivan argues he can\'t be taxed on illegal income — filing a return would incriminate him, and the Fifth Amendment forbids that."',
      'Narrator: "Justice Oliver Wendell Holmes, 86 years old, disposes of the argument in a few dry pages: gains from illicit traffic are income, and the Fifth is not a license to file nothing."',
      'Wilson: "Read it again. Slower. That ruling is a key, and somewhere in Chicago is the lock."',
      '[SCENE capr_sullivan_2]',
    ], { evidence: { target: 50, scale: 50 }, regulation: { target: 30, scale: 50 } }),
  xw('capr_sullivan_2', 'The Record: U.S. v. Sullivan — II', dropCourt,
    xone('capr_sullivan_2', 'wilson'),
    [
      'Wilson (Closeup/Determined): "Before Sullivan, a criminal fortune was unreachable — you couldn\'t tax what the law refused to see. After Sullivan, every dollar is visible to the Treasury, however it was earned."',
      'Wilson: "Capone never filed a return in his life. Until 1927 that was caution. After 1927 it was twenty-two counts waiting for a clerk to type them."',
      'Narrator: "The most important gunfire in this story is a pen in Washington, and it made no sound at all."',
      '[SCENE cap_record]',
    ]),

  xw('capr_lunch', 'The Record: The Lunch Counter', dropCicero,
    [xsign('capr_lunch', 'HAWTHORNE RESTAURANT — AFTER THE GUNS'), ...xone('capr_lunch', 'capone')],
    [
      'Narrator: "September 20, 1926, ten minutes after. The eleventh car is gone. The Hawthorne\'s lunch counter is a beach of glass. Coffee still steams in cups whose saucers have been shot away."',
      'Narrator: "Capone gets up off the floor where his bodyguard threw him. Outside, a bystander — Mrs. Freeman, her little boy in the car — has been hurt by flying debris. Her eye will need specialists."',
      'Capone: "Every bill. The specialists too. And the shops on the block — every window, every splinter, paid by Friday."',
      'Narrator: "He paid — thousands. Aftermath, itemized: the glazier\'s invoice as public relations. It worked, which is the part worth studying."',
      '[SCENE cap_record]',
    ], { heat: { target: 55, scale: 40 }, prestige: { target: 45, scale: 50 } }),

  xw('capr_adonis', 'The Record: The Adonis Social Club', null,
    [xsign('capr_adonis', 'BROOKLYN — DECEMBER 26, 1925'), ...xone('capr_adonis', 'ness')],
    [
      'Narrator: "Brooklyn, the night after Christmas, 1925. Capone is back east, visiting. At the Adonis Social Club the lights go out during a party, and when they come back on the White Hand gang is short its leadership — Peg-Leg Lonergan among the dead."',
      'Ness: "Capone was in the room. Arrested, questioned, released. No witness in the borough could recall a single thing about the loudest event of their year."',
      'Narrator: "No charges, ever. File it as the East Coast rehearsal: the lights, the silence after, the code holding. Chicago would get the finished performance."',
      '[SCENE cap_record]',
    ], { repression: { target: 50, scale: 40 }, heat: { target: 45, scale: 50 } }),

  xw('capr_frank_1', 'The Record: Frank Capone — I', dropCicero,
    [xsign('capr_frank_1', 'CICERO — APRIL 1, 1924'), ...xtwo('capr_frank_1', 'capone', 'torrio')],
    [
      'Narrator: "Election day, Cicero, late afternoon. A squad of Chicago police in plain clothes — sent into a town not their jurisdiction, in unmarked cars, with shotguns — meets Frank Capone near a polling place on 22nd Street."',
      'Narrator: "The police say he drew. The volley is not in dispute. Frank Capone — the Outfit\'s smooth front man, the brother with the banker\'s manners — dies on the street at 29."',
      'Capone (Pointing/Angry): "Plainclothes. No badges showing. You tell me what that is, if a man like us does it."',
      '[SCENE capr_frank_2]',
    ], { heat: { target: 35, scale: 40 }, respect: { target: 50, scale: 40 } }),
  xw('capr_frank_2', 'The Record: Frank Capone — II', dropCicero,
    xtwo('capr_frank_2', 'capone', 'torrio'),
    [
      'Narrator: "The funeral: a silver-plated casket, twenty thousand dollars in flowers, and Cicero\'s saloons dark for two hours by order. The coroner\'s jury found the police acted in the line of duty. No officer was charged."',
      'Torrio (Lean/Tired): "Mark the exchange rate, Al. One election, one brother. The books say Cicero was cheap. The books lie by omission."',
      'Narrator: "Al buried the gentle brother and kept the town. Which was the bargain — and no one who made it ever said the price out loud again."',
      '[SCENE cap_record]',
    ]),

  xw('capr_plea', 'The Record: The Plea Wilkerson Threw Out', dropCourt,
    [xsign('capr_plea', 'SUMMER 1931 — THE BARGAIN'), ...xtwo('capr_plea', 'capone', 'wilson')],
    [
      'Narrator: "June 1931. The deal is done and the papers know it: Capone will plead guilty, serve about two and a half years, and the government will be spared a trial it might lose. He hands out smiles on the courthouse steps."',
      'Narrator: "July 30. Judge James Wilkerson, from the bench: the court will make no bargain with a defendant. The parties may have an understanding. The court has none."',
      'Capone (Sit/Confused): "They shook on it. In this town a handshake IS the paper."',
      'Wilson: "That\'s the town, Mr. Capone. This is a courtroom that doesn\'t eat in it."',
      'Narrator: "The plea came back out; the trial went forward; the jury got swapped; the counts ran their course. The last fix he ever bought was the one that never existed."',
      '[SCENE cap_record]',
    ], { evidence: { target: 85, scale: 40 }, heat: { target: 55, scale: 50 } }),

  xw('capr_raids_1', 'The Record: The Brewery Raids — I', null,
    [xsign('capr_raids_1', 'SOUTH WABASH — 5 A.M.'), ...xone('capr_raids_1', 'ness')],
    [
      'Narrator: "1930. A ten-ton flatbed with a steel ram idles in the dark outside a warehouse full of beer. Behind the wheel, a federal agent twenty-seven years old, named Eliot Ness."',
      'Ness: "Through the doors at five sharp. Nineteen trucks, forty-five thousand gallons, seized before the coffee was cold. We photographed everything and smiled for nobody."',
      'Narrator: "Raid after raid, brewery after brewery — the Outfit\'s cash flow cut by an axe blade wearing a badge."',
      '[SCENE capr_raids_2]',
    ], { regulation: { target: 25, scale: 40 }, evidence: { target: 60, scale: 50 } }),
  xw('capr_raids_2', 'The Record: The Brewery Raids — II', null,
    xone('capr_raids_2', 'ness'),
    [
      'Ness: "They tried money — an envelope on the car seat, two thousand a week, per man. My men handed it back with the window open, driving. A reporter heard. UNTOUCHABLES."',
      'Ness: "You want the honest ledger? We never convicted him of a count that stuck to the sentence. What we took was the money that fed the fixes — and we made honesty look employable, in a town that had forgotten the look of it."',
      'Narrator: "Legend inflated the squad later; the movies inflated the legend. The gallons were real. So was the returned envelope — which, in 1930 Chicago, is the more improbable object."',
      '[SCENE cap_record]',
    ]),

  xw('capr_mcgurn', 'The Record: McGurn — an Aftermath', null,
    [xsign('capr_mcgurn', 'MILWAUKEE AVENUE — FEBRUARY 1936'), ...xone('capr_mcgurn', 'press', 2.6)],
    [
      'Narrator: "February 1936, a second-floor bowling alley on Milwaukee Avenue, minutes past midnight — seven years, almost to the hour, after Clark Street. Machine Gun Jack McGurn, the massacre\'s suspected stage manager, bowls his last frame."',
      'Narrator: "Aftermath only, as always in this telling: the pins standing, the alley gone quiet, and beside him a nickel comic valentine — a joke card about hard times, left by men who wanted the date noticed."',
      'The Press: "Nobody charged, of course. The story wrote its own headline: the massacre reaching forward through seven years to collect its author. Filed under: the street keeps score."',
      '[SCENE cap_record]',
    ], { repression: { target: 65, scale: 40 }, heat: { target: 50, scale: 60 } }),

  xw('capr_repeal_1', 'The Record: Repeal — I', null,
    [xsign('capr_repeal_1', 'DECEMBER 5, 1933 — 5:32 P.M.'),
      spr('capr_repeal_1_a', 'newsboy', 32, 66, 1.8), spr('capr_repeal_1_b', 'workman', 70, 62)],
    [
      'Narrator: "December 5, 1933. Utah ratifies, the wire flashes, and at 5:32 Eastern the Twenty-first Amendment repeals the Eighteenth. Prohibition ends the way it began — with a signature."',
      'Newsboy: "Extra! PROHIBITION DEAD! Legal liquor by Christmas! ...Extra?"',
      'Narrator: "He\'s calling it down a street where the speakeasy door already hangs open. Nobody inside but chairs on tables. The password was the product; the product is legal; the door is just a door."',
      '[SCENE capr_repeal_2]',
    ], { greed: { target: 40, scale: 50 }, prestige: { target: 35, scale: 50 } }),
  xw('capr_repeal_2', 'The Record: Repeal — II', null,
    [spr('capr_repeal_2_a', 'newsboy', 32, 66, 1.8), spr('capr_repeal_2_b', 'workman', 70, 62)],
    [
      'Workman: "Fourteen years they charged us triple for the privilege of a locked door. Now the tavern on the corner sells it with a license in the window — taxed, and boring."',
      'Narrator: "The black market that grossed the Outfit a hundred and five million dollars in a year drained like a tub. The empire\'s founding commodity became a line at the grocery."',
      'Narrator: "The Outfit shrugged and moved deeper into the rackets that never needed Prohibition — the unions, the wire, the rent. The lesson, one last time: outlaw a thirst and you print money for gunmen. Legalize it, and the gunmen go back to collecting rent. The rent was always the business."',
      '[SCENE cap_record]',
    ]),
];

scenes.push(...EXPANSION);
console.log(`Expansion: ${EXPANSION.length} scenes (3 hubs, 28 duet beats, 20 aftermath beats, 12 record exhibits).`);

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
    line: 'This is Chicago, 1929, as an engine. The Outfit is the rent siphon; the breadline is the margin; the envelopes are the regulation valve, stuck open. Greed is set where Capone set it. Pull the one lever the era never pulled — and listen: the Voices of Chicago will cut in when the needles swing.',
  },
}));

const game = {
  info: {
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
