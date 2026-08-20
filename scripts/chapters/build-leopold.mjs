// Builds public/hvb-leopold.json — the KING LEOPOLD / CONGO FREE STATE
// (1885-1908) chapter of Humans vs Billionaires, sourced from
// docs/HVB_RESEARCH.md Chapter 2. 1900s documentary-photograph style.
//
// Run: node scripts/chapters/gen-leopold.mjs   (art, if missing)
//      node scripts/chapters/build-leopold.mjs
// Play: http://localhost:8080/theater?game=/hvb-leopold.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, balloon, machineHubScene, WORLD_BASE,
  ACTORS as CORE_ACTORS, SFX as CORE_SFX,
} from '../machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

// Robust art loader: returns a data URI or null if the file is missing.
const art = (...segs) => {
  const p = resolve(root, 'art-demo', ...segs);
  if (!existsSync(p)) {
    console.warn(`  ! missing art: ${segs.join('/')} (skipping)`);
    return null;
  }
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
};

// ---------------------------------------------------------------- assets

const ART = {
  station: art('leopold_station.png'),          // existing backdrop
  king: art('leopold_king.png'),                // existing keyed sprite
  casement: art('leopold_casement.png'),        // existing keyed sprite
  palace: art('leopold', 'leopold_palace.png'),
  village: art('leopold', 'leopold_village.png'),
  morel: art('leopold', 'leopold_morel.png'),
  harris: art('leopold', 'leopold_harris.png'),
  officer: art('leopold', 'leopold_officer.png'),
  sheppard: art('leopold', 'leopold_sheppard.png'),
  kodak: art('leopold', 'leopold_kodak.png'),
  docks: art('leopold', 'leopold_docks.png'),
  lecture: art('leopold', 'leopold_lecture.png'),
  community: art('leopold', 'leopold_community.png'),
  movement: art('leopold', 'leopold_movement.png'),
  // Mid-scene pose variants (reference-consistent with the base sprites).
  kingSit: art('leopold', 'leopold_king_sit.png'),
  kingPoint: art('leopold', 'leopold_king_point.png'),
  casementCloseup: art('leopold', 'leopold_casement_closeup.png'),
  morelPoint: art('leopold', 'leopold_morel_point.png'),
  harrisCrouch: art('leopold', 'leopold_harris_crouch.png'),
};

// actor(id, name, baseImage, [[pose, expression, image], ...])
// Variant graphics whose art failed to generate are silently dropped, and
// the matching [POSE] lines are dropped with them (see hasPose / poseLine).
const actor = (id, name, image, variants = []) =>
  image && {
    id,
    name,
    graphics: [
      { id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image },
      ...variants
        .filter(([, , img]) => img)
        .map(([pose, expression, img], i) => ({
          id: `${id}_g${i + 1}`, pose, expression, angle: 0, image: img,
        })),
    ],
    status: 'work',
  };

// Emit a [POSE] line only when the actor really has that graphics triple.
const poseLine = (actorId, pose, expression, img) =>
  img ? `[POSE ${actorId} pose=${pose} expression=${expression}]` : [];
const neutral = (actorId) => `[POSE ${actorId} pose=Neutral expression=Neutral]`;

const drop = (id, name, image) => (image ? { id, name, image, status: 'work' } : null);

// Stage element, silently dropped if its actor's art is missing.
const el = (id, assetId, x, y, scale = 2.4) =>
  ART[KEY_OF[assetId]]
    ? {
        id, assetId, type: 'ACTOR', x, y, scale, zIndex: 3, rotation: 0,
        pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
      }
    : null;

const KEY_OF = {
  leopold: 'king', casement: 'casement', morel: 'morel', harris: 'harris',
  officer: 'officer', sheppard: 'sheppard', kodak: 'kodak',
  community: 'community', movement: 'movement',
};

const stage = (...els) => els.filter(Boolean);

// ---- the three-door rule -------------------------------------------------
// House rule: no [CHOICE] shows more than three doors. Long menus fan out
// into small grouping scenes — each a beat of framing, then its own three.
// Nothing is removed; the long lists simply live one door deeper.
const MENU_MAX = 3;
const choice = (opts) => ['[CHOICE]', ...opts.filter(Boolean), '[/CHOICE]'];
const fanScene = (id, name, dropKey, stageEls, framing, doors) => {
  if (doors.length > MENU_MAX) throw new Error(`${id}: ${doors.length} doors (max ${MENU_MAX})`);
  return {
    id, name, sceneType: 'WITNESS',
    dropId: dropFor(dropKey),
    stage: stageEls,
    script: lines(...framing, ...choice(doors)),
    status: 'work',
  };
};

// ------------------------------------------------- Voices of the Congo
// A data-driven reaction layer: ten documented moments x the people who
// ran, endured, exposed, and ended the system — ~100 short documentary
// vignettes. Register throughout: testimony, absence, aftermath. No
// depicted violence; disputed figures stay framed as disputed.
//
// Navigation: lp_palace -> lp_voices (hub) -> evc_<event> (responder
// chooser) -> vgl_<event>_<responder> (vignette) -> back.
// Every vignette carries narraton metadata in pool 'leopold_reactions',
// keyed to the worldState the event corresponds to.

const RESP = {
  leopold:   { label: 'King Leopold',        drop: 'palace' },
  casement:  { label: 'Consul Casement',     drop: 'station' },
  morel:     { label: 'E.D. Morel',          drop: 'docks' },
  harris:    { label: 'Alice Seeley Harris', drop: 'village' },
  sheppard:  { label: 'William Sheppard',    drop: 'station' },
  officer:   { label: 'The Officer',         drop: 'station' },
  community: { label: 'The Community',       drop: 'village' },
  movement:  { label: 'The Movement',        drop: 'lecture' },
};

const dropFor = (key) => (ART[key] ? `${key}_drop` : (ART.station ? 'station_drop' : null));

const EVENTS = [
  {
    id: 'berlin', title: 'The Berlin Award, 1885', drop: 'palace',
    keys: { concealment: { target: 0, scale: 8 } },
    blurb: 'February 1885. The Berlin Conference recognizes Leopold\'s International African Association as sovereign over the Congo basin — a million square miles granted to one man as a work of charity. No Congolese delegate is present.',
  },
  {
    id: 'treaties', title: 'The Treaty Signings, 1879-1884', drop: 'station',
    keys: { concealment: { target: 1, scale: 8 } },
    blurb: 'Stanley\'s expeditions gather more than four hundred treaties along the river: chiefs marking papers written in a language they cannot read, ceding land and labor for cloth and trinkets.',
  },
  {
    id: 'quotas', title: 'The First Quotas', drop: 'station',
    keys: { quotaDoubled: { target: 1, scale: 1 } },
    blurb: 'The concession companies — ABIR, the Anversoise — set each village a wild-rubber quota, enforced by armed sentries. In districts such as Bongandanga the figure is roughly three kilograms of dried rubber per man per fortnight, verified by basket at the weighing shed. Wild rubber does not farm; it must be bled from vines deeper and deeper in the forest, and meeting the figure means abandoning the fields.',
  },
  {
    id: 'bullets', title: 'The Bullet Accounting', drop: 'station',
    keys: { concealment: { target: 3, scale: 8 } },
    blurb: 'Force Publique officers must account for every cartridge issued, and the proof demanded of soldiers is not paper. The rule turns ammunition audits into mutilation — documented later, station by station, in the Casement Report.',
  },
  {
    id: 'hostages', title: 'The Hostage-Taking', drop: 'station',
    keys: { hostages: { target: 1, scale: 1 } },
    blurb: 'Stations hold women and children as surety until a village\'s men deliver rubber; later the agents imprison the chiefs themselves — one post records 44 chiefs held in July 1902. The practice is entered in company ledgers — which is how it will one day be proved.',
  },
  {
    id: 'docks', title: 'Morel\'s Dock Discovery, c. 1900', drop: 'docks',
    keys: { exposure: { target: 1, scale: 8 } },
    blurb: 'A Liverpool shipping clerk checks the Elder Dempster manifests: rubber and ivory in; guns, chains and cartridges out. Nothing to pay a workforce with. The trade is not trade.',
  },
  {
    id: 'photographs', title: 'The Harris Photographs, 1904', drop: 'village',
    keys: { rumor: { target: 8, scale: 16 } },
    blurb: 'Alice Seeley Harris levels a box Kodak in the ABIR districts. Her photographs — among them Nsala of Wala, seated before what the militia left of his daughter Boali — become the lantern slides of the reform campaign.',
  },
  {
    id: 'report', title: 'The Casement Report, 1904', drop: 'palace',
    keys: { testimony: { target: 1, scale: 1 }, exposure: { target: 3, scale: 8 } },
    blurb: 'February 1904. The British consul\'s report to Parliament: forty pages of findings and twenty of sworn testimony, names redacted to initials. The Foreign Office hedges; the facts hold.',
  },
  {
    id: 'pamphlet', title: 'The Twain Pamphlet, 1905', drop: 'lecture',
    keys: { celebrities: { target: 1, scale: 1 } },
    blurb: 'Mark Twain publishes King Leopold\'s Soliloquy — the King defending himself in his own voice and damning himself in every line. It sells in the tens of thousands, proceeds to the reform cause.',
  },
  {
    id: 'annexation', title: 'The Annexation, 1908', drop: 'palace',
    keys: { exposure: { target: 6, scale: 8 } },
    blurb: 'Under sustained pressure, Belgium takes the Congo from its King. His personal rule ends; extraction continues under the Belgian flag. In 1909 the funeral crowds boo him; in 1913 the reform association dissolves, its work done.',
  },
];

// Each entry: r = responder id, s = optional stance label, l = 2-3 short
// lines of first-pass dialogue (documentary register, in-character).
const VOICES = {
  berlin: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold (Sit/Smug): "The powers have entrusted me with a sacred task: to open the Congo to civilization and close it to the slave trade."`,
      `Leopold: "I ask nothing for myself. Belgium is small; my heart, I confess, is large."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold: "A million square miles, and not one power asked what it costs to run. It will pay for itself. It must."`,
      `Leopold (Sit/Smug): "They signed away a continent to keep it from each other. Vanity is a lever, gentlemen. I only pulled it."`,
    ]},
    { r: 'casement', l: [
      `Casement: "I read the Berlin Act as a young man. Free trade, protection of the natives — clause after clause."`,
      `Casement: "Years later I walked the territory it created. I never saw the Act in operation. Only its opposite, well organized."`,
    ]},
    { r: 'morel', l: [
      `Morel: "Berlin promised free trade on the Congo. Note the word. Trade means goods move both ways."`,
      `Morel: "Hold that promise against a shipping manifest and it comes apart in your hands. That is all I ever did."`,
    ]},
    { r: 'harris', l: [
      `Harris: "A conference hall in Berlin. Maps on the table, not photographs."`,
      `Harris: "No one at that table had seen the river. I would spend years showing them what they signed."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "The year Berlin met, I was studying for the ministry. I reached the Congo five years later."`,
      `Sheppard: "The charity they chartered — I looked for it in the Kasai. I found the company instead."`,
    ]},
    { r: 'officer', l: [
      `Officer: "The Act is read to us at induction. Suppression of the slave trade; uplift of the native."`,
      `Officer: "Then we are handed the quota book. The two documents are never in the same drawer."`,
    ]},
    { r: 'community', l: [
      `The Community: "No one from the river stood in that hall. Our names were not asked."`,
      `The Community: "We learned of Berlin the way you learn of weather — when it arrives."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "In 1885 the whole reforming world applauded him. Philanthropy, they printed."`,
      `The Movement: "Our movement began the day someone checked the applause against the cargo lists."`,
    ]},
  ],

  treaties: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "Every station was acquired lawfully. The chiefs made their marks freely; the documents are on file in Brussels."`,
      `Leopold (Sit/Smug): "Four hundred treaties. Show me another empire with such tidy paperwork."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold: "Stanley understands his instructions: the treaties must grant everything, and the price must be nothing."`,
      `Leopold: "Do not send lawyers up the river. Send cloth."`,
    ]},
    { r: 'casement', l: [
      `Casement: "I have examined the treaty texts. Sovereignty, land and labor, ceded for cloth, in a script the signers could not read."`,
      `Casement: "In consular law we have a word for a contract like that. It is not treaty."`,
    ]},
    { r: 'morel', l: [
      `Morel: "A treaty is a bargain between parties who understand it. These are receipts, signed by the losers, for a taking."`,
      `Morel: "File them beside the manifests. Paper convicts paper."`,
    ]},
    { r: 'harris', l: [
      `Harris: "I photographed a chief once who kept his copy of the paper, folded small, in a tin."`,
      `Harris: "He could not read it. He kept it because he understood, too late, that the paper was the weapon."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "The elders in the Kasai told me how the marks were made. A gift of cloth, a flag, a hand guided on the page."`,
      `Sheppard: "They were not fooled men. They were ambushed in a language."`,
    ]},
    { r: 'officer', l: [
      `Officer: "Bula Matari, they called Stanley — breaker of rocks. The treaties came up the river before we did."`,
      `Officer: "When a village disputes the paper, we do not argue the clause. We are the clause."`,
    ]},
    { r: 'community', l: [
      `The Community: "Our fathers touched the pen because the visitors were armed and the cloth was offered as between equals."`,
      `The Community: "We know what a bargain is. That was not one. We have said so from the first day."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "Four hundred treaties, and not one read aloud in the signers' own tongue. We printed a facsimile in the pamphlets."`,
      `The Movement: "Let the public read the clause that took a country. It fits on one line."`,
    ]},
  ],

  quotas: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "The natives are paid for their harvest. Labor is the great teacher; idleness the old tyrant of Africa."`,
      `Leopold: "The returns you read of are commerce, nothing more."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold (Sit/Smug): "ABIR sells in Europe at ten francs the kilogram what costs it one franc thirty-five to collect. Do not tell me the system fails."`,
      `Leopold: "Raise the quota where the returns fall. The forest is large."`,
    ]},
    { r: 'casement', l: [
      `Casement: "I recorded the arithmetic of one district: two hundred forty persons, a ton of foodstuffs weekly, fifteen shillings tenpence returned."`,
      `Casement: "That is not a wage. It is a tribute, with a cash alibi."`,
    ]},
    { r: 'morel', l: [
      `Morel: "The company calls it purchase. The ledgers show the price: near nothing, and the sentries thrown in."`,
      `Morel: "A trade where one side cannot refuse is not trade. It is the quota, wearing a shop apron."`,
    ]},
    { r: 'harris', l: [
      `Harris: "You can photograph a quota. It looks like a village with no one in the fields at midday."`,
      `Harris: "Everyone who can walk is in the forest, bleeding vines."`,
    ]},
    { r: 'sheppard', s: 'what he saw', l: [
      `Sheppard: "In the Kasai I counted the gardens gone to weeds. The people had no time to farm; the vine came first."`,
      `Sheppard: "Hunger is in the quota the way the harvest is — built in."`,
    ]},
    { r: 'sheppard', s: 'what he wrote down', l: [
      `Sheppard: "I kept a notebook: names and villages, dates and amounts. Not impressions — entries."`,
      `Sheppard: "Years on, when the company sued me for saying so in print, the notebook answered. The court believed the entries."`,
    ]},
    { r: 'officer', l: [
      `Officer: "The quota is set in Brussels, enforced here, and blamed on the forest when it fails."`,
      `Officer: "My instructions are one page. What the sentries do with them, no page records."`,
    ]},
    { r: 'community', s: 'enduring', l: [
      `The Community: "We tap the vines two days' walk out now. The near forest is bled white."`,
      `The Community: "We carry the baskets in, we are weighed, we are told the number again. We keep our children close, and we endure."`,
    ]},
    { r: 'community', s: 'resisting', l: [
      `The Community: "Some of us have stopped. We cut the vines ourselves, so there is nothing left to demand."`,
      `The Community: "Some have crossed the river to the French side. The forest that hides rubber can hide people."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "Red Rubber, Morel titled it. Every ton priced in something no market lists."`,
      `The Movement: "We read the dividend tables aloud at meetings, next to the testimony. The two columns explain each other."`,
    ]},
  ],

  bullets: [
    { r: 'leopold', s: 'in private', l: [
      `Leopold: "I issued no such rule. I issue budgets. What a budget becomes, nine hundred miles up a river, is administration, not policy."`,
      `Leopold (Pointing/Angry): "And I will thank Europe not to lecture me on economies it taught me."`,
    ]},
    { r: 'casement', l: [
      `Casement (Closeup/Determined): "I verified the practice at more stations than I could bear to count. Cartridge issued, proof required, entry made."`,
      `Casement: "I wrote it without adjectives. The practice supplies its own."`,
    ]},
    { r: 'morel', l: [
      `Morel: "An audit rule. That is what chills me — not rage, procedure."`,
      `Morel: "Somewhere a clerk designed it, and the design worked, year after year."`,
    ]},
    { r: 'harris', l: [
      `Harris: "There are photographs from these districts I will not describe here. The world has seen them."`,
      `Harris: "We photographed what the rule left behind, never the rule at work. The aftermath was proof enough."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "I was made to count once, at a post in the Kasai. I wrote the number in my notebook and the officer signed it, proud of his accounting."`,
      `Sheppard: "I have carried that page ever since. It weighs more than the book."`,
    ]},
    { r: 'officer', s: 'obedient', l: [
      `Officer: "The colonel's rule is simple: a cartridge is money, and money is accounted. The men bring their proofs to the sergeant."`,
      `Officer: "I record the tally and forward it. That is the whole of my instruction, and I follow it."`,
    ]},
    { r: 'officer', s: 'uneasy', l: [
      `Officer: "I asked once to see the regulation in writing. There is no regulation — only the audit, and what passes it."`,
      `Officer: "I have requested a transfer to the railway. I do not say why in the letter."`,
    ]},
    { r: 'community', s: 'enduring', l: [
      `The Community: "What the rule asked of the soldiers, our villages know. We buried what was returned to us, and we said the names."`,
      `The Community: "We are asked to prove nothing. We remember everything."`,
    ]},
    { r: 'community', s: 'resisting', l: [
      `The Community: "Some of the soldiers were our own sons, conscripted. At Luluabourg they turned their rifles around."`,
      `The Community: "The Batetela fought the Free State for years. The first army the regime feared was the one it had armed."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "When we first printed the accounting rule, editors refused it as unbelievable."`,
      `The Movement: "So we stopped asserting and started quoting: the Report, page and line. Disbelief is no defense against a page number."`,
    ]},
  ],

  hostages: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "Detention? A brief guardianship, humanely conducted, to encourage the men to their work."`,
      `Leopold: "You will find no order of mine commanding cruelty."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold: "Surety works where wages fail. A man will not walk two days into the forest for cloth. He will for his family."`,
      `Leopold (Sit/Smug): "Keep the word surety in the books. Words are also administration."`,
    ]},
    { r: 'casement', l: [
      `Casement: "At one station I copied the surety ledger myself: names, dates of seizure, the rubber owed against each."`,
      `Casement: "The clerk was helpful. He believed he was showing me good order."`,
    ]},
    { r: 'morel', l: [
      `Morel: "They booked human beings like goods in bond. And bonds, gentlemen, generate paper."`,
      `Morel: "I have never needed to imagine anything. The system confessed in its own hand."`,
    ]},
    { r: 'harris', l: [
      `Harris: "I photographed the shed where they were held — after. Empty, swept, a bar across the door."`,
      `Harris: "An empty room can testify. You only have to print it."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "The women came back to a village with no harvest in it, and began again the same day."`,
      `Sheppard: "I recorded their names. Not victims — householders, mothers, farmers. The ledger never asked their names. I did."`,
    ]},
    { r: 'officer', l: [
      `Officer: "Surety is the cleanest tool we have. No shots, no marks, entries in and entries out."`,
      `Officer: "I used to believe that sentence. I typed it often enough."`,
    ]},
    { r: 'community', s: 'enduring', l: [
      `The Community: "They took the mothers to the station and named it surety. We carried rubber to buy back our own."`,
      `The Community: "We counted the days aloud, so the children would know that counting was not the enemy."`,
    ]},
    { r: 'community', s: 'resisting', l: [
      `The Community: "After the second seizure our village did not deliver. We moved, whole, in one night — pots, goats, seed."`,
      `The Community: "Let the station hold an empty district in surety."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "Hostage is the word we used on the posters, because it was the true one."`,
      `The Movement: "Their ledgers said surety. We printed both words side by side and let the audience choose."`,
    ]},
  ],

  docks: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "I am told a Liverpool clerk studies my cargoes. Let him. Publish the tonnage of souls saved from the slavers; publish anything."`,
      `Leopold: "Commerce has always had its sour spectators."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold (Pointing/Angry): "Find out who pays him. No one? You are certain?"`,
      `Leopold: "A man who cannot be bought is a problem of an entirely different order."`,
    ]},
    { r: 'casement', l: [
      `Casement: "Morel found in a ledger what I found on the river. We had never met, and our evidence agreed to the shilling."`,
      `Casement: "That agreement is what a fact looks like."`,
    ]},
    { r: 'morel', s: 'the discovery', l: [
      `Morel (Pointing/Surprised): "There — outbound: guns, cartridges, chains. No cloth, no trade goods, no payment."`,
      `Morel: "Nothing is being bought. Everything is being taken. The manifest says so in its own dull voice."`,
    ]},
    { r: 'morel', s: 'the resignation', l: [
      `Morel: "Elder Dempster offered me advancement to stop asking. I resigned instead."`,
      `Morel: "A salary is a small thing to set down next to what the columns were saying."`,
    ]},
    { r: 'harris', l: [
      `Harris: "I met him later — a clerk's mind and a preacher's fire, both at full steam."`,
      `Harris: "He had never seen the Congo. He did not need to. The Congo had been arriving at his dock for years."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "What I saw in the Kasai, Morel saw in Liverpool without leaving the quay."`,
      `Sheppard: "Witness is not only eyes. Sometimes it is arithmetic, done honestly."`,
    ]},
    { r: 'officer', l: [
      `Officer: "We load the outbound cargo he wrote about. I never thought of the manifest as a confession."`,
      `Officer: "Neither did Brussels. That was the mistake."`,
    ]},
    { r: 'community', l: [
      `The Community: "We saw the steamers too — riding low going out to sea, full of our forest; empty of anything for us coming back."`,
      `The Community: "A man across the ocean read the numbers and believed us. The numbers were ours before they were his."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "One clerk, one ledger, no army. Within four years, an association; within eight, questions in every parliament in Europe."`,
      `The Movement: "Write it on the banner: the truth requires an accountant."`,
    ]},
  ],

  photographs: [
    { r: 'leopold', l: [
      `Leopold: "Photographs can be staged; missionaries have imaginations, and darkroom chemicals."`,
      `Leopold: "But the crowds do not ask how a negative was made. That little box does me more harm than any consul."`,
    ]},
    { r: 'casement', l: [
      `Casement: "My report gave the facts a spine. Her slides gave them a face."`,
      `Casement: "Parliament reads forty pages. A hall reads a photograph in one second, and never afterward unreads it."`,
    ]},
    { r: 'morel', l: [
      `Morel: "I set her photographs into the pamphlets beside the tonnage tables."`,
      `Morel: "Numbers for the head, negatives for the heart. The campaign needed both."`,
    ]},
    { r: 'harris', s: 'behind the camera', l: [
      `Harris (Crouch/Determined): "Nsala sat on the mission veranda and asked, in effect, that the world be made to look. I steadied the camera and did the one thing I could."`,
      `Harris: "I have never called it my photograph. It is his testimony. I held the box."`,
    ]},
    { r: 'harris', s: 'in the lantern halls', l: [
      `Harris: "In the halls I say very little. I change the slide, and wait, and change the slide."`,
      `Harris: "Some nights the silence after a slide is the loudest sound I have ever heard."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "I knew the people in those photographs as neighbors, not emblems. Nsala was a man of Wala; his daughter was named Boali."`,
      `Sheppard: "Say the names. A photograph without the names is only sorrow. With them, it is evidence."`,
    ]},
    { r: 'officer', l: [
      `Officer: "There is an instruction now about cameras at the stations. It arrived years too late."`,
      `Officer: "You cannot confiscate a negative that has already crossed the ocean."`,
    ]},
    { r: 'community', s: 'those who sat', l: [
      `The Community: "The mothers and fathers who sat for her chose to sit. Understand that. It cost them more than the sitting."`,
      `The Community: "We gave our grief a face on purpose, so it could travel where we could not."`,
    ]},
    { r: 'community', s: 'the argument', l: [
      `The Community: "Some said: do not show them our dead; they have taken enough. Others said: the shame is not ours to carry."`,
      `The Community: "The second voice won. It was the harder gift, and we gave it."`,
    ]},
    { r: 'movement', l: [
      `The Movement: "Sixty slides, a lantern, a chapel hall — that was the whole armory."`,
      `The Movement: "Twain named the weapon from inside the King's own head: the Kodak, 'the most powerful enemy that has confronted us.'"`,
    ]},
  ],

  report: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "An honest inquiry would have consulted my administration. Mr. Casement consulted rumor at riverside missions."`,
      `Leopold: "My own Commission will examine the matter. My officials. My terms."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold (Sit/Smug): "Read it twice. He proves the system from our own ledgers. Europe forgives cruelty; the danger is the bookkeeping."`,
      `Leopold: "Burn nothing — that looks worse. Reinterpret."`,
    ]},
    { r: 'casement', s: 'the consul', l: [
      `Casement (Closeup/Determined): "I wrote it cold, on purpose. Dates, stations, statements signed or marked."`,
      `Casement: "Let no man say he was moved by my rhetoric. There is none. He is moved by what happened."`,
    ]},
    { r: 'casement', s: 'in private', l: [
      `Casement: "At night, after the interviews, I wrote a different set of pages no Parliament will see."`,
      `Casement: "A man can be a consul all day. The evening belongs to what he heard."`,
    ]},
    { r: 'morel', l: [
      `Morel: "The Report reached me like ammunition reaches a gun already aimed."`,
      `Morel: "Within a month we founded the Congo Reform Association in Liverpool. February wrote; March organized."`,
    ]},
    { r: 'harris', l: [
      `Harris: "The Foreign Office cut the names to initials. As if an E could not grieve; as if an M had no village."`,
      `Harris: "My slides gave the initials back their faces."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "He wrote what we missionaries had been saying for a decade — but under a consul's seal."`,
      `Sheppard: "The same words weigh differently under a crown. That is a bitter chemistry, and we used it."`,
    ]},
    { r: 'officer', l: [
      `Officer: "The consul was courteous at my station. He asked to see the books, and I showed him the books."`,
      `Officer: "I have thought about that afternoon every day since the Report was printed."`,
    ]},
    { r: 'community', l: [
      `The Community: "The twenty pages at the back — those are ours. Sworn, marked, spoken to his face across a table."`,
      `The Community: "They printed our words in London with the letters of our names removed. The words still stand. We know which are whose."`,
    ]},
    { r: 'movement', s: 'in the halls', l: [
      `The Movement: "A Blue Book is built to be shelved. We refused the shelf."`,
      `The Movement: "We read it aloud — at meetings, from pulpits, in every paper Morel could reach. A report becomes a movement when it is spoken."`,
    ]},
    { r: 'movement', s: 'in the streets', l: [
      `The Movement: "Handbills at the dock gates. Questions planted in the Commons. Resolutions from a hundred chapels."`,
      `The Movement: "The Foreign Office called it pressure. We called it the public, informed."`,
    ]},
  ],

  pamphlet: [
    { r: 'leopold', l: [
      `Leopold (Pointing/Angry): "An American humorist puts words in my mouth, and the world laughs at a king."`,
      `Leopold: "The worst of it is the accuracy. He has read everything my syndicate ever planted, and quotes it back with the bill attached."`,
    ]},
    { r: 'casement', l: [
      `Casement: "Satire can go where a consul cannot. I could report the King; Twain could inhabit him."`,
      `Casement: "Between us, the man has nowhere left to stand."`,
    ]},
    { r: 'morel', l: [
      `Morel: "He gave us the pamphlet outright — no royalty, the proceeds to the Association."`,
      `Morel: "The most valuable cargo I ever handled, and it weighed three ounces."`,
    ]},
    { r: 'harris', l: [
      `Harris: "Twain has the King call my camera 'the only witness I couldn't bribe.'"`,
      `Harris: "I read that line and looked at the box on my table. It had never seemed small. Now it never will."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "Twain, Conan Doyle — and Booker T. Washington, who spoke where I could not always be heard, and was heard."`,
      `Sheppard: "It mattered, I will say it plainly, that Black America stood in this fight by name."`,
    ]},
    { r: 'officer', l: [
      `Officer: "A copy reached the mess by steamer, third-hand, the cover gone."`,
      `Officer: "No one laughed twice. On the second reading you notice it is all true."`,
    ]},
    { r: 'community', l: [
      `The Community: "We are told a famous writer across the sea has made the King ridiculous."`,
      `The Community: "Good. But understand: he is not ridiculous here. Here he is the quota. Laugh — then finish the work."`,
    ]},
    { r: 'movement', s: 'in the halls', l: [
      `The Movement: "Tens of thousands of copies at a shilling, sold at the hall doors beside the slide programs."`,
      `The Movement: "Mockery finished what testimony began. No drawing room in Europe could praise the King now without someone smiling."`,
    ]},
    { r: 'movement', s: 'in the streets', l: [
      `The Movement: "The boys cried it outside the exchanges: the King's own soliloquy, one shilling."`,
      `The Movement: "Satire travels faster than a Blue Book, and it fits in a coat pocket."`,
    ]},
  ],

  annexation: [
    { r: 'leopold', s: 'in public', l: [
      `Leopold: "I give the Congo to Belgium as I always intended — a patriot's bequest, freely made."`,
      `Leopold: "History will thank me when the shouting tires."`,
    ]},
    { r: 'leopold', s: 'in private', l: [
      `Leopold: "The State archives burned for days before the transfer. I will give them my Congo; they have no right to know what I did there."`,
      `Leopold (Sit/Smug): "Let the new owners audit ashes."`,
    ]},
    { r: 'casement', l: [
      `Casement: "Annexation, not restitution. The same stations, the same companies, a different flag over the same forest."`,
      `Casement: "I note the improvement honestly, and refuse to call it justice."`,
    ]},
    { r: 'morel', l: [
      `Morel: "We forced the transfer; we could not force the accounting. Extraction continues, in better manners."`,
      `Morel: "In 1913 we dissolved the Association — work done. I have never been entirely sure of that adjective."`,
    ]},
    { r: 'harris', l: [
      `Harris: "I lectured for years after. The slides did not change; the audiences did — disbelief, then grief, then at last resolve."`,
      `Harris: "When the crowds booed the funeral in 1909, they were seeing the slides, I think. I put them there."`,
    ]},
    { r: 'sheppard', l: [
      `Sheppard: "In 1909 a Congo court tried me for libel over what I wrote of the Kasai companies. My notebook and I won."`,
      `Sheppard: "The King died months later. The system I described outlived him. Both facts belong in the record."`,
    ]},
    { r: 'officer', l: [
      `Officer: "We hauled down one flag and raised another over the same station. The ledgers did not change hands; they changed headings."`,
      `Officer: "I stayed on. I want that written down too."`,
    ]},
    { r: 'community', s: 'enduring', l: [
      `The Community: "The King is gone and the quota is not. The new officials speak of reform in the old warehouse."`,
      `The Community: "We plant our fields again anyway. That much we have taken back."`,
    ]},
    { r: 'community', s: 'counting the cost', l: [
      `The Community: "They argue in Europe over our dead — some say millions upon millions, some say fewer, and they are right that the counting is disputed."`,
      `The Community: "We do not count that way. We count the villages that sing again, and the ones that never will."`,
    ]},
    { r: 'movement', s: 'the reckoning', l: [
      `The Movement: "First campaign of its kind, they call us now: ledgers, lantern slides, testimony, and no army at all."`,
      `The Movement: "We dissolved in 1913 believing the work done. Watch the world, reader, and decide."`,
    ]},
    { r: 'movement', s: 'in the streets', l: [
      `The Movement: "When the funeral passed in Brussels, the crowd booed its own King. No association organized that."`,
      `The Movement: "That sound was the campaign's true dissolution — the public no longer needed telling."`,
    ]},
  ],
};

// ---- generate hub, choosers, vignettes ----

const voiceVignettes = [];
const voiceChoosers = [];

// Ten or eleven witnesses to a single moment will not fit through three
// doors. The chooser asks WHICH BENCH first — the Crown and its men, the
// people who went and looked, the river and the campaign — and each bench
// opens on its own short list. Where a bench runs long, it continues into
// a second page rather than dropping anyone.
const VGROUPS = [
  { key: 'crown', label: 'The Crown and its men', who: ['leopold', 'officer'],
    framing: ['Narrator: "First the men who owned it and the men who worked it. Neither has ever once been asked to see the other\'s ledger."'] },
  { key: 'witness', label: 'Those who went and looked', who: ['casement', 'harris', 'sheppard'],
    framing: ['Narrator: "A consul, a missionary with a box camera, a preacher from Virginia. Three people who went up the river and came back unable to be quiet."'] },
  { key: 'river', label: 'The river, and the campaign', who: ['community', 'morel', 'movement'],
    framing: ['Narrator: "The people it was done to, the clerk who read the manifests, and the movement that grew out of both. The record, from underneath."'] },
];

for (const ev of EVENTS) {
  const entries = VOICES[ev.id] || [];
  const seen = {};
  const doorsFor = {};
  for (const v of entries) {
    seen[v.r] = (seen[v.r] || 0) + 1;
    const id = `vgl_${ev.id}_${v.r}${seen[v.r] > 1 ? seen[v.r] : ''}`;
    const label = `${RESP[v.r].label}${v.s ? ` — ${v.s}` : ''}`;
    const g = VGROUPS.find((x) => x.who.includes(v.r));
    if (!g) throw new Error(`no voice group for responder ${v.r}`);
    (doorsFor[g.key] ||= []).push(`- "${label}" -> ${id}`);
    voiceVignettes.push({
      id,
      name: `${ev.title}: ${label}`,
      sceneType: 'WITNESS',
      dropId: dropFor(RESP[v.r].drop),
      stage: stage(el(`${id}_a`, v.r, 50, 60)),
      script: lines(
        ...v.l,
        '[CHOICE]',
        `- "Another voice on this moment" -> evc_${ev.id}`,
        '- "Back to the moments" -> lp_voices',
        '[/CHOICE]',
      ),
      narraton: { pool: 'leopold_reactions', keys: ev.keys, repeatable: true },
      status: 'work',
    });
  }
  voiceChoosers.push({
    id: `evc_${ev.id}`,
    name: ev.title,
    sceneType: 'WITNESS',
    dropId: dropFor(ev.drop),
    stage: [],
    script: lines(
      `Narrator: "${ev.blurb}"`,
      'Narrator: "Who speaks to this? Three benches. Everyone on all three still gets their say."',
      ...choice(VGROUPS.map((g) => `- "${g.label}" -> evcg_${ev.id}_${g.key}`)),
    ),
    status: 'work',
  });

  // One scene per bench — continued onto a second page when a bench runs
  // longer than the three-door rule allows.
  for (const g of VGROUPS) {
    const doors = doorsFor[g.key] || [];
    const tail = `- "Back to the moments" -> lp_voices`;
    const all = [...doors, tail];
    let i = 0;
    let page = 0;
    while (i < all.length) {
      const last = all.length - i <= MENU_MAX;
      const take = last ? all.length - i : MENU_MAX - 1;
      const id = page === 0 ? `evcg_${ev.id}_${g.key}` : `evcg_${ev.id}_${g.key}_${page + 1}`;
      voiceChoosers.push({
        id,
        name: `${ev.title} — ${g.label}${page ? ` (${page + 1})` : ''}`,
        sceneType: 'WITNESS',
        dropId: dropFor(ev.drop),
        stage: [],
        script: lines(
          ...(page === 0 ? g.framing : ['Narrator: "The bench is not finished."']),
          ...choice([
            ...all.slice(i, i + take),
            ...(last ? [] : [`- "Still more from this bench" -> evcg_${ev.id}_${g.key}_${page + 2}`]),
          ]),
        ),
        status: 'work',
      });
      i += take;
      page += 1;
    }
  }
}

const voicesHub = {
  id: 'lp_voices',
  name: 'Voices of the Congo',
  sceneType: 'WITNESS',
  dropId: dropFor('lecture'),
  stage: stage(el('lp_vo_comm', 'community', 26, 60), el('lp_vo_move', 'movement', 74, 60)),
  script: lines(
    'Narrator: "The record of the Congo Free State, 1885-1908, moment by moment. It runs in three movements: the taking, the system, the proof. Choose one, then choose who answers it — drawn from the testimony, ledgers, and campaign literature of the period."',
    '[CHOICE]',
    '- "The taking — 1879 to 1885" -> lpg_taking',
    '- "The system — quota, cartridge, hostage" -> lpg_system',
    '- "The proof — 1900 to 1908" -> lpg_proof',
    '[/CHOICE]',
  ),
  status: 'work',
};

// The three movements. Every one of the ten moments is still in here.
const evDoor = (id) => {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev) throw new Error(`unknown event ${id}`);
  return `- "${ev.title}" -> evc_${id}`;
};

const voiceGroups = [
  fanScene('lpg_taking', 'Voices — The Taking', 'palace',
    stage(el('lpg_taking_a', 'leopold', 50, 60)),
    ['Narrator: "Before there is rubber there is paper. Four hundred marks on documents nobody could read, and a conference table in Berlin with no Congolese seat at it."'],
    [evDoor('treaties'), evDoor('berlin'), '- "Return to Brussels" -> lp_palace']),

  fanScene('lpg_system', 'Voices — The System', 'station',
    stage(el('lpg_system_a', 'officer', 50, 60)),
    ['Narrator: "Then the machinery: a weight of rubber per man per fortnight, a cartridge that must be accounted for, and a shed to hold a man\'s family in while he goes and finds the vines."'],
    [evDoor('quotas'), evDoor('bullets'), evDoor('hostages')]),

  fanScene('lpg_proof', 'Voices — The Proof', 'docks',
    stage(el('lpg_proof_a', 'morel', 50, 60)),
    ['Narrator: "And then somebody checks the manifests. Rubber and ivory in; guns and chains out; nothing going the other way that could possibly be called a wage."'],
    [evDoor('docks'), evDoor('photographs'), '- "The reckoning — 1904 to 1908" -> lpg_reckoning']),

  fanScene('lpg_reckoning', 'Voices — The Reckoning', 'palace',
    stage(el('lpg_reckoning_a', 'casement', 50, 60)),
    ['Narrator: "Forty pages of findings, a satire that outsold both, and a kingdom taken off a king by his own parliament. The extraction did not stop. Only the ownership changed."'],
    [evDoor('report'), evDoor('pamphlet'), evDoor('annexation')]),
];

const VOICES_SCENES = [voicesHub, ...voiceGroups, ...voiceChoosers, ...voiceVignettes];

// ---------------------------------------------------------------- Duets
// Seven two-voice conversation chains — the record staged as dialogue.
// Where an exchange is reconstructed (Stanley, the mirror) or is a
// literary device (Twain), the narrator says so on the record.
// Register throughout: documentary — testimony, absence, aftermath.

const DUETS = [
  {
    id: 'evidence', title: 'Casement & Morel — The Shape of Proof', drop: 'docks',
    a: 'casement', b: 'morel',
    keys: { exposure: { target: 3, scale: 8 } },
    intro: 'December 1903. The consul back from the river; the clerk who never left Liverpool. They meet at a house in London and compare what they carry.',
    beats: [
      [
        `Narrator: "Two men, two kinds of proof, one table."`,
        `Casement: "I have testimony. Names, dates, quotas — sworn or marked, taken across a table like this one."`,
        `Morel: "I have ledgers. Tonnage in, cartridges out, year on year. No witness required."`,
        `Casement: "And yet you sent for me."`,
        `Morel: "And yet you came."`,
      ],
      [
        `Morel: "Understand what a column can do. It cannot weep, so it cannot be accused of weeping."`,
        `Morel: "They called the missionaries hysterical. No one has ever called a manifest hysterical."`,
        `Casement: "No. They call it dull, and turn the page."`,
        `Morel: "Then we must stop them turning the page."`,
      ],
      [
        `Casement: "A number tells you the system exists. A name tells you what it is for."`,
        `Casement (Closeup/Determined): "I sat across from the people your columns describe. They are not illustrations of an argument. They are its authors."`,
        `Morel: "Then the pamphlets carry both. The arithmetic on the left page, the testimony on the right."`,
        `Casement: "And neither can be dismissed without dismissing the other."`,
      ],
      [
        `Narrator: "Out of that evening comes a division of labor that will run for a decade."`,
        `Morel: "You cannot campaign — you are a serving consul. I cannot testify — I have seen nothing. So: your facts, my presses."`,
        `Casement: "Founded on the understanding that we exaggerate nothing. The record is bad enough told plainly."`,
        `Morel: "Told plainly, and told everywhere. In March we found the association. Liverpool first."`,
        `Narrator: "The Congo Reform Association is founded 23 March 1904. Ledgers and testimony, bound in one spine."`,
      ],
    ],
  },
  {
    id: 'treaties', title: 'Leopold & Stanley — The Founding Paper', drop: 'palace',
    a: 'leopold', b: 'stanley',
    keys: { concealment: { target: 1, scale: 8 } },
    intro: 'Brussels, between 1879 and 1884. What follows is reconstructed from the surviving instructions and reports — the words are framed on the record, not invented against it.',
    beats: [
      [
        `Narrator: "The instructions to Stanley survive in the correspondence. Their substance is this."`,
        `Leopold: "The treaties must be brief, Mr. Stanley, and they must grant everything. Land, labor, sovereignty. The consideration may be cloth."`,
        `Stanley: "The chiefs cannot read the text, Majesty."`,
        `Leopold: "The powers of Europe can. It is for them the text is written."`,
      ],
      [
        `Stanley: "Four hundred and fifty marks on four hundred and fifty papers, from the estuary to Stanley Falls. The stations are planted."`,
        `Leopold (Sit/Smug): "Tidy. An empire acquired by stationery."`,
        `Stanley: "On the river they call me Bula Matari. Breaker of rocks."`,
        `Narrator: "The name outlives the man. On the river it comes to mean the State itself — the thing that cannot be argued with."`,
      ],
      [
        `Stanley: "You ask what the chiefs understood. They understood a flag, a gift, and a visitor who would return."`,
        `Stanley: "What the paper said — sovereignty, in perpetuity — no man at those palavers said aloud in any tongue they knew."`,
        `Leopold: "And yet the marks are genuine."`,
        `Narrator: "Both statements are true. That is the whole method, in two sentences."`,
      ],
      [
        `Narrator: "Berlin, 1885: the four hundred treaties are the exhibit that wins a million square miles."`,
        `Leopold: "You see, Mr. Stanley — no conquest. A file."`,
        `Narrator: "Twenty years later the same file is read again, by different eyes, as evidence. Paper convicts paper."`,
        `Narrator: "The Community said it from the first day: we know what a bargain is. That was not one."`,
      ],
    ],
  },
  {
    id: 'mirror', title: 'Leopold & the Glass — The Two Ledgers', drop: 'palace',
    a: 'leopold', b: null,
    keys: { concealment: { target: 3, scale: 8 } },
    intro: 'The palace office, after hours. A king and a mirror. Each scene is two beats: the public mask, then the private ledger. The mask is quoted from his speeches; the ledger from what his orders did.',
    beats: [
      [
        `Leopold: "To open to civilization the only part of our globe it has not yet penetrated — a crusade worthy of this century of progress."`,
        `Narrator: "That is the mask. It is a real quotation. Now the ledger."`,
        `Leopold (Sit/Smug): "ABIR pays a dividend past one hundred percent. The crusade is the best investment in Europe."`,
        `Narrator: "Both sentences are his. He kept them in separate drawers."`,
      ],
      [
        `Leopold: "You will find no order of mine commanding cruelty. I issue budgets."`,
        `Narrator: "The mask again. Now the ledger."`,
        `Leopold: "A budget that pays sentries by the ton collected is an order. I have always known what my arithmetic instructs."`,
        `Narrator: "The second sentence he never said aloud. The first was his entire defense, for twenty years."`,
      ],
      [
        `Narrator: "February 1904. The Casement Report is on the desk. The mask answers the press."`,
        `Leopold (Pointing/Angry): "Rumor, gathered at riverside missions. An honest inquiry would have consulted my administration."`,
        `Narrator: "The ledger reads it a second time, alone."`,
        `Leopold: "He proves it from our own books. The danger was never cruelty. Europe forgives cruelty. The danger is the bookkeeping."`,
      ],
      [
        `Leopold: "I give my Congo to Belgium as I always intended. A patriot's bequest."`,
        `Narrator: "The mask, 1908. The ledger burns."`,
        `Leopold: "Eight days the furnaces ran. I will give them my Congo; they have no right to know what I did there."`,
        `Narrator: "The archive fires are documented; the sentence about them is his, reported. The mirror scene ends here. He never looked long."`,
      ],
    ],
  },
  {
    id: 'camera', title: 'Harris & Sheppard — What the Camera Carries', drop: 'village',
    a: 'harris', b: 'sheppard',
    keys: { rumor: { target: 8, scale: 16 } },
    intro: 'A mission veranda in the rubber country. A box Kodak on the table between them, and a notebook beside it.',
    beats: [
      [
        `Harris: "The camera carries an hour of light. A face, a doorway, the thing set down on the step."`,
        `Sheppard: "And it crosses the ocean unchanged. No editor can soften a negative."`,
        `Harris: "That is its whole power. It cannot be argued into meaning less."`,
      ],
      [
        `Sheppard: "Now what it cannot carry. It cannot carry a name."`,
        `Sheppard: "Nsala is a man of Wala. His daughter was named Boali. The print says none of that unless a hand writes it under."`,
        `Harris: "Nor the before. The gardens as they were. The market days. A photograph begins at the catastrophe."`,
        `Sheppard: "So the notebook goes where the camera goes. Names, dates, what stood here before. Or the picture is only sorrow."`,
      ],
      [
        `Harris: "There is a harder question. Whether to make the picture at all."`,
        `Sheppard: "The people who sat for you chose to sit. Say that in the halls, every time."`,
        `Harris (Crouch/Determined): "Nsala asked, in effect, that the world be made to look. I steadied the box. That is the whole of my authorship."`,
        `Sheppard: "Then the photograph is his testimony. You held the pen he chose."`,
      ],
      [
        `Narrator: "The division of labor settles: her slides, his entries — projected together, cited together."`,
        `Harris: "In the halls I change the slide and wait. You have given me the sentence to read while they look."`,
        `Sheppard: "Read the names. A hall that has heard a name does not file out the same."`,
        `Narrator: "Sixty slides, one notebook, a lantern. The armory of the campaign, complete on one table."`,
      ],
    ],
  },
  {
    id: 'interview', title: 'Morel & the Officer — The Interview That Gives Nothing', drop: 'station',
    a: 'morel', b: 'officer',
    keys: { exposure: { target: 1, scale: 8 } },
    intro: 'A composite of the interviews Morel sought with serving and former Free State men — reconstructed on the record from his account of what such interviews yielded, which was, on the surface, nothing.',
    beats: [
      [
        `Morel: "Lieutenant. The outbound manifests show guns, cartridges, chains. No trade goods. What are the cartridges for?"`,
        `Officer: "Resupply of the Force Publique, per regulation."`,
        `Morel: "And the chains?"`,
        `Officer: "Stores. Everything on that manifest is per regulation."`,
        `Narrator: "First answer: regulation. Note it."`,
      ],
      [
        `Morel: "The quotas, then. Who sets a village's rubber figure?"`,
        `Officer: "The figure arrives from Brussels. I do not set it. I record against it."`,
        `Morel: "And when the figure is not met?"`,
        `Officer: "The shortfall is entered and forwarded. What follows is not my office."`,
        `Narrator: "Second answer: not my office. Note it."`,
      ],
      [
        `Morel: "The surety ledgers. Persons entered as held against delivery."`,
        `Officer: "Entries in and entries out. The book is kept correctly."`,
        `Morel: "I did not ask whether it was kept correctly. I asked what it is."`,
        `Officer: "It is a book, monsieur, kept correctly."`,
      ],
      [
        `Narrator: "Morel closes his notebook. The interview has given nothing — and therefore everything."`,
        `Morel (Pointing/Surprised): "There it is. Ask the system what it does, and it answers: regulation, procedure, a book kept correctly."`,
        `Morel: "Nothing is what this machine says when questioned. I will print the nothing verbatim, next to the manifests."`,
        `Narrator: "He does. The refusals read worse than confessions, because they are in no one's voice at all."`,
      ],
    ],
  },
  {
    id: 'testimony', title: 'Casement & the Community — Taking the Record', drop: 'village',
    a: 'casement', b: 'community',
    keys: { testimony: { target: 1, scale: 1 } },
    intro: 'The upper river, 1903. A table, an interpreter, a consul with a ledger of his own. The witnesses are not subjects of this record. They are its authors.',
    beats: [
      [
        `Casement: "I will write what you say, as you say it. Names, dates, amounts. Nothing added."`,
        `The Community: "You will be told exactly. We have kept the account ourselves, waiting for someone to ask."`,
        `Casement: "Then I am the clerk here. Begin where you choose."`,
      ],
      [
        `The Community: "Write: this district, two hundred forty persons. One ton of foodstuffs delivered weekly, on instruction."`,
        `The Community: "Returned to us for it: fifteen shillings tenpence. We counted it in front of the agent. He did not disagree with the counting."`,
        `Casement (Closeup/Determined): "Two hundred forty. One ton. Fifteen and ten. Entered."`,
        `Narrator: "The figure goes into the Report unaltered, and from the Report into Twain, and from Twain around the world."`,
      ],
      [
        `The Community: "Stop. The name you have written — the second vowel is wrong. It is his name. It must be exact."`,
        `Casement: "Corrected. Read it back to me until it is right."`,
        `The Community: "Now it is right. A record with our names wrong would be one more thing taken."`,
      ],
      [
        `Casement: "I must tell you what London will do. The names will be cut to initials before printing. I have argued; I have lost."`,
        `The Community: "Then the letters will stand where our names stood. We know which words are whose. So do you."`,
        `Casement: "I keep the uncut copy. The names are not lost. They are waiting."`,
      ],
      [
        `Narrator: "The statements are read back entire, in the witnesses' own tongue, and marked or signed."`,
        `The Community: "We did not speak to be pitied. We spoke to be entered in the book that travels."`,
        `Casement: "Twenty pages of you, appended to forty of me. Yours is the half they will not survive."`,
        `Narrator: "He is right. It is the testimony, not the findings, that the King's press never manages to answer."`,
      ],
    ],
  },
  {
    id: 'soliloquy', title: 'Twain & the King — The Soliloquy, Staged', drop: 'lecture',
    a: 'leopold', b: 'twain',
    keys: { celebrities: { target: 1, scale: 1 } },
    intro: 'What follows is Mark Twain\'s device, from King Leopold\'s Soliloquy, 1905. The King never spoke these words: Twain wrote them, put them in the royal mouth, and footnoted the real documents. The satire is staged here as the satire it is.',
    beats: [
      [
        `Twain: "The device is simple. I do not accuse the King. I let him defend himself — in my ink."`,
        `Narrator: "The stage direction, Twain's own: the King, alone, reading pamphlets, 'meditating and mouthing.'"`,
        `Twain: "Every document he waves at you in fury is genuine. That is the trick. The rage is mine; the exhibits are his."`,
      ],
      [
        `Narrator: "The King, as Twain wrote him:"`,
        `Leopold: "In these twenty years I have spent millions to keep the press of the two hemispheres quiet, and still these leaks keep on occurring."`,
        `Leopold (Sit/Smug): "I have my traducers — meddlesome missionaries, with my mouth full of Bible and my pelt oozing piety at every pore."`,
        `Twain: "He objects, you notice, not to the deeds. To the leaks."`,
      ],
      [
        `Narrator: "The passage the campaign will quote forever — the King, as Twain wrote him, on the camera:"`,
        `Leopold: "The kodak has been a sore calamity to us. The most powerful enemy that has confronted us, indeed."`,
        `Leopold (Pointing/Angry): "The only witness I have encountered in my long experience that I couldn't bribe."`,
        `Twain: "I gave him that confession because it is true, and because he would never make it. Satire is the crowbar for doors of that kind."`,
      ],
      [
        `Narrator: "Twain's King reads his own purchased press aloud:"`,
        `Leopold: "'A hospital. A school. A church.' — I paid for that sentence, and it was worth every franc."`,
        `Leopold: "'Benefactor of a down-trodden people.' — also mine. The invoice is filed."`,
        `Twain: "The syndicate's clippings, with the bill attached. I invented nothing but the honesty."`,
      ],
      [
        `Twain: "The pamphlet sells at a shilling, tens of thousands of copies. I take no royalty; the proceeds go to the reform cause."`,
        `Narrator: "1905. After the Soliloquy, no drawing room in Europe can praise the King without someone smiling."`,
        `Twain: "That is what satire is for. It does not replace the testimony. It clears the room of the excuses, so the testimony can be heard."`,
        `Narrator: "Device flagged, exhibits real, proceeds accounted. The record and the ridicule, filed together."`,
      ],
    ],
  },
];

const duetScenes = [];
for (const d of DUETS) {
  const total = d.beats.length;
  d.beats.forEach((beat, i) => {
    duetScenes.push({
      id: `du_${d.id}_${i + 1}`,
      name: `${d.title} (${i + 1}/${total})`,
      sceneType: 'WITNESS',
      dropId: dropFor(d.drop),
      stage: stage(
        el(`du_${d.id}_${i + 1}_a`, d.a, d.b && KEY_OF[d.b] ? 32 : 50, 60),
        d.b ? el(`du_${d.id}_${i + 1}_b`, d.b, 70, 61) : null,
      ),
      script: lines(
        ...(i === 0 ? [`Narrator: "${d.intro}"`] : []),
        ...beat,
        '[CHOICE]',
        ...(i + 1 < total ? [`- "Continue" -> du_${d.id}_${i + 2}`] : []),
        '- "Back to the duets" -> lp_duets',
        '[/CHOICE]',
      ),
      narraton: { pool: 'leopold_reactions', keys: d.keys, repeatable: true },
      status: 'work',
    });
  });
}

const duetsHub = {
  id: 'lp_duets',
  name: 'Duets — Two Voices, One Record',
  sceneType: 'WITNESS',
  dropId: dropFor('lecture'),
  stage: stage(el('lp_du_cas', 'casement', 28, 60), el('lp_du_mor', 'morel', 72, 61)),
  script: lines(
    'Narrator: "Seven conversations across the record, 1879-1909, sorted by which room they happen in. Where an exchange is reconstructed or is a writer\'s device, the staging says so."',
    '[CHOICE]',
    '- "The King and the paper" -> lpg_du_king',
    '- "The proof, and the camera" -> lpg_du_proof',
    '- "The river and the station" -> lpg_du_river',
    '[/CHOICE]',
  ),
  status: 'work',
};

const duDoor = (id) => {
  const d = DUETS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown duet ${id}`);
  return `- "${d.title}" -> du_${d.id}_1`;
};

const duetGroups = [
  fanScene('lpg_du_king', 'Duets — The King and the Paper', 'palace',
    stage(el('lpg_du_king_a', 'leopold', 50, 60)),
    ['Narrator: "Three conversations in Brussels. In all three the King is talking, and in exactly none of them is he telling the truth to the person in front of him."'],
    [duDoor('treaties'), duDoor('mirror'), duDoor('soliloquy')]),

  fanScene('lpg_du_proof', 'Duets — The Proof and the Camera', 'docks',
    stage(el('lpg_du_proof_a', 'casement', 28, 60), el('lpg_du_proof_b', 'harris', 72, 61)),
    ['Narrator: "Two conversations about what counts as evidence. One at a London table with sworn testimony on it, one in a village with a box Kodak on a stump."'],
    [duDoor('evidence'), duDoor('camera'), '- "Return to Brussels" -> lp_palace']),

  fanScene('lpg_du_river', 'Duets — The River and the Station', 'village',
    stage(el('lpg_du_river_a', 'community', 28, 60), el('lpg_du_river_b', 'officer', 72, 61)),
    ['Narrator: "Two conversations upriver. One where the record is finally taken down. One where a man in uniform declines, very politely, to say anything at all."'],
    [duDoor('testimony'), duDoor('interview'), '- "Back to the duets" -> lp_duets']),
];

const DUET_SCENES = [duetsHub, ...duetGroups, ...duetScenes];

// ------------------------------------------------------------ Aftermaths
// Four documented turns of the system, each followed down two lines of
// sight across three distances: that week, a year on, a generation on.

const AFTERMATHS = [
  {
    id: 'quota', title: 'The Quota System', drop: 'station',
    keys: { quotaDoubled: { target: 1, scale: 1 } },
    tracks: [
      {
        id: 'village', label: 'From the villages', actor: 'community', drop: 'village',
        steps: [
          [
            `Narrator: "That week. The circular reaches the district; the figure is read aloud at the weighing shed."`,
            `The Community: "The number is said to us as weather is said. No one asks whether the forest can bear it."`,
            `The Community: "The men leave the fields at midday and do not come back to them. That is the first thing a quota does. It empties the gardens."`,
          ],
          [
            `Narrator: "A year on. The near vines are bled dead; the tapping is two days' walk out."`,
            `The Community: "We measure the quota now in walking. Two days out, two days back, and the basket weighed at the end of it."`,
            `The Community: "The gardens are weeds. We trade for manioc from across the river when the sentries do not watch. We keep the children close, and we endure."`,
          ],
          [
            `Narrator: "A generation on. Belgian rule; the wild-rubber regime gives way to taxes, cultivation orders, the mines."`,
            `The Community: "The fields are planted again. That much is taken back."`,
            `The Community: "The elders teach the children which clearings were villages. Not to frighten them. So that the counting is never only Europe's."`,
          ],
        ],
      },
      {
        id: 'ledger', label: 'From the ledgers', actor: 'officer', drop: 'station',
        steps: [
          [
            `Narrator: "That week. At the station, the new figure is entered at the head of the book."`,
            `Officer: "One line changes: the figure. Every line below it will now be measured against a number the forest cannot meet."`,
            `Officer: "I am not asked to approve it. I am asked to record against it. There is a difference, I tell myself that week."`,
          ],
          [
            `Narrator: "A year on. The concession returns rise; the dividend passes one hundred percent."`,
            `Officer: "Brussels reads the returns and doubles nothing down — the figure holds, so the figure was right. That is how a ledger reasons."`,
            `Officer: "Requests for transfer to the railway are running higher this year. No one writes the reason in the request."`,
          ],
          [
            `Narrator: "A generation on. The books survive the state that kept them."`,
            `Officer: "The ledgers were never burned — they were the respectable part. They sit in the archives at Brussels, correct to the last entry."`,
            `Narrator: "Historians will read the quota books against the testimony and find they agree. The system's own arithmetic is the witness that never recants."`,
          ],
        ],
      },
    ],
  },
  {
    id: 'hostages', title: 'The Hostage Policy', drop: 'station',
    keys: { hostages: { target: 1, scale: 1 } },
    tracks: [
      {
        id: 'village', label: 'From the villages', actor: 'community', drop: 'village',
        steps: [
          [
            `Narrator: "That week. The station downriver takes surety against delivery."`,
            `The Community: "They hold the mothers at the station and call it surety. We carry rubber to buy back our own."`,
            `The Community: "We count the days aloud with the children, so that counting itself is not made the enemy."`,
          ],
          [
            `Narrator: "A year on. The villages have learned the policy's shape, and answer it."`,
            `The Community: "After the second seizure, some villages move whole in one night — pots, goats, seed. Let the station hold an empty district."`,
            `The Community: "Some cross to the French bank. The forest that hides rubber can hide people. We say it as a proverb now."`,
          ],
          [
            `Narrator: "A generation on. The word remains in the family stories, in its own tongue and in theirs."`,
            `The Community: "Surety. We teach the children the word in their language and ours, so they will know it if it is ever said to them politely again."`,
            `The Community: "The ones who were held are named in our histories as householders and mothers. Their captivity is not the whole of them. It never was."`,
          ],
        ],
      },
      {
        id: 'record', label: 'From the record', actor: 'casement', drop: 'station',
        steps: [
          [
            `Narrator: "That week. The practice is entered in the station books as it happens — names, dates of seizure, rubber owed against each."`,
            `Casement: "The clerks kept it correctly. Good order was the whole of their instruction, and good order is what will convict."`,
          ],
          [
            `Narrator: "A year on. A consul copies the surety ledger at the station table, the clerk assisting."`,
            `Casement (Closeup/Determined): "He believed he was showing me good administration. I copied every line. Word for word is the only safe method — and the only fair one."`,
            `Casement: "The page goes to Parliament. The clerk's neat hand becomes the Crown's exhibit."`,
          ],
          [
            `Narrator: "A generation on. The copied pages outlive the stations, the companies, and the men."`,
            `Casement: "A practice that books itself cannot later claim it never happened. That was the State's one honest habit, and it is the one that ends it."`,
            `Narrator: "The surety ledgers are cited in every history of the Free State since. Entries in, entries out — read at last in full."`,
          ],
        ],
      },
    ],
  },
  {
    id: 'report', title: 'The Casement Report', drop: 'palace',
    keys: { testimony: { target: 1, scale: 1 }, exposure: { target: 3, scale: 8 } },
    tracks: [
      {
        id: 'campaign', label: 'From the campaign', actor: 'morel', drop: 'docks',
        steps: [
          [
            `Narrator: "That week. February 1904. The Blue Book is laid before Parliament, names cut to initials."`,
            `Morel: "It reached me like ammunition reaches a gun already aimed."`,
            `Morel: "Within the month we found the association. February wrote; March organized."`,
          ],
          [
            `Narrator: "A year on. The lantern circuits run; the Soliloquy sells at the hall doors."`,
            `Morel: "We read the Report aloud — pulpits, meeting halls, the dock gates. A Blue Book is built to be shelved. We refused the shelf."`,
            `Morel: "The Foreign Office calls it pressure. We call it the public, informed."`,
          ],
          [
            `Narrator: "A generation on. The campaign is studied as the first of its kind — and its author's whole record is kept honestly."`,
            `Morel: "Ledgers, testimony, lantern slides, and no army at all. They call it the first modern human-rights campaign. Let them also say what it could not reach."`,
            `Narrator: "Casement is executed by Britain in 1916, for Ireland. The Report's truth does not depend on its author's fate — but the record keeps both."`,
          ],
        ],
      },
      {
        id: 'palace', label: 'From the palace', actor: 'leopold', drop: 'palace',
        steps: [
          [
            `Narrator: "That week. The Report is on the desk beside the press clippings."`,
            `Leopold: "Rumor, gathered at missions. My administration was not consulted. My own Commission will examine the matter — my officials, my terms."`,
            `Leopold (Sit/Smug): "And read it twice before filing. He proves the system from our own ledgers. The danger is the bookkeeping."`,
          ],
          [
            `Narrator: "A year on. The King's own Commission of Inquiry, built to be hollow, confirms the substance."`,
            `Leopold: "I appointed jurists to bury a report, and they have countersigned it."`,
            `Narrator: "Cosmetic reforms follow; extraction continues. But the King's own inquiry is now a citation against him, and the campaign quotes it from the stage."`,
          ],
          [
            `Narrator: "A generation on. The Report is the document by which the reign is remembered."`,
            `Narrator: "The speeches about civilization are quoted only to be measured against it. Forty pages of findings, twenty of testimony — the twenty are the part history kept."`,
            `Leopold: "I spent millions on the story. He spent a winter on the facts."`,
          ],
        ],
      },
    ],
  },
  {
    id: 'annexation', title: 'The Annexation, 1908', drop: 'palace',
    keys: { exposure: { target: 6, scale: 8 } },
    tracks: [
      {
        id: 'village', label: 'From the villages', actor: 'community', drop: 'village',
        steps: [
          [
            `Narrator: "That week. November 1908. Belgian rule arrives: a new flag over the same station."`,
            `The Community: "The flag changed over the warehouse. The scales inside it did not."`,
            `The Community: "New officials speak of reform in the old building. We listen, and we plant, and we wait to see what the weighing shed does."`,
          ],
          [
            `Narrator: "A year on. The quotas continue under new letterhead — framed honestly: the worst of the terror recedes; the extraction does not."`,
            `The Community: "It is better. We say that plainly, because it is true: fewer sentries, fewer seizures."`,
            `The Community: "And it is not finished. The rubber still goes down the river, and the orders still come up it. A gentler letterhead is not a return of what was taken."`,
          ],
          [
            `Narrator: "A generation on. The Belgian Congo: taxes, mines, cultivation orders — a colony run by ministries instead of one man."`,
            `The Community: "Our grandchildren will see the last flag come down. In 1960 the Congo takes its independence."`,
            `Narrator: "That is the coda, and it belongs to the Congolese alone. This record ends where theirs continues."`,
          ],
        ],
      },
      {
        id: 'campaign', label: 'From the campaign', actor: 'movement', drop: 'lecture',
        steps: [
          [
            `Narrator: "That week. The reform press claims its victory — carefully."`,
            `The Movement: "We forced the transfer. Write that. And write the second sentence too: we could not force the accounting."`,
            `The Movement: "The King loses his Congo and keeps his fortune. Victory, with the ledger still unbalanced."`,
          ],
          [
            `Narrator: "A year on. December 1909: the King is dead; the funeral cortege is booed in the streets of Brussels."`,
            `The Movement: "No association organized that sound. The public no longer needed telling."`,
            `The Movement: "Morel watches the new administration and refuses the word done. The lantern circuits run on, thinner but running."`,
          ],
          [
            `Narrator: "A generation on. 1913: the Congo Reform Association dissolves itself, its work — as it judged — done."`,
            `The Movement: "The association ends. The method does not: ledgers, testimony, photographs, publication. Every campaign since has used our toolbox."`,
            `Narrator: "Whether the work was done is a question the record leaves open, on purpose. Watch the world, reader, and decide."`,
          ],
        ],
      },
    ],
  },
];

const aftermathScenes = [];
const STEP_LABELS = ['That week', 'A year on', 'A generation on'];
for (const ev of AFTERMATHS) {
  for (const tr of ev.tracks) {
    tr.steps.forEach((step, i) => {
      aftermathScenes.push({
        id: `af_${ev.id}_${tr.id}_${i + 1}`,
        name: `${ev.title} — ${tr.label}: ${STEP_LABELS[i]}`,
        sceneType: 'WITNESS',
        dropId: dropFor(tr.drop),
        stage: stage(el(`af_${ev.id}_${tr.id}_${i + 1}_a`, tr.actor, 50, 60)),
        script: lines(
          ...step,
          '[CHOICE]',
          ...(i + 1 < tr.steps.length
            ? [`- "${STEP_LABELS[i + 1]}" -> af_${ev.id}_${tr.id}_${i + 2}`]
            : []),
          '- "Back to the aftermaths" -> lp_aftermaths',
          '[/CHOICE]',
        ),
        narraton: { pool: 'leopold_reactions', keys: ev.keys, repeatable: true },
        status: 'work',
      });
    });
  }
}

const aftermathsHub = {
  id: 'lp_aftermaths',
  name: 'Aftermaths — That Week, a Year On, a Generation On',
  sceneType: 'WITNESS',
  dropId: dropFor('village'),
  stage: stage(el('lp_af_comm', 'community', 50, 60)),
  script: lines(
    'Narrator: "Four turns of the system, each followed down two lines of sight — the week it happened, a year on, a generation on. Nothing here is depicted; everything here is documented or honestly framed. Choose the turn; then choose where you stand."',
    '[CHOICE]',
    '- "The quota system" -> lpg_af_quota',
    '- "The hostage policy" -> lpg_af_hostages',
    '- "The report, and the annexation" -> lpg_af_end',
    '[/CHOICE]',
  ),
  status: 'work',
};

const afEv = (id) => {
  const ev = AFTERMATHS.find((x) => x.id === id);
  if (!ev) throw new Error(`unknown aftermath ${id}`);
  return ev;
};
const afDoors = (id) =>
  afEv(id).tracks.map((tr) => `- "${tr.label}" -> af_${id}_${tr.id}_1`);

const aftermathGroups = [
  fanScene('lpg_af_quota', 'Aftermaths — The Quota System', 'station',
    stage(el('lpg_af_quota_a', 'community', 50, 60)),
    ['Narrator: "A weight of dried rubber per man per fortnight, verified by basket. Two lines of sight run out from that basket, and neither one ever comes back."'],
    [...afDoors('quota'), '- "Return to Brussels" -> lp_palace']),

  fanScene('lpg_af_hostages', 'Aftermaths — The Hostage Policy', 'station',
    stage(el('lpg_af_hostages_a', 'community', 50, 60)),
    ['Narrator: "Hold the women and the children until the men bring rubber. Later, hold the chiefs. It is in the company ledgers, which is exactly how it was proved."'],
    [...afDoors('hostages'), '- "Return to Brussels" -> lp_palace']),

  fanScene('lpg_af_end', 'Aftermaths — The Report and the Annexation', 'palace',
    stage(el('lpg_af_end_a', 'casement', 50, 60)),
    ['Narrator: "The two turns that ended his ownership and changed nothing about the extraction. Follow either one out to a generation on and see for yourself."'],
    ['- "The Casement Report" -> lpg_af_report', '- "The Annexation, 1908" -> lpg_af_annex',
      '- "Return to Brussels" -> lp_palace']),

  fanScene('lpg_af_report', 'Aftermaths — The Casement Report', 'palace',
    stage(el('lpg_af_report_a', 'casement', 50, 60)),
    ['Narrator: "Forty pages of findings, twenty of sworn testimony, names cut down to initials so the sentries could not work backwards. Two lines of sight."'],
    [...afDoors('report'), '- "Back to the aftermaths" -> lp_aftermaths']),

  fanScene('lpg_af_annex', 'Aftermaths — The Annexation', 'palace',
    stage(el('lpg_af_annex_a', 'leopold', 50, 60)),
    ['Narrator: "Belgium takes the Congo off its King. He is booed at his own funeral. The rubber keeps moving. Two lines of sight."'],
    [...afDoors('annexation'), '- "Back to the aftermaths" -> lp_aftermaths']),
];

const AFTERMATH_SCENES = [aftermathsHub, ...aftermathGroups, ...aftermathScenes];

// ------------------------------------------------------------ The Record
// Single-scene entries of uncovered research — episodes the main spine
// passes over, each documented, each returning to the shelf. The final
// fourteen entries come from the Pass 2 deep-dive dossier: the quota and
// margin arithmetic, the hostage escalation, the named perpetrators, the
// verbatim testimony, and the prestige machine read in Georgist terms.

const RECORD = [
  {
    id: 'batetela1', title: 'The Batetela Mutiny at Luluabourg, 1895', drop: 'station', actor: 'community',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "July 1895, Luluabourg. Batetela soldiers of the Force Publique — conscripted, drilled, and turned against their own country — turn their rifles on the regime instead."`,
      `The Community: "The first army the State feared was the one it had armed. Our sons, in its own uniforms."`,
      `Narrator: "They defeat regular columns, take posts, and hold the field for months. The State's reports call it mutiny. In the villages it is called by names closer to war."`,
    ],
  },
  {
    id: 'batetela2', title: 'The Mutineers\' Years, 1895-1908', drop: 'station', actor: 'community',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "The Batetela risings do not end in a season. Columns are sent, and beaten, and sent again; bands fight on in the southeast for years — the last are not subdued until after the Free State itself is gone."`,
      `The Community: "Europe's histories give the resistance a footnote. Ours give it the years it actually lasted."`,
      `Narrator: "The record is thin and mostly military, written by the losers' enemies. It is entered here for what it proves: the Congo never consented, and never stopped saying so."`,
    ],
  },
  {
    id: 'commission1', title: 'The Commission Hearings, 1904-05', drop: 'station', actor: 'community',
    keys: { commissioned: { target: 1, scale: 1 } },
    l: [
      `Narrator: "The King's Commission of Inquiry travels the river to defuse the Casement Report. Witnesses walk in from the districts to testify — knowing the sentries will still be there when the commissioners have gone."`,
      `The Community: "We testified to the King's own judges, in daylight, with the company agents watching. Let no one say the record was gathered timidly."`,
      `Narrator: "At Bonginda the testimony reportedly left one veteran official weeping at the table. The Commission was built to be hollow. The witnesses filled it."`,
    ],
  },
  {
    id: 'commission2', title: 'The Commission\'s Report, 1905', drop: 'palace', actor: 'leopold',
    keys: { commissioned: { target: 1, scale: 1 } },
    l: [
      `Narrator: "November 1905. The Commission's report confirms the substance of the charges — forced labor, hostage-taking, the sentry system — in the measured language of the King's own jurists."`,
      `Leopold: "I appointed them to end the discussion. They have printed its confirmation under my seal."`,
      `Narrator: "The full testimony is never published; the summary alone is damning enough. Reform decrees follow, cosmetic; the campaign quotes the King's own inquiry from every stage in Britain."`,
    ],
  },
  {
    id: 'lantern_us1', title: 'The Lantern Tours Reach America', drop: 'lecture', actor: 'movement',
    keys: { celebrities: { target: 1, scale: 1 } },
    l: [
      `Narrator: "1904 onward. The Harrises carry the lantern show across the Atlantic: hundreds of meetings, church halls and lyceums, the same sixty slides."`,
      `The Movement: "America mattered doubly. The King courted Washington for recognition first, in 1884. So the campaign went to America to take the story back."`,
      `Narrator: "An American Congo Reform Association forms; Morel tours in 1904 himself. The pressure is now on two governments at once."`,
    ],
  },
  {
    id: 'lantern_us2', title: 'Booker T. Washington Speaks', drop: 'lecture', actor: 'movement',
    keys: { celebrities: { target: 1, scale: 1 } },
    l: [
      `Narrator: "Booker T. Washington joins the American campaign — writing, speaking, and pressing the case in Washington alongside Sheppard's testimony from the Kasai."`,
      `The Movement: "It mattered, and say it plainly: Black America stood in this fight by name — Washington on the platform, Sheppard in the record."`,
      `Narrator: "Washington publishes on the Congo in 1904 and lobbies the President's circle. The reform cause in America is not a mission-hall curiosity; it is national politics."`,
    ],
  },
  {
    id: 'press1', title: 'The Press Syndicate', drop: 'palace', actor: 'leopold',
    keys: { pressFunded: { target: 1, scale: 1 } },
    l: [
      `Narrator: "Brussels runs a press bureau: subsidies, planted articles, pamphlets by the hundred thousand, friendly correspondents kept friendly."`,
      `Leopold (Sit/Smug): "A newspaper is an instrument like any other. One does not bribe it. One subscribes, generously, to its better judgment."`,
      `Narrator: "The bureau's output is real journalism's shape with none of its substance: hospitals photographed, schools counted, quotas unmentioned. For years, it works."`,
    ],
  },
  {
    id: 'press2', title: 'The Syndicate Exposed, 1906', drop: 'docks', actor: 'morel',
    keys: { exposure: { target: 3, scale: 8 } },
    l: [
      `Narrator: "December 1906. The New York American publishes the papers of Henry Kowalsky, the King's American lobbyist — retainers, planted articles, a paid campaign to soften Congress and the press."`,
      `Morel: "We had said for years the coverage was bought. Now the receipts themselves are on the front page — sold to a newspaper by the King's own hireling."`,
      `Narrator: "The propaganda machine, exposed, becomes evidence against its owner. Every past denial is re-read with the invoice beside it."`,
    ],
  },
  {
    id: 'doyle', title: 'Conan Doyle\'s Pamphlet, 1909', drop: 'lecture', actor: 'movement',
    keys: { celebrities: { target: 1, scale: 1 } },
    l: [
      `Narrator: "1909. Arthur Conan Doyle writes The Crime of the Congo in roughly eight days — a shilling book, sixty thousand words, built from the campaign's documents."`,
      `The Movement: "The creator of Sherlock Holmes, laying out the evidence like a case file. The public that would not read a Blue Book read him overnight."`,
      `Narrator: "Doyle tours the platforms with Morel and mails copies to the powerful by the hundred. The last years of the campaign have the loudest pens in England."`,
    ],
  },
  {
    id: 'sheppard1', title: 'Sheppard in the Kasai, 1899', drop: 'village', actor: 'sheppard',
    keys: { testimony: { target: 1, scale: 1 } },
    l: [
      `Narrator: "September 1899. William Sheppard is sent into the Kasai bush to document what the Zappo Zap irregulars — armed by the State to collect its tribute — have done to the Pianga villages."`,
      `Sheppard: "I counted, and wrote, and photographed. Sixteen days. Names of villages, numbers, dates. The State's tribute collectors, at their assigned work."`,
      `Narrator: "His report travels from mission board to newspapers to the American Congress. It is among the earliest full documentations of the system by a Black American witness — methodical, sworn, and never shaken."`,
    ],
  },
  {
    id: 'sheppard2', title: 'The Libel Trial, 1909', drop: 'station', actor: 'sheppard',
    keys: { testimony: { target: 1, scale: 1 } },
    l: [
      `Narrator: "1908: Sheppard publishes what the Kasai Company's regime has done to the Kuba country. The company sues him for libel in the State's own court at Leopoldville."`,
      `Sheppard: "They put my sentences on trial. My notebook answered for them — names, dates, amounts, as I had written them down for twenty years."`,
      `Narrator: "September 1909: acquitted. The company's own court could not break the entries. The verdict is reported across America as the vindication of the whole missionary record."`,
    ],
  },
  {
    id: 'arith1', title: 'The Arithmetic, Staged: 15s 10d', drop: 'lecture', actor: null,
    keys: { testimony: { target: 1, scale: 1 } },
    balloonText: 'THE LAKE MANTUMBA ARITHMETIC',
    l: [
      `Narrator: "One entry from the Casement Report, staged as the campaign staged it — as arithmetic."`,
      `[SET_TEXT rc_arith1_b "240 PERSONS — COMPELLED"]`,
      `Narrator: "Two hundred and forty persons, men, women and children, compelled to supply government."`,
      `[SET_TEXT rc_arith1_b "ONE TON OF FOODSTUFFS — WEEKLY"]`,
      `Narrator: "One ton of carefully prepared foodstuffs per week, delivered to the station."`,
      `[SET_TEXT rc_arith1_b "RETURNED: 15 SHILLINGS 10 PENCE"]`,
      `Narrator: "Receiving in return, in the Report's own words, 'the princely sum of 15s. 10d.'"`,
    ],
  },
  {
    id: 'arith2', title: 'What the Number Means', drop: 'lecture', actor: 'movement',
    keys: { testimony: { target: 1, scale: 1 } },
    balloonText: '15s 10d ÷ 240 PERSONS ÷ 1 WEEK',
    l: [
      `Narrator: "Divide it out, as the lecturers did from the stage: fifteen shillings tenpence, across two hundred forty people, for a week's compelled labor — a fraction of a penny each."`,
      `The Movement: "We wrote the division on a slide and let the audience finish it. No adjective in the language does what that long division does."`,
      `Narrator: "Set beside it the concession dividends passing one hundred percent. Two numbers, one system. The campaign's whole case, in arithmetic a child could check."`,
    ],
  },
  {
    id: 'tervuren1', title: 'The Human Exhibition, 1897', drop: 'palace', actor: 'community',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "1897, Tervuren, outside Brussels. For the World's Fair the King exhibits 267 Congolese men, women and children in a built 'village' in the park, behind a fence, before more than a million visitors."`,
      `The Community: "They were people with names — soldiers' families, boatmen, weavers — shipped to Belgium to be looked at in the cold."`,
      `Narrator: "Seven die that summer, of pneumonia and influenza, and are buried by the parish church of Sint-Jan Evangelist, for decades in unmarked ground. Their names are recorded: Ekia, Gemba, Kitukwa, Mpela, Zao, Samba, and Mbange. The fence bore a sign, added after visitors kept throwing food: they are fed. Nothing in this scene is invented."`,
    ],
  },
  {
    id: 'tervuren2', title: 'The Museum at Tervuren', drop: 'palace', actor: null,
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "From the 1897 exhibition grows a permanent Museum of the Congo at Tervuren — marble halls, rubber and ivory in cases, statues of Belgium bringing civilization. The quota system appears nowhere in it."`,
      `Narrator: "It is the King's story, built to outlast him — a museum as the final press release."`,
      `Narrator: "It stands today, renamed and remade, its own history now part of the exhibit. A century on, the labels are still being corrected. The record outlasts the marble, but the marble takes longer to answer than the lies did to build."`,
    ],
  },
  {
    id: 'kodak', title: 'The Kodak on the Table', drop: 'village', actor: 'harris',
    keys: { rumor: { target: 8, scale: 16 } },
    l: [
      `Narrator: "A last entry: the instrument itself. A No. 2 Bull's-Eye Kodak — a box, a lens, a strap. It cost a few pounds and needed no tripod."`,
      `Harris: "It was not built as a weapon. It was built for holidays. That an amateur's box could answer an empire's press bureau — that was the discovery."`,
      `Narrator: "Cheap cameras, cheap print, fast steamers: the same machinery that moved the rubber moved the evidence. The system built the roads its exposure traveled."`,
    ],
  },
  // ---- Pass 2 additions: the deeper dossier ----
  {
    id: 'bongandanga', title: 'The Bongandanga Quota', drop: 'station', actor: 'community',
    keys: { quotaDoubled: { target: 1, scale: 1 } },
    balloonText: '3 KG DRIED RUBBER — PER MAN — PER FORTNIGHT',
    l: [
      `Narrator: "The quota, stated exactly, from the ABIR district of Bongandanga: roughly three kilograms of dried rubber per man per fortnight, verified by basket at the weighing shed."`,
      `The Community: "Say the number slowly. Three kilograms of dried rubber is days of tapping, farther out each season — and the fortnight does not lengthen when the vines recede."`,
      `Narrator: "Meeting the figure means abandoning the fields. The quota does not merely take the rubber; it takes the time that grew the food. Hunger is not a side effect of the system. It is the system, arriving on schedule."`,
    ],
  },
  {
    id: 'margin', title: 'The Red-Rubber Margin', drop: 'docks', actor: 'morel',
    keys: { concealment: { target: 3, scale: 8 } },
    balloonText: 'COST: 1.35 FRANCS/KG — SOLD: UP TO 10 FRANCS/KG',
    l: [
      `Narrator: "The extraction engine, in two numbers. Through the late 1890s ABIR sold in Europe, for up to ten francs, a kilogram of rubber that cost it 1.35 francs to collect."`,
      `Morel: "Study the gap. It is not profit as a merchant knows profit — no wage paid, no goods exchanged, nothing bought. The 1.35 francs is the cost of the sentries and the steamers. The rest is rent, taken at gunpoint from land the takers claim to own."`,
      `Narrator: "The campaign will call it red rubber. Henry George would have called it by its older name: rent, collected where no law reaches, wearing a company letterhead."`,
    ],
  },
  {
    id: 'shares', title: 'The Share Register, 1892-1903', drop: 'docks', actor: null,
    keys: { concealment: { target: 3, scale: 8 } },
    balloonText: 'THE ABIR SHARE REGISTER',
    l: [
      `Narrator: "One security, followed for eleven years. An ABIR share, on the register:"`,
      `[SET_TEXT rc_shares_b "1892 — SHARE: 500 GOLD FRANCS. DIVIDEND: 1 FRANC."]`,
      `Narrator: "Eighteen ninety-two. Five hundred gold francs the share; one franc the annual dividend."`,
      `[SET_TEXT rc_shares_b "1903 — SHARE: 15,000 FRANCS. DIVIDEND: 1,200 FRANCS."]`,
      `Narrator: "Nineteen hundred and three. Fifteen thousand francs the share; twelve hundred francs the dividend. A thirty-fold price, a twelve-hundred-fold payout."`,
      `Narrator: "In those same eleven years the quota, the sentry system, and the surety ledgers did their work in the Maringa-Lopori basin. The register and the testimony describe the same machine. Read either; they agree."`,
    ],
  },
  {
    id: 'fortune', title: 'The King\'s Seventy Million', drop: 'palace', actor: 'leopold',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "The personal account. Between 1896 and 1905, historians estimate, Leopold netted some seventy million Belgian francs from the Congo — his privately, not Belgium's."`,
      `Leopold (Sit/Smug): "The Congo cost me my inheritance in the lean years. I regard the later returns as repayment, with interest, from a grateful estate."`,
      `Narrator: "The estate was not consulted. The seventy million is an estimate and is flagged as one — the King's finances were built to resist counting — but the arcades, the galleries, and the palace works it paid for stand in Belgium to this day, auditable in stone."`,
    ],
  },
  {
    id: 'chiefs', title: 'The Chiefs in the Sheds, 1899-1902', drop: 'station', actor: 'community',
    keys: { hostages: { target: 1, scale: 1 } },
    l: [
      `Narrator: "The hostage policy, escalating in the companies' own records. First the women and children, held as surety. Then the chiefs themselves: in July 1902 one post recorded that it held 44 chiefs in prison."`,
      `The Community: "Understand what a chief in their shed means. It is the village's law, its memory, and its voice, held against a weight of rubber. They did not only take persons. They took the offices we govern ourselves by."`,
      `Narrator: "And the sheds killed. The posts at Bongandanga and Mompono each recorded death rates of three to ten prisoners per day in 1899. The figures are the companies' own entries. No reformer wrote them. A clerk did."`,
    ],
  },
  {
    id: 'chicotte', title: 'The Chicotte', drop: 'station', actor: 'officer',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "An instrument, described and not depicted: the chicotte, a whip of raw, sun-dried hippopotamus hide, issued at the stations as routinely as ledger paper."`,
      `Officer: "It hangs by the weighing shed. Most days it is not taken down. It does not need to be taken down. That is what it is for."`,
      `Narrator: "The testimony before the Commission, and Casement's pages, record what its use did. This record keeps the instrument in view for one reason: it was standard equipment. Not an excess. An issue item, requisitioned, replaced, and accounted."`,
    ],
  },
  {
    id: 'fievez', title: 'The Devil of the Equator', drop: 'station', actor: null,
    keys: { exposure: { target: 3, scale: 8 } },
    l: [
      `Narrator: "Léon Fiévez, district commissioner of the Equateur from April 1893. In late 1894 alone, his forces burned or looted more than 160 villages. The record of him that matters most is Congolese."`,
      `Narrator: "A man named Tswambe testified — his words reported through a Catholic priest, and quoted by Hochschild; reported speech, and flagged as such:"`,
      `Tswambe: "All blacks saw this man as the devil of the Equator... From all the bodies killed in the field, you had to cut off the hands. He wanted to see the number of hands cut off by each soldier... A village which refused to provide rubber would be completely swept clean."`,
      `Narrator: "Foreign press coverage eventually forced Fiévez's removal. Not a trial — a removal. The system disciplined its excesses only when they became visible, which is a sentence worth reading twice."`,
    ],
  },
  {
    id: 'lemaire', title: 'The Commissioner\'s Own Sentence', drop: 'station', actor: null,
    keys: { testimony: { target: 1, scale: 1 } },
    l: [
      `Narrator: "Charles Lemaire, commissioner of the Equateur before Fiévez, 1890 to 1893. After his retirement he wrote down, in his own hand, what the post had required of him. Verbatim:"`,
      `Lemaire: "As soon as it was a question of rubber, I wrote to the government, 'To gather rubber in the district... one must cut off hands, noses and ears.'"`,
      `Narrator: "No missionary alleged this. No reformer reconstructed it. The commissioner reported it of himself, as administration. Lemaire was not disgraced: he became the first director of Belgium's Colonial University, teaching the next generation how the Congo was run."`,
    ],
  },
  {
    id: 'rom', title: 'The Officer Behind Kurtz', drop: 'station', actor: 'officer',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "Léon Rom, Force Publique officer. The documented atrocities of his stations were of a kind that some scholars — it is a scholarly reading, not a certainty, and is flagged as one — see behind Conrad's Kurtz in Heart of Darkness."`,
      `Officer: "Conrad came up this river in 1890, a steamer officer like any other. He saw what the stations were. He changed the names and kept the truth."`,
      `Narrator: "Whether or not Rom sat for the portrait, the novel's readers met the Free State before the Blue Books reached them. Fiction carried the reconnaissance; the documents came after, and matched."`,
    ],
  },
  {
    id: 'uu', title: 'The Testimony of the Witnesses', drop: 'village', actor: 'casement',
    keys: { testimony: { target: 1, scale: 1 } },
    l: [
      `Narrator: "From the sworn testimony appended to the Casement Report — names cut to initials by the Foreign Office before printing. These words are verbatim. Nothing is staged here except the page."`,
      `Casement: "A refugee stated: 'They killed my little sister, threw her in a house, and set it on fire.'"`,
      `Casement: "The witness the Report calls U.U. stated: 'As we fled, the soldiers killed ten children, in the water. They killed a lot of adults, cut off their hands, put them in baskets, and took them to the white man, who counted 200 hands...'"`,
      `Narrator: "The sentences were spoken across a table, sworn, read back, and marked. They have been in the public record since 1904. This scene exists so that they are read, not summarized."`,
    ],
  },
  {
    id: 'string', title: 'The Knotted String', drop: 'village', actor: 'casement',
    keys: { testimony: { target: 1, scale: 1 } },
    l: [
      `Narrator: "One witness came to the consul's table carrying his testimony in his hands — recorded by Casement, retold by Conan Doyle in The Crime of the Congo."`,
      `Casement: "He appeared with a string knotted in forty-two places, and with a packet of fifty leaves. Each knot, he said, was a murder he had counted. Each leaf stood for a rope in his village."`,
      `Narrator: "Where the State kept ledgers, the villages kept string and leaves. Two systems of record met across that table, and they corroborated each other exactly. The arithmetic of the Congo was never Europe's alone."`,
    ],
  },
  {
    id: 'arch', title: 'The Arch, Paid in Rubber', drop: 'palace', actor: null,
    keys: { concealment: { target: 3, scale: 8 } },
    balloonText: 'THE CINQUANTENAIRE ARCH, BRUSSELS, 1905',
    l: [
      `Narrator: "Brussels, 1905 — the year after the Casement Report. The monumental arch of the Cinquantenaire is completed, substantially on Congo money, routed through the Fondation de la Couronne — the Crown Foundation, the King's instrument for converting Congo revenue into Belgian stone."`,
      `Narrator: "Read it in George's terms: rent extracted at gunpoint on the Lopori, laundered through a foundation, and fixed as civic marble in Europe. The margin from the red rubber does not vanish. It becomes architecture — and the architecture becomes an alibi."`,
      `Narrator: "Belgians call him the Builder King. The record asks only that the building and the funding stream be read in the same sentence. They were never separate facts."`,
    ],
  },
  {
    id: 'ostend', title: 'The Builder King', drop: 'palace', actor: 'leopold',
    keys: { concealment: { target: 3, scale: 8 } },
    l: [
      `Narrator: "The program is larger than one arch: the Royal Galleries of Ostend, works at Antwerp, palace grounds at Laeken, the Africa Palace at Tervuren — the prestige machine, in masonry."`,
      `Leopold: "A king is judged by what he leaves standing. I have given Belgium boulevards, galleries, arcades. Posterity walks through my defense."`,
      `Narrator: "That is precisely the mechanism: prestige as insulation. Every colonnade made the quota system harder to believe. The monuments were not decoration on the extraction. They were its armor — and for twenty years, the armor held."`,
    ],
  },
  {
    id: 'antislavery', title: 'The Anti-Slavery Conference, 1889-90', drop: 'palace', actor: 'leopold',
    keys: { concealment: { target: 1, scale: 8 } },
    l: [
      `Narrator: "Brussels, 1889-90. Leopold hosts the great Anti-Slavery Conference of the powers — the King of the Congo presiding, in his own capital, over the abolition of slavery in Africa."`,
      `Leopold: "Who has done more against the slavers than my State? The powers may consult their own resolutions — passed at my table, under my roof."`,
      `Narrator: "Within a few years his Force Publique is conscripting kidnapped children, his stations hold hostages against rubber, and his companies run forced labor at a scale the century has not seen. The conference is not a footnote to the system. It is its masterpiece: prestige language, minted in advance, as insulation for the thing it named."`,
    ],
  },
];

const recordScenes = RECORD.map((r) => ({
  id: `rc_${r.id}`,
  name: `The Record: ${r.title}`,
  sceneType: 'WITNESS',
  dropId: dropFor(r.drop),
  stage: stage(
    r.actor ? el(`rc_${r.id}_a`, r.actor, 50, 60) : null,
    r.balloonText ? balloon(`rc_${r.id}_b`, r.balloonText, 50, 12, { scale: 1.1, zIndex: 5 }) : null,
  ),
  script: lines(
    ...r.l,
    '[CHOICE]',
    '- "Back to the record" -> lp_record',
    '- "Return to Brussels" -> lp_palace',
    '[/CHOICE]',
  ),
  narraton: { pool: 'leopold_reactions', keys: r.keys, repeatable: true },
  status: 'work',
}));

const recordHub = {
  id: 'lp_record',
  name: 'The Record — Uncovered Research',
  sceneType: 'WITNESS',
  dropId: dropFor('lecture'),
  stage: stage(el('lp_rc_shep', 'sheppard', 28, 61), el('lp_rc_move', 'movement', 72, 60)),
  script: lines(
    `Narrator: "${RECORD.length} entries the main story passes over — mutinies, hearings, trials, invoices, the quota and margin arithmetic, the named perpetrators in their own words, the verbatim testimony, and the monuments the rubber paid for. Each is documented; where a figure is disputed or a quote is secondhand, the entry says so."`,
    'Narrator: "Thirty at once is not a shelf, it is an avalanche. They are filed in three: what the Congo did back, what the campaign did about it, and where the money went."',
    '[CHOICE]',
    '- "The Congo answering" -> lpg_rc_congo',
    '- "The campaign, and the men who fought it" -> lpg_rc_campaign',
    '- "The money, the men, the monuments" -> lpg_rc_money',
    '[/CHOICE]',
  ),
  status: 'work',
};

// ---- the record, filed in threes ----------------------------------------
// Thirty entries reached through a shelf of small grouping scenes. Every
// one of the thirty is still on the shelf; none was cut to make room.
const rcDoor = (id) => {
  const r = RECORD.find((x) => x.id === id);
  if (!r) throw new Error(`unknown record entry ${id}`);
  return `- "${r.title}" -> rc_${r.id}`;
};
const RC_BACK = '- "Back to the record" -> lp_record';

const recordGroups = [
  fanScene('lpg_rc_congo', 'The Record — The Congo Answering', 'station',
    stage(el('lpg_rc_congo_a', 'community', 50, 60)),
    ['Narrator: "The Free State\'s own histories call this the disorder. It is the part of the record where the country says no, in arms, in courtrooms, and across a table with a consul writing it down."'],
    ['- "The mutinies" -> lpg_rc_mutiny', '- "The King\'s Commission" -> lpg_rc_commission',
      '- "The testimony taken down" -> lpg_rc_testimony']),

  fanScene('lpg_rc_mutiny', 'The Record — The Mutinies', 'station',
    stage(el('lpg_rc_mutiny_a', 'community', 50, 60)),
    ['Narrator: "The first army the State feared was the one it had armed itself."'],
    [rcDoor('batetela1'), rcDoor('batetela2'), RC_BACK]),

  fanScene('lpg_rc_commission', 'The Record — The King\'s Commission', 'palace',
    stage(el('lpg_rc_commission_a', 'leopold', 50, 60)),
    ['Narrator: "He sent his own inquiry up the river to put the thing to rest. It came back and agreed with Casement. He published a summary instead."'],
    [rcDoor('commission1'), rcDoor('commission2'), RC_BACK]),

  fanScene('lpg_rc_testimony', 'The Record — The Testimony', 'village',
    stage(el('lpg_rc_testimony_a', 'casement', 50, 60)),
    ['Narrator: "Chiefs held in sheds, witnesses cut down to initials, and a length of knotted string keeping a count no ledger in Brussels would keep."'],
    [rcDoor('chiefs'), rcDoor('uu'), rcDoor('string')]),

  fanScene('lpg_rc_campaign', 'The Record — The Campaign', 'lecture',
    stage(el('lpg_rc_campaign_a', 'movement', 50, 60)),
    ['Narrator: "The first modern human-rights campaign, assembled out of lantern slides, pamphlets, a shipping clerk\'s arithmetic, and one preacher who would not shut up about the Kasai."'],
    ['- "The lantern tours" -> lpg_rc_lantern', '- "The King\'s press, and its exposure" -> lpg_rc_press',
      '- "Sheppard, and the trial" -> lpg_rc_sheppard']),

  fanScene('lpg_rc_lantern', 'The Record — The Lantern Tours', 'lecture',
    stage(el('lpg_rc_lantern_a', 'movement', 50, 60)),
    ['Narrator: "A magic lantern, a bedsheet, and Alice Harris\'s photographs at four feet across. It crossed the Atlantic and picked up allies nobody in Brussels had budgeted for."'],
    [rcDoor('lantern_us1'), rcDoor('lantern_us2'), rcDoor('doyle')]),

  fanScene('lpg_rc_press', 'The Record — The King\'s Press', 'palace',
    stage(el('lpg_rc_press_a', 'leopold', 50, 60)),
    ['Narrator: "He bought newspapers the way he bought rubber: wholesale, quietly, and with somebody else\'s money. Then somebody printed the invoices."'],
    [rcDoor('press1'), rcDoor('press2'), rcDoor('kodak')]),

  fanScene('lpg_rc_sheppard', 'The Record — Sheppard', 'village',
    stage(el('lpg_rc_sheppard_a', 'sheppard', 50, 60)),
    ['Narrator: "A Black American preacher walks into the Kasai, counts what the company left, and gets sued for saying so. Then wins."'],
    [rcDoor('sheppard1'), rcDoor('sheppard2'), RC_BACK]),

  fanScene('lpg_rc_money', 'The Record — The Money', 'docks',
    stage(el('lpg_rc_money_a', 'morel', 50, 60)),
    ['Narrator: "Here is where the chapter stops being about a wicked king and starts being about rent. Follow the number."'],
    ['- "The arithmetic, staged" -> lpg_rc_arith', '- "Where the money went" -> lpg_rc_purse',
      '- "The men, the instruments, the monuments" -> lpg_rc_men']),

  fanScene('lpg_rc_arith', 'The Record — The Arithmetic', 'lecture',
    stage(el('lpg_rc_arith_a', 'movement', 50, 60)),
    ['Narrator: "Fifteen shillings and tenpence. Three entries on what that number is, and what it is doing standing where a wage should be."'],
    [rcDoor('arith1'), rcDoor('arith2'), rcDoor('bongandanga')]),

  fanScene('lpg_rc_purse', 'The Record — Where the Money Went', 'docks',
    stage(el('lpg_rc_purse_a', 'morel', 50, 60)),
    ['Narrator: "The margin, the share register, and seventy million francs that never once passed through a Congolese hand on the way to Brussels."'],
    [rcDoor('margin'), rcDoor('shares'), rcDoor('fortune')]),

  fanScene('lpg_rc_men', 'The Record — The Men', 'station',
    stage(el('lpg_rc_men_a', 'officer', 50, 60)),
    ['Narrator: "The rate was not collected by an abstraction. It was collected by men with names, using an instrument with a name."'],
    ['- "The instrument, and the men who used it" -> lpg_rc_instr',
      rcDoor('rom'),
      '- "The monuments the rubber paid for" -> lpg_rc_monuments']),

  fanScene('lpg_rc_instr', 'The Record — The Instrument', 'station',
    stage(el('lpg_rc_instr_a', 'officer', 50, 60)),
    ['Narrator: "A whip of dried hippopotamus hide, and two commissioners who wrote down what they did with it, in their own hands, for their own files."'],
    [rcDoor('chicotte'), rcDoor('fievez'), rcDoor('lemaire')]),

  fanScene('lpg_rc_monuments', 'The Record — The Monuments', 'palace',
    stage(el('lpg_rc_monuments_a', 'leopold', 50, 60)),
    ['Narrator: "He spent it on stone. Arches, galleries, a seaside, a museum — and in 1897 he put two hundred and sixty-seven people in a park and charged admission."'],
    [rcDoor('tervuren1'), rcDoor('tervuren2'), '- "The arch, the seaside, the conference" -> lpg_rc_stone']),

  fanScene('lpg_rc_stone', 'The Record — The Stone', 'palace',
    stage(el('lpg_rc_stone_a', 'leopold', 50, 60)),
    ['Narrator: "Three more monuments, all of them still standing, all of them paid for out of the Congo. Read the plaques. The plaques do not say so."'],
    [rcDoor('arch'), rcDoor('ostend'), rcDoor('antislavery')]),
];

const RECORD_SCENES = [recordHub, ...recordGroups, ...recordScenes];

// ---- the desk, in three doors -------------------------------------------
// The palace used to open on nine. Now: the order, the archive, the engine.
const PALACE_FAN = [
  fanScene('lp_order', 'The Order', 'palace',
    stage(el('lp_order_king', 'leopold', 32, 60)),
    [
      'Leopold: "The concession reports are not encouraging. Returns down, villages resisting, agents making excuses in three languages."',
      'Narrator: "He will never see the country he is about to change. He will write one sentence and a forest will empty. Which sentence?"',
    ],
    [
      '- "Double the rubber quota — the returns must not fall" -> lp_quota',
      '- "Order hostages taken until the villages comply" -> lp_hostages',
      '- "Not yet — back to the desk" -> lp_palace',
    ]),

  fanScene('lp_archive', 'The Archive', 'lecture',
    stage(el('lp_archive_move', 'movement', 50, 60)),
    [
      'Narrator: "Set the pen down. Everything the King managed was written down by somebody — by consuls, by shipping clerks, by the company itself in its own ledgers, and by the people it was done to, who have been saying so since the first day."',
      'Narrator: "This is that archive. It does not need you to hold the pen."',
    ],
    [
      '- "Voices of the Congo — the record, moment by moment" -> lp_voices',
      '- "The shelves — duets, aftermaths, the record" -> lp_shelves',
      '- "Two witness reels" -> lp_reels',
    ]),

  fanScene('lp_shelves', 'The Shelves', 'lecture',
    stage(el('lp_shelves_shep', 'sheppard', 28, 61), el('lp_shelves_move', 'movement', 72, 60)),
    ['Narrator: "Three shelves. Duets are the conversations the record allows. Aftermaths are what the same event looks like a generation later. The Record is everything the main story walks past."'],
    [
      '- "Duets — two voices, one record" -> lp_duets',
      '- "Aftermaths — that week, a year on, a generation on" -> lp_aftermaths',
      '- "The Record — uncovered research" -> lp_record',
    ]),

  fanScene('lp_reels', 'Two Reels', 'village',
    stage(el('lp_reels_comm', 'community', 50, 60)),
    ['Narrator: "Two reels, and no choices inside either one. A village, and a lecture hall in England where the village is four feet across on a bedsheet."'],
    [
      '- "Witness: The Village" -> lp_cut_village',
      '- "Witness: The Lantern Lecture" -> lp_cut_lantern',
      '- "Return to Brussels" -> lp_palace',
    ]),
];

// ------------------------------------------- Cutscenes + the Georgist ledger
// Two non-interactive documentary cutscenes ([AUTOPLAY on] .. [AUTOPLAY off]),
// each exiting into an IMPACT scene that reads the era in Henry George's
// terms on live gauges, then offers the Machine itself (lp_machine).
// Register: documentary restraint — absence, aftermath, testimony, witness.

const MACHINE_SCENES = [
  // -------- Cutscene A: The Village --------
  {
    id: 'lp_cut_village',
    name: 'Witness: The Village',
    sceneType: 'WITNESS',
    dropId: ART.village ? 'village_drop' : null,
    stage: stage(el('lp_cv_comm', 'community', 50, 62)),
    script: lines(
      '[AUTOPLAY on]',
      '[SET cvFade = 1]',
      '[BIND lp_cv_comm.opacity to cvFade]',
      '[WAIT 5s]',
      'Narrator: "A village in the ABIR concession, on the Lopori river. Look at it while it is still here."',
      '[WAIT 3s]',
      'Narrator: "Forty houses. Gardens of manioc and plantain behind them. A smithy. Drying racks for the nets. A palaver tree where disputes were argued and marriages settled. People lived on this ground for longer than Belgium has existed."',
      '[WAIT 4s]',
      '[EFFECT fade_out on lp_cv_comm]',
      'Narrator: "Then the quota. The first year, the men tapped the vines near the village and made the weight."',
      '[SET cvFade = 0.7]',
      '[WAIT 3s]',
      'Narrator: "The second year the near vines were bled dead. The men walked two days into the forest, and the gardens went to weeds."',
      '[SET cvFade = 0.45]',
      '[WAIT 3s]',
      'Narrator: "The third year the sentries came to live at the village, and the weighing shed was built, and those who could leave began to leave."',
      '[SET cvFade = 0.2]',
      '[WAIT 3s]',
      'Narrator: "There is no fourth year to tell."',
      '[SET cvFade = 0]',
      '[CLEAR_EFFECT fade_out from lp_cv_comm]',
      '[WAIT 5s]',
      'Narrator: "The houses stand. The cooking pots sit where they were set down, mid-meal. That is the whole of what the camera finds, and the whole of what it needs."',
      '[WAIT 5s]',
      '[AUTOPLAY off]',
      '[SCENE lp_impact_village]',
    ),
    status: 'work',
  },

  // -------- Impact A: the ledger of the quota years --------
  {
    id: 'lp_impact_village',
    name: 'The Ledger: Rent at Gunpoint',
    sceneType: 'WITNESS',
    dropId: ART.village ? 'village_drop' : null,
    stage: stage(
      balloon('lp_iv_title', 'THE GEORGIST LEDGER — CONGO FREE STATE', 55, 8, { scale: 1.1, zIndex: 5 }),
    ),
    script: lines(
      '[GAUGE greed at 12,18 min=0 max=100 label="GREED"]',
      '[GAUGE repression at 12,38 min=0 max=100 label="REPRESSION"]',
      '[GAUGE education at 12,58 min=0 max=100 label="EDUCATION"]',
      '[GAUGE marginHeight at 12,78 min=0 max=100 label="THE MARGIN"]',
      '# rewind the dials to the eve of the quota years, then let the era in',
      '[SET greed = 60]',
      '[SET repression = 45]',
      '[SET education = 10]',
      '[SET marginHeight = 100]',
      '[TICK 300ms]',
      '# the quota years, one notch at a time',
      '[IF greed < 95]',
      '[SET greed = min(greed + 2, 95)]',
      '[ENDIF]',
      '[IF repression < 90]',
      '[SET repression = min(repression + 3, 90)]',
      '[ENDIF]',
      '[IF marginHeight > 12]',
      '[SET marginHeight = max(marginHeight - 4, 12)]',
      '[ENDIF]',
      '[/TICK]',
      'Narrator: "Read the village as Henry George would. The rubber quota is rent — the price of being allowed to exist on land that someone in Brussels claims to own — and it is collected at gunpoint."',
      'Narrator: "Watch the margin. The margin is the best land free labor can still reach without paying an owner. When one man owns a million square miles, the margin is driven to the floor — and wages fall with it, everywhere, to bare survival and below."',
      'Narrator: "Greed sets the quota. Repression enforces it. There is no wage fund and no market here: product in, guns out. The machine stands naked in the Congo — every later, politer version is built to disguise exactly this."',
      'Narrator: "One dial has not moved: education. What the world knows. It stands at almost nothing — and it is the only counter-force this machine has ever feared."',
      '[CHOICE]',
      '- "See it feed the Machine" -> lp_machine',
      '- "Back" -> lp_palace',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // -------- Cutscene B: The Lantern Lecture --------
  {
    id: 'lp_cut_lantern',
    name: 'Witness: The Lantern Lecture',
    sceneType: 'WITNESS',
    dropId: ART.lecture ? 'lecture_drop' : null,
    stage: stage(
      el('lp_cl_kodak', 'kodak', 50, 70, 1.3),
      balloon('lp_cl_marquee', 'THE CONGO MEETING — THE EVIDENCE, WITH LANTERN ILLUSTRATIONS', 50, 10, { scale: 1.1, zIndex: 5 }),
    ),
    script: lines(
      '[AUTOPLAY on]',
      '[WAIT 4s]',
      'Narrator: "A hall in Britain, 1906. One of hundreds this year. The Congo Reform Association does not shout. It projects."',
      '[WAIT 3s]',
      '[SET_TEXT lp_cl_marquee "LAKE MANTUMBA DISTRICT — 240 PERSONS, ONE TON OF FOODSTUFFS WEEKLY, 15s 10d RETURNED"]',
      'Narrator: "The slides are places, dates, ledger entries. Every one documented. Every one has survived cross-examination."',
      '[WAIT 4s]',
      '[SET_TEXT lp_cl_marquee "THE ABIR CONCESSION, 1903 — AT LEAST 122 DEAD ON ONE RUBBER EXPEDITION"]',
      '[WAIT 4s]',
      '[SET_TEXT lp_cl_marquee "ABIR SHARE, 1892: 500 FRANCS. 1903: 15,000. DIVIDEND: 1 FRANC TO 1,200."]',
      '[WAIT 4s]',
      '[SET_TEXT lp_cl_marquee "LULUABOURG, 1895 — THE FORCE PUBLIQUE TURNS ITS RIFLES ON THE REGIME"]',
      '[WAIT 4s]',
      '[SET_TEXT lp_cl_marquee "BOMA, FEBRUARY 1904 — THE CASEMENT REPORT: FORTY PAGES OF FINDINGS, TWENTY OF SWORN TESTIMONY"]',
      '[WAIT 4s]',
      '[SET_TEXT lp_cl_marquee "NSONGO DISTRICT, 1904 — NSALA OF WALA. HIS DAUGHTER WAS NAMED BOALI."]',
      '[WAIT 5s]',
      '[EFFECT glow on lp_cl_kodak]',
      'Narrator: "On the table beside the lantern: a box Kodak. It has crossed the ocean twice."',
      '[WAIT 3s]',
      `Narrator: "Mark Twain, writing in the King's own voice: 'The kodak has been a sore calamity to us. The most powerful enemy that has confronted us, indeed.'"`,
      '[WAIT 4s]',
      '[CLEAR_EFFECT glow from lp_cl_kodak]',
      'Narrator: "The audience does not move. Row after row of silhouettes, holding still, doing the one thing the whole campaign was built to make possible: looking."',
      '[WAIT 5s]',
      '[AUTOPLAY off]',
      '[SCENE lp_impact_lantern]',
    ),
    status: 'work',
  },

  // -------- Impact B: the ledger of the counter-force --------
  {
    id: 'lp_impact_lantern',
    name: 'The Ledger: The Counter-Force',
    sceneType: 'WITNESS',
    dropId: ART.lecture ? 'lecture_drop' : null,
    stage: stage(
      balloon('lp_il_title', 'THE GEORGIST LEDGER — THE REFORM MECHANISM', 55, 8, { scale: 1.1, zIndex: 5 }),
    ),
    script: lines(
      '[GAUGE greed at 12,14 min=0 max=100 label="GREED"]',
      '[GAUGE repression at 12,31 min=0 max=100 label="REPRESSION"]',
      '[GAUGE education at 12,48 min=0 max=100 label="EDUCATION / EXPOSURE"]',
      '[GAUGE marginHeight at 12,65 min=0 max=100 label="THE MARGIN"]',
      '[GAUGE prestige at 12,82 min=0 max=100 label="PRESTIGE"]',
      '# start from the quota-era floor, then let the campaign in',
      '[SET greed = 95]',
      '[SET repression = 90]',
      '[SET education = 10]',
      '[SET marginHeight = 12]',
      '[SET prestige = 80]',
      '[TICK 300ms]',
      '# the reform mechanism: exposure climbs, and prestige corrodes with it',
      '[IF education < 65]',
      '[SET education = min(education + 2, 65)]',
      '[ENDIF]',
      '[IF prestige > 30]',
      '[SET prestige = max(prestige - 2, 30)]',
      '[ENDIF]',
      '[IF education >= 40]',
      '[IF repression > 70]',
      '[SET repression = max(repression - 1, 70)]',
      '[ENDIF]',
      '[IF marginHeight < 30]',
      '[SET marginHeight = min(marginHeight + 1, 30)]',
      '[ENDIF]',
      '[ENDIF]',
      '[/TICK]',
      `Narrator: "Now the counter-force, and it is not an army. Watch education climb: a consul's report, a clerk's ledgers, sixty lantern slides. What the public knows."`,
      `Narrator: "And watch prestige fall with it. The King's whole system rests on a story — philanthropy, civilization, the suppression of slavers. Education corrodes prestige. That is the reform mechanism, the whole of it."`,
      'Narrator: "When the story dies, the rest follows: the quota loses its respectable name, repression loses its cover, and the margin lifts off the floor — not far, and not fast, but measurably. In 1908 the corroded prestige can no longer hold the Congo, and Belgium takes it from its King."',
      `Narrator: "George's ledger closes on the line the campaign proved: rent taken at gunpoint can outlast anything except being seen."`,
      '[CHOICE]',
      '- "See it feed the Machine" -> lp_machine',
      '- "Back" -> lp_palace',
      '[/CHOICE]',
    ),
    status: 'work',
  },

  // -------- The Machine, 1904 --------
  machineHubScene({
    id: 'lp_machine',
    name: 'The Machine, 1904',
    pool: 'leopold_reactions',
    panel: 'drama',
    endings: false,
    autopilot: false,
    buttons: ['lp_back_button'],
  }),
];

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB — King Leopold: The Kodak and the King',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {
      // Georgist rig baseline, pre-seeded for the Congo Free State era:
      // naked extraction (greed 95, repression 90), a world that does not
      // yet know (education 10), a King still applauded (prestige 80).
      ...WORLD_BASE,
      greed: 95, repression: 90, education: 10, prestige: 80,
      cvFade: 1,
      exposure: 0, concealment: 0, rumor: 0,
      pressFunded: 0, commissioned: 0, quotaDoubled: 0, hostages: 0,
      testimony: 0, thinDossier: 0, celebrities: 0,
    },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'lp_palace',
    enableAutosave: true,
  },

  actors: [
    actor('leopold', 'Leopold', ART.king, [
      ['Sit', 'Smug', ART.kingSit],
      ['Pointing', 'Angry', ART.kingPoint],
    ]),
    actor('casement', 'Casement', ART.casement, [
      ['Closeup', 'Determined', ART.casementCloseup],
    ]),
    actor('morel', 'Morel', ART.morel, [
      ['Pointing', 'Surprised', ART.morelPoint],
    ]),
    actor('harris', 'Harris', ART.harris, [
      ['Crouch', 'Determined', ART.harrisCrouch],
    ]),
    actor('officer', 'Officer', ART.officer),
    actor('sheppard', 'Sheppard', ART.sheppard),
    actor('kodak', 'The Kodak', ART.kodak),
    actor('community', 'The Community', ART.community),
    actor('movement', 'The Movement', ART.movement),
    // Voice-only figures for the Duets (no art; the engine renders name-only)
    { id: 'stanley', name: 'Stanley', graphics: [], status: 'work' },
    { id: 'twain', name: 'Twain', graphics: [], status: 'work' },
    // Voice-only witnesses from the Pass 2 dossier (The Record):
    // Tswambe's words are reported via a Catholic priest (Hochschild);
    // Lemaire's are his own, written after retirement.
    { id: 'tswambe', name: 'Tswambe', graphics: [], status: 'work' },
    { id: 'lemaire', name: 'Lemaire', graphics: [], status: 'work' },
    // Machine core cast (empty graphics — the rig renders placeholders)
    ...CORE_ACTORS,
  ].filter(Boolean),

  drops: [
    drop('palace_drop', 'Brussels Palace Office', ART.palace),
    drop('station_drop', 'Congo River Station', ART.station),
    drop('village_drop', 'The Empty Village', ART.village),
    drop('docks_drop', 'Liverpool Docks', ART.docks),
    drop('lecture_drop', 'The Lantern Lecture Hall', ART.lecture),
  ].filter(Boolean),

  sfx: [
    { id: 'glow', name: 'Kodak Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
    { id: 'shake', name: 'Report Lands', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
    { id: 'fade_out', name: 'Documentary Fade', type: 'fade', category: 'DO', params: { intensity: 50 }, status: 'work' },
    // Machine core effects the rig's tick expects (merge missing ids only)
    ...CORE_SFX.filter((s) => !['glow', 'shake', 'fade_out'].includes(s.id)),
  ],

  items: [],
  buttons: [
    {
      id: 'lp_back_button', name: 'Return to Brussels', label: 'BRUSSELS',
      x: 50, y: 4, width: 12, height: 6,
      targetSceneId: 'lp_palace', status: 'work',
    },
  ],

  scenes: [
    // ------------------------------------------------ 1. The palace (Leopold's seat, round 1)
    {
      id: 'lp_palace',
      name: 'The Desk That Never Saw the Congo',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_p_king', 'leopold', 32, 60)),
      script: lines(
        'Narrator: "Brussels, 1900. King Leopold II owns the Congo Free State personally — a million square miles he has never set foot in. At Berlin in 1885, Europe blessed it as a work of Christian charity."',
        poseLine('leopold', 'Sit', 'Smug', ART.kingSit),
        'Leopold: "My International African Association exists to suppress the slave trade. The powers have said so. The maps on this wall say so."',
        'Narrator: "He governs the rubber country from this chair. He will die without ever having seen it. The concession reports are on the desk: returns falling, villages resisting, quotas unmet."',
        'Leopold: "If there are these abuses in the Congo, we must stop them. If they continue, it will be the end of the state. (attributed, 1896)"',
        'Narrator: "He does not stop them. He manages them. You hold the pen."',
        '[CHOICE]',
        '- "Give the order — the returns must not fall" -> lp_order',
        '- "Open the archive instead" -> lp_archive',
        '- "Enter the Machine" -> lp_machine',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 1a. Quota branch
    {
      id: 'lp_quota',
      name: 'The Impossible Quota',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_q_king', 'leopold', 32, 60)),
      script: lines(
        '[SET quotaDoubled = 1]',
        '[SET concealment = concealment + 1]',
        'Leopold: "The ABIR concession will double its per-village quota. Wild rubber does not harvest itself. See that the agents understand: shortfalls are their failure, and failures are... corrected."',
        'Narrator: "The quotas were already impossible. Villagers abandoned their farms to bleed the vines farther and farther into the forest; hunger followed. On paper, it is only a number doubled. Everything else happens off the page — which is the point."',
        '[SCENE lp_station]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 1b. Hostage branch
    {
      id: 'lp_hostages',
      name: 'The Hostage Ledger',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_h_king', 'leopold', 32, 60)),
      script: lines(
        '[SET hostages = 1]',
        '[SET concealment = concealment + 2]',
        'Leopold: "The Force Publique may hold the women and children of a village until its men deliver the rubber. Call it... surety. Record it as surety."',
        'Narrator: "The Casement Report will later document exactly this order in operation: women held hostage until the men delivered rubber, entered in station ledgers like goods in bond. It is efficient. It is also written down — and everything written down can one day be read aloud in Parliament."',
        '[SCENE lp_station]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 2. The river station
    {
      id: 'lp_station',
      name: 'The Quota',
      sceneType: 'WITNESS',
      dropId: ART.station ? 'station_drop' : null,
      stage: stage(el('lp_s_officer', 'officer', 30, 61), el('lp_s_sheppard', 'sheppard', 71, 62)),
      script: lines(
        'Narrator: "A river station in the ABIR concession. Baskets of wild rubber stand weighed and stacked on the landing. The company sets each village a quota, enforced on pain of death."',
        'Officer: "Two hundred and forty persons, compelled to supply one ton of foodstuffs per week. They receive fifteen shillings tenpence. The ledger balances."',
        'Officer: "And the rubber: at Bongandanga, three kilograms of dried rubber per man per fortnight, verified by basket. The basket is the law here. Everything else is commentary."',
        '[IF quotaDoubled == 1]',
        'Officer: "New instruction from Brussels: the quota is doubled. The vines nearby are bled dry; the men will walk two days now to find rubber. The ledger will still balance. Ledgers always balance."',
        'Sheppard: "Doubled. You know what that number does. Not to the ledger — to the villages."',
        '[ENDIF]',
        '[IF hostages == 1]',
        'Officer: "New instruction from Brussels: surety may be taken. The station downriver holds forty women against delivery. It is entered in the book, all quite regular."',
        'Sheppard: "Entered in the book. I have copied that page, Lieutenant. Word for word."',
        '[ENDIF]',
        'Sheppard: "The ledger balances because the villages empty. I have walked the Kasai. The people abandon their farms to bleed the vines, and when the quota falls short — I have written down what happens then."',
        'Officer: "You missionaries and your notebooks."',
        'Sheppard: "Notebooks, Lieutenant. And soon, cameras. What is done here is done in the dark. The dark is ending."',
        '[SCENE lp_docks]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 3. Morel on the docks (reformers' seat)
    {
      id: 'lp_docks',
      name: 'The Shipping Records',
      sceneType: 'WITNESS',
      dropId: ART.docks ? 'docks_drop' : (ART.station ? 'station_drop' : null),
      stage: stage(el('lp_d_morel', 'morel', 50, 61)),
      script: lines(
        'Narrator: "Liverpool, around 1900. E.D. Morel, a shipping clerk for the Elder Dempster line, checks the manifests of the Congo boats — and cannot stop checking them."',
        'Morel: "Rubber in. Ivory in. Fortunes in. And going out... I have the outbound manifests here. Guns. Cartridges. Chains. No trade goods. Nothing to pay anyone with."',
        poseLine('morel', 'Pointing', 'Surprised', ART.morelPoint),
        'Morel: "There. Look at it. Nothing is being bought. If nothing is paid, the rubber is not trade. It is forced labor — the ledgers prove it, column by column."',
        'Narrator: "It is one of history\'s great data-analysis epiphanies: a clerk reading atrocity off a cargo manifest. Morel quits his desk. Now the question is what a man with arithmetic and no army does next. You are that man."',
        neutral('morel'),
        'Morel: "They have the Congo. We have the arithmetic. The only question is when to fire it."',
        '[CHOICE]',
        '- "Publish now — the ledgers alone, before the trail cools" -> lp_publish',
        '- "Wait. Gather sworn testimony to stand behind the numbers" -> lp_gather',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 3a. Publish-now branch
    {
      id: 'lp_publish',
      name: 'The Thin Dossier',
      sceneType: 'WITNESS',
      dropId: ART.docks ? 'docks_drop' : (ART.station ? 'station_drop' : null),
      stage: stage(el('lp_pu_morel', 'morel', 50, 61)),
      script: lines(
        '[SET thinDossier = 1]',
        '[SET exposure = exposure + 1]',
        'Morel: "Print it. Columns, tonnages, dates. Let Brussels explain a colony that exports fortunes and imports only cartridges."',
        'Narrator: "The articles land — and slide. Numbers without faces are deniable; the King\'s friendly papers call it a clerk\'s grudge. The arithmetic is right, and it is not yet enough. But the first crack is made, and cracks spread."',
        '[SCENE lp_village]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 3b. Testimony branch
    {
      id: 'lp_gather',
      name: 'The Sworn Statements',
      sceneType: 'WITNESS',
      dropId: ART.docks ? 'docks_drop' : (ART.station ? 'station_drop' : null),
      stage: stage(el('lp_g_morel', 'morel', 34, 61), el('lp_g_sheppard', 'sheppard', 70, 62)),
      script: lines(
        '[SET testimony = 1]',
        '[SET exposure = exposure + 2]',
        'Morel: "Numbers can be shrugged at. Numbers plus witnesses cannot. Reverend Sheppard — your notebooks. May I print what you saw, over your name?"',
        'Sheppard: "Over my name. I did not walk the Kasai and write it down to keep it private. Take the station ledger page too — their own book, their own hand."',
        'Narrator: "Ledgers from Liverpool, sworn statements from the Kasai. When this dossier fires, there will be nothing soft for the King\'s papers to push against."',
        '[SCENE lp_village]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 4. The empty village
    {
      id: 'lp_village',
      name: 'The Kodak',
      sceneType: 'WITNESS',
      dropId: ART.village ? 'village_drop' : null,
      stage: stage(
        el('lp_v_harris', 'harris', 30, 62),
        el('lp_v_kodak', 'kodak', 52, 68, 1.4),
        balloon('exposure_ticker', 'THE PRESSES ARE QUIET — FOR NOW', 50, 12, { scale: 1.1, zIndex: 5 }),
      ),
      script: lines(
        '[GAUGE exposure at 88,70 min=0 max=8 label="EXPOSURE"]',
        '[GAUGE concealment at 88,84 min=0 max=8 label="CONCEALMENT"]',
        '[TICK 2s]',
        '[SET rumor = rumor + 1]',
        '[IF rumor >= 4]',
        '[SET_TEXT exposure_ticker "SHIPS RETURN FULL OF RUBBER, SAIL OUT FULL OF GUNS"]',
        '[ENDIF]',
        '[IF rumor >= 8]',
        '[SET_TEXT exposure_ticker "MISSIONARIES SHOW THE LANTERN SLIDES OF THE SEVERED"]',
        '[ENDIF]',
        '[IF rumor >= 12]',
        '[SET_TEXT exposure_ticker "CONSUL CASEMENT: THE FACTS ARE WORSE THAN RUMOR"]',
        '[ENDIF]',
        '[IF rumor >= 16]',
        '[SET_TEXT exposure_ticker "TWAIN MOCKS THE KING: \'PIETY OOZING FROM EVERY PORE\'"]',
        '[ENDIF]',
        '[IF rumor >= 20]',
        '[SET_TEXT exposure_ticker "A QUESTION IS PUT DOWN IN THE COMMONS ABOUT THE CONGO"]',
        '[ENDIF]',
        '[/TICK]',
        'Narrator: "A village in the rubber country, 1904. The houses stand. The cooking pots sit where they were set down, mid-meal. No one is here. The quota came, and then the sentries, and then nothing."',
        'Harris: "No bodies. No smoke. Just... interruption. A meal that was never finished."',
        'Sheppard: "I have seen a hundred of these in the Kasai. The forest takes them back in two seasons. The company books record them only as a shortfall."',
        'Harris: "The books lie beautifully. This does not."',
        '[EFFECT glow on lp_v_kodak]',
        poseLine('harris', 'Crouch', 'Determined', ART.harrisCrouch),
        'Narrator: "Alice Seeley Harris kneels and levels the box Kodak. What she photographs in these districts — including a father named Nsala, seated on a mission veranda with what the ABIR militia left him of his five-year-old daughter, Boali — will be projected from lantern slides in a thousand halls across Britain and America."',
        'Harris: "Hold still. The light is good."',
        'Narrator: "The shutter clicks. Mark Twain, writing in the King\'s own voice a year later, names the weapon: \'The kodak has been a sore calamity to us. The most powerful enemy that has confronted us, indeed.\'"',
        neutral('harris'),
        '[CLEAR_EFFECT glow from lp_v_kodak]',
        '[CHOICE]',
        '- "Carry the photographs to Consul Casement" -> lp_casement',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 5. Casement writes (reformers' seat)
    {
      id: 'lp_casement',
      name: 'Writing the Report',
      sceneType: 'WITNESS',
      dropId: ART.station ? 'station_drop' : null,
      stage: stage(el('lp_c_casement', 'casement', 40, 61), el('lp_c_harris', 'harris', 74, 62)),
      script: lines(
        'Narrator: "Boma, late 1903. British consul Roger Casement has spent months on the upper river taking sworn statements. Now he writes: forty pages for Parliament, twenty more of testimony, appended and named."',
        poseLine('casement', 'Closeup', 'Determined', ART.casementCloseup),
        'Casement: "The facts are worse than the rumors. Villages compelled at gunpoint. Soldiers made to account for every cartridge fired. I will state it plainly and attach the proofs."',
        '[IF hostages == 1]',
        'Casement: "And the surety ledgers. Women held against rubber, entered in the company\'s own hand. They wrote it down for me."',
        '[ENDIF]',
        '[IF quotaDoubled == 1]',
        'Casement: "The doubled quota is in their own circulars. I need invent nothing. I need only append."',
        '[ENDIF]',
        '[IF thinDossier == 1]',
        'Harris: "Morel\'s articles were called a clerk\'s grudge. Your report will give his columns their faces."',
        '[ENDIF]',
        '[IF testimony == 1]',
        'Harris: "Morel is holding his dossier for you — ledgers and sworn statements together. Your report will be the third rail of it."',
        '[ENDIF]',
        neutral('casement'),
        'Casement: "A report can be shelved. A movement cannot. When this is printed, Mrs. Harris, what do we do with it?"',
        '[CHOICE]',
        '- "Take it to the famous pens — Twain, Conan Doyle" -> lp_allies',
        '- "Straight to Parliament — let the record speak" -> lp_parliament',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 5a. Celebrity allies branch
    {
      id: 'lp_allies',
      name: 'The Famous Pens',
      sceneType: 'WITNESS',
      dropId: ART.lecture ? 'lecture_drop' : (ART.palace ? 'palace_drop' : null),
      stage: stage(el('lp_a_morel', 'morel', 34, 61), el('lp_a_harris', 'harris', 70, 62)),
      script: lines(
        '[SET celebrities = 1]',
        '[SET exposure = exposure + 2]',
        'Morel: "Twain has agreed. He is writing the King\'s own soliloquy — Leopold defending himself in his own voice, and damning himself with every line. Conan Doyle is drafting a book. Booker T. Washington will speak in America."',
        'Harris: "Then the photographs will not travel alone. Every lantern slide will arrive with a famous sentence around its neck."',
        'Narrator: "1905: \'King Leopold\'s Soliloquy\' sells in the tens of thousands. 1909: Conan Doyle\'s \'The Crime of the Congo\', written in eight days. The campaign now has ledgers, testimony, photographs — and celebrity."',
        '[SCENE lp_response]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 5b. Parliament-only branch
    {
      id: 'lp_parliament',
      name: 'The Blue Book',
      sceneType: 'WITNESS',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_pa_casement', 'casement', 50, 61)),
      script: lines(
        '[SET exposure = exposure + 1]',
        'Casement: "February 1904. The report is laid before Parliament as a Blue Book. No adjectives. Witnessed, named, appended."',
        'Narrator: "The record speaks — to those who read records. The Foreign Office hedges; names are redacted to initials; the King\'s papers call it exaggeration. Sober truth, unamplified, travels slower than it deserves."',
        '[SCENE lp_response]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 6. The King responds (Leopold's seat, round 2)
    {
      id: 'lp_response',
      name: 'The Report Lands',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_r_king', 'leopold', 30, 60), el('lp_r_casement', 'casement', 71, 62)),
      script: lines(
        'Narrator: "Brussels. The Casement Report is on the King\'s desk, beside the press clippings and the first lantern-lecture notices."',
        '[EFFECT shake on stage]',
        'Casement: "Parliament has the testimony. Morel has the shipping ledgers. Mrs. Harris has the photographs. You may bribe a newspaper, Majesty. You cannot bribe a negative."',
        'Leopold: "You have been listening to missionaries. And their little cameras."',
        '[IF hostages == 1]',
        'Casement: "Your own station books record the hostages, Majesty. Your clerks were more honest than your speeches."',
        '[ENDIF]',
        '[IF quotaDoubled == 1]',
        'Casement: "Your doubled quota is in your own circulars. I did not have to prove your orders. You printed them."',
        '[ENDIF]',
        'Narrator: "The King must answer. You hold the pen again. What does he reach for?"',
        '[CHOICE]',
        '- "Fund the press syndicate — buy the story back" -> lp_press',
        '- "Concede a Commission of Inquiry" -> lp_commission',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 6a. Press branch
    {
      id: 'lp_press',
      name: 'The Press Syndicate',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_pr_king', 'leopold', 32, 60)),
      script: lines(
        '[SET pressFunded = 1]',
        '[SET concealment = concealment + 2]',
        poseLine('leopold', 'Pointing', 'Angry', ART.kingPoint),
        'Leopold: "A syndicate. Discreet payments to useful papers — that one, and that one, and the wire service. The missionary tales are hysteria; print that the Congo is a hospital, a school, a church."',
        neutral('leopold'),
        'Narrator: "Paid journalists and lobbyists discredit missionary reports. Truth is suppressed while the killing continues. It buys the King time — and it makes the eventual exposure detonate all the louder."',
        '[SCENE lp_lecture]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 6b. Commission branch
    {
      id: 'lp_commission',
      name: 'The Hollow Commission',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_cm_king', 'leopold', 32, 60)),
      script: lines(
        '[SET commissioned = 1]',
        '[SET exposure = exposure + 1]',
        'Leopold: "Very well — a Commission of Inquiry. My officials, my terms of reference, my Congo. Let it inquire."',
        'Narrator: "The 1904-05 commission is designed to be hollow — and betrays its designer. Even his own jurists, shown the evidence, confirm the abuses. Cosmetic reform follows; the extraction continues; but the King\'s own inquiry is now a citation against him."',
        '[SCENE lp_lecture]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 7. The lantern lecture (verdict)
    {
      id: 'lp_lecture',
      name: 'The Lantern Lecture',
      sceneType: 'WITNESS',
      dropId: ART.lecture ? 'lecture_drop' : (ART.village ? 'village_drop' : null),
      stage: stage(
        el('lp_l_morel', 'morel', 28, 62),
        el('lp_l_harris', 'harris', 72, 62),
        balloon('verdict_ticker', 'TONIGHT: THE CONGO ATROCITIES, WITH LANTERN ILLUSTRATIONS', 50, 12, { scale: 1.1, zIndex: 5 }),
      ),
      script: lines(
        'Narrator: "A darkened hall in Britain, one of hundreds. The Congo Reform Association\'s lantern shows put Harris\'s photographs before audiences no Blue Book would ever reach. The beam cuts the dark; the frame on the wall waits."',
        'Harris: "I do not raise my voice in these halls. I change the slide. The slide does the rest."',
        '[IF celebrities == 1]',
        'Morel: "And Twain\'s pamphlet sells at the door. \'The kodak has been a sore calamity to us.\' The King wrote none of it and confesses all of it."',
        '[ENDIF]',
        '[IF pressFunded == 1]',
        'Morel: "His syndicate answers us in the morning papers. Bought ink against lantern light. Each denial now sells more tickets than our posters do."',
        '[ENDIF]',
        '[IF commissioned == 1]',
        'Morel: "And we quote his own Commission from the stage. There is no rebuttal to a confession you commissioned yourself."',
        '[ENDIF]',
        '[IF testimony == 1]',
        'Harris: "Sheppard\'s sworn pages read aloud, then the slides. Testimony, then evidence. No one leaves unsure."',
        '[ENDIF]',
        '[IF thinDossier == 1]',
        'Harris: "The early articles were shrugged off — numbers without faces. The slides are the faces. We will not be shrugged at twice."',
        '[ENDIF]',
        'Narrator: "History weighs what the campaign built against what the palace hid."',
        '[IF exposure > concealment]',
        '[SCENE lp_funeral]',
        '[ENDIF]',
        '[SCENE lp_holdout]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 8a. Exposure ending: annexation
    {
      id: 'lp_funeral',
      name: 'The Booing',
      sceneType: 'WITNESS',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_f_morel', 'morel', 28, 62), el('lp_f_harris', 'harris', 72, 62)),
      script: lines(
        'Narrator: "1908. Under the sustained pressure of the Casement Report and Morel\'s campaign, Belgium annexes the Congo Free State from its King. Leopold\'s personal rule — the mask-off private-atrocity system — ends."',
        '[IF celebrities == 1]',
        'Morel: "Twain and Conan Doyle made the Congo impossible to ignore at dinner tables that never read a Blue Book. That, in the end, is what a parliament cannot outwait."',
        '[ENDIF]',
        'Morel: "Not a victory to toast. Extraction continues under the Belgian flag. But the thing that was his — the thing the arithmetic exposed — is finished."',
        'Narrator: "December 1909. Leopold II is dead. As the funeral cortege passes through Brussels, the crowds boo their King."',
        'Harris: "They booed. All that piety, all those bought headlines — and at the end, the crowd looked at him the way the camera did. Without flattery."',
        'Narrator: "In 1913 the Congo Reform Association dissolves itself, believing its work done — history\'s first successful mass human-rights campaign, driven by a clerk\'s ledgers, a consul\'s testimony, and a missionary\'s box Kodak. Scholars still dispute the full toll: modern estimates run from roughly 1.2 million to 10 million dead. Hochschild popularized ten million — about half the population — combining killing, forced-labor death, starvation, disease, and falling birth rates; Vansina and others caution the worst districts may not speak for the whole. The dispute is itself part of the record."',
        '[CHOICE]',
        '- "Play again" -> lp_palace',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 8b. Concealment ending: the delay
    {
      id: 'lp_holdout',
      name: 'The Bought Silence',
      sceneType: 'WITNESS',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_ho_king', 'leopold', 32, 60)),
      script: lines(
        poseLine('leopold', 'Sit', 'Smug', ART.kingSit),
        'Narrator: "For now, the propaganda holds. The syndicate\'s papers call the testimony hysteria; the lantern lectures play to thinner houses; the question in the Commons is talked out. The King keeps his Congo a while longer."',
        'Leopold: "You see? Patience, and ink. The public tires of atrocity faster than it tires of rubber."',
        'Narrator: "Understand what was won here: nothing but time. Every season of delay is paid in the rubber districts, in quotas and surety ledgers, off the page. Concealment is not innocence. It is interest, compounding."',
        neutral('leopold'),
        'Narrator: "And the delay ends. The negatives do not decay; the ledgers do not recant. In 1908 Belgium takes the Congo from its King anyway. In 1909 the funeral crowds boo him in the streets of Brussels. In 1913 the Congo Reform Association dissolves, its work — delayed, never defeated — done."',
        'Narrator: "History\'s verdict is not a race the truth can lose. It can only be made to run longer, and the entry fee is paid by others."',
        '[CHOICE]',
        '- "Play again" -> lp_palace',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ The desk's three doors
    ...PALACE_FAN,

    // ------------------------------------------------ Voices of the Congo (reaction layer)
    ...VOICES_SCENES,

    // ------------------------------------------------ Duets (two-voice chains)
    ...DUET_SCENES,

    // ------------------------------------------------ Aftermaths (three-distance chains)
    ...AFTERMATH_SCENES,

    // ------------------------------------------------ The Record (uncovered research)
    ...RECORD_SCENES,

    // ------------------------------------------------ Cutscenes, ledgers, the Machine
    ...MACHINE_SCENES,
  ],

  episodes: [
    {
      id: 'ep_leopold',
      name: 'The Kodak and the King',
      description: 'King Leopold II and the Congo Free State, 1885-1908: the propaganda machine, the quota system, and the first modern human-rights campaign.',
      sceneIds: [
        'lp_palace', ...PALACE_FAN.map((s) => s.id),
        'lp_quota', 'lp_hostages', 'lp_station',
        'lp_docks', 'lp_publish', 'lp_gather', 'lp_village',
        'lp_casement', 'lp_allies', 'lp_parliament', 'lp_response',
        'lp_press', 'lp_commission', 'lp_lecture', 'lp_funeral', 'lp_holdout',
      ],
      status: 'work',
    },
    {
      id: 'ep_leopold_voices',
      name: 'Voices of the Congo',
      description: 'A documentary reaction layer: ten recorded moments of the Congo Free State, 1885-1908, answered by the people who ran, endured, exposed, and ended it.',
      sceneIds: VOICES_SCENES.map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_leopold_duets',
      name: 'Duets',
      description: 'Seven two-voice conversation chains across the record, 1879-1909 — evidence strategy, the founding treaties, the King and his mirror, the camera, the interview that gives nothing, the taking of testimony, and Twain\'s Soliloquy staged as the satire it is.',
      sceneIds: DUET_SCENES.map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_leopold_aftermaths',
      name: 'Aftermaths',
      description: 'Four turns of the system — the quota, the hostage policy, the Casement Report, the annexation — each followed down two lines of sight: that week, a year on, a generation on.',
      sceneIds: AFTERMATH_SCENES.map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_leopold_record',
      name: 'The Record',
      description: 'Uncovered research: the Batetela mutinies, the Commission hearings, the American lantern tours, the press syndicate and its exposure, Conan Doyle, Sheppard\'s Kasai record and libel trial, the 15s 10d arithmetic, Tervuren — and the Pass 2 dossier: the Bongandanga quota, the red-rubber margin and share register, the King\'s seventy million, the chiefs in the sheds, the chicotte, Fiévez, Lemaire, Rom, the verbatim testimony, the knotted string, and the prestige machine in stone.',
      sceneIds: RECORD_SCENES.map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_leopold_machine',
      name: 'The Machine, 1904',
      description: 'Two documentary cutscenes, their Georgist ledger readings, and the era machine itself — the Congo Free State as the naked form of the rent engine.',
      sceneIds: MACHINE_SCENES.map((s) => s.id),
      status: 'work',
    },
  ],
};

// Prune stage elements referencing actors that failed to load.
const actorIds = new Set(game.actors.map((a) => a.id));
for (const s of game.scenes) {
  s.stage = s.stage.filter((e) => e.type !== 'ACTOR' || actorIds.has(e.assetId));
}

const outPath = resolve(root, 'public', 'hvb-leopold.json');
writeFileSync(outPath, JSON.stringify(game) + '\n', 'utf8');
const mb = (JSON.stringify(game).length / 1024 / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${mb} MB, ${game.scenes.length} scenes, ${game.actors.length} actors, ${game.drops.length} drops)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-leopold.json');
