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
};

const stage = (...els) => els.filter(Boolean);

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
        'Leopold: "If there are these abuses in the Congo, we must stop them. If they continue, it will be the end of the state." (attributed, 1896)',
        'Narrator: "He does not stop them. He manages them. You hold the pen. What does the King order?"',
        '[CHOICE]',
        '- "Double the rubber quota — the returns must not fall" -> lp_quota',
        '- "Order hostages taken until the villages comply" -> lp_hostages',
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
