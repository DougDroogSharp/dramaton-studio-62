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
import { lines, balloon } from '../machine-core.mjs';

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
    blurb: 'The concession companies — ABIR, the Anversoise — set each village a wild-rubber quota, enforced by armed sentries. Wild rubber does not farm; it must be bled from vines deeper and deeper in the forest.',
  },
  {
    id: 'bullets', title: 'The Bullet Accounting', drop: 'station',
    keys: { concealment: { target: 3, scale: 8 } },
    blurb: 'Force Publique officers must account for every cartridge issued, and the proof demanded of soldiers is not paper. The rule turns ammunition audits into mutilation — documented later, station by station, in the Casement Report.',
  },
  {
    id: 'hostages', title: 'The Hostage-Taking', drop: 'station',
    keys: { hostages: { target: 1, scale: 1 } },
    blurb: 'Stations hold women and children as surety until a village\'s men deliver rubber. The practice is entered in company ledgers — which is how it will one day be proved.',
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
      `Leopold (Sit/Smug): "ABIR returned a dividend past one hundred percent. Do not tell me the system fails."`,
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

for (const ev of EVENTS) {
  const entries = VOICES[ev.id] || [];
  const seen = {};
  const choiceLines = [];
  for (const v of entries) {
    seen[v.r] = (seen[v.r] || 0) + 1;
    const id = `vgl_${ev.id}_${v.r}${seen[v.r] > 1 ? seen[v.r] : ''}`;
    const label = `${RESP[v.r].label}${v.s ? ` — ${v.s}` : ''}`;
    choiceLines.push(`- "${label}" -> ${id}`);
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
      'Narrator: "Who speaks to this?"',
      '[CHOICE]',
      ...choiceLines,
      '- "Back to the moments" -> lp_voices',
      '[/CHOICE]',
    ),
    status: 'work',
  });
}

const voicesHub = {
  id: 'lp_voices',
  name: 'Voices of the Congo',
  sceneType: 'WITNESS',
  dropId: dropFor('lecture'),
  stage: stage(el('lp_vo_comm', 'community', 26, 60), el('lp_vo_move', 'movement', 74, 60)),
  script: lines(
    'Narrator: "The record of the Congo Free State, 1885-1908, moment by moment. Choose an event, then choose who answers it — drawn from the testimony, ledgers, and campaign literature of the period."',
    '[CHOICE]',
    ...EVENTS.map((ev) => `- "${ev.title}" -> evc_${ev.id}`),
    '- "Return to Brussels" -> lp_palace',
    '[/CHOICE]',
  ),
  status: 'work',
};

const VOICES_SCENES = [voicesHub, ...voiceChoosers, ...voiceVignettes];

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB — King Leopold: The Kodak and the King',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {
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
  ],

  items: [],
  buttons: [],

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
        'Narrator: "He does not stop them. He manages them. You hold the pen. What does the King order?"',
        '[CHOICE]',
        '- "Double the rubber quota — the returns must not fall" -> lp_quota',
        '- "Order hostages taken until the villages comply" -> lp_hostages',
        '- "Voices of the Congo — the record, moment by moment" -> lp_voices',
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
        'Narrator: "In 1913 the Congo Reform Association dissolves itself, believing its work done — history\'s first successful mass human-rights campaign, driven by a clerk\'s ledgers, a consul\'s testimony, and a missionary\'s box Kodak. Scholars still dispute the full toll — estimates range up to roughly ten million dead, though Vansina and others caution the worst districts may not speak for the whole."',
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

    // ------------------------------------------------ Voices of the Congo (reaction layer)
    ...VOICES_SCENES,
  ],

  episodes: [
    {
      id: 'ep_leopold',
      name: 'The Kodak and the King',
      description: 'King Leopold II and the Congo Free State, 1885-1908: the propaganda machine, the quota system, and the first modern human-rights campaign.',
      sceneIds: [
        'lp_palace', 'lp_quota', 'lp_hostages', 'lp_station',
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
