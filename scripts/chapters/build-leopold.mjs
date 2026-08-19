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
};

const actor = (id, name, image) =>
  image && {
    id,
    name,
    graphics: [{ id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image }],
    status: 'work',
  };

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
    worldState: { exposure: 0, pressFunded: 0, commissioned: 0 },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'lp_palace',
    enableAutosave: true,
  },

  actors: [
    actor('leopold', 'Leopold', ART.king),
    actor('casement', 'Casement', ART.casement),
    actor('morel', 'Morel', ART.morel),
    actor('harris', 'Harris', ART.harris),
    actor('officer', 'Officer', ART.officer),
    actor('sheppard', 'Sheppard', ART.sheppard),
    actor('kodak', 'The Kodak', ART.kodak),
  ].filter(Boolean),

  drops: [
    drop('palace_drop', 'Brussels Palace Office', ART.palace),
    drop('station_drop', 'Congo River Station', ART.station),
    drop('village_drop', 'The Empty Village', ART.village),
  ].filter(Boolean),

  sfx: [
    { id: 'glow', name: 'Kodak Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
    { id: 'shake', name: 'Report Lands', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
  ],

  items: [],
  buttons: [],

  scenes: [
    // ------------------------------------------------ 1. The palace
    {
      id: 'lp_palace',
      name: 'The Propaganda Machine',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_p_king', 'leopold', 32, 60)),
      script: lines(
        'Narrator: "Brussels, 1900. King Leopold II owns the Congo Free State personally — a million square miles he has never set foot in. At Berlin in 1885, Europe blessed it as a work of Christian charity."',
        'Leopold: "My International African Association exists to suppress the slave trade. The powers have said so. The maps on this wall say so."',
        'Narrator: "The rubber returns say otherwise. And the missionaries are writing letters home. The King reaches for the tools that have always worked."',
        'Leopold: "If there are these abuses in the Congo, we must stop them. If they continue, it will be the end of the state." (attributed, 1896)',
        'Narrator: "He does not stop them. He manages them."',
        '[CHOICE]',
        '- "Fund the press syndicate — pay journalists to deny everything" -> lp_press',
        '- "Appoint a Commission of Inquiry — a hollow one" -> lp_commission',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 1a. Press branch
    {
      id: 'lp_press',
      name: 'The Press Syndicate',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_pr_king', 'leopold', 32, 60)),
      script: lines(
        '[SET pressFunded = 1]',
        'Leopold: "A syndicate. Discreet payments to useful papers. The missionary tales are hysteria; print that the Congo is a hospital, a school, a church."',
        'Narrator: "Paid journalists and lobbyists discredit missionary reports. Truth is suppressed while the killing continues. It buys the King years — and it makes the eventual exposure detonate all the louder."',
        '[SCENE lp_station]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 1b. Commission branch
    {
      id: 'lp_commission',
      name: 'The Hollow Commission',
      sceneType: 'AGENCY',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_cm_king', 'leopold', 32, 60)),
      script: lines(
        '[SET commissioned = 1]',
        'Leopold: "Very well — a Commission of Inquiry. My officials, my terms of reference, my Congo. Let it inquire."',
        'Narrator: "The 1904-05 commission confirms the abuses — and leaves Leopold in control. Cosmetic reform; the extraction continues. A de-escalation designed to de-escalate nothing."',
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
        'Sheppard: "The ledger balances because the villages empty. I have walked the Kasai. The people abandon their farms to bleed the vines, and when the quota falls short — I have written down what happens then."',
        'Officer: "You missionaries and your notebooks."',
        'Sheppard: "Notebooks, Lieutenant. And soon, cameras. What is done here is done in the dark. The dark is ending."',
        '[SCENE lp_docks]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 3. Morel on the docks
    {
      id: 'lp_docks',
      name: 'The Shipping Records',
      sceneType: 'WITNESS',
      dropId: ART.station ? 'station_drop' : null,
      stage: stage(el('lp_d_morel', 'morel', 50, 61)),
      script: lines(
        'Narrator: "Liverpool, around 1900. E.D. Morel, a shipping clerk for the Elder Dempster line, checks the manifests of the Congo boats — and cannot stop checking them."',
        'Morel: "Rubber in. Ivory in. Fortunes in. And going out... I have the outbound manifests here. Guns. Cartridges. Chains. No trade goods. Nothing to pay anyone with."',
        'Morel: "Nothing is being bought. If nothing is paid, the rubber is not trade. It is forced labor — the ledgers prove it, column by column."',
        'Narrator: "It is one of history\'s great data-analysis epiphanies: a clerk reading atrocity off a cargo manifest. Morel quits, starts publishing, and in March 1904 founds the Congo Reform Association in Liverpool with Roger Casement — arguably the first modern international human-rights movement."',
        'Morel: "They have the Congo. We have the arithmetic."',
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
        '[GAUGE exposure at 88,78 min=0 max=30 label="EXPOSURE"]',
        '[TICK 2s]',
        '[SET exposure = exposure + 1]',
        '[IF exposure >= 4]',
        '[SET_TEXT exposure_ticker "SHIPS RETURN FULL OF RUBBER, SAIL OUT FULL OF GUNS"]',
        '[ENDIF]',
        '[IF exposure >= 8]',
        '[SET_TEXT exposure_ticker "MISSIONARIES SHOW THE LANTERN SLIDES OF THE SEVERED"]',
        '[ENDIF]',
        '[IF exposure >= 12]',
        '[SET_TEXT exposure_ticker "CONSUL CASEMENT: THE FACTS ARE WORSE THAN RUMOR"]',
        '[ENDIF]',
        '[IF exposure >= 16]',
        '[SET_TEXT exposure_ticker "TWAIN MOCKS THE KING: \'PIETY OOZING FROM EVERY PORE\'"]',
        '[ENDIF]',
        '[IF exposure >= 20]',
        '[SET_TEXT exposure_ticker "BELGIUM TO TAKE THE CONGO FROM ITS KING — EXPOSURE: {exposure}"]',
        '[ENDIF]',
        '[/TICK]',
        'Narrator: "A village in the rubber country, 1904. The houses stand. The cooking pots sit where they were set down, mid-meal. No one is here. The quota came, and then the sentries, and then nothing."',
        'Harris: "No bodies. No smoke. Just... interruption. A meal that was never finished."',
        'Sheppard: "I have seen a hundred of these in the Kasai. The forest takes them back in two seasons. The company books record them only as a shortfall."',
        'Harris: "The books lie beautifully. This does not."',
        '[EFFECT glow on lp_v_kodak]',
        'Narrator: "Alice Seeley Harris levels the box Kodak. What she photographs in these districts — including a father named Nsala, seated on a mission veranda with what the ABIR militia left him of his five-year-old daughter, Boali — will be projected from lantern slides in a thousand halls across Britain and America."',
        'Harris: "Hold still. The light is good."',
        'Narrator: "The shutter clicks. Mark Twain, writing in the King\'s own voice a year later, names the weapon: \'The kodak has been a sore calamity to us. The most powerful enemy that has confronted us, indeed.\'"',
        '[CLEAR_EFFECT glow from lp_v_kodak]',
        '[CHOICE]',
        '- "Carry the photographs to Consul Casement" -> lp_casement',
        '[/CHOICE]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 5. The Casement report
    {
      id: 'lp_casement',
      name: 'The Report Lands',
      sceneType: 'WITNESS',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_c_king', 'leopold', 30, 60), el('lp_c_casement', 'casement', 71, 62)),
      script: lines(
        'Narrator: "February 1904. British consul Roger Casement\'s report to Parliament: forty pages, twenty more of sworn testimony. Killings, mutilations, hostage-taking — witnessed, named, appended."',
        '[EFFECT shake on stage]',
        'Casement: "The facts are worse than the rumors, Majesty. Villages compelled at gunpoint. Women held hostage until the men delivered rubber. Soldiers made to account for every cartridge fired."',
        'Leopold: "You have been listening to missionaries. And their little cameras."',
        'Casement: "Parliament has the testimony. Morel has the shipping ledgers. Mrs. Harris has the photographs. You may bribe a newspaper, Majesty. You cannot bribe a negative."',
        '[IF pressFunded == 1]',
        'Leopold: "My syndicate assures me the papers will call this hysteria."',
        'Casement: "The papers you have not bought are louder."',
        '[ENDIF]',
        '[IF commissioned == 1]',
        'Leopold: "My own Commission is inquiring. Surely that suffices."',
        'Casement: "Your Commission confirmed us, Majesty. Your own inquiry could not unsee it."',
        '[ENDIF]',
        'Narrator: "The Congo Reform Association amplifies everything: Twain, Conan Doyle, Booker T. Washington. Scholars still dispute the full toll — estimates range up to roughly ten million dead, perhaps half the population, though Vansina and others caution the worst districts may not speak for the whole. The system that produced the baskets of rubber is no longer deniable."',
        '[SCENE lp_funeral]',
      ),
      status: 'work',
    },

    // ------------------------------------------------ 6. Annexation ending
    {
      id: 'lp_funeral',
      name: 'The Booing',
      sceneType: 'WITNESS',
      dropId: ART.palace ? 'palace_drop' : null,
      stage: stage(el('lp_f_morel', 'morel', 28, 62), el('lp_f_harris', 'harris', 72, 62)),
      script: lines(
        'Narrator: "1908. Under the sustained pressure of the Casement Report and Morel\'s campaign, Belgium annexes the Congo Free State from its King. Leopold\'s personal rule — the mask-off private-atrocity system — ends."',
        'Morel: "Not a victory to toast. Extraction continues under the Belgian flag. But the thing that was his — the thing the arithmetic exposed — is finished."',
        'Narrator: "December 1909. Leopold II is dead. As the funeral cortege passes through Brussels, the crowds boo their King."',
        'Harris: "They booed. All that piety, all those bought headlines — and at the end, the crowd looked at him the way the camera did. Without flattery."',
        'Narrator: "In 1913 the Congo Reform Association dissolves itself, believing its work done — history\'s first successful mass human-rights campaign, driven by a clerk\'s ledgers, a consul\'s testimony, and a missionary\'s box Kodak."',
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
      sceneIds: ['lp_palace', 'lp_press', 'lp_commission', 'lp_station', 'lp_docks', 'lp_village', 'lp_casement', 'lp_funeral'],
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
