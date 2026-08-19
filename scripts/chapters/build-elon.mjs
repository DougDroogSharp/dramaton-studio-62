// Builds public/hvb-elon.json — the standalone ELON MUSK (2020s)
// chapter of Humans vs Billionaires. All content sourced from
// docs/HVB_RESEARCH.md Chapter 5 (Reuters investigation, court records).
//
// Run: node scripts/chapters/build-elon.mjs
// Play: http://localhost:8080/theater?game=/hvb-elon.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, machineHubScene, WORLD_BASE,
  ACTORS as CORE_ACTORS, SFX as CORE_SFX,
} from '../machine-core.mjs';

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

// Build an actor with one or more {pose, expression} graphics. Each entry
// carries fallback file candidates so a POSE command always has a matching
// graphics triple even if a variant sprite failed to generate.
const actorDef = (id, name, variants) => {
  const graphics = [];
  for (const v of variants) {
    const image = art(...v.files);
    if (image) {
      graphics.push({
        id: `${id}_g_${v.pose.toLowerCase()}_${v.expression.toLowerCase()}`,
        pose: v.pose,
        expression: v.expression,
        angle: 0,
        image,
      });
    }
  }
  return { id, name, graphics, status: 'work' };
};

const actors = [
  actorDef('elon_musk', 'Elon', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon_musk.png'] },
    { pose: 'Neutral', expression: 'Panicked', files: ['elon/elon_sweat.png', 'elon_musk.png'] },
    { pose: 'Pointing', expression: 'Smug', files: ['elon/elon_point_smug.png', 'elon_musk.png'] },
    { pose: 'Crouch', expression: 'Scared', files: ['elon/elon_crouch_scared.png', 'elon/elon_sweat.png', 'elon_musk.png'] },
    { pose: 'Sit', expression: 'Angry', files: ['elon/elon_sit_angry.png', 'elon/elon_sweat.png', 'elon_musk.png'] },
  ]),
  actorDef('elon_reporter', 'Reporter', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon_reporter.png'] },
    { pose: 'Closeup', expression: 'Determined', files: ['elon/reporter_closeup_determined.png', 'elon_reporter.png'] },
  ]),
  actorDef('elon_worker', 'Worker', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon/worker.png', 'elon_reporter.png'] },
    { pose: 'Pointing', expression: 'Angry', files: ['elon/worker_point_angry.png', 'elon/worker.png', 'elon_reporter.png'] },
  ]),
  actorDef('elon_hypebro', 'Lieutenant', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon/hypebro.png', 'elon_musk.png'] },
  ]),
  actorDef('elon_lawyer', 'Lawyer', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon/lawyer.png', 'elon_reporter.png'] },
  ]),
  // Crowd actors for the reaction layer ("Voices of the Feed").
  actorDef('elon_workers', 'Workers', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon/workers_crowd.png', 'elon/worker.png', 'elon_reporter.png'] },
  ]),
  actorDef('elon_fans', 'Fans', [
    { pose: 'Neutral', expression: 'Neutral', files: ['elon/fans_crowd.png', 'elon/hypebro.png', 'elon_musk.png'] },
  ]),
];

const dropDef = (id, name, ...files) => {
  const image = art(...files);
  return image ? { id, name, image, status: 'work' } : null;
};

const drops = [
  dropDef('elon_hq', 'The Headquarters', 'elon_hq.png'),
  dropDef('elon_factory_drop', 'Rocket Factory Floor', 'elon/factory.png', 'elon_hq.png'),
  dropDef('elon_feedroom_drop', 'The Feed Control Room', 'elon/feedroom.png', 'elon_hq.png'),
  dropDef('elon_court_drop', 'The Courtroom', 'elon/courtroom.png', 'elon_hq.png'),
  dropDef('elon_bedroom_drop', 'The 3AM Bedroom', 'elon/bedroom3am.png', 'elon_hq.png'),
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
    '[SET exposure = 0]',
    '[SET injuries = 100]',
    '[SET tickerIdx = 0]',
    '[SET tday = 0]',
    '[SET firedWalkout = 0]',
    '[SET settledQuiet = 0]',
    '[SET photoOp = 0]',
    '[SET attackedPress = 0]',
    '[SET paidFine = 0]',
    '[SET soldSpike = 0]',
    'Narrator: "October 2022. The richest man alive — first person ever worth $300 billion — stands before the biggest feed on Earth."',
    'Lieutenant: "The board accepted, boss. Forty-four billion dollars and the town square is yours. What\'s the move?"',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "It\'s not a company. It\'s a mission to save humanity. Nobody audits a mission."',
    '[CHOICE]',
    '- "Buy the platform — and cut the workforce" -> elon_bird',
    '- "Gut the moderation — disband Trust & Safety" -> elon_gut',
    '- "Just post through it" -> elon_gut',
    '- "Voices of the Feed" -> elon_voices',
    '- "Witness: McGregor, June 2014" -> el_cut_mcgregor',
    '- "Witness: The Dashboard Is Green" -> el_cut_dashboard',
    '- "Enter the Machine" -> el_machine',
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
    '[SET exposure = exposure + 5]',
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
    '[SET exposure = exposure + 10]',
    '[SET prestige = prestige - 5]',
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
    '- "Keep the line speed — Mars doesn\'t wait" -> elon_walkout',
    '- "Walk the floor and hear them out" -> elon_walkout',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4b — THE WALKOUT (decision web: fire / settle / photo-op)
scenes.push({
  id: 'elon_walkout',
  name: 'The Walkout',
  sceneType: 'AGENCY',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('em_wo', 'elon_musk', 24, 62),
    el('wk_wo', 'elon_worker', 68, 63),
    el('lt_wo', 'elon_hypebro', 88, 64, 2.0),
  ],
  script: lines(
    '[GAUGE prestige at 87,20 min=0 max=100 label="PRESTIGE"]',
    '[GAUGE exposure at 87,44 min=0 max=100 label="EXPOSURE"]',
    'Narrator: "The stand runs hot one shift too many. Tools go down. The crew walks off the floor — the way real SpaceX and Tesla workers organized, petitioned, and spoke to reporters."',
    '[POSE elon_worker pose=Pointing expression=Angry]',
    'Worker: "Six times the industry injury average at Brownsville. Lonnie LeBlanc is DEAD and his family found out about the OSHA file from a reporter. We\'re done pretending the dashboard is green."',
    'Lieutenant: "Boss, optics-wise, this is... suboptimal. Options on the tablet."',
    'Elon: "Nobody walks out of a mission."',
    '[CHOICE]',
    '- "Fire everyone who walked" -> elon_fire',
    '- "Settle quietly — NDAs for everyone" -> elon_settle',
    '- "Stage a photo-op concession" -> elon_photo',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4c — FIRE THEM (retaliation consequence)
scenes.push({
  id: 'elon_fire',
  name: 'The Purge',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('em_fire', 'elon_musk', 30, 62),
    el('wk_fire', 'elon_worker', 72, 63),
  ],
  script: lines(
    '[SET firedWalkout = 1]',
    '[SET exposure = exposure + 25]',
    '[SET prestige = prestige - 5]',
    'Elon: "Badge access revoked. The mission doesn\'t need people who don\'t believe in the mission."',
    '[POSE elon_worker pose=Pointing expression=Angry]',
    'Worker: "In the real record, workers who spoke up alleged exactly this — retaliation. The labor board takes complaints. So do reporters."',
    'Narrator: "Every fired worker is a source now. Termination letters photograph beautifully."',
    '[SCENE elon_reuters]',
  ),
  status: 'work',
});

// 4d — SETTLE QUIETLY (hush-money consequence)
scenes.push({
  id: 'elon_settle',
  name: 'The Quiet Checks',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('em_set', 'elon_musk', 30, 62),
    el('lt_set', 'elon_hypebro', 72, 63),
  ],
  script: lines(
    '[SET settledQuiet = 1]',
    '[SET exposure = exposure + 5]',
    '[SET prestige = prestige - 10]',
    'Lieutenant: "Settlements drafted, boss. Confidentiality clauses on every page. Nobody talks, nothing changes, line speed holds."',
    'Elon: "Perfect. Silence is the cheapest part I buy."',
    'Narrator: "The checks clear. The test stand still runs hot. And every NDA is a document — documents have a way of surfacing in discovery."',
    '[SCENE elon_reuters]',
  ),
  status: 'work',
});

// 4e — PHOTO-OP CONCESSION (prestige-laundering consequence)
scenes.push({
  id: 'elon_photo',
  name: 'The Photo-Op',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('em_photo', 'elon_musk', 30, 62),
    el('wk_photo', 'elon_worker', 72, 63),
  ],
  script: lines(
    '[SET photoOp = 1]',
    '[SET prestige = prestige + 10]',
    '[SET exposure = exposure + 10]',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "New hard hats for everyone! Signed. Limited edition. This is me, caring, at scale."',
    'Worker: "The hats are nice. The test stand is still the test stand. The injury rate is still six times the average."',
    'Narrator: "Prestige-laundering, the research calls it: the mission narrative as reputational armor. The photo trends. The dashboard behind it keeps counting."',
    '[SCENE elon_reuters]',
  ),
  status: 'work',
});

// 4f — THE REUTERS QUESTIONS (decision web: stonewall / spin / attack)
scenes.push({
  id: 'elon_reuters',
  name: 'Questions From Reuters',
  sceneType: 'AGENCY',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_rq', 'elon_musk', 30, 62),
    el('rp_rq', 'elon_reporter', 70, 62),
  ],
  script: lines(
    '[GAUGE prestige at 87,20 min=0 max=100 label="PRESTIGE"]',
    '[GAUGE exposure at 87,44 min=0 max=100 label="EXPOSURE"]',
    'Narrator: "2023. A Reuters reporter has spent months on the injury records. A detailed list of questions arrives ahead of publication. This is the courtesy the press extends — and the trap prestige builds for itself."',
    '[POSE elon_reporter pose=Closeup expression=Determined]',
    'Reporter: "Six hundred documented injuries since 2014. A death in 2014 the family never heard about. Brownsville at 4.8 per 100 workers against an industry 0.8. Comment by Friday. I\'m filing either way."',
    'Elon: "Options. Give me options."',
    '[CHOICE]',
    '- "Stonewall — no comment" -> elon_stonewall',
    '- "Spin the mission — we\'re saving humanity" -> elon_spin',
    '- "Attack the reporter on the platform" -> elon_attack',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 4g — STONEWALL
scenes.push({
  id: 'elon_stonewall',
  name: 'No Comment',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_sw', 'elon_musk', 30, 62),
    el('rp_sw', 'elon_reporter', 70, 62),
  ],
  script: lines(
    '[SET exposure = exposure + 20]',
    'Elon: "SpaceX does not respond to legacy media. Tell her the press office is an emoji now."',
    '[POSE elon_reporter pose=Closeup expression=Determined]',
    'Reporter: "Noted: \'did not respond to requests for comment.\' That sentence has ended more careers than any quote ever has."',
    'Narrator: "The story runs with a hole where his side could have been. Readers fill holes with the worst thing they can imagine — and the documents are worse."',
    '[SCENE elon_3am]',
  ),
  status: 'work',
});

// 4h — SPIN THE MISSION
scenes.push({
  id: 'elon_spin',
  name: 'The Mission Statement',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_sp', 'elon_musk', 30, 62),
    el('rp_sp', 'elon_reporter', 70, 62),
  ],
  script: lines(
    '[SET prestige = prestige + 5]',
    '[SET exposure = exposure + 10]',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "Statement: SpaceX is making life multiplanetary. Some friction is inevitable when you\'re saving the species."',
    '[POSE elon_reporter pose=Closeup expression=Determined]',
    'Reporter: "Funny. Tom Moline, one of your former engineers, told me the mission is exactly the problem: \'The company justifies casting aside anything that could stand in the way… including worker safety.\'"',
    'Reporter: "And Travis Carson, a former supervisor: \'SpaceX\'s idea of safety is: We\'ll let you decide what\'s safe for you — which really means there was no accountability.\'"',
    'Narrator: "The spin goes in the story — right next to the sources who lived under it. Context is a solvent."',
    '[SCENE elon_3am]',
  ),
  status: 'work',
});

// 4i — ATTACK THE REPORTER
scenes.push({
  id: 'elon_attack',
  name: 'Posting Through It',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('em_at', 'elon_musk', 30, 62),
    el('rp_at', 'elon_reporter', 70, 62),
  ],
  script: lines(
    '[SET attackedPress = 1]',
    '[SET exposure = exposure + 30]',
    '[SET prestige = prestige - 15]',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "Thread. 1/47. The REAL injury is to journalism itself—"',
    '[POSE elon_reporter pose=Closeup expression=Determined]',
    'Reporter: "He\'s quote-posting me to two hundred million people. Which means two hundred million people just learned my story exists. Filing now."',
    'Narrator: "He owns the megaphone, so every attack is also an advertisement. The platform amplifies the exposé it was bought to bury."',
    '[SCENE elon_3am]',
  ),
  status: 'work',
});

// 4j — 3AM (the bedroom: phone-glow, posting through it, IF-gated callbacks)
scenes.push({
  id: 'elon_3am',
  name: 'Three In The Morning',
  sceneType: 'WITNESS',
  dropId: dropId('elon_bedroom_drop'),
  stage: [
    el('em_3am', 'elon_musk', 50, 64, 2.8),
    balloon('thought_cloud', '...', 62, 22, { zIndex: 4 }),
  ],
  script: lines(
    '[POSE elon_musk pose=Sit expression=Angry]',
    '[GAUGE exposure at 87,20 min=0 max=100 label="EXPOSURE"]',
    'Narrator: "Three in the morning. The richest man alive sits in the sheets, lit from below by the only company he keeps at this hour."',
    '[SET_TEXT thought_cloud "just one more post and the narrative is fixed"]',
    'Elon: "Reply. Reply. Quote-post. Reply. Why is the ratio doing that. RATIO, WHY."',
    '[IF firedWalkout == 1]',
    'Narrator: "Somewhere in the dark, fired workers are on the phone with lawyers. Retaliation complaints draft easily at 3am too."',
    '[ENDIF]',
    '[IF settledQuiet == 1]',
    'Narrator: "Somewhere in a filing cabinet, the quiet settlements sit in neat rows. Discovery requests love neat rows."',
    '[ENDIF]',
    '[IF photoOp == 1]',
    'Narrator: "The signed-hard-hat photo is trending again — this time as a meme, captioned with the Brownsville injury rate."',
    '[ENDIF]',
    '[IF attackedPress == 1]',
    'Narrator: "His own thread is now the top reply under the exposé. He is doing the paper\'s distribution for free."',
    '[ENDIF]',
    '[SET_TEXT thought_cloud "does a mission need a body count to be real"]',
    'Elon: "...one more post."',
    'Narrator: "The feed never says goodnight. Publication day is coming."',
    '[SCENE elon_press]',
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
    '[GAUGE exposure at 87,44 min=0 max=100 label="EXPOSURE"]',
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
    '[IF settledQuiet == 1]',
    'Lawyer: "Also — the quiet walkout settlements? Plaintiffs\' counsel subpoenaed the lot. Confidentiality clauses read very badly aloud to a jury."',
    '[ENDIF]',
    '[IF firedWalkout == 1]',
    'Lawyer: "And the workers you fired for walking out have filed retaliation charges. Every termination letter is now an exhibit."',
    '[ENDIF]',
    'Elon: "Every one of those documents is legacy media."',
    'Lawyer: "Every one of those documents is discovery, sir. My billing rate is the only number in this room still going up."',
    'Lawyer: "One open item. CalOSHA\'s fine for Francisco Cabada\'s fractured skull: $18,475. We can contest it — precedent says we can grind it toward $475 — or you pay it in full and fix the stand. Your call."',
    '[CHOICE]',
    '- "Contest it — grind $18,475 toward $475" -> elon_appeal',
    '- "Pay it in full and fix the test stand" -> elon_payfine',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 6b — THE FINE APPEAL (historical path)
scenes.push({
  id: 'elon_appeal',
  name: 'Four Hundred Seventy-Five Dollars',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('em_ap', 'elon_musk', 30, 62),
    el('lw_ap', 'elon_lawyer', 70, 62),
  ],
  script: lines(
    '[SET exposure = exposure + 20]',
    '[SET prestige = prestige - 10]',
    'Lawyer: "Filed. This is the historical path: SpaceX appealed the $18,475 penalty for the accident that left Francisco Cabada comatose — seeking a reduction toward $475."',
    'Elon: "It\'s the principle. Regulators shouldn\'t tax the mission."',
    'Narrator: "Ydy Cabada, his wife, to Reuters: \'It would have been nice to get a call from Elon Musk… But I guess workers are just disposable to them.\'"',
    'Narrator: "$475. Against a $300 billion fortune, the fine for a fractured skull prices out below a decent office chair. Reporters can do that arithmetic in their sleep — and they publish it."',
    '[SCENE elon_finale]',
  ),
  status: 'work',
});

// 6c — PAY AND REFORM (counterfactual, flagged as such)
scenes.push({
  id: 'elon_payfine',
  name: 'The Road Not Taken',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('em_pf', 'elon_musk', 30, 62),
    el('lw_pf', 'elon_lawyer', 70, 62),
  ],
  script: lines(
    '[SET paidFine = 1]',
    '[SET prestige = prestige + 5]',
    '[SET exposure = exposure - 10]',
    'Lawyer: "Paid in full. Stand-down ordered on the test cell, guards retrofitted. For the record: this is the road not taken. In the real record, SpaceX contested the fine toward $475."',
    'Elon: "Eighteen thousand dollars. I make that in the time it takes to say eighteen thousand dollars."',
    'Narrator: "Which is the point the simulation lets you feel: the deterrence was never the money. A fine a billionaire can\'t feel only works if paying it comes with changing something. Here, for once, something changed."',
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
    'Narrator: "The hoard is priced on speculation — on tomorrow\'s Mars, tomorrow\'s robotaxi, tomorrow\'s everything. The trillion is a bet other people are making about him. What does he do with the bet?"',
    '[CHOICE]',
    '- "Sell into it — turn myth into money" -> elon_sell',
    '- "Diamond-hands the myth" -> elon_diamond',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 7b — SELL INTO THE SPIKE
scenes.push({
  id: 'elon_sell',
  name: 'Selling The Myth',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_sell', 'elon_musk', 50, 60, 2.8),
    balloon('sell_ticker', 'NET WORTH — LIVE', 45, 95),
  ],
  script: lines(
    '[SET soldSpike = 1]',
    '[SET prestige = prestige - 10]',
    'Elon: "Liquidity event. Small one. For a foundation. For humanity. Do NOT read the filing."',
    '[SET_TEXT sell_ticker "INSIDER SALE DISCLOSED — THE PRICE WAS A STORY, AND THE AUTHOR JUST SOLD"]',
    'Narrator: "The disclosure is public within days — that\'s the one rule even a trillionaire\'s feed can\'t delete. When the man the price believes in stops believing first, the price notices."',
    '[POSE elon_musk pose=Crouch expression=Scared]',
    '[EFFECT shake_all on em_sell]',
    'Narrator: "The correction comes anyway. Twelve days after the milestone, he is back below the trillion — only now some of the myth is banked, and all of it is priced."',
    '[SCENE elon_ending]',
  ),
  status: 'work',
});

// 7c — DIAMOND-HANDS (historical shape: hold, wobble, fall back)
scenes.push({
  id: 'elon_diamond',
  name: 'Diamond Hands',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_dh', 'elon_musk', 50, 60, 2.8),
    balloon('dh_ticker', 'NET WORTH — LIVE', 45, 95),
  ],
  script: lines(
    '[SET prestige = prestige + 5]',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "Sell? You don\'t sell the mission. The mission only goes up."',
    '[WAIT 2s]',
    '[SET_TEXT dh_ticker "DAY 12: SHARES CORRECT — FIRST TRILLIONAIRE FALLS BACK BELOW $1,000,000,000,000"]',
    '[POSE elon_musk pose=Crouch expression=Scared]',
    '[EFFECT shake_all on em_dh]',
    'Narrator: "Twelve days. The shares correct and he falls back below the trillion — the historical shape of it. The glow was never money. It was a bet other people were making about him, and bets get called."',
    'Elon: "Turn the feed off. TURN THE FEED OFF."',
    '[SCENE elon_ending]',
  ),
  status: 'work',
});

// 8 — ENDING ROUTER (exposure decides which ending the record supports)
scenes.push({
  id: 'elon_ending',
  name: 'The Reckoning Fork',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('em_rt', 'elon_musk', 50, 62)],
  script: lines(
    '[IF exposure >= 60]',
    '[SCENE elon_end_crack]',
    '[ENDIF]',
    '[SCENE elon_end_sim]',
  ),
  status: 'work',
});

// 8a — ENDING: THE SHELL CRACKS IN PUBLIC (exposure high)
scenes.push({
  id: 'elon_end_crack',
  name: 'The Shell Cracks',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('em_ec', 'elon_musk', 34, 62),
    el('rp_ec', 'elon_reporter', 72, 62),
    balloon('verdict_board', 'THE RECORD', 50, 20, { zIndex: 2 }),
  ],
  script: lines(
    '[GAUGE exposure at 87,20 min=0 max=100 label="EXPOSURE"]',
    '[GAUGE prestige at 87,44 min=0 max=100 label="PRESTIGE"]',
    'Narrator: "2024. The Reuters SpaceX investigation wins the Pulitzer Prize for National Reporting. In open court and on front pages, the save-humanity shell cracks where everyone can see it."',
    '[SET_TEXT verdict_board "PULITZER 2024 • DIAZ VERDICT $137M • CRD SUIT • EEOC SUIT • 600+ INJURIES DOCUMENTED"]',
    '[POSE elon_musk pose=Crouch expression=Scared]',
    'Elon: "It\'s just PAPER. It\'s just WORDS. The mission is REAL—"',
    '[POSE elon_reporter pose=Closeup expression=Determined]',
    'Reporter: "So is the record. Lonnie LeBlanc. Francisco Cabada. Owen Diaz. Six hundred names with case numbers. That\'s what a mission with a body count looks like written down."',
    '[IF attackedPress == 1]',
    'Narrator: "His own posts attacking the reporter run as exhibits beside the story — the megaphone testifying against its owner."',
    '[ENDIF]',
    '[IF firedWalkout == 1]',
    'Narrator: "The retaliation charges from the walkout purge are consolidated into the record too. Every firing became a filing."',
    '[ENDIF]',
    'Narrator: "No collapse completes in this era — he is still rich beyond arithmetic. But prestige is the armor, and the armor is now evidence. Publication and litigation: education corroding prestige, in real time. The record is the resistance."',
    '[CHOICE]',
    '- "Run it back" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// 8b — ENDING: THE SIMULATION CONTINUES (prestige held)
scenes.push({
  id: 'elon_end_sim',
  name: 'The Simulation Continues',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('em_es', 'elon_musk', 50, 60, 2.8),
    balloon('sim_ticker', 'THE FEED — LIVE', 45, 95),
  ],
  script: lines(
    '[GAUGE prestige at 87,20 min=0 max=100 label="PRESTIGE"]',
    '[GAUGE exposure at 87,44 min=0 max=100 label="EXPOSURE"]',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "See? Still here. Still the mission. Still the richest man alive. Foundation gala on Thursday — we\'re saving humanity, ask anyone I pay."',
    '[SET_TEXT sim_ticker "NO ENDING YET — THIS ERA IS STILL RUNNING. THE EXPOSÉS ARE PUBLISHED. THE SUITS ARE FILED. THE VERDICTS STAND."]',
    'Narrator: "This ending is honest about itself: it isn\'t one. The prestige shell held — this run. The Reuters exposé still won its Pulitzer. The CRD and EEOC suits are still on the docket. The record accumulates whether or not the feed acknowledges it."',
    '[IF paidFine == 1]',
    'Narrator: "In this run, one fine was paid in full and one test stand got fixed. Hold that thought — it is the size of the difference a working rule could make."',
    '[ENDIF]',
    'Narrator: "So the chapter closes on the litmus test the whole era keeps failing: Does philanthropy substitute for justice? Are missions-to-save-humanity laundering a fortune — or is the underlying extraction actually being stopped?"',
    'Narrator: "The dashboard behind the mission is still counting. You\'ve seen which one he watches."',
    '[CHOICE]',
    '- "Run it back" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ================================================================ EPISODES
// "Voices of the Feed" — a ~100-vignette reaction layer. Data-driven:
// EVENTS (documented moments from HVB_RESEARCH.md ch.5) × RESPONDERS
// (named voices plus the workers and reply-guys en masse, with stance
// variants). Each vignette is 2-3 short lines — first-pass prose meant
// for editing — and carries Narraton metadata in the 'elon_reactions'
// pool so the storyteller can surface reactions that match the state.
// Victims are named factually; the caricature register is reserved for
// Elon and the hype-bro. Verbatim sourced quotes stay verbatim.

const storySceneCount = scenes.length;

// keys: least-squares targets against the running worldState.
const nkeys = (exposure, prestige) => ({
  exposure: { target: exposure, scale: 100 },
  prestige: { target: prestige, scale: 100 },
});

const RESPONDERS = [
  { id: 'elon_pub', label: 'Elon — posting through it', actor: 'elon_musk', drop: 'elon_feedroom_drop' },
  { id: 'elon_3am', label: 'Elon — 3am, private', actor: 'elon_musk', drop: 'elon_bedroom_drop' },
  { id: 'reporter', label: 'The Reporter', actor: 'elon_reporter', drop: 'elon_hq' },
  { id: 'worker', label: 'The Worker', actor: 'elon_worker', drop: 'elon_factory_drop' },
  { id: 'lawyer', label: 'The Lawyer', actor: 'elon_lawyer', drop: 'elon_court_drop' },
  { id: 'lt', label: 'The Lieutenant', actor: 'elon_hypebro', drop: 'elon_feedroom_drop' },
  { id: 'workers_g', label: 'The Workers — grieving', actor: 'elon_workers', drop: 'elon_factory_drop' },
  { id: 'workers_o', label: 'The Workers — organizing', actor: 'elon_workers', drop: 'elon_factory_drop' },
  { id: 'fans_d', label: 'The Reply Guys — defending', actor: 'elon_fans', drop: 'elon_feedroom_drop' },
  { id: 'fans_q', label: 'The Reply Guys — doubting', actor: 'elon_fans', drop: 'elon_feedroom_drop' },
];

const EVENTS = [
  {
    id: 'fremont', name: 'The Fremont Speedup', drop: 'elon_factory_drop', keys: nkeys(15, 90),
    setup: '2016–2018. Fremont runs hot: 722 recorded injuries in 2017 — about two a day — and a severe-injury rate reported 83% above the industry average. Tesla disputes the reporting. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "Fremont is the most advanced factory on Earth. The machine builds the machine."',
        'Elon (Pointing/Smug): "Injury reports? Legacy-media FUD. The line speaks for itself."',
        'Narrator: "The line speaks in incident reports. About two a day, in 2017."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Searching my own name plus \'injury rate.\' Again."',
        'Elon (Panicked): "722 is just a number. Numbers are just... numbers."',
        'Narrator: "He mutes the word \'Fremont.\' The word does not mute him."',
      ],
      reporter: [
        'Reporter: "Reveal\'s Will Evans and Alyssa Jeong Perry counted: 722 injuries at Fremont in 2017. About two a day."',
        'Reporter (Closeup/Determined): "And workers say some injuries never made the log at all. That\'s the story under the story."',
      ],
      worker: [
        'Worker: "The line sped up again this shift. My wrists knew before the memo landed."',
        'Worker (Pointing/Angry): "Two of us a day get hurt and the dashboard stays green. Whose dashboard is that?"',
      ],
      lawyer: [
        'Lawyer: "Tesla disputes the Reveal numbers. For the record."',
        'Lawyer: "Also for the record: disputing a count is not the same as lowering it."',
      ],
      lt: [
        'Lieutenant: "Boss, the injury story is trending. Counter-narrative: factory tour, dramatic lighting, robots."',
        'Lieutenant: "We\'ll call the speedup \'production hell.\' Heroic framing. People love hell when it\'s yours."',
      ],
      workers_g: [
        'Workers: "Maria went out on a stretcher Tuesday. The line didn\'t even stop."',
        'Workers: "We patch each other up in the parking lot and clock back in."',
      ],
      workers_o: [
        'Workers: "The UAW commissioned a safety study. Worksafe found what our bodies already knew."',
        'Workers: "Every unlogged injury goes in our own notebook now. Notebooks organize."',
      ],
      fans_d: [
        'Fans: "722 injuries? Out of how many shifts? Do the math, haters."',
        'Fans: "You can\'t build the future without a few bruises."',
      ],
      fans_q: [
        'Fans: "Okay but... two a day is a lot of bruises."',
        'Fans: "My cousin works the Fremont line. She says it\'s worse than the posts say."',
      ],
    },
  },
  {
    id: 'leblanc', name: 'The Death of Lonnie LeBlanc', drop: 'elon_factory_drop', keys: nkeys(25, 85),
    setup: 'June 2014, SpaceX McGregor, Texas. Lonnie LeBlanc, 38, a recently retired Marine, is killed when a gust blows him off a trailer — he was holding insulation down with his own body weight. OSHA settles for a $7,000 fine. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "SpaceX safety is world-class. We are literally saving humanity."',
        'Narrator: "He never posts about McGregor, June 2014. The feed moves on. The record doesn\'t."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Legal says the LeBlanc matter is closed. Closed. Settled. 2014."',
        'Elon (Panicked): "Then why do I remember the number? Seven thousand dollars."',
      ],
      reporter: [
        'Reporter: "Lonnie LeBlanc, 38, retired Marine. No proper tie-downs, so he sat on the cargo. A gust. That was all."',
        'Reporter (Closeup/Determined): "His family didn\'t know OSHA had investigated until I called them. Nine years later."',
      ],
      worker: [
        'Worker: "They sent a man up to be a paperweight. That\'s what no tie-downs means."',
        'Worker: "His uncle Ron Weimer said it best: \'There\'s a way to do dangerous work… without people dying.\'"',
      ],
      lawyer: [
        'Lawyer: "OSHA settled at $7,000. That is the price the system put on it."',
        'Lawyer: "For comparison, sir: your dinner tab clears that. Regularly."',
      ],
      lt: [
        'Lieutenant: "Boss, nobody\'s even heard of McGregor. Zero mentions. Non-story."',
        'Lieutenant: "...There is a reporter calling the family, though. Flagging it. Low priority. Probably."',
      ],
      workers_g: [
        'Workers: "Lonnie made it through the Marines. He didn\'t make it through a gust of wind at McGregor."',
        'Workers: "We held a minute of silence on the pad. The schedule took it back by lunch."',
      ],
      workers_o: [
        'Workers: "A $7,000 fine for a death. That\'s not deterrence, that\'s a tip."',
        'Workers: "We\'re asking OSHA to read its own file out loud. Loudly. To reporters."',
      ],
      fans_d: [
        'Fans: "2014? Ancient history. Every industry has accidents. Look up fishing boats."',
        'Fans: "The fine was only $7,000, so how bad could it have been? Checkmate."',
      ],
      fans_q: [
        'Fans: "Wait. The family found out about the OSHA file from a REPORTER?"',
        'Fans: "A man died and the feed never showed it to me. What else didn\'t it show me?"',
      ],
    },
  },
  {
    id: 'cabada', name: 'Francisco Cabada\'s Skull', drop: 'elon_factory_drop', keys: nkeys(35, 80),
    setup: '18 January 2022, SpaceX Hawthorne. During pressure testing, a Raptor V2 engine part flies off and fractures Francisco Cabada\'s skull, leaving him comatose. CalOSHA fines SpaceX $18,475; SpaceX appeals toward $475. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "Raptor 2 is a marvel. Full-flow staged combustion. Progress has a price."',
        'Narrator: "The price had a name and a wife who waited by a hospital bed. He didn\'t call."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "The appeal is a PRINCIPLE. Regulators shouldn\'t tax the mission."',
        'Elon (Panicked): "$18,475 down to $475. Someone will put that next to my net worth. Someone always does the math."',
      ],
      reporter: [
        'Reporter: "Francisco Cabada, engine technician. A Raptor part fractured his skull during a pressure test. He hasn\'t woken up."',
        'Reporter (Closeup/Determined): "His wife Ydy told me: \'It would have been nice to get a call from Elon Musk… But I guess workers are just disposable to them.\'"',
      ],
      worker: [
        'Worker: "Frank ran that test cell for years. The part didn\'t care how good he was."',
        'Worker (Pointing/Angry): "They appealed the fine for his skull. Toward $475. Say that out loud."',
      ],
      lawyer: [
        'Lawyer: "The appeal is procedurally routine. Every employer contests CalOSHA."',
        'Lawyer: "It is also arithmetic a jury can do: $475, against $300 billion. I\'d advise against a jury."',
      ],
      lt: [
        'Lieutenant: "Optics check: \'comatose technician\' is polling... poorly, boss."',
        'Lieutenant: "Recommend we announce a Mars update Thursday. A big one. A loud one."',
      ],
      workers_g: [
        'Workers: "We keep a chair for Frank in the break room. Nobody sits in it."',
        'Workers: "His wife visits the hospital every day. The company visits the appeals board."',
      ],
      workers_o: [
        'Workers: "After Frank, we started our own incident log. Ours doesn\'t get appealed."',
        'Workers: "\'You decide what\'s safe for you\' isn\'t a safety policy. It\'s the company ducking."',
      ],
      fans_d: [
        'Fans: "Pressure tests are dangerous EVERYWHERE. Name one rocket program without incidents."',
        'Fans: "The fine got reduced, so the regulators must have overcharged. System working!"',
      ],
      fans_q: [
        'Fans: "They fought the fine down toward $475. For a fractured skull."',
        'Fans: "I\'ve spent more than $475 on merch. His merch."',
      ],
    },
  },
  {
    id: 'diaz', name: 'The Diaz Verdict', drop: 'elon_court_drop', keys: nkeys(45, 70),
    setup: '4 October 2021. A federal jury awards Owen Diaz — a Black contract elevator operator at Fremont, 2015–16 — $137 million for a racially hostile workplace. Later reduced on appeal; the finding stands. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "We run the most scrutinized factory in America. We\'ll appeal. We always appeal."',
        'Narrator: "The appeal worked on the number. It did not work on the finding."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "$137 million. Drafting a post about frivolous—"',
        'Elon (Panicked): "The jury heard the evidence. Twelve people. Delete draft. Delete draft."',
      ],
      reporter: [
        'Reporter: "Owen Diaz ran an elevator at Fremont and testified to what he heard on that floor. Daily."',
        'Reporter (Closeup/Determined): "$130 million of the award was punitive. Punitive means the jury wanted it to hurt."',
      ],
      worker: [
        'Worker: "Everybody on that floor knew what Owen was hearing. Now a jury knows too."',
        'Worker: "The award got smaller on appeal. What happened to him didn\'t."',
      ],
      lawyer: [
        'Lawyer: "Reduced to $15 million in 2022, about $3.2 million at retrial in 2023. Wins, on paper."',
        'Lawyer: "Then the state civil-rights suit. Then the EEOC. Verdicts breed filings, sir."',
        'Narrator: "Kevin Kish, California CRD, announcing the 2022 suit: Tesla operates \'a racially segregated workplace.\'"',
      ],
      lt: [
        'Lieutenant: "Boss, don\'t post about the verdict. Whatever you\'re typing — don\'t."',
        'Lieutenant: "He\'s typing. He posted. Okay. Crisis binder, page one."',
      ],
      workers_g: [
        'Workers: "Owen told the truth about that floor and it cost him years of his life."',
        'Workers: "Some of us heard the same words he heard. We believed him before the jury did."',
      ],
      workers_o: [
        'Workers: "The state took hundreds of complaints from this plant before it sued. Hundreds. Ours included."',
        'Workers: "One verdict, two agencies, one paper trail. That\'s how a floor gets safer."',
      ],
      fans_d: [
        'Fans: "One contractor\'s lawsuit. Statistically zero. The media does this every time."',
        'Fans: "It got reduced to $3 million! That\'s basically an apology from the court."',
      ],
      fans_q: [
        'Fans: "A jury put $130 million of PUNITIVE on it. Juries don\'t do that for nothing."',
        'Fans: "Then the state sued. Then the feds. That\'s... a pattern, right?"',
      ],
    },
  },
  {
    id: 'buyout', name: 'The Platform Purchase', drop: 'elon_feedroom_drop', keys: nkeys(20, 95),
    setup: '27 October 2022. He walks into the headquarters carrying a sink, closes the $44 billion deal, and posts: \'the bird is freed.\' Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "let that sink in"',
        'Elon (Pointing/Smug): "the bird is freed"',
        'Narrator: "Both verbatim, October 2022. Forty-four billion dollars for the megaphone."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "$44 billion. The banks made me overpay. The BANKS."',
        'Elon (Panicked): "It\'s fine. It\'s a town square. Town squares definitely service debt."',
      ],
      reporter: [
        'Reporter: "He paid $44 billion for the place where reporters publish. Note the incentive."',
        'Reporter (Closeup/Determined): "Owning the megaphone doesn\'t own the story. We can print anywhere."',
      ],
      worker: [
        'Worker: "$44 billion for an app. Our safety-budget requests come back \'under review.\'"',
        'Worker: "A rocket plant, a car plant, and now the feed. Same boss. Same dashboard."',
      ],
      lawyer: [
        'Lawyer: "He tried to back out. Discovery was going to be... vivid. He closed instead."',
        'Lawyer: "Buying the court of public opinion does not recuse the actual courts."',
      ],
      lt: [
        'Lieutenant: "The sink bit KILLED, boss. \'Let that sink in.\' Cinema."',
        'Lieutenant: "Also payroll asks if we own a social network now. We do? Cool. Cool cool cool."',
      ],
      workers_g: [
        'Workers: "$44 billion. Lonnie\'s fine was $7,000. We did the division on a napkin."',
        'Workers: "The napkin is still on the break-room wall."',
      ],
      workers_o: [
        'Workers: "He bought the place where our organizing threads live. Noted."',
        'Workers: "So we backed up the contact lists. Solidarity doesn\'t need his servers."',
      ],
      fans_d: [
        'Fans: "HE OWNS THE BIRD APP NOW. Best timeline. Free speech is BACK."',
        'Fans: "The sink meme is already framed in my apartment."',
      ],
      fans_q: [
        'Fans: "He said he\'d back out, then suddenly closed. What changed? Depositions, apparently."',
        'Fans: "$44 billion... should the town square have a landlord?"',
      ],
    },
  },
  {
    id: 'layoffs', name: 'The Layoffs Weekend', drop: 'elon_feedroom_drop', keys: nkeys(30, 85),
    setup: 'November 2022. Within about a week of the deal closing, roughly half of the platform\'s 7,500 staff are laid off — the safety and moderation teams among them. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "Extremely hardcore. Only intense, exceptional people remain. The rest were headcount."',
        'Narrator: "\'Headcount\' had badge photos, mortgages, and half the institutional knowledge."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Who runs two-factor auth? WHO RAN two-factor auth?"',
        'Elon (Panicked): "He was on the list. He was ON the list. Un-list him. Can we un-list?"',
      ],
      reporter: [
        'Reporter: "Roughly half of 7,500 people, cut in days, many by overnight email."',
        'Reporter (Closeup/Determined): "The teams that kept the feed safe were, in HR terms, \'on the list.\'"',
      ],
      worker: [
        'Worker: "Factory floor or feed floor — the move\'s the same. Cut deep, call it hardcore."',
        'Worker: "The survivors do three jobs and thank him publicly. We know that shift."',
      ],
      lawyer: [
        'Lawyer: "Layoff law has notice periods. Several jurisdictions have billed us their opinion."',
        'Lawyer: "The severance lawsuits are, let\'s say, a genre now."',
      ],
      lt: [
        'Lieutenant: "Boss, we cut half the staff and the site stayed up! Mostly! Largely up!"',
        'Lieutenant: "Minor note: we may have laid off the person who knows why it stays up."',
      ],
      workers_g: [
        'Workers: "Half the badge photos went dark in a weekend. We watched it like weather."',
        'Workers: "Some found out when the laptop locked mid-sentence."',
      ],
      workers_o: [
        'Workers: "Layoff by midnight email is an organizing pamphlet that writes itself."',
        'Workers: "Their severance suits, our safety petitions — same lesson. Paper fights back."',
      ],
      fans_d: [
        'Fans: "7,500 people to run a website?? He HAD to cut. Basic efficiency."',
        'Fans: "Hardcore mode! I would work 120 hours a week for him. For FREE."',
      ],
      fans_q: [
        'Fans: "My favorite support account went dark. The actual human behind it is gone."',
        'Fans: "\'Efficiency\' is doing a lot of work for \'we fired whoever answered my tickets.\'"',
      ],
    },
  },
  {
    id: 'trustsafety', name: 'Trust & Safety, Disbanded', drop: 'elon_feedroom_drop', keys: nkeys(40, 75),
    setup: 'December 2022. The Trust and Safety Council is dissolved, banned accounts are reinstated, the COVID-misinformation policy is deleted. Researchers later document a measurable rise in hate-speech impressions. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "The people have spoken. Amnesty. Vox Populi, Vox Dei."',
        'Narrator: "Researchers auditing the feed logged what the vox did next: hate-speech impressions rose."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Moderation was censorship. Deleting it was freedom. The graphs are lying."',
        'Elon (Panicked): "Why is my mentions tab like this. Who let these people in. ...I did. Technically I did."',
      ],
      reporter: [
        'Reporter: "The council of outside safety experts got a form email: dissolved."',
        'Reporter (Closeup/Determined): "Then the audit landed: hate-speech impressions up, measurably. Not vibes. A dataset."',
      ],
      worker: [
        'Worker: "Moderators were the feed\'s safety rail. We know what happens when rails come off."',
        'Worker: "On our floor it\'s guards off the machines. Same shape. Different blood."',
      ],
      lawyer: [
        'Lawyer: "Advertisers read those audits. Regulators read those audits."',
        'Lawyer: "In Europe they don\'t just read them, sir. They invoice."',
      ],
      lt: [
        'Lieutenant: "Engagement is UP, boss. Way up. Some of it is, um. The bad kind of up."',
        'Lieutenant: "Advertisers keep \'pausing.\' Which is like leaving, but with a press release."',
      ],
      workers_g: [
        'Workers: "The mod teams were people too — they saw the worst of it so the rest of us didn\'t."',
        'Workers: "They got cut, and the worst of it came back onto everyone\'s screen."',
      ],
      workers_o: [
        'Workers: "The slurs that got Owen Diaz a verdict now trend on the boss\'s own platform."',
        'Workers: "We archive what shows up. Screenshots are testimony now."',
      ],
      fans_d: [
        'Fans: "FREE SPEECH IS BACK. If you see hate speech, that\'s just other people\'s free speech."',
        'Fans: "The council was a censorship committee. A form email was generous."',
      ],
      fans_q: [
        'Fans: "My replies got dark. Really dark. Overnight."',
        'Fans: "I muted forty accounts this week. The moderation used to do that. For free."',
      ],
    },
  },
  {
    id: 'reuters', name: 'The Reuters Investigation', drop: 'elon_hq', keys: nkeys(65, 60),
    setup: '10 November 2023. Reuters publishes Marisa Taylor\'s investigation, \'At SpaceX, worker injuries soar in Elon Musk\'s rush to Mars\': more than 600 documented injuries since 2014, and one death. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "Legacy media attacks the mission because the mission makes them irrelevant."',
        'Narrator: "The \'attack\' was records. Six hundred injuries, documented, with case numbers."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Brownsville, 4.8 per 100. Industry, 0.8. She led with the ratio."',
        'Elon (Panicked): "You can\'t ratio a ratio. Can you ratio a ratio? Drafting."',
      ],
      reporter: [
        'Reporter (Closeup/Determined): "Months of records requests. Six hundred-plus injuries. Crushed limbs. One death."',
        'Reporter: "Tom Moline, former SpaceX engineer, on the record: the company \'justifies casting aside anything that could stand in the way… including worker safety.\'"',
      ],
      worker: [
        'Worker: "Travis Carson, one of our old supervisors, told Reuters: \'SpaceX\'s idea of safety is: We\'ll let you decide what\'s safe for you\' — \'which really means there was no accountability.\'"',
        'Worker (Pointing/Angry): "We LIVED that quote. Now it has a byline."',
      ],
      lawyer: [
        'Lawyer: "Every number in that story is now findable in discovery. She did plaintiffs\' homework for free."',
        'Lawyer: "My advice remains: no posting. My expectation remains: posting."',
      ],
      lt: [
        'Lieutenant: "Boss, Reuters sent detailed questions before publishing. That\'s thorough. Scary-thorough."',
        'Lieutenant: "Our strategy of \'the press office is an emoji\' may have underperformed."',
      ],
      workers_g: [
        'Workers: "Six hundred injuries. We could put a face on every kind of them."',
        'Workers: "Lonnie\'s family learned about the OSHA file from that reporter. Nine years. It took a stranger."',
      ],
      workers_o: [
        'Workers: "Six hundred documented. Our notebooks say the real count is higher."',
        'Workers: "Reporters can only print what someone tells them. Keep talking."',
      ],
      fans_d: [
        'Fans: "600 injuries over NINE YEARS at a ROCKET company. Contextless FUD."',
        'Fans: "Reuters is jealous because journalism doesn\'t go to Mars."',
      ],
      fans_q: [
        'Fans: "Six times the industry average isn\'t \'rockets are hard.\' Other rocket companies exist."',
        'Fans: "I read the whole thing. Twice. I don\'t have a reply for the wind gust."',
      ],
    },
  },
  {
    id: 'pulitzer', name: 'The Pulitzer', drop: 'elon_hq', keys: nkeys(80, 45),
    setup: '2024. The Reuters SpaceX investigation wins the Pulitzer Prize for National Reporting. Education corroding prestige, in real time. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "Awards are legacy media giving itself a trophy for being legacy media."',
        'Narrator: "He posted this on the platform he bought so the story wouldn\'t matter. It mattered."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "A Pulitzer. For MY injuries. Her prize, MY injuries—"',
        'Elon (Panicked): "That came out wrong. That came out very wrong. Never say that in public."',
      ],
      reporter: [
        'Reporter (Closeup/Determined): "The prize isn\'t the point. The point is one word: \'documented.\' Six hundred times over."',
        'Reporter: "What a Pulitzer really buys: editors approve the next records request faster."',
      ],
      worker: [
        'Worker: "A prize won\'t fix a test stand. But the foremen read the news now, before every shift."',
        'Worker: "The company knows the world is watching the injury log. Watched logs shrink."',
      ],
      lawyer: [
        'Lawyer: "Congratulating the press is not my role. Updating your risk model is."',
        'Lawyer: "A Pulitzer footnotes every future filing. Judges read the news too, sir."',
      ],
      lt: [
        'Lieutenant: "Boss, do NOT quote-post the Pulitzer announcement. It\'s bait."',
        'Lieutenant: "He\'s typing. Of course he\'s typing."',
      ],
      workers_g: [
        'Workers: "The story that won was about our people. Lonnie. Frank. The six hundred."',
        'Workers: "Somebody finally made the country read their names."',
      ],
      workers_o: [
        'Workers: "A Pulitzer means the next whistleblower gets believed a day faster."',
        'Workers: "We taped the story inside every locker. Management removes it. We keep printing."',
      ],
      fans_d: [
        'Fans: "Pulitzers are participation trophies for the MSM. Mars is the real prize."',
        'Fans: "When the first crew lands on Mars, nobody will remember an article."',
      ],
      fans_q: [
        'Fans: "The committee checked her math. Everyone checked her math. The math held."',
        'Fans: "I used to reply \'source?\' to everything. Now the source has a Pulitzer."',
      ],
    },
  },
  {
    id: 'trillion', name: 'The Trillion Day', drop: 'elon_feedroom_drop', keys: nkeys(50, 100),
    setup: 'Mid-June 2026. Around SpaceX\'s Nasdaq debut he becomes the first person ever worth one trillion dollars — for about twelve days, until the shares correct. Who\'s talking?',
    v: {
      elon_pub: [
        'Elon (Pointing/Smug): "First. Trillionaire. Ever. The mission is priced in. YOU\'RE priced in."',
        'Narrator: "Twelve days later the price changed its mind. Prices do."',
      ],
      elon_3am: [
        'Elon (Sit/Angry): "Refresh. Still $990 billion. Refresh. REFRESH."',
        'Elon (Panicked): "Who sells at 3am?? Europe. Europe sells at 3am."',
      ],
      reporter: [
        'Reporter: "A trillion dollars, priced on futures that haven\'t happened: Mars, robotaxis, everything."',
        'Reporter (Closeup/Determined): "The correction took twelve days. The injury records aren\'t priced on anything. They just are."',
      ],
      worker: [
        'Worker: "A trillion for one man, on paper. Frank\'s fine got appealed toward $475. Same company."',
        'Worker: "Our raises are \'not in the budget.\' The budget has a comma problem."',
      ],
      lawyer: [
        'Lawyer: "Congratulations. A larger fortune is a larger target class. Plaintiffs can read tickers."',
        'Lawyer: "Also the estate-planning team called. All of them. At once."',
      ],
      lt: [
        'Lieutenant: "T-DAY, BOSS! I made hats. \'FIRST TRILLIONAIRE.\' Four hundred units."',
        'Lieutenant: "...Day thirteen. Do we, uh. Do we still hand out the hats?"',
      ],
      workers_g: [
        'Workers: "The night he hit a trillion, the swing shift ran the stand hot. Again."',
        'Workers: "None of that number ever reached the floor. It never does."',
      ],
      workers_o: [
        'Workers: "A trillion is a bet other people place on our work staying cheap."',
        'Workers: "Twelve days later the bet wobbled. Our petition didn\'t."',
      ],
      fans_d: [
        'Fans: "FIRST TRILLIONAIRE IN HISTORY. I feel like I\'M rich. We did it!"',
        'Fans: "The dip is FUD. Diamond hands. He\'s basically holding for humanity."',
      ],
      fans_q: [
        'Fans: "We cheered a number that wasn\'t ours, and it fell twelve days later."',
        'Fans: "I keep thinking about the napkin math. A $7,000 fine. One trillion. Explain the units to me."',
      ],
    },
  },
];

// --- hub: pick an event ---------------------------------------------------
scenes.push({
  id: 'elon_voices',
  name: 'Voices of the Feed',
  sceneType: 'AGENCY',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('vox_fans', 'elon_fans', 26, 63, 2.2),
    el('vox_workers', 'elon_workers', 74, 63, 2.2),
  ],
  script: lines(
    'Narrator: "Ten moments in the record. Pick one, and hear who\'s talking."',
    '[CHOICE]',
    ...EVENTS.map((ev) => `- "${ev.name}" -> vox_${ev.id}`),
    '- "Witness: McGregor, June 2014" -> el_cut_mcgregor',
    '- "Witness: The Dashboard Is Green" -> el_cut_dashboard',
    '- "See the Machine itself" -> el_machine',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- per-event responder choosers + vignettes -----------------------------
for (const ev of EVENTS) {
  // responder chooser
  scenes.push({
    id: `vox_${ev.id}`,
    name: `Voices: ${ev.name}`,
    sceneType: 'AGENCY',
    dropId: dropId(ev.drop),
    stage: [
      el(`vx_${ev.id}_f`, 'elon_fans', 24, 63, 2.0),
      el(`vx_${ev.id}_w`, 'elon_workers', 76, 63, 2.0),
    ],
    script: lines(
      `Narrator: "${ev.setup}"`,
      '[CHOICE]',
      ...RESPONDERS.map((r) => `- "${r.label}" -> vg_${ev.id}_${r.id}`),
      '- "Back to the events" -> elon_voices',
      '[/CHOICE]',
    ),
    status: 'work',
  });

  // vignettes
  for (const r of RESPONDERS) {
    const body = ev.v[r.id];
    if (!body) throw new Error(`Missing vignette: ${ev.id} / ${r.id}`);
    scenes.push({
      id: `vg_${ev.id}_${r.id}`,
      name: `${ev.name} — ${r.label}`,
      sceneType: 'WITNESS',
      dropId: dropId(r.drop),
      stage: [el(`vg_${ev.id}_${r.id}_a`, r.actor, 50, 62, 2.4)],
      narraton: { pool: 'elon_reactions', keys: ev.keys, repeatable: true, weight: 1 },
      script: lines(
        ...body,
        '[CHOICE]',
        `- "Another voice on this" -> vox_${ev.id}`,
        '- "Back to the events" -> elon_voices',
        '[/CHOICE]',
      ),
      status: 'work',
    });
  }
}

const vignetteCount = EVENTS.length * RESPONDERS.length;
const voicesSceneCount = scenes.length;

// ================================================================ CUTSCENES
// Two non-interactive witness cutscenes ([AUTOPLAY on] … [AUTOPLAY off]).
// The horror is carried by plainness and by the real numbers; nothing is
// depicted. Each jumps to its IMPACT scene, which animates the Georgist
// variables the moment moved — and offers the Machine.

// C1 — McGREGOR, JUNE 2014 (the death of Lonnie LeBlanc, in plain beats)
scenes.push({
  id: 'el_cut_mcgregor',
  name: 'McGregor, June 2014',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    // Stillness: no actors. A site card and a line that will become the fine.
    balloon('mcg_card', 'SPACEX TEST SITE — McGREGOR, TEXAS', 50, 22, { zIndex: 2 }),
    balloon('mcg_fine', 'JUNE 2014', 45, 95),
  ],
  script: lines(
    '[AUTOPLAY on]',
    'Narrator: "McGregor, Texas. June 2014. A rocket test site on flat land. Wind country."',
    '[WAIT 2s]',
    'Narrator: "A trailer is loaded with foam insulation. The load has to cross the yard."',
    '[WAIT 2s]',
    'Narrator: "There are no straps on the trailer. Nobody goes to get straps."',
    '[WAIT 3s]',
    'Narrator: "Lonnie LeBlanc, thirty-eight, a recently retired Marine, climbs up and sits on the insulation. His body weight is the tie-down."',
    '[WAIT 3s]',
    'Narrator: "The trailer moves. A gust of wind."',
    '[WAIT 3s]',
    'Narrator: "He is blown headfirst off the trailer. He dies at the scene."',
    '[WAIT 4s]',
    '[SET_TEXT mcg_fine "OSHA SETTLES THE CASE. THE FINE: $7,000"]',
    '[WAIT 4s]',
    'Narrator: "His family is not told there was an investigation."',
    '[WAIT 9s]',
    'Narrator: "Nine years. Then a reporter calls them."',
    '[WAIT 2s]',
    'Narrator: "Ron Weimer, his uncle, to Reuters: \'There\'s a way to do dangerous work… without people dying.\'"',
    '[WAIT 3s]',
    '[AUTOPLAY off]',
    '[SCENE el_impact_mcgregor]',
  ),
  status: 'work',
});

// C2 — THE DASHBOARD IS GREEN (the injury ticker; the numbers do the horror)
scenes.push({
  id: 'el_cut_dashboard',
  name: 'The Dashboard Is Green',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('dash_workers', 'elon_workers', 50, 64, 2.4),
    balloon('dash_stand', 'RAPTOR TEST STAND', 50, 24, { zIndex: 2 }),
    balloon('dash_rate', 'THE OTHER DASHBOARD', 45, 95),
  ],
  script: lines(
    '[AUTOPLAY on]',
    '[EFFECT electric_flare on dash_stand]',
    'Narrator: "A test stand, flickering. The workers stand and watch the numbers they already live in. The company dashboard is green. This is the other one."',
    '[WAIT 3s]',
    '[SET_TEXT dash_rate "BROWNSVILLE, 2022: 4.8 INJURIES PER 100 WORKERS"]',
    '[WAIT 3s]',
    '[SET_TEXT dash_rate "SPACE-INDUSTRY AVERAGE: 0.8 PER 100 — BROWNSVILLE RUNS SIX TIMES THAT"]',
    '[WAIT 3s]',
    '[SET_TEXT dash_rate "McGREGOR: 2.7 PER 100 — THREE TIMES THE AVERAGE"]',
    '[WAIT 3s]',
    '[SET_TEXT dash_rate "HAWTHORNE: 1.8 PER 100 — TWICE THE AVERAGE"]',
    '[WAIT 3s]',
    '[SET_TEXT dash_rate "KENNEDY SPACE CENTER, 2016: 21.5 PER 100 — TWENTY-SEVEN TIMES THE AVERAGE"]',
    '[WAIT 4s]',
    '[SET_TEXT dash_rate "REUTERS, 2023: 600+ DOCUMENTED INJURIES SINCE 2014. ONE DEATH."]',
    '[WAIT 4s]',
    'Narrator: "Ydy Cabada, whose husband Francisco was left comatose by a Raptor part on that stand: \'It would have been nice to get a call from Elon Musk… But I guess workers are just disposable to them.\'"',
    '[WAIT 4s]',
    '[AUTOPLAY off]',
    '[SCENE el_impact_dashboard]',
  ),
  status: 'work',
});

// ================================================================ IMPACT
// The cutscene, translated into the Georgist variables — needles animated
// by an IF-guarded [TICK 300ms], narration mapping the record onto George.

// I1 — impact of McGregor: greed moves the margin; regulation corrodes.
scenes.push({
  id: 'el_impact_mcgregor',
  name: 'Impact: The Price of a Gust',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    balloon('imp1_card', 'WHAT McGREGOR DOES TO THE MACHINE', 45, 16, { zIndex: 2 }),
  ],
  script: lines(
    '[GAUGE greed at 87,14 min=0 max=100 label="GREED"]',
    '[GAUGE repression at 87,38 min=0 max=100 label="REPRESSION"]',
    '[GAUGE regulation at 87,62 min=0 max=100 label="REGULATION"]',
    '[TICK 300ms]',
    '[IF greed < 92]',
    '[SET greed = min(greed + 2, 92)]',
    '[ENDIF]',
    '[IF repression < 60]',
    '[SET repression = min(repression + 2, 60)]',
    '[ENDIF]',
    '[IF regulation > 12]',
    '[SET regulation = max(regulation - 1, 12)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "Watch the needles. Speed-over-safety is not a mood — it is greed moving the margin. Every point it climbs, the margin of production drops, and rent eats the difference out of wages. The straps were a cost. The Marine was not."',
    'Narrator: "A death priced at $7,000 — and the next fine, for Francisco Cabada\'s skull, contested from $18,475 toward $475. That falling needle is regulation corroding: a rule that costs less than the profit of breaking it is not a rule. It is a price."',
    'Narrator: "And a family kept from the file for nine years — that is repression rising: the cost of keeping the humans from comparing notes."',
    '[CHOICE]',
    '- "See it feed the Machine" -> el_machine',
    '- "Back" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// I2 — impact of the exposé: education corroding prestige, Kodak-style.
scenes.push({
  id: 'el_impact_dashboard',
  name: 'Impact: The Numbers Get Out',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    balloon('imp2_card', 'WHAT THE EXPOSÉ DOES TO THE MACHINE', 45, 16, { zIndex: 2 }),
  ],
  script: lines(
    '[GAUGE education at 87,14 min=0 max=100 label="EDUCATION"]',
    '[GAUGE prestige at 87,38 min=0 max=100 label="PRESTIGE"]',
    '[GAUGE exposure at 87,62 min=0 max=100 label="EXPOSURE"]',
    '[TICK 300ms]',
    '[IF education < 70]',
    '[SET education = min(education + 2, 70)]',
    '[ENDIF]',
    '[IF prestige > 60]',
    '[SET prestige = max(prestige - 1, 60)]',
    '[ENDIF]',
    '[IF exposure < 65]',
    '[SET exposure = min(exposure + 2, 65)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "The rates on the stand were not a leak. They were records — requested, checked, published. Publication is education, and education is the one variable that corrodes prestige directly."',
    'Narrator: "It is the same mechanism as the Kodak in 1904: a cheap camera did to Leopold\'s rubber story what a Reuters spreadsheet does to the mission. The shell doesn\'t crack from outrage. It cracks from documentation."',
    'Narrator: "So the needles move: education up, prestige down, exposure up. A Pulitzer in 2024 is the mechanism certifying itself. The record is the resistance."',
    '[CHOICE]',
    '- "See it feed the Machine" -> el_machine',
    '- "Back" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// ================================================================ THE MACHINE
// The shared Georgist rig, pre-seeded with the 2026 configuration.
// Commentary draws from the elon_reactions Narraton pool (the vignettes).
scenes.push(machineHubScene({
  id: 'el_machine',
  name: 'The Machine, 2026',
  pool: 'elon_reactions',
  panel: 'drama',
  endings: false,
  autopilot: false,
  intro: {
    gateVar: 'elMachineSeen',
    line: 'The Machine, 2026 configuration: greed near the stops, speculation pricing a trillion-dollar future, prestige thick, education climbing on a Pulitzer. Watch the margin. Watch the wages. The lever is on the right.',
  },
}));

const machineSceneCount = scenes.length - voicesSceneCount;

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB: Elon Musk (2020s)',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {
      // Georgist rig: every simulation variable and coefficient.
      ...WORLD_BASE,
      // Chapter state.
      exposure: 0,
      injuries: 100,
      tickerIdx: 0,
      tday: 0,
      firedWalkout: 0,
      settledQuiet: 0,
      photoOp: 0,
      attackedPress: 0,
      paidFine: 0,
      soldSpike: 0,
      elMachineSeen: 0,
      // Machine pre-seed: the 2026 configuration.
      greed: 85,
      speculation: 70,
      prestige: 80,
      education: 40,
    },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'elon_feed',
    enableAutosave: true,
  },
  // Chapter actors plus the core Machine cast (empty graphics), and the
  // chapter SFX plus any core SFX ids the Machine tick needs (flame_burn).
  actors: [...actors, ...CORE_ACTORS.filter((a) => !actors.some((x) => x.id === a.id))],
  scenes,
  drops,
  items: [],
  sfx: [...SFX, ...CORE_SFX.filter((s) => !SFX.some((x) => x.id === s.id))],
  buttons: [],
  episodes: [
    {
      id: 'ep_elon',
      name: 'Elon Musk (2020s)',
      description: 'The feed, the factory, the exposé, the verdict, the wobble. Sourced from the Reuters investigation and court records.',
      sceneIds: scenes.slice(0, storySceneCount).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_voices',
      name: 'Voices of the Feed',
      description: 'The reaction layer: ten documented moments × ten voices — Elon posting and Elon at 3am, the reporter, the worker, the lawyer, the lieutenant, the workers grieving and organizing, the reply guys defending and doubting. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(storySceneCount, voicesSceneCount).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_machine',
      name: 'The Machine, 2026',
      description: 'Two witness cutscenes from the record — McGregor, June 2014 and the injury dashboard — their impact on the Georgist variables, and the Machine itself, pre-seeded with the 2026 configuration. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(voicesSceneCount).map((s) => s.id),
      status: 'work',
    },
  ],
};

const outPath = resolve(root, 'public', 'hvb-elon.json');
const json = JSON.stringify(game);
writeFileSync(outPath, json + '\n', 'utf8');
console.log(`Wrote ${outPath} (${(json.length / 1024 / 1024).toFixed(1)} MB, ${scenes.length} scenes [${storySceneCount} story + ${voicesSceneCount - storySceneCount} voices (${vignetteCount} vignettes) + ${machineSceneCount} machine], ${drops.length} drops, ${game.actors.length} actors)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-elon.json');
