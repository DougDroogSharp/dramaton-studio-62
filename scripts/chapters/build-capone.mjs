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

const actor = (id, name, ...rel) => {
  const img = rel.length ? art(...rel) : null;
  return {
    id,
    name,
    graphics: img
      ? [{ id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image: img }]
      : [],
    status: 'work',
  };
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
  actor('capone', 'Capone', 'capone_boss.png'),
  actor('wilson', 'Wilson', 'capone_wilson.png'),
  actor('torrio', 'Torrio', 'capone', 'capone_torrio.png'),
  actor('ness', 'Ness', 'capone', 'capone_ness.png'),
  actor('workman', 'Workman', 'capone', 'capone_breadline.png'),
  actor('newsboy', 'Newsboy', 'capone', 'capone_newsboy.png'),
  actor('narrator', 'Narrator'),
];

const dropLexington = drop('capone_lexington', 'Lexington Hotel Suite', 'capone', 'capone_lexington.png');
const dropSoup = drop('capone_soupkitchen', 'Capone Free Soup Kitchen', 'capone', 'capone_soupkitchen.png');
const dropGarage = drop('capone_garage', 'Clark Street Garage', 'capone_garage.png');

// ---------------------------------------------------------------- scenes

const scenes = [
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
      'Narrator: "Chicago, 1928. The Lexington Hotel, fourth floor. The Outfit grossed $105 million last year — Guinness will record it as the highest income a private citizen ever took in. The racket is rent, and the rent is due."',
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
      'Torrio: "Al. In \'26 they drove past the Hawthorne and put a thousand rounds through your windows. I know what settling means. I retired the day it nearly settled me."',
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
      '[GAUGE prestige at 8,20 min=0 max=100 label="PRESTIGE"]',
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
      'Newsboy: "Extra! Extra! Capone feeds five thousand! Read it in the Tribune!"',
      'Workman: "Two years I built Pullman cars. Now the only man in Chicago with a job for my hands is the one the police can\'t touch. You want me to refuse the soup?"',
      'Capone: "I\'m a businessman. I\'ve made my money supplying a popular demand. If I break the law, my customers are as guilty as I am."',
      'Narrator: "An associate told a Chicago paper: he couldn\'t stand to see those poor devils starving, so the big boy decided to do it himself. The Tribune printed the meal count. Nobody printed what the soup was laundering."',
      'Workman: "The wall on Clark Street is still standing, mister. A bowl of soup don\'t wash brick."',
      'Narrator: "Watch the gauge. Charity is cheap when the till is rent. But downtown, in a federal office, a quieter arithmetic is running the other way."',
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
      'Wilson: "A seized ledger from the Hawthorne Smoke Shop. Net profits, initialed. Cashier\'s checks endorsed by his men. He never opened a bank account in his life — and it doesn\'t matter. A net worth is a confession written in arithmetic."',
      'Ness: "My squad\'s been taking his breweries apart all year. Every still we axe cuts the cash flow. But raids make headlines, Frank. Your ledgers make a sentence."',
      'Wilson: "The man spends a quarter million a year — suits, hotels, Miami. Spending is income made visible. Watch the stack grow. He fell for the one law that doesn\'t care whose bread the policeman eats."',
      'Narrator: "The Secret Six bankroll the investigation. The Tribune that printed his meal counts now prints his indictment: T-MEN TRACE THE MONEY. The ledger closes in."',
      '[SCENE cap_verdict]',
    ),
    status: 'work',
  },

  // 5 — THE VERDICT: October 17, 1931.
  {
    id: 'cap_verdict',
    name: 'The Verdict — October 17, 1931',
    sceneType: 'WITNESS',
    dropId: null,
    stage: [
      balloon('verdict_card', 'UNITED STATES v. ALPHONSE CAPONE', 50, 22, { zIndex: 3 }),
      spr('st_capone6', 'capone', 34, 63),
      spr('st_wilson2', 'wilson', 70, 63),
    ],
    script: lines(
      '[EFFECT gold_glow on verdict_card]',
      'Narrator: "Federal court, Chicago. Capone\'s men had bought the jury list — so on the first morning Judge Wilkerson swapped his entire panel with another courtroom\'s. The fix died in its chair."',
      'Wilson: "No tommy gun in evidence. No witness to any wall. Just returns never filed, and a net worth no honest income explains."',
      'Capone: "Some call it bootlegging. Some call it racketeering. I called it a business. Prohibition made nothing but trouble."',
      'Narrator: "October 17, 1931. Guilty on the tax counts. Eleven years, and a $50,000 fine — the man who grossed $105 million in a single year, felled not by bullets but by accounting."',
      'Narrator: "Atlanta, then Alcatraz. Released in 1939 with his health destroyed, dead in 1947. In 1933 repeal drained the black market that fed the racket; the precedent that criminal income is taxable outlived them all."',
      'Wilson: "Rent leaves receipts. It always leaves receipts."',
      '[CHOICE]',
      '- "Return to the Lexington — run it again" -> cap_lexington',
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
    worldState: { prestige: 35, evidence: 0, newsIdx: 0, rent: 0, repression: 20, regulation: 30 },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'cap_lexington',
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
      description: 'Capone chapter of Humans vs Billionaires: the racket as rent, the soup kitchen as prestige, the ledger as the end.',
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
