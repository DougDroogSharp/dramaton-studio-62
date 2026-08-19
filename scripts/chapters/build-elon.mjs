// Builds public/hvb-elon.json — the standalone ELON MUSK (2020s)
// chapter of Humans vs Billionaires. All content sourced from
// docs/HVB_RESEARCH.md Chapter 5 (Reuters investigation, court records).
//
// Run: node scripts/chapters/build-elon.mjs
// Play: http://localhost:8080/theater?game=/hvb-elon.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lines } from '../machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

// Robust art loader: returns a data URI, falling back through candidates,
// or null if nothing exists on disk.
const art = (...candidates) => {
  for (const file of candidates) {
    const p = resolve(root, 'art-demo', file);
    if (existsSync(p)) {
      return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
    }
  }
  return null;
};

// ---------------------------------------------------------------- assets

// Elon gets two expression graphics: Neutral (smug) and Panicked (sweating).
const elonGraphics = [];
const elonNeutral = art('elon_musk.png');
if (elonNeutral) {
  elonGraphics.push({ id: 'elon_g', pose: 'Neutral', expression: 'Neutral', angle: 0, image: elonNeutral });
}
const elonSweat = art('elon/elon_sweat.png', 'elon_musk.png');
if (elonSweat) {
  elonGraphics.push({ id: 'elon_g_panic', pose: 'Neutral', expression: 'Panicked', angle: 0, image: elonSweat });
}

const simpleActor = (id, name, ...files) => {
  const image = art(...files);
  return {
    id,
    name,
    graphics: image
      ? [{ id: `${id}_g`, pose: 'Neutral', expression: 'Neutral', angle: 0, image }]
      : [],
    status: 'work',
  };
};

const actors = [
  { id: 'elon_musk', name: 'Elon', graphics: elonGraphics, status: 'work' },
  simpleActor('elon_reporter', 'Reporter', 'elon_reporter.png'),
  simpleActor('elon_worker', 'Worker', 'elon/worker.png', 'elon_reporter.png'),
  simpleActor('elon_hypebro', 'Lieutenant', 'elon/hypebro.png', 'elon_musk.png'),
  simpleActor('elon_lawyer', 'Lawyer', 'elon/lawyer.png', 'elon_reporter.png'),
];

const dropDef = (id, name, ...files) => {
  const image = art(...files);
  return image ? { id, name, image, status: 'work' } : null;
};

const drops = [
  dropDef('elon_hq', 'The Headquarters', 'elon_hq.png'),
  dropDef('elon_factory_drop', 'Rocket Factory Floor', 'elon/factory.png', 'elon_hq.png'),
  dropDef('elon_feedroom_drop', 'The Feed Control Room', 'elon/feedroom.png', 'elon_hq.png'),
].filter(Boolean);

const dropId = (id) => (drops.some((d) => d.id === id) ? id : (drops[0]?.id ?? null));

const el = (id, assetId, x, y, scale = 2.4) => ({
  id, assetId, type: 'ACTOR', x, y, scale, zIndex: 3, rotation: 0,
  pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
});

const balloon = (id, text, x, y, { scale = 1, zIndex = 5 } = {}) => ({
  id, assetId: '', type: 'BALLOON', x, y, scale, zIndex, rotation: 0,
  text, balloonType: 'SPEECH',
});

const SFX = [
  { id: 'electric_flare', name: 'Electric Flare', type: 'electric', category: 'ATTACH', params: { intensity: 70 }, status: 'work' },
  { id: 'gold_glow', name: 'Gold Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
  { id: 'shake_all', name: 'Crisis Shake', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
];

// ---------------------------------------------------------------- scenes

const scenes = [];

// 1 — THE FEED CONTROL ROOM (choice)
scenes.push({
  id: 'elon_feed',
  name: 'The Feed Control Room',
  sceneType: 'AGENCY',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_feed', 'elon_musk', 30, 62),
    el('lt_feed', 'elon_hypebro', 70, 63),
  ],
  script: lines(
    '[SET prestige = 100]',
    '[SET injuries = 100]',
    '[SET tickerIdx = 0]',
    '[SET tday = 0]',
    'Narrator: "October 2022. The richest man alive — first person ever worth $300 billion — stands before the biggest feed on Earth."',
    'Lieutenant: "The board accepted, boss. Forty-four billion dollars and the town square is yours. What\'s the move?"',
    'Elon: "It\'s not a company. It\'s a mission to save humanity. Nobody audits a mission."',
    '[CHOICE]',
    '- "Buy the platform — and cut the workforce" -> elon_bird',
    '- "Gut the moderation — disband Trust & Safety" -> elon_gut',
    '- "Just post through it" -> elon_gut',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 2 — THE BIRD IS FREED (buy consequence)
scenes.push({
  id: 'elon_bird',
  name: 'The Bird Is Freed',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_bird', 'elon_musk', 30, 62),
    el('lt_bird', 'elon_hypebro', 70, 63),
  ],
  script: lines(
    'Elon: "the bird is freed"',
    'Narrator: "27 October 2022. He posts it, and the deal closes: $44 billion. Within a week, roughly half of the platform\'s 7,500 staff are laid off."',
    'Lieutenant: "Hardcore, boss. Extremely hardcore. The safety and moderation teams were, uh... on the list."',
    'Narrator: "Documented consequence: with the moderation teams gutted, researchers logged a measurable rise in hate-speech impressions on the platform."',
    'Elon: "The feed is fine. Look at the engagement."',
    '[SCENE elon_factory]',
  ),
  status: 'work',
});

// 3 — GUT THE MODERATION (moderation consequence)
scenes.push({
  id: 'elon_gut',
  name: 'Trust and Safety',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_gut', 'elon_musk', 30, 62),
    el('lt_gut', 'elon_hypebro', 70, 63),
  ],
  script: lines(
    'Lieutenant: "December 2022. Trust and Safety Council: dissolved. Banned accounts: reinstated. COVID-misinformation policy: deleted."',
    'Elon: "Free speech absolutism. You\'re welcome, humanity."',
    'Narrator: "Documented consequence: researchers auditing the platform found a rise in hate-speech impressions after the rollback. The moderation was the product. It is gone."',
    'Lieutenant: "Engagement is UP though. Number go up."',
    'Narrator: "Meanwhile, in Texas and California, the rockets have a schedule to keep."',
    '[SCENE elon_factory]',
  ),
  status: 'work',
});

// 4 — THE FACTORY FLOOR (injury dashboard: TICK + ticker + gauge + electric)
scenes.push({
  id: 'elon_factory',
  name: 'The Factory Floor',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('em_fac', 'elon_musk', 24, 62),
    el('wk_fac', 'elon_worker', 72, 63),
    balloon('engine_stand', 'RAPTOR TEST STAND', 50, 28, { zIndex: 2 }),
    balloon('injury_ticker', 'INJURY DASHBOARD — LIVE', 45, 95),
  ],
  script: lines(
    '[EFFECT electric_flare on engine_stand]',
    '[GAUGE injuries at 87,20 min=0 max=600 label="INJURIES"]',
    '[TICK 1500ms]',
    '[SET injuries = min(injuries + 11, 600)]',
    '[SET tickerIdx = tickerIdx + 1]',
    '[IF tickerIdx > 3]',
    '[SET tickerIdx = 0]',
    '[ENDIF]',
    '[IF tickerIdx == 0]',
    '[SET_TEXT injury_ticker "REUTERS COUNT: {injuries} DOCUMENTED INJURIES AT SPACEX SINCE 2014 — AND CLIMBING"]',
    '[ENDIF]',
    '[IF tickerIdx == 1]',
    '[SET_TEXT injury_ticker "BROWNSVILLE 2022: 4.8 INJURIES PER 100 WORKERS — SIX TIMES THE SPACE-INDUSTRY AVERAGE OF 0.8"]',
    '[ENDIF]',
    '[IF tickerIdx == 2]',
    '[SET_TEXT injury_ticker "McGREGOR, JUNE 2014: LONNIE LeBLANC, 38, RETIRED MARINE, KILLED. OSHA FINE: $7,000"]',
    '[ENDIF]',
    '[IF tickerIdx == 3]',
    '[SET_TEXT injury_ticker "HAWTHORNE, JAN 2022: FRANCISCO CABADA\'S SKULL FRACTURED BY A RAPTOR PART. FINE: $18,475 — APPEALED TOWARD $475"]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "A rocket factory floor. The engine on the test stand is ahead of schedule. The dashboard behind it counts something else."',
    'Elon: "Mars doesn\'t wait. Run the stand hot. The dashboard is green."',
    'Worker: "That dashboard isn\'t the one we live in, sir. Watch the ticker."',
    'Narrator: "Tom Moline, former SpaceX engineer, to Reuters: \'Elon\'s concept that SpaceX is on this mission to go to Mars as fast as possible and save humanity permeates every part of the company. The company justifies casting aside anything that could stand in the way… including worker safety.\'"',
    'Worker: "Lonnie LeBlanc died holding down insulation with his own body weight. A gust of wind. His family didn\'t even know OSHA investigated — until a reporter told them, nine years later."',
    'Narrator: "Ydy Cabada, whose husband Francisco was left comatose by an engine-test accident: \'It would have been nice to get a call from Elon Musk… But I guess workers are just disposable to them.\'"',
    'Elon: "We are saving humanity. Speed IS safety, if you think about it on a long enough timeline."',
    'Worker: "There\'s a way to do dangerous work without people dying. Someone is writing all of this down."',
    '[CHOICE]',
    '- "Keep the line speed — Mars doesn\'t wait" -> elon_press',
    '- "Face the reporter" -> elon_press',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 5 — THE REPORTER (prestige shell thins: BIND opacity + TICK decrement)
scenes.push({
  id: 'elon_press',
  name: 'The Investigation Lands',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_press', 'elon_musk', 30, 62),
    el('rp_press', 'elon_reporter', 70, 62),
    balloon('prestige_shell', 'PRESTIGE ARMOR', 30, 24, { zIndex: 2 }),
  ],
  script: lines(
    '[BIND em_press.opacity to prestige / 100]',
    '[BIND prestige_shell.scale to 0.4 + prestige / 120]',
    '[GAUGE prestige at 87,20 min=0 max=100 label="PRESTIGE"]',
    '[TICK 1200ms]',
    '[SET prestige = max(prestige - 3, 22)]',
    '[/TICK]',
    'Narrator: "10 November 2023. Reuters publishes Marisa Taylor\'s investigation: \'At SpaceX, worker injuries soar in Elon Musk\'s rush to Mars.\' More than 600 documented injuries. One death."',
    'Reporter: "Six hundred documented injuries since 2014. Brownsville at six times the industry average. Kennedy Space Center hit 21.5 per 100 workers in 2016 — twenty-seven times the average. On the record?"',
    'Elon: "The mission—"',
    'Reporter: "A mission with a body count is called something else. The story runs whether you comment or not."',
    '[POSE elon_musk expression=Panicked]',
    'Elon: "Do you have ANY idea how many memes I have posted about transparency?"',
    'Narrator: "The save-humanity armor is a projection, and the projector is losing the room. In 2024 the investigation wins the Pulitzer Prize for National Reporting."',
    'Reporter: "One more thing. The lawyers called. They\'d like a word."',
    '[SCENE elon_court]',
  ),
  status: 'work',
});

// 6 — THE COURTROOM (Diaz verdict, real numbers)
scenes.push({
  id: 'elon_court',
  name: 'The Verdict',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_court', 'elon_musk', 30, 62),
    el('lw_court', 'elon_lawyer', 70, 62),
  ],
  script: lines(
    '[POSE elon_musk expression=Panicked]',
    'Lawyer: "Owen Diaz. Black contract elevator operator at the Fremont plant, 2015 to 2016. On 4 October 2021, a federal jury awarded him $137 million — $130 million of it punitive — for a racially hostile workplace."',
    'Elon: "We\'ll appeal. We always appeal. We appealed an $18,475 safety fine down toward $475."',
    'Lawyer: "You did. And the Diaz award was reduced — $15 million in 2022, about $3.2 million at retrial in 2023. But the verdict itself stands in the record. Juries read the record."',
    'Narrator: "9 February 2022: the California Civil Rights Department sues, alleging Tesla runs \'a racially segregated workplace\' — after a nearly three-year investigation and hundreds of complaints. September 2023: the federal EEOC files its own suit."',
    'Elon: "Every one of those documents is legacy media."',
    'Lawyer: "Every one of those documents is discovery, sir. My billing rate is the only number in this room still going up."',
    '[SCENE elon_finale]',
  ),
  status: 'work',
});

// 7 — THE TRILLIONAIRE WOBBLE (finale: glow, then CLEAR_EFFECT)
scenes.push({
  id: 'elon_finale',
  name: 'Twelve Days of a Trillion',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_fin', 'elon_musk', 50, 60, 2.8),
    balloon('wealth_ticker', 'NET WORTH — LIVE', 45, 95),
  ],
  script: lines(
    '[EFFECT gold_glow on em_fin]',
    '[TICK 1000ms]',
    '[SET tday = min(tday + 1, 12)]',
    '[SET_TEXT wealth_ticker "DAY {tday} OF THE TRILLION: NET WORTH PRICED ON A FUTURE THAT HASN\'T HAPPENED YET"]',
    '[/TICK]',
    'Narrator: "Mid-June 2026. Around SpaceX\'s Nasdaq debut, he becomes the first human being ever worth one trillion dollars. He glows."',
    'Elon: "First. Person. Ever. A TRILLION. The mission is priced in!"',
    'Narrator: "The hoard is priced on speculation — on tomorrow\'s Mars, tomorrow\'s robotaxi, tomorrow\'s everything. Tomorrow arrives with a correction."',
    '[WAIT 2s]',
    '[POSE elon_musk expression=Panicked]',
    '[CLEAR_EFFECT gold_glow from em_fin]',
    '[EFFECT shake_all on em_fin]',
    'Narrator: "Twelve days. The shares correct, and he falls back below the trillion. The glow was never money. It was a bet other people were making about him — and bets get called."',
    'Elon: "Turn the feed off. TURN THE FEED OFF."',
    'Narrator: "No collapse completes in this era. But the shell is cracked: a Pulitzer-winning exposé, state and federal lawsuits, a record verdict. Publication and litigation — education corroding prestige, in real time. The record is the resistance."',
    '[CHOICE]',
    '- "Run it back" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB: Elon Musk (2020s)',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {
      prestige: 100,
      injuries: 100,
      tickerIdx: 0,
      tday: 0,
    },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'elon_feed',
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
      id: 'ep_elon',
      name: 'Elon Musk (2020s)',
      description: 'The feed, the factory, the exposé, the verdict, the wobble. Sourced from the Reuters investigation and court records.',
      sceneIds: scenes.map((s) => s.id),
      status: 'work',
    },
  ],
};

const outPath = resolve(root, 'public', 'hvb-elon.json');
const json = JSON.stringify(game);
writeFileSync(outPath, json + '\n', 'utf8');
console.log(`Wrote ${outPath} (${(json.length / 1024 / 1024).toFixed(1)} MB, ${scenes.length} scenes, ${drops.length} drops, ${actors.length} actors)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-elon.json');
