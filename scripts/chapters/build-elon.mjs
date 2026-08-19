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

// ---------------------------------------------------------------- game

const game = {
  info: {
    title: 'HVB: Elon Musk (2020s)',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: {
      prestige: 100,
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
