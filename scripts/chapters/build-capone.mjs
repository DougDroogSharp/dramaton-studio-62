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
import { lines, balloon, actorEl, SFX } from '../machine-core.mjs';

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

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB — King of Chicago',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { prestige: 35, evidence: 0, newsIdx: 0, rent: 0, repression: 20, regulation: 30, heat: 20, respect: 40, hawthorne: 0, juryBribe: 0 },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'cap_cicero',
    enableAutosave: true,
  },
  actors,
  scenes,
  drops,
  items: [],
  sfx: SFX,
  buttons: [],
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
