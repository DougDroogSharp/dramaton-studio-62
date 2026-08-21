// Builds public/hvb-elon.json — the standalone ELON MUSK (2020s)
// chapter of Humans vs Billionaires. All content sourced from
// docs/HVB_RESEARCH.md Chapter 5 (Reuters investigation, court records)
// and docs/HVB_RESEARCH_2.md Chapter 4 (the Pass 2 deep dive: SEC
// settlement, text troves, DealBook, Tornetta/Delaware, Foundation math,
// the prestige machine, the injury taxonomy).
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
import { buildStamp } from '../stamp.mjs';

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

// ---- the three-door rule -------------------------------------------------
// House rule: no [CHOICE] shows more than three doors. Longer menus fan out
// into small grouping scenes, each a beat of framing and then its own three.
// Nothing is cut — the long lists just live one door deeper.
const MENU_MAX = 3;
const choice = (opts) => ['[CHOICE]', ...opts.filter(Boolean), '[/CHOICE]'];
const fanScene = (id, name, drop, stage, framing, doors) => {
  if (doors.length > MENU_MAX) throw new Error(`${id}: ${doors.length} doors (max ${MENU_MAX})`);
  return {
    id, name, sceneType: 'AGENCY',
    dropId: dropId(drop),
    stage,
    script: lines(...framing, ...choice(doors)),
    status: 'work',
  };
};

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
    // Introducing the man: the smallest documented version of the whole
    // chapter, up front, plus the button out to Doug's comic.
    '[BUTTON el_comic_godgamer]',
    'Narrator: "Before he does anything else in this chapter, know the smallest true thing about him. Two years after this scene he will go on the internet and claim to be one of the best video-game players alive — and the people who actually play that game will take about two days to show that large parts of the run were not his."',
    'Elon (Pointing/Smug): "Top twenty hardcore. Globally. While running five companies."',
    'Lieutenant: "Boss, the guys who play it for a living have watched the tape. They have... questions. About your build. Which is yours. Obviously."',
    'Narrator: "Doug Sharp already drew this one: ELON MUSK, GOD GAMER. The button up top opens the comic in a new tab. Everything else in this chapter is that same move with heavier machinery and real bodies."',
    '[CHOICE]',
    '- "Take the town square — make the move" -> elon_move',
    '- "Open the archive — ten years of receipts" -> elon_archive',
    '- "Enter the Machine" -> el_machine',
    '[/CHOICE]',
  ),
  status: 'work',
});

// The feed room used to hand you eleven doors at once. Three now — and
// everything that was on that list is still behind one of them.
scenes.push(fanScene(
  'elon_move', 'The Move', 'elon_feedroom_drop',
  [el('mv_elon', 'elon_musk', 30, 62), el('mv_lt', 'elon_hypebro', 70, 63)],
  [
    'Lieutenant: "Boss. Forty-four billion is sitting in escrow and the whole planet is refreshing. Give me a verb."',
    'Elon (Pointing/Smug): "A verb. I have several. All of them are load-bearing."',
    'Narrator: "Three verbs, then. Each one costs somebody a paycheck, a moderator, or a night\'s sleep — and none of those costs will show up on the dashboard."',
  ],
  [
    '- "Buy the platform — and cut the workforce" -> elon_bird',
    '- "Gut the moderation — disband Trust & Safety" -> elon_gut',
    '- "Just post through it" -> elon_gut',
  ],
));

scenes.push(fanScene(
  'elon_archive', 'The Archive', 'elon_hq',
  [el('ar_rep', 'elon_reporter', 26, 62, 2.2), el('ar_work', 'elon_workers', 74, 63, 2.2)],
  [
    'Narrator: "Set the phone down. Every move in this chapter got written up by somebody — by OSHA, by Reuters, by a Delaware chancellor, by a man with a fractured skull and a lawyer."',
    'Narrator: "This is that pile. Nothing in it is alleged. All of it is filed."',
  ],
  [
    '- "Voices of the Feed" -> elon_voices',
    '- "The shelves — duets, aftermaths, the record" -> elon_shelves',
    '- "The reels, and the God Gamer" -> elon_reels',
  ],
));

scenes.push(fanScene(
  'elon_shelves', 'The Shelves', 'elon_court_drop',
  [el('sh_law', 'elon_lawyer', 26, 62, 2.2), el('sh_rep', 'elon_reporter', 74, 62, 2.2)],
  [
    'Narrator: "Three shelves. Duets are two people in a room. Aftermaths are what the same day looks like ten years out. The Record is the paperwork nobody live-tweeted."',
  ],
  [
    '- "Duets" -> elon_duets',
    '- "Aftermaths" -> elon_aftermaths',
    '- "The Record" -> elon_record',
  ],
));

scenes.push(fanScene(
  'elon_reels', 'The Reels', 'elon_factory_drop',
  [el('rl_work', 'elon_workers', 50, 63, 2.2)],
  [
    'Narrator: "Two reels with no choices in them, and one very small true thing about a man who says he is one of the best players alive."',
  ],
  [
    '- "Witness: McGregor, June 2014" -> el_cut_mcgregor',
    '- "Witness: The Dashboard Is Green" -> el_cut_dashboard',
    '- "The God Gamer — Path of Exile, and the x-ray" -> el_poe_hub',
  ],
));

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
    'Narrator: "10 November 2023. Reuters publishes Marisa Taylor\'s investigation: \'At SpaceX, worker injuries soar in Elon Musk\'s rush to Mars.\' At least 600 previously unreported injuries since 2014. One death."',
    'Reporter: "Six hundred injuries the public had never seen — twenty-nine broken bones, seventeen crushed hands and fingers, eight amputations, five electrocutions. Roughly four hundred came in years SpaceX filed no injury data to OSHA at all. Brownsville at six times the industry average. Kennedy Space Center hit 21.5 per 100 workers in 2016 — twenty-seven times the average. On the record?"',
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
    'Lawyer: "One open item. CalOSHA\'s fine for Francisco Cabada\'s fractured skull: $18,475. We can contest it — precedent says we can grind it toward $475 — or you pay it in full and fix the stand. Be advised: in January 2024 his wife, Ydy Cabada, filed a negligence suit. That one does not grind. Your call."',
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
    setup: '27 October 2022. He walks into the headquarters carrying a sink, closes the $44 billion deal — financed largely against his Tesla stock — and posts: \'the bird is freed.\' Who\'s talking?',
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
    'Narrator: "Ten moments in the record, filed by the room they happened in: the floor, the courthouse, the feed. Pick a room, then hear who\'s talking."',
    '[CHOICE]',
    '- "The floor — Fremont and McGregor" -> vxg_floor',
    '- "The courthouse and the newsroom" -> vxg_court',
    '- "The feed — October 2022 onward" -> vxg_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

const evDoor = (id) => {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev) throw new Error(`unknown event ${id}`);
  return `- "${ev.name}" -> vox_${id}`;
};

scenes.push(fanScene(
  'vxg_floor', 'Voices: The Floor', 'elon_factory_drop',
  [el('vxg_floor_a', 'elon_workers', 50, 63, 2.2)],
  ['Narrator: "Three moments on a factory floor. A speedup, a man crushed under a load of metal, and a skull. None of the three made the feed."'],
  [evDoor('fremont'), evDoor('leblanc'), evDoor('cabada')],
));

scenes.push(fanScene(
  'vxg_court', 'Voices: The Courthouse and the Newsroom', 'elon_court_drop',
  [el('vxg_court_a', 'elon_lawyer', 26, 62, 2.2), el('vxg_court_b', 'elon_reporter', 74, 62, 2.2)],
  ['Narrator: "Three moments where somebody wrote it down and made it stick — a jury, an investigation, and the prize the investigation won."'],
  [evDoor('diaz'), evDoor('reuters'), evDoor('pulitzer')],
));

scenes.push(fanScene(
  'vxg_feed', 'Voices: The Feed', 'elon_feedroom_drop',
  [el('vxg_feed_a', 'elon_fans', 26, 63, 2.2), el('vxg_feed_b', 'elon_hypebro', 74, 63, 2.2)],
  ['Narrator: "Forty-four billion dollars for a town square, and then the fastest demolition of a workforce anybody had ever livestreamed."'],
  [evDoor('buyout'), evDoor('layoffs'), '- "Trust & Safety, and the trillion" -> vxg_feed2'],
));

scenes.push(fanScene(
  'vxg_feed2', 'Voices: The Feed, Continued', 'elon_feedroom_drop',
  [el('vxg_feed2_a', 'elon_musk', 50, 62)],
  ['Narrator: "Then the moderators go, and three years later the number on the screen says one trillion. Both of those are the same sentence."'],
  [evDoor('trustsafety'), evDoor('trillion'), '- "Back to the story" -> elon_feed'],
));

// --- per-event responder choosers + vignettes -----------------------------
// Ten responders do not fit through three doors, so the chooser asks which
// table first. Every one of the ten still speaks; none was cut.
const VGROUPS = [
  { key: 'man', label: 'The man, and the man who agrees with him',
    who: ['elon_pub', 'elon_3am', 'lt'],
    drop: 'elon_feedroom_drop', face: 'elon_musk',
    framing: ['Narrator: "Him at the podium, him at three in the morning, and the lieutenant whose entire job is to hear the first one and never the second."'] },
  { key: 'floor', label: 'The floor',
    who: ['worker', 'workers_g', 'workers_o'],
    drop: 'elon_factory_drop', face: 'elon_workers',
    framing: ['Narrator: "The people who make the thing. One alone, one crew grieving, one crew organizing — and the third is the one that costs him money."'] },
  { key: 'record', label: 'The people who write it down',
    who: ['reporter', 'lawyer'],
    drop: 'elon_hq', face: 'elon_reporter',
    framing: ['Narrator: "A reporter with a records request and a lawyer with a docket number. Between them they are the only part of this chapter he cannot post his way out of."'],
    more: { key: 'replies', label: 'And the replies' } },
  { key: 'replies', label: 'The replies', nested: true,
    who: ['fans_d', 'fans_q'],
    drop: 'elon_feedroom_drop', face: 'elon_fans',
    framing: ['Narrator: "Down in the replies, the same account defends him and doubts him, sometimes in the same thread, usually within an hour."'] },
];

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
      'Narrator: "Ten people have something to say about this. They do not all sit at the same table."',
      ...choice(VGROUPS.filter((g) => !g.nested)
        .map((g) => `- "${g.label}" -> vxr_${ev.id}_${g.key}`)),
    ),
    status: 'work',
  });

  // One scene per table — the ten responders, three at a time. A table
  // that already fills its three doors keeps all three for witnesses; the
  // way back rides on whichever table has a slot to spare.
  for (const g of VGROUPS) {
    const doors = g.who.map((rid) => {
      const r = RESPONDERS.find((x) => x.id === rid);
      if (!r) throw new Error(`unknown responder ${rid}`);
      return `- "${r.label}" -> vg_${ev.id}_${r.id}`;
    });
    if (g.more) doors.push(`- "${g.more.label}" -> vxr_${ev.id}_${g.more.key}`);
    else if (doors.length < MENU_MAX) doors.push('- "Back to the events" -> elon_voices');
    scenes.push(fanScene(
      `vxr_${ev.id}_${g.key}`, `Voices: ${ev.name} — ${g.label}`, g.drop,
      [el(`vxr_${ev.id}_${g.key}_a`, g.face, 50, 62, 2.2)],
      g.framing,
      doors,
    ));
  }

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
    '[SET_TEXT dash_rate "REUTERS, 2023: AT LEAST 600 PREVIOUSLY UNREPORTED INJURIES SINCE 2014. ONE DEATH."]',
    '[WAIT 4s]',
    '[SET_TEXT dash_rate "THE 600: 100+ CUTS AND LACERATIONS • 29 BROKEN BONES AND DISLOCATIONS • 17 CRUSHED HANDS AND FINGERS"]',
    '[WAIT 4s]',
    '[SET_TEXT dash_rate "9 HEAD INJURIES • 8 AMPUTATIONS • 7 EYE INJURIES • 5 BURNS • 5 ELECTROCUTIONS"]',
    '[WAIT 4s]',
    '[SET_TEXT dash_rate "ROUGHLY 400 OF THEM CAME IN YEARS SPACEX FILED NO INJURY DATA TO OSHA AT ALL"]',
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
const expansionStart = scenes.length;

// ================================================================ DUETS
// Seven two-hander conversations, each a four-scene chain. Hub-wired via
// elon_duets; every content scene carries Narraton metadata in the
// elon_reactions pool. Register: caricature for Elon and the Lieutenant
// only; everyone else plays it straight. Sourced quotes stay verbatim.

const rn = (exposure, prestige) => ({
  pool: 'elon_reactions', keys: nkeys(exposure, prestige), repeatable: true, weight: 1,
});

// --- duets hub -------------------------------------------------------------
scenes.push({
  id: 'elon_duets',
  name: 'Duets',
  sceneType: 'AGENCY',
  dropId: dropId('elon_hq'),
  stage: [
    el('du_hub_e', 'elon_musk', 24, 62, 2.0),
    el('du_hub_r', 'elon_reporter', 76, 62, 2.0),
  ],
  script: lines(
    'Narrator: "Two people in a room. Seven rooms, sorted by who is doing the talking — him, the lawyers, or the people who actually work here."',
    '[CHOICE]',
    '- "Rooms with Elon in them" -> dug_elon',
    '- "Rooms with lawyers in them" -> dug_law',
    '- "Rooms with the floor in them" -> dug_floor',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push(fanScene(
  'dug_elon', 'Duets — Rooms With Elon In Them', 'elon_feedroom_drop',
  [el('dug_elon_a', 'elon_musk', 30, 62), el('dug_elon_b', 'elon_hypebro', 70, 63)],
  ['Narrator: "Three rooms where he is the loudest thing present. In one he is talking to a reporter, in one to an employee, and in one to nobody at all, which is the one he is best at."'],
  [
    '- "The Interviews — Elon and the Reporter" -> duet_press_1',
    '- "The Metrics Meeting — Elon and the Lieutenant" -> duet_metrics_1',
    '- "Elon and the Feed" -> duet_feed_1',
  ],
));

scenes.push(fanScene(
  'dug_law', 'Duets — Rooms With Lawyers In Them', 'elon_court_drop',
  [el('dug_law_a', 'elon_lawyer', 30, 62), el('dug_law_b', 'elon_reporter', 70, 62)],
  ['Narrator: "Two rooms with a lawyer in them. One where the lawyer is buying somebody\'s silence, and one where the lawyer is the reason a number got out."'],
  [
    '- "The NDA — the Worker and the Lawyer" -> duet_nda_1',
    '- "On the Record — the Reporter and the Lawyer" -> duet_record_1',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push(fanScene(
  'dug_floor', 'Duets — Rooms With the Floor In Them', 'elon_factory_drop',
  [el('dug_floor_a', 'elon_worker', 30, 62), el('dug_floor_b', 'elon_workers', 70, 63, 2.2)],
  ['Narrator: "Two rooms he is not in. One is a break area at shift change. One is the replies at two in the morning. He would find both of them extremely boring, which is how you know they matter."'],
  [
    '- "The Organizing Conversation — the Worker and the Workers" -> duet_org_1',
    '- "The Ratio — the Fans and the Reporter" -> duet_ratio_1',
    '- "Back to the duets" -> elon_duets',
  ],
));

// --- A. The Interviews (Elon × Reporter, three escalating + a coda) -------
scenes.push({
  id: 'duet_press_1',
  name: 'Interview One: The Access',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dp1_e', 'elon_musk', 30, 62), el('dp1_r', 'elon_reporter', 70, 62)],
  narraton: rn(10, 95),
  script: lines(
    'Narrator: "2022. The first interview. He grants it like a favor."',
    'Elon (Pointing/Smug): "Forty-five minutes. I\'m saving humanity on a schedule."',
    'Reporter: "Then I\'ll be quick. How do you count injuries at your launch sites?"',
    'Elon (Pointing/Smug): "We count everything. We\'re a data company that makes rockets."',
    'Reporter: "Good. Then the numbers exist."',
    'Elon: "Obviously."',
    'Reporter (Closeup/Determined): "Noted. That\'s all I needed today."',
    'Narrator: "He thinks he won the interview. She got the only quote she came for: the numbers exist."',
    '[CHOICE]',
    '- "Interview two — the questions" -> duet_press_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_press_2',
  name: 'Interview Two: The Questions',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dp2_e', 'elon_musk', 30, 62), el('dp2_r', 'elon_reporter', 70, 62)],
  narraton: rn(40, 80),
  script: lines(
    'Narrator: "2023. The second interview. This time she requested it."',
    'Reporter (Closeup/Determined): "I have injury records from your own filings. Brownsville: 4.8 per 100 workers. The industry average is 0.8."',
    'Elon: "Rockets are hard. Averages are for people who don\'t build anything."',
    'Reporter: "Other rocket companies report 0.8. They build things."',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "Who leaked the numbers?"',
    'Reporter: "Nobody. They\'re public records. I requested them."',
    'Elon (Panicked): "You can just... DO that?"',
    'Reporter: "That\'s the job. A written list of questions is coming. Answer or don\'t — I\'m filing either way."',
    '[CHOICE]',
    '- "Interview three — publication day" -> duet_press_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_press_3',
  name: 'Interview Three: Publication Day',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dp3_e', 'elon_musk', 30, 62), el('dp3_r', 'elon_reporter', 70, 62)],
  narraton: rn(70, 55),
  script: lines(
    'Narrator: "10 November 2023. The story is live: more than 600 documented injuries since 2014. One death. He called this meeting."',
    '[POSE elon_musk expression=Panicked]',
    'Elon: "Retract it. Name your price. Everyone at a newspaper has a price, that\'s why they\'re at a newspaper."',
    'Reporter: "The story is made of public records and named sources. There\'s nothing to retract and nothing to buy."',
    'Elon: "Then I\'ll post the REAL numbers."',
    'Reporter (Closeup/Determined): "Please do. Publishing your numbers next to OSHA\'s is called a follow-up. I get paid for those."',
    'Elon (Crouch/Scared): "This conversation is off the record!"',
    'Reporter: "You didn\'t ask that at the start. You never ask at the start."',
    'Narrator: "Escalation complete: from granting access, to demanding silence, to begging. The record did that."',
    '[CHOICE]',
    '- "The coda — after the Pulitzer" -> duet_press_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_press_4',
  name: 'The Coda: After the Pulitzer',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dp4_e', 'elon_musk', 30, 62), el('dp4_r', 'elon_reporter', 70, 62)],
  narraton: rn(85, 40),
  script: lines(
    'Narrator: "2024. The investigation wins the Pulitzer Prize for National Reporting. Now HE requests the interview."',
    'Elon: "I\'m offering you an exclusive. Me. Unfiltered. The mission, in my own words."',
    'Reporter: "What changed at the test stands since November?"',
    'Elon (Pointing/Smug): "We\'ve announced a Mars update. Huge one."',
    'Reporter: "That\'s not a safety answer. Has the injury rate come down?"',
    'Elon: "...Next question."',
    'Reporter (Closeup/Determined): "That was the only question. It\'s always been the only question."',
    'Narrator: "She doesn\'t need him anymore. The documents speak. That\'s what a Pulitzer certifies."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- B. The Metrics Meeting (Elon × Lieutenant — dashboard theater) --------
scenes.push({
  id: 'duet_metrics_1',
  name: 'The Metrics Meeting',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('dm1_e', 'elon_musk', 30, 62),
    el('dm1_l', 'elon_hypebro', 70, 63),
    balloon('metric_board', 'ALL-HANDS METRICS — LIVE', 45, 95),
  ],
  narraton: rn(30, 90),
  script: lines(
    '[SET mIdx = 0]',
    '[TICK 1500ms]',
    '[SET mIdx = mIdx + 1]',
    '[IF mIdx > 2]',
    '[SET mIdx = 0]',
    '[ENDIF]',
    '[IF mIdx == 0]',
    '[SET_TEXT metric_board "ENGAGEMENT: UP AND TO THE RIGHT (AXIS UNLABELED)"]',
    '[ENDIF]',
    '[IF mIdx == 1]',
    '[SET_TEXT metric_board "IMPRESSIONS: RECORD HIGH (INCLUDES THE ANGRY ONES)"]',
    '[ENDIF]',
    '[IF mIdx == 2]',
    '[SET_TEXT metric_board "VIBES: GREEN (METHODOLOGY: VIBES)"]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "The weekly metrics meeting. Every chart the Lieutenant brings is green. That is the Lieutenant\'s actual job."',
    'Lieutenant: "Boss. Engagement: up. Impressions: up. Everything that can be up: up."',
    'Elon (Pointing/Smug): "Number go up. This is why we win."',
    'Lieutenant: "The axis is... the axis is proprietary, boss."',
    '[CHOICE]',
    '- "What the charts don\'t count" -> duet_metrics_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_metrics_2',
  name: 'What the Charts Don\'t Count',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('dm2_e', 'elon_musk', 30, 62),
    el('dm2_l', 'elon_hypebro', 70, 63),
  ],
  narraton: rn(40, 85),
  script: lines(
    'Elon: "Where\'s the advertiser chart? There\'s usually an advertiser chart."',
    'Lieutenant: "That one\'s, um. In the appendix. The appendix is at the printer. The printer is on fire."',
    'Elon (Sit/Angry): "Show me the chart."',
    'Lieutenant: "Okay so — technically it also goes up, if you rotate the tablet."',
    'Narrator: "Advertisers keep \'pausing.\' Which is like leaving, but with a press release."',
    'Elon: "And the injury dashboard?"',
    'Lieutenant: "Company dashboard: green. The other dashboard is, uh. Reuters runs the other dashboard now."',
    '[CHOICE]',
    '- "The gratitude metric" -> duet_metrics_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_metrics_3',
  name: 'The Gratitude Metric',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('dm3_e', 'elon_musk', 30, 62),
    el('dm3_l', 'elon_hypebro', 70, 63),
  ],
  narraton: rn(45, 80),
  script: lines(
    'Elon: "I want a metric for how much humanity appreciates me."',
    'Lieutenant: "On it. Working title: \'Impressions of Gratitude.\'"',
    'Elon (Pointing/Smug): "Perfect. Weight my replies by follower count."',
    'Lieutenant: "Then the top of the gratitude chart is... you, boss. Thanking yourself."',
    'Elon: "And is the number up?"',
    'Lieutenant: "The number is EXTREMELY up. I made the number this morning."',
    'Narrator: "Dashboard theater, defined: when the instrument exists to please the pilot, it stops being an instrument."',
    '[CHOICE]',
    '- "After the meeting" -> duet_metrics_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_metrics_4',
  name: 'After the Meeting',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('dm4_l', 'elon_hypebro', 50, 63, 2.6),
  ],
  narraton: rn(50, 75),
  script: lines(
    'Narrator: "The room empties. The Lieutenant stays behind with the real numbers."',
    'Lieutenant: "Okay. Real talk. Just me and the spreadsheet."',
    'Lieutenant: "Advertisers: leaving. Injury rate: six times the average. Debt: forty-four billion reasons."',
    'Lieutenant: "I could tell him. I could just... walk in and tell him."',
    'Narrator: "He opens the door. He closes the door."',
    'Lieutenant: "New plan: I make the font on the green charts bigger."',
    'Narrator: "Every court has one courtier who knows. Knowing is not the hard part. It never was."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- C. The NDA (Worker × Lawyer) ------------------------------------------
scenes.push({
  id: 'duet_nda_1',
  name: 'The Paper on the Table',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [el('dn1_w', 'elon_worker', 30, 62), el('dn1_l', 'elon_lawyer', 70, 62)],
  narraton: rn(35, 75),
  script: lines(
    'Narrator: "A conference room. A settlement offer. A worker who got hurt on the line, and the company\'s lawyer."',
    'Lawyer: "The offer is fair. Sign, and the check clears in thirty days."',
    'Worker: "And the clause on page four?"',
    'Lawyer: "Confidentiality. Standard language. Everyone signs it."',
    'Worker: "Standard for who?"',
    'Lawyer: "For every case I have ever settled. That is rather the point of me."',
    'Narrator: "The number on page one is real money. The clause on page four is why the number exists."',
    '[CHOICE]',
    '- "What silence costs" -> duet_nda_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_nda_2',
  name: 'What Silence Costs',
  sceneType: 'AGENCY',
  dropId: dropId('elon_court_drop'),
  stage: [el('dn2_w', 'elon_worker', 30, 62), el('dn2_l', 'elon_lawyer', 70, 62)],
  narraton: rn(40, 70),
  script: lines(
    'Worker: "If I sign, I can\'t talk to the reporter."',
    'Lawyer: "Correct."',
    'Worker: "Or the labor board. Or the next guy on my shift who asks what happened."',
    'Lawyer: "You may speak to regulators. The clause is not magic. It is merely expensive to test."',
    'Worker (Pointing/Angry): "My medical bills are due now. My story is the only thing they want to buy."',
    'Lawyer: "That is an accurate summary of the market, yes."',
    'Narrator: "This is the choice the system builds: rent versus record. Sign, or don\'t."',
    '[CHOICE]',
    '- "Sign it" -> duet_nda_sign',
    '- "Don\'t sign" -> duet_nda_refuse',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_nda_sign',
  name: 'The Signature',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [el('dns_w', 'elon_worker', 30, 62), el('dns_l', 'elon_lawyer', 70, 62)],
  narraton: rn(45, 70),
  script: lines(
    'Narrator: "The pen moves. The check clears. The bills get paid — that part is real, and it matters."',
    'Worker: "So that\'s it. My accident never happened."',
    'Lawyer: "It happened. It is simply no longer... citable."',
    'Worker: "The reporter called again yesterday. I let it ring."',
    'Lawyer: "For what it is worth: settlements are documents too. Discovery finds neat rows of them. It always does."',
    'Narrator: "One name comes off the story. The story runs anyway — six hundred injuries have a lot of names."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_nda_refuse',
  name: 'The Unsigned Page',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [el('dnr_w', 'elon_worker', 30, 62), el('dnr_l', 'elon_lawyer', 70, 62)],
  narraton: rn(55, 65),
  script: lines(
    'Worker: "No. My name stays mine."',
    'Lawyer: "The offer expires when I leave this room."',
    'Worker (Pointing/Angry): "So did Lonnie LeBlanc. And his family didn\'t even get the file for nine years. Someone has to be a name on the record."',
    'Lawyer: "...For the record, and strictly off it: that is what the clause is priced against."',
    'Narrator: "No check. Real consequences — bills, fear, a long wait. And one more named source in a documented six hundred."',
    'Narrator: "The Reuters investigation was built out of exactly this arithmetic: people who kept their names."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- D. On the Record (Reporter × Lawyer) ----------------------------------
scenes.push({
  id: 'duet_record_1',
  name: 'Definitions First',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dr1_r', 'elon_reporter', 30, 62), el('dr1_l', 'elon_lawyer', 70, 62)],
  narraton: rn(50, 65),
  script: lines(
    'Narrator: "A phone call before publication. The company\'s lawyer, and the reporter. Both professionals. Both counting words."',
    'Lawyer: "Before we begin: this call is off the record."',
    'Reporter: "I haven\'t agreed to that. Off the record is a contract, not a greeting."',
    'Lawyer: "...Correct. I withdraw the greeting."',
    'Reporter (Closeup/Determined): "On the record, on background, or goodbye. Pick one."',
    'Lawyer: "Background. Attributable to \'a person familiar with the company\'s thinking.\'"',
    'Reporter: "I know the company\'s thinking. I\'ve read its filings. Try again."',
    '[CHOICE]',
    '- "The statement" -> duet_record_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_record_2',
  name: 'The Statement',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dr2_r', 'elon_reporter', 30, 62), el('dr2_l', 'elon_lawyer', 70, 62)],
  narraton: rn(55, 60),
  script: lines(
    'Lawyer: "Fine. A statement, on the record: \'Safety is our highest priority.\'"',
    'Reporter: "Reading it back: safety is your highest priority. Brownsville logged 4.8 injuries per 100 workers. The industry average is 0.8. Shall I print both sentences together?"',
    'Lawyer: "...I would prefer you did not."',
    'Reporter: "I know. That\'s how I know it\'s the right layout."',
    'Narrator: "A statement is not a shield. Next to the numbers, it is a caption."',
    '[CHOICE]',
    '- "What she already has" -> duet_record_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_record_3',
  name: 'What She Already Has',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dr3_r', 'elon_reporter', 30, 62), el('dr3_l', 'elon_lawyer', 70, 62)],
  narraton: rn(60, 55),
  script: lines(
    'Lawyer: "May I ask what documents you are working from?"',
    'Reporter (Closeup/Determined): "Injury logs. OSHA files. Court records. Your own appeal contesting an $18,475 fine toward $475."',
    'Lawyer: "That appeal is procedurally routine."',
    'Reporter: "The procedure fractured Francisco Cabada\'s skull. I\'m not asking you to confirm the documents. They confirm themselves."',
    'Lawyer: "Then why call me at all?"',
    'Reporter: "Fairness. The story will say I called. What it says next is up to your client."',
    '[CHOICE]',
    '- "The last sentence" -> duet_record_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_record_4',
  name: 'The Last Sentence',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('dr4_r', 'elon_reporter', 30, 62), el('dr4_l', 'elon_lawyer', 70, 62)],
  narraton: rn(65, 50),
  script: lines(
    'Lawyer: "My client\'s instruction is: no comment."',
    'Reporter: "Then the last sentence writes itself: \'did not respond to requests for comment.\'"',
    'Lawyer: "You say that like a threat."',
    'Reporter: "It\'s a vacancy. Readers fill it with the worst thing they can imagine."',
    'Lawyer: "...And the documents are worse."',
    'Reporter (Closeup/Determined): "The documents are worse. Good night, counselor."',
    'Narrator: "Two professionals, one record. Only one of them is allowed to want it published. Both know it will be."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- E. Elon × the Feed (the replies as SET_TEXT) --------------------------
scenes.push({
  id: 'duet_feed_1',
  name: 'The Post',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('df1_e', 'elon_musk', 34, 62, 2.6),
    balloon('feed_replies', 'THE REPLIES — LIVE', 45, 95),
  ],
  narraton: rn(45, 75),
  script: lines(
    'Narrator: "A duet for one man and two hundred million strangers. He posts. The feed answers."',
    'Elon (Pointing/Smug): "Posting: \'The legacy media hates progress. We are literally saving humanity.\'"',
    '[SET_TEXT feed_replies "REPLY: WE LOVE YOU KING 🚀 | REPLY: sir this is about the injury report"]',
    'Elon: "See? Love. Mostly love."',
    '[SET_TEXT feed_replies "REPLY: 4.8 per 100 workers. industry is 0.8. explain? | REPLY: source??? | REPLY: the source is reuters. it\'s always reuters"]',
    'Elon: "Ignore. Scroll. Ignore."',
    '[SET_TEXT feed_replies "TOP REPLY: a man died holding down insulation with his body weight. $7,000 fine."]',
    'Elon (Panicked): "Who pinned that? WHY is that the top reply?"',
    'Narrator: "The algorithm ranks by engagement. He built it that way. It is very engaged."',
    '[CHOICE]',
    '- "The ratio arrives" -> duet_feed_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_feed_2',
  name: 'The Ratio',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('df2_e', 'elon_musk', 34, 62, 2.6),
    balloon('ratio_board', 'REPLIES vs LIKES', 45, 95),
  ],
  narraton: rn(55, 65),
  script: lines(
    '[SET rratio = 2]',
    '[TICK 1200ms]',
    '[SET rratio = min(rratio * 2, 512)]',
    '[SET_TEXT ratio_board "REPLIES OUTNUMBER LIKES {rratio} TO 1 — AND CLIMBING"]',
    '[/TICK]',
    'Narrator: "On the feed, a post with more replies than likes is a verdict. The count is on the wall."',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "The ratio is a false metric. I should know. I own the metrics."',
    'Elon: "Options: delete the post, or post again, harder."',
    'Elon (Pointing/Smug): "Posting again. Harder."',
    'Narrator: "The feed\'s one law, which no owner has ever repealed: you cannot ratio your way out of a ratio."',
    '[CHOICE]',
    '- "Three in the morning" -> duet_feed_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_feed_3',
  name: 'Draft, Delete, Draft',
  sceneType: 'WITNESS',
  dropId: dropId('elon_bedroom_drop'),
  stage: [
    el('df3_e', 'elon_musk', 50, 64, 2.8),
    balloon('draft_box', 'DRAFTS', 45, 95),
  ],
  narraton: rn(60, 60),
  script: lines(
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Narrator: "3AM. The duet\'s quiet movement. He types to the feed, and deletes before the feed can answer."',
    '[SET_TEXT draft_box "DRAFT: the reporter is lying and here is a 40-part thread — DELETED"]',
    'Elon (thinking): "Too defensive."',
    '[SET_TEXT draft_box "DRAFT: I have always cared deeply about worker safety — DELETED"]',
    'Elon (thinking): "The replies would just post the fine. $475. They always post the fine."',
    '[SET_TEXT draft_box "DRAFT: (blank) — 14 MINUTES, NO TEXT"]',
    'Elon (Panicked): "Why is the blank one the hardest?"',
    'Narrator: "Because the feed can answer anything except silence. And silence is the one thing he cannot post."',
    '[CHOICE]',
    '- "The poll" -> duet_feed_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_feed_4',
  name: 'The Poll',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('df4_e', 'elon_musk', 34, 62, 2.6),
    balloon('poll_board', 'POLL — LIVE', 45, 95),
  ],
  narraton: rn(65, 55),
  script: lines(
    'Narrator: "December 2022. Documented: he polls the feed on whether he should step down as its head, and promises to abide by the result."',
    'Elon (Pointing/Smug): "The people love a decisive leader. Watch this."',
    '[SET_TEXT poll_board "SHOULD HE STEP DOWN? — VOTING OPEN"]',
    '[WAIT 2s]',
    '[SET_TEXT poll_board "17.5 MILLION VOTES. YES: 57.5%"]',
    'Elon (Crouch/Scared): "The poll is being manipulated. By voters."',
    'Narrator: "He later hands the CEO title to someone else — and keeps the feed, the servers, and the algorithm."',
    'Narrator: "The duet ends the only way it can: the feed gets the last word. It is made entirely of last words."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- F. The Organizing Conversation (Worker × Workers) ---------------------
scenes.push({
  id: 'duet_org_1',
  name: 'The Break Room',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('do1_w', 'elon_worker', 30, 62), el('do1_ws', 'elon_workers', 72, 63)],
  narraton: rn(30, 80),
  script: lines(
    'Narrator: "A break room. Fifteen minutes. The conversation that starts every union that has ever existed."',
    'Worker: "Got a second? Not about the game. About Tuesday. About Maria\'s wrist."',
    'Workers: "We heard. Line didn\'t even stop."',
    'Worker: "It never stops. That\'s the point. There\'s a meeting Thursday. Off-site."',
    'Workers: "Whose meeting?"',
    'Worker: "Ours. That\'s the whole idea. Ours."',
    '[CHOICE]',
    '- "The fear" -> duet_org_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_org_2',
  name: 'The Fear',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('do2_w', 'elon_worker', 30, 62), el('do2_ws', 'elon_workers', 72, 63)],
  narraton: rn(35, 78),
  script: lines(
    'Workers: "You know what happens to people who organize here. Badge stops working. \'Performance.\'"',
    'Worker: "I know. Workers who spoke up alleged exactly that — retaliation. It\'s in the filings."',
    'Workers: "I\'ve got a mortgage. Kids. I can\'t be a test case."',
    'Worker: "Nobody\'s asking you to be first. First already happened. The 2017 crew talked to the UAW, and a safety study came out of it."',
    'Workers: "And what did the study change?"',
    'Worker (Pointing/Angry): "It made the count public. Everything since — the exposés, the suits — started with a count someone made public."',
    '[CHOICE]',
    '- "The notebook" -> duet_org_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_org_3',
  name: 'The Notebook',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('do3_w', 'elon_worker', 30, 62), el('do3_ws', 'elon_workers', 72, 63)],
  narraton: rn(40, 75),
  script: lines(
    'Worker: "Here\'s all Thursday is: a notebook. Every injury, every near-miss, every unlogged incident. Date, shift, witness."',
    'Workers: "The company has a log."',
    'Worker: "The company\'s log is the dashboard that stays green. Ours doesn\'t get appealed."',
    'Workers: "And if they find the notebook?"',
    'Worker: "There are copies. That\'s the other whole idea. Copies."',
    'Narrator: "Reveal\'s 2018 reporting alleged injuries kept off Tesla\'s official books. The counter-log is not paranoia. It is method."',
    '[CHOICE]',
    '- "What paper does" -> duet_org_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_org_4',
  name: 'What Paper Does',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('do4_w', 'elon_worker', 30, 62), el('do4_ws', 'elon_workers', 72, 63)],
  narraton: rn(50, 70),
  script: lines(
    'Workers: "Say we fill the notebook. Then what? He\'s worth more than the state budget."',
    'Worker: "Then it goes where paper goes. Reporters. The labor board. The civil-rights department took hundreds of complaints from one plant before it sued."',
    'Workers: "Hundreds. From people like us?"',
    'Worker: "Exactly like us. One complaint is a grudge. Hundreds are a pattern. A pattern is a case."',
    'Workers: "...Thursday, you said."',
    'Worker: "Thursday. Bring a pen."',
    'Narrator: "This is the resistance mechanism of the whole era, at kitchen-table scale: organize, document, publish."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- G. The Ratio (Fans × Reporter — defending vs the documents) -----------
scenes.push({
  id: 'duet_ratio_1',
  name: 'The Pile-On',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('dg1_f', 'elon_fans', 30, 63), el('dg1_r', 'elon_reporter', 72, 62)],
  narraton: rn(55, 60),
  script: lines(
    'Narrator: "The exposé is out. The fans find the reporter\'s account within the hour."',
    'Fans: "FUD merchant. Legacy media hit piece. Who paid you?"',
    'Fans: "600 injuries at a ROCKET company over NINE YEARS. Do you even math?"',
    'Reporter: "..."',
    'Fans: "She\'s not even replying. Ratio her into the sun, boys."',
    'Narrator: "She is not replying because she is at her desk, doing the one thing the pile-on cannot do: filing the next records request."',
    '[CHOICE]',
    '- "She replies once" -> duet_ratio_2',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_ratio_2',
  name: 'One Reply',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('dg2_f', 'elon_fans', 30, 63), el('dg2_r', 'elon_reporter', 72, 62)],
  narraton: rn(60, 55),
  script: lines(
    'Reporter (Closeup/Determined): "One reply, pinned: the documents. OSHA files. Injury logs. Court records. No adjectives. Links only."',
    'Fans: "Links?? Nobody clicks links. Post a take like a normal person."',
    'Fans: "I\'m not reading all that. Imagine reading. Couldn\'t be me."',
    'Reporter: "The documents don\'t need you to read them today. They\'ll still be there when you do."',
    'Narrator: "An opinion ages. A record waits. That asymmetry is the whole fight."',
    '[CHOICE]',
    '- "One fan reads it" -> duet_ratio_3',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_ratio_3',
  name: 'One Fan Reads It',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('dg3_f', 'elon_fans', 50, 63, 2.6)],
  narraton: rn(65, 50),
  script: lines(
    'Narrator: "Somewhere in the pile-on, one account goes quiet for two hours. He clicked the link."',
    'Fans: "Okay. The Brownsville number is real. It\'s in the government table. I checked the table myself."',
    'Fans: "The wind gust one. The Marine. I keep re-reading the wind gust one."',
    'Fans: "I came here to dunk on her. I\'ve got nothing for the wind gust."',
    'Narrator: "He doesn\'t post an apology. Almost nobody does. He just stops posting the other thing."',
    '[CHOICE]',
    '- "The quiet unfollow" -> duet_ratio_4',
    '- "Back to the Duets" -> elon_duets',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'duet_ratio_4',
  name: 'The Quiet Unfollow',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('dg4_f', 'elon_fans', 30, 63),
    el('dg4_r', 'elon_reporter', 72, 62),
    balloon('follow_count', 'THE COUNT', 45, 95),
  ],
  narraton: rn(70, 45),
  script: lines(
    '[SET_TEXT follow_count "UNFOLLOWED. NO ANNOUNCEMENT. NO THREAD."]',
    'Narrator: "Nobody ratios their way out of a fandom. They walk out the back, one at a time, without a word."',
    'Fans: "It\'s not that I hate him now. I just... stopped defending the fine. $475 for a skull. I can\'t type around that."',
    'Reporter: "For every hundred who pile on, a few click through. That\'s not a ratio. That\'s a readership."',
    'Narrator: "Education corroding prestige is not a stampede. It is this: one quiet unfollow at a time, at scale."',
    '[CHOICE]',
    '- "Back to the Duets" -> elon_duets',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

const duetsEnd = scenes.length;

// ================================================================ AFTERMATHS
// Four documented events, each followed through time from two perspectives:
// that week / a year on / the long view. LeBlanc carries an extra beat —
// the Pulitzer citation — because the record carried his name that far.

scenes.push({
  id: 'elon_aftermaths',
  name: 'Aftermaths',
  sceneType: 'AGENCY',
  dropId: dropId('elon_hq'),
  stage: [
    el('af_hub_w', 'elon_workers', 26, 63, 2.2),
    el('af_hub_r', 'elon_reporter', 74, 62, 2.2),
  ],
  script: lines(
    'Narrator: "An event is a day. An aftermath is everyone\'s calendar afterward. Four events, two calendars apiece. Pick the day; then pick whose calendar."',
    '[CHOICE]',
    '- "Lonnie LeBlanc, June 2014" -> afg_leblanc',
    '- "The platform purchase, October 2022" -> afg_buyout',
    '- "The record, and the verdict" -> afg_late',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push(fanScene(
  'afg_leblanc', 'Aftermaths — Lonnie LeBlanc', 'elon_factory_drop',
  [el('afg_leblanc_a', 'elon_workers', 50, 63, 2.2)],
  ['Narrator: "A load of insulation, an unsecured trailer, a man dead at thirty-eight. The company priced it at seven thousand dollars. Two calendars ran on from that afternoon."'],
  [
    '- "LeBlanc\'s death — the family" -> aft_leblanc_family_week',
    '- "LeBlanc\'s death — the crew" -> aft_leblanc_crew_week',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push(fanScene(
  'afg_buyout', 'Aftermaths — The Platform Purchase', 'elon_feedroom_drop',
  [el('afg_buyout_a', 'elon_fans', 26, 63, 2.2), el('afg_buyout_b', 'elon_hypebro', 74, 63, 2.2)],
  ['Narrator: "One weekend, half a workforce. The people who lost the job and the people who cheered from the timeline both woke up Monday. Follow either."'],
  [
    '- "The platform purchase — the staff" -> aft_buyout_staff_week',
    '- "The platform purchase — the fans" -> aft_buyout_fans_week',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push(fanScene(
  'afg_late', 'Aftermaths — The Record and the Verdict', 'elon_hq',
  [el('afg_late_a', 'elon_reporter', 26, 62, 2.2), el('afg_late_b', 'elon_lawyer', 74, 62, 2.2)],
  ['Narrator: "Two times somebody made it stick — an investigation and a jury. Both of them cost a person years. Pick which one to follow out."'],
  [
    '- "The Reuters investigation" -> afg_reuters',
    '- "The Diaz verdict" -> afg_diaz',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push(fanScene(
  'afg_reuters', 'Aftermaths — The Reuters Investigation', 'elon_hq',
  [el('afg_reuters_a', 'elon_reporter', 50, 62, 2.2)],
  ['Narrator: "Six hundred injuries, requested and checked and printed. Two calendars afterward: hers, and his."'],
  [
    '- "The Reuters investigation — the reporter" -> aft_reuters_rep_week',
    '- "The Reuters investigation — Elon" -> aft_reuters_elon_week',
    '- "Back to the aftermaths" -> elon_aftermaths',
  ],
));

scenes.push(fanScene(
  'afg_diaz', 'Aftermaths — The Diaz Verdict', 'elon_court_drop',
  [el('afg_diaz_a', 'elon_lawyer', 50, 62, 2.2)],
  ['Narrator: "A jury put a number on what a year of it was worth. Then the courts spent years arguing the number down. Two calendars."'],
  [
    '- "The Diaz verdict — Owen Diaz" -> aft_diaz_owen_week',
    '- "The Diaz verdict — the floor" -> aft_diaz_floor_week',
    '- "Back to the aftermaths" -> elon_aftermaths',
  ],
));

// --- LeBlanc: the family ----------------------------------------------------
scenes.push({
  id: 'aft_leblanc_family_week',
  name: 'LeBlanc: That Week — The Family',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [balloon('alf_card', 'McGREGOR, TEXAS — JUNE 2014', 50, 22, { zIndex: 2 })],
  narraton: rn(20, 90),
  script: lines(
    'Narrator: "June 2014. The family of Lonnie LeBlanc, thirty-eight, buries a Marine who survived his service and died moving insulation."',
    'Narrator: "They are told there was an accident. A gust of wind. That is true, and it is not the whole file."',
    'Narrator: "They are not told that federal investigators opened a case. They are not told it settles, quietly, for $7,000."',
    'Narrator: "A family cannot ask questions about a file it does not know exists. That is what the quiet is for."',
    '[CHOICE]',
    '- "A year on" -> aft_leblanc_family_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_leblanc_family_year',
  name: 'LeBlanc: A Year On — The Family',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [balloon('alfy_card', 'JUNE 2015', 50, 22, { zIndex: 2 })],
  narraton: rn(25, 88),
  script: lines(
    'Narrator: "June 2015. One year. No call from the company\'s famous owner. No letter about an investigation. No finding to read."',
    'Narrator: "Grief without facts doesn\'t close. It circles. Was it preventable? Was anyone told anything? Did anything change?"',
    'Narrator: "The answers existed the whole time, in a government file with his name on it."',
    'Narrator: "The file waits eight more years for a stranger with a press badge."',
    '[CHOICE]',
    '- "The long view: the call" -> aft_leblanc_call',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- LeBlanc: the crew ------------------------------------------------------
scenes.push({
  id: 'aft_leblanc_crew_week',
  name: 'LeBlanc: That Week — The Crew',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('alcw_ws', 'elon_workers', 50, 64, 2.4)],
  narraton: rn(22, 90),
  script: lines(
    'Narrator: "The yard at McGregor, the week after. The test schedule holds."',
    'Workers: "There are straps on the trailers now. Boxes of them. Overnight."',
    'Workers: "Nobody had to requisition straps last month either. Somebody just had to go get them."',
    'Workers: "A minute of silence on the pad. The schedule took it back by lunch."',
    'Narrator: "The cheapest safety equipment on any site is hindsight. It is always fully stocked, one week late."',
    '[CHOICE]',
    '- "A year on" -> aft_leblanc_crew_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_leblanc_crew_year',
  name: 'LeBlanc: A Year On — The Crew',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('alcy_ws', 'elon_workers', 50, 64, 2.4)],
  narraton: rn(28, 87),
  script: lines(
    'Narrator: "A year on. The fine — $7,000 — is settled and filed. The Mars timeline has not moved an inch to the left."',
    'Workers: "New guys don\'t know the name Lonnie. Nobody briefs it. It\'s not in the onboarding."',
    'Workers: "We tell them ourselves, in the truck, off the clock."',
    'Workers: "That\'s the whole memorial: word of mouth, against a company that owns the dashboard."',
    'Narrator: "By 2023, Reuters will count more than 600 documented injuries at the company since his death. The count started here."',
    '[CHOICE]',
    '- "The long view: the call" -> aft_leblanc_call',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- LeBlanc: the long view -------------------------------------------------
scenes.push({
  id: 'aft_leblanc_call',
  name: 'LeBlanc: The Call, Nine Years Later',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('alc_r', 'elon_reporter', 50, 62, 2.6)],
  narraton: rn(60, 60),
  script: lines(
    'Narrator: "2023. A Reuters reporter, working the injury records, reaches the LeBlanc family. Nine years after the yard at McGregor."',
    'Reporter: "They didn\'t know. Nine years, and the family never knew OSHA had investigated. I had to be the one to tell them."',
    'Reporter (Closeup/Determined): "That call is the story. Not the fine. The silence."',
    'Narrator: "Ron Weimer, Lonnie\'s uncle, to Reuters: \'There\'s a way to do dangerous work… without people dying.\'"',
    'Narrator: "A sentence that waited nine years for someone to ask the question."',
    '[CHOICE]',
    '- "The name in the citation" -> aft_leblanc_citation',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_leblanc_citation',
  name: 'LeBlanc: The Name in the Citation',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [balloon('alp_card', 'PULITZER PRIZE FOR NATIONAL REPORTING — 2024', 50, 22, { zIndex: 2 })],
  narraton: rn(85, 40),
  script: lines(
    'Narrator: "2024. The Reuters investigation wins the Pulitzer Prize for National Reporting."',
    'Narrator: "Inside the prize-winning work is a name: Lonnie LeBlanc, thirty-eight, retired Marine. The death the mission never mentioned."',
    'Narrator: "A company kept his file quiet for nine years. The record answered by keeping his name permanently."',
    'Narrator: "That is the long view: the quiet was rented. The record is owned."',
    '[CHOICE]',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Buyout: the staff ------------------------------------------------------
scenes.push({
  id: 'aft_buyout_staff_week',
  name: 'The Purchase: That Week — The Staff',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('abs_ws', 'elon_workers', 50, 63, 2.4)],
  narraton: rn(30, 90),
  script: lines(
    'Narrator: "November 2022. The deal closes, and within about a week roughly half of 7,500 jobs are gone."',
    'Workers: "The email came at midnight. Subject line: \'Your role at the company.\' You knew from the subject line."',
    'Workers: "Some people found out when the laptop locked mid-sentence."',
    'Workers: "The Trust and Safety folks were on the list. The people whose whole job was the worst of the feed."',
    'Narrator: "That week, the platform\'s institutional memory left the building carrying a cardboard box."',
    '[CHOICE]',
    '- "A year on" -> aft_buyout_staff_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_buyout_staff_year',
  name: 'The Purchase: A Year On — The Staff',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('absy_ws', 'elon_workers', 50, 63, 2.4)],
  narraton: rn(45, 75),
  script: lines(
    'Narrator: "Late 2023. A year out from the midnight emails."',
    'Workers: "The severance suits became a genre. Some settled. Some are still in line."',
    'Workers: "Most of us landed somewhere. Some built the competitors. Grudges ship features."',
    'Workers: "And the group chat still lights up every time the site breaks in a way only Deb knew how to fix."',
    'Narrator: "A layoff deletes salaries in a day and knowledge forever. Only one of those was on the spreadsheet."',
    '[CHOICE]',
    '- "The long view" -> aft_buyout_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Buyout: the fans -------------------------------------------------------
scenes.push({
  id: 'aft_buyout_fans_week',
  name: 'The Purchase: That Week — The Fans',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('abf_f', 'elon_fans', 50, 63, 2.4)],
  narraton: rn(15, 98),
  script: lines(
    'Narrator: "October 2022. Sink week. The fans\' finest hour."',
    'Fans: "HE BOUGHT THE BIRD APP. Best timeline. Free speech is BACK, baby."',
    'Fans: "\'Let that sink in.\' He carried a SINK. Cinema. I\'ve watched it forty times."',
    'Fans: "Everything is going to be different now. Better different."',
    'Narrator: "Everything was going to be different. On that single point, the fans were completely correct."',
    '[CHOICE]',
    '- "A year on" -> aft_buyout_fans_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_buyout_fans_year',
  name: 'The Purchase: A Year On — The Fans',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [el('abfy_f', 'elon_fans', 50, 63, 2.4)],
  narraton: rn(45, 70),
  script: lines(
    'Narrator: "A year on. The feed the fans defended is measurably not the feed they defended."',
    'Fans: "My replies got dark. Really dark. I muted forty accounts this week alone."',
    'Fans: "Researchers published the audit — hate-speech impressions up after the moderation rollback. I read it to dunk on it. Couldn\'t."',
    'Fans: "Half my mutuals moved to the other apps. The group chat has three apps now. THREE."',
    'Narrator: "The bird was freed. Where it flew was documented."',
    '[CHOICE]',
    '- "The long view" -> aft_buyout_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_buyout_long',
  name: 'The Purchase: The Long View',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [balloon('abl_card', 'THE TOWN SQUARE — WITH A LANDLORD', 50, 22, { zIndex: 2 })],
  narraton: rn(60, 60),
  script: lines(
    'Narrator: "The long view. $44 billion bought the megaphone — and proved what a megaphone cannot do."',
    'Narrator: "It could not bury the Reuters investigation; his own attacks on it worked as free distribution."',
    'Narrator: "It could not repeal the audits, the advertiser exits, or the poll where 57.5% of his own feed voted him out of the chair."',
    'Narrator: "Henry George\'s question fits a platform as well as a field: when the town square has a landlord, who collects the rent — and who pays it?"',
    '[CHOICE]',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Reuters: the reporter --------------------------------------------------
scenes.push({
  id: 'aft_reuters_rep_week',
  name: 'The Investigation: That Week — The Reporter',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('arw_r', 'elon_reporter', 50, 62, 2.6)],
  narraton: rn(65, 55),
  script: lines(
    'Narrator: "10 November 2023. \'At SpaceX, worker injuries soar in Elon Musk\'s rush to Mars.\' Publication day, plus six."',
    'Reporter: "The inbox is two kinds of email now. Lawyers, and sources."',
    'Reporter (Closeup/Determined): "Every exposé works like a net. You publish what you can prove, and the people who lived the rest come find you."',
    'Reporter: "Three new workers this week. Two with photos. One with a spreadsheet."',
    'Narrator: "The story about six hundred injuries begins collecting the six hundred and first."',
    '[CHOICE]',
    '- "A year on" -> aft_reuters_rep_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_reuters_rep_year',
  name: 'The Investigation: A Year On — The Reporter',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('ary_r', 'elon_reporter', 50, 62, 2.6)],
  narraton: rn(85, 40),
  script: lines(
    'Narrator: "2024. The Pulitzer Prize for National Reporting."',
    'Reporter: "The prize week was strange. The work is about people who got hurt. You accept it on their behalf or not at all."',
    'Reporter (Closeup/Determined): "What it actually changes: editors approve the next records request faster. Sources return calls a day sooner."',
    'Reporter: "That\'s the whole machine of accountability journalism. Speed of trust."',
    'Narrator: "Education corroding prestige, certified by committee."',
    '[CHOICE]',
    '- "The long view" -> aft_reuters_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Reuters: Elon ------------------------------------------------------------
scenes.push({
  id: 'aft_reuters_elon_week',
  name: 'The Investigation: That Week — Elon',
  sceneType: 'WITNESS',
  dropId: dropId('elon_bedroom_drop'),
  stage: [el('aew_e', 'elon_musk', 50, 64, 2.8)],
  narraton: rn(70, 55),
  script: lines(
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Narrator: "The same week, at the other end of the story."',
    'Elon: "Day one: ignore it. Legacy media. Irrelevant."',
    'Elon: "Day three: okay, everyone is quoting the Brownsville number. Posting the mission statement."',
    'Elon (Panicked): "Day five: the mission statement is getting ratio\'d by the wind gust. You can\'t argue with a wind gust!"',
    'Elon (thinking): "Day six, 3AM: does a mission need a body count to be real?"',
    'Narrator: "He deletes the thought. The feed never sees it. This is as close as the week gets to a comment."',
    '[CHOICE]',
    '- "A year on" -> aft_reuters_elon_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_reuters_elon_year',
  name: 'The Investigation: A Year On — Elon',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [el('aey_e', 'elon_musk', 50, 62, 2.6)],
  narraton: rn(75, 50),
  script: lines(
    'Elon (Pointing/Smug): "A year later and we\'re still standing. Rockets still fly. Told you it was nothing."',
    'Narrator: "A year later: the fine for Francisco Cabada\'s skull is still being contested toward $475. The test cadence is still the test cadence."',
    'Narrator: "Structurally, nothing the story documented has been publicly dismantled. That is also part of the record."',
    'Elon: "See? Immune."',
    'Narrator: "Not immune. Priced. The suits are on the docket, the audits are published, and every future jury pool has read the story."',
    '[CHOICE]',
    '- "The long view" -> aft_reuters_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_reuters_long',
  name: 'The Investigation: The Long View',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [balloon('arl_card', '600+ DOCUMENTED. PERMANENT.', 50, 22, { zIndex: 2 })],
  narraton: rn(85, 40),
  script: lines(
    'Narrator: "The long view. An exposé does not fire an executive or fix a test stand. It does something slower."',
    'Narrator: "It moves facts from \'alleged\' to \'documented.\' Documented facts compound: every future filing cites them, every regulator starts from them."',
    'Narrator: "And it lowers the price of the next truth. The next whistleblower is believed a day faster. The next family gets its call nine years sooner. Maybe."',
    'Narrator: "The record is the resistance. This is what that sentence means, operationally."',
    '[CHOICE]',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Diaz: Owen Diaz ----------------------------------------------------------
scenes.push({
  id: 'aft_diaz_owen_week',
  name: 'The Verdict: That Week — Owen Diaz',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [balloon('adw_card', 'U.S. DISTRICT COURT — 4 OCTOBER 2021', 50, 22, { zIndex: 2 })],
  narraton: rn(45, 70),
  script: lines(
    'Narrator: "4 October 2021. A federal jury hears what Owen Diaz heard, daily, running an elevator at the Fremont plant in 2015 and 2016."',
    'Narrator: "The award: $137 million. $130 million of it punitive. Punitive means the jury wanted it to hurt."',
    'Narrator: "For one week, a contract elevator operator\'s testimony outweighs the richest company narrative on Earth."',
    'Narrator: "He told the truth about a floor, and twelve strangers believed him. That week, that was the entire system working."',
    '[CHOICE]',
    '- "A year on" -> aft_diaz_owen_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_diaz_owen_year',
  name: 'The Verdict: A Year On — Owen Diaz',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [balloon('ady_card', 'THE APPEALS', 50, 22, { zIndex: 2 })],
  narraton: rn(50, 65),
  script: lines(
    'Narrator: "A year on, the number shrinks: $15 million in 2022. About $3.2 million at retrial in 2023."',
    'Narrator: "Appeals courts trim awards. They did not trim the finding: a racially hostile workplace, proven to a federal jury."',
    'Narrator: "Diaz spent years of his life re-testifying to the worst days of it. That is the tax the process charges the person who was right."',
    'Narrator: "The money got smaller. What happened to him didn\'t."',
    '[CHOICE]',
    '- "The long view" -> aft_diaz_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --- Diaz: the floor ----------------------------------------------------------
scenes.push({
  id: 'aft_diaz_floor_week',
  name: 'The Verdict: That Week — The Floor',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('adf_ws', 'elon_workers', 50, 64, 2.4)],
  narraton: rn(45, 70),
  script: lines(
    'Narrator: "The Fremont floor, the week the verdict lands."',
    'Workers: "Everybody on that floor knew what Owen was hearing. Now twelve jurors know too."',
    'Workers: "Some of us heard the same words. We believed him before the jury did."',
    'Workers: "The foremen got quieter this week. Quieter is not fixed. But we notice quieter."',
    'Narrator: "A verdict does not clean a floor. It tells the floor that testimony works. Floors remember that."',
    '[CHOICE]',
    '- "A year on" -> aft_diaz_floor_year',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_diaz_floor_year',
  name: 'The Verdict: A Year On — The Floor',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [el('adfy_ws', 'elon_workers', 50, 64, 2.4)],
  narraton: rn(55, 62),
  script: lines(
    'Narrator: "9 February 2022. Four months after the verdict, the state sues."',
    'Narrator: "Kevin Kish, California Civil Rights Department, after a nearly three-year investigation and hundreds of complaints: Tesla operates \'a racially segregated workplace.\'"',
    'Workers: "Hundreds of complaints. Ours included. One verdict turned them from a stack into a case."',
    'Workers: "That\'s what Owen bought the floor with those years: the state stopped filing us under \'anecdote.\'"',
    'Narrator: "Verdicts breed filings. The lawyer said it as a warning. The floor hears it as a promise."',
    '[CHOICE]',
    '- "The long view" -> aft_diaz_long',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'aft_diaz_long',
  name: 'The Verdict: The Long View',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [balloon('adl_card', 'VERDICT → CRD SUIT → EEOC SUIT', 50, 22, { zIndex: 2 })],
  narraton: rn(65, 55),
  script: lines(
    'Narrator: "The long view. October 2021: the Diaz verdict. February 2022: the California CRD suit. September 2023: the federal EEOC files its own."',
    'Narrator: "One man\'s testimony, then a state agency, then the federal government — each filing standing on the one before."',
    'Narrator: "This is how accountability actually compounds: not one giant reckoning, but a chain of documents, each making the next one cheaper to file."',
    'Narrator: "The chain is still being written. That is what \'no ending yet\' means in this chapter."',
    '[CHOICE]',
    '- "Back to the Aftermaths" -> elon_aftermaths',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

const aftermathsEnd = scenes.length;

// ================================================================ THE RECORD
// Documented items the main story doesn't stage, in two drawers.
// Drawer one (12 files): studies, suits, filings, meetings, memes, votes.
// Drawer two (12 deep-dive files, HVB_RESEARCH_2.md ch.4): the SEC
// settlement, the released text troves, DealBook, Tornetta, the Delaware
// escape, the Foundation math, the prestige machine, the injury taxonomy,
// the insulating layer, Cabada v. SpaceX, and the flagged 2025 beat.
// Uncovered research, played straight.

scenes.push({
  id: 'elon_record',
  name: 'The Record',
  sceneType: 'AGENCY',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rec_hub_l', 'elon_lawyer', 26, 62, 2.2),
    el('rec_hub_r', 'elon_reporter', 74, 62, 2.2),
  ],
  script: lines(
    'Narrator: "The record, drawer one: twelve items the story hasn\'t staged. Studies, suits, meetings, memes, votes. A second drawer holds the deep-dive files. Filed in three, because fourteen at once is not a drawer."',
    '[CHOICE]',
    '- "The floor — studies, suits, testimony" -> recg_floor',
    '- "The platform, October 2022" -> recg_platform',
    '- "The money" -> recg_pay',
    '[/CHOICE]',
  ),
  status: 'work',
});

// Drawer one, filed in threes. All twelve files are still in here.
scenes.push(fanScene(
  'recg_floor', 'The Record — The Floor', 'elon_factory_drop',
  [el('recg_floor_a', 'elon_workers', 50, 63, 2.2)],
  ['Narrator: "Everything filed about the places where the work happens. Somebody counted, somebody sued, and two people got up under oath and said what they saw."'],
  [
    '- "The studies" -> recg_studies',
    '- "The suits" -> recg_suits',
    '- "Starbase: shift change, 4.8 per 100" -> rec_starbase',
  ],
));

scenes.push(fanScene(
  'recg_studies', 'The Record — The Studies', 'elon_factory_drop',
  [el('recg_studies_a', 'elon_reporter', 50, 62, 2.2)],
  ['Narrator: "Three files on counting. A state study, an exposé built from the state study, and the company\'s answer, which was that everybody else is counting wrong."'],
  [
    '- "2017: The Worksafe study" -> rec_worksafe',
    '- "2018: The Reveal exposé" -> rec_reveal',
    '- "2018: Tesla\'s denial" -> rec_reveal_denial',
  ],
));

scenes.push(fanScene(
  'recg_suits', 'The Record — The Suits', 'elon_court_drop',
  [el('recg_suits_a', 'elon_lawyer', 50, 62, 2.2)],
  ['Narrator: "Two agencies of the government and two people with names. All four say the same thing about the same factory, in four different filing systems."'],
  [
    '- "2022: The CRD suit, filing day" -> rec_crd',
    '- "2023: The EEOC suit" -> rec_eeoc',
    '- "The testimony: Moline and Carson" -> rec_testimony',
  ],
));

scenes.push(fanScene(
  'recg_platform', 'The Record — The Platform', 'elon_feedroom_drop',
  [el('recg_platform_a', 'elon_hypebro', 50, 63, 2.2)],
  ['Narrator: "October 2022, two files. A last meeting nobody wanted to be in, and a man carrying a sink through a lobby so that the photograph would exist."'],
  [
    '- "2022: Trust & Safety\'s final meeting" -> rec_tsc',
    '- "2022: The sink walk-in" -> rec_sink',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push(fanScene(
  'recg_pay', 'The Record — The Money', 'elon_hq',
  [el('recg_pay_a', 'elon_musk', 50, 62)],
  ['Narrator: "The largest compensation package in the history of corporations, awarded, voided, and voted on again. Read it next to the fine for a fractured skull. Both numbers are real."'],
  [
    '- "2018: The pay package vote" -> rec_pay_2018',
    '- "2024: The package, voided" -> rec_pay_voided',
    '- "The re-vote, and the second drawer" -> recg_pay2',
  ],
));

scenes.push(fanScene(
  'recg_pay2', 'The Record — The Re-Vote', 'elon_hq',
  [el('recg_pay2_a', 'elon_musk', 30, 62), el('recg_pay2_b', 'elon_hypebro', 70, 63)],
  ['Narrator: "They voted for it a second time and the chancellor voided it a second time. Under this drawer there is another one, and it is worse."'],
  [
    '- "2024: The re-vote" -> rec_pay_revote',
    '- "Open the second drawer — the deep-dive files" -> elon_record_2',
    '- "Back to the story" -> elon_feed',
  ],
));

scenes.push({
  id: 'rec_worksafe',
  name: 'The Worksafe Study',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('rws_w', 'elon_worker', 30, 62),
    balloon('rws_card', 'WORKSAFE — 2017', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(20, 88),
  script: lines(
    'Narrator: "2017. Amid UAW organizing at Fremont, the nonprofit Worksafe examines Tesla\'s own injury data."',
    'Worker: "It wasn\'t a leak. It wasn\'t a raid. It was our numbers, read by someone who knew how to read them."',
    'Narrator: "The finding: Tesla\'s rate of serious injuries ran well above the industry average — the severe-injury rate reported 83% higher."',
    'Worker: "The company said the study was union propaganda. The study said: here is the math, check it."',
    'Narrator: "A commissioned study is organizing in document form. It set the table for everything Reveal printed a year later."',
    '[CHOICE]',
    '- "Next file: the Reveal exposé" -> rec_reveal',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_reveal',
  name: 'The Reveal Exposé',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rrv_r', 'elon_reporter', 50, 62, 2.6),
    balloon('rrv_card', 'REVEAL / CIR — APRIL 2018', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(30, 85),
  script: lines(
    'Narrator: "April 2018. Reveal, from the Center for Investigative Reporting: Will Evans and Alyssa Jeong Perry publish the Tesla injury investigation."',
    'Reporter: "722 recorded injuries at Fremont in 2017. About two a day."',
    'Reporter (Closeup/Determined): "And the harder finding: workers alleging injuries kept off the official logs — mislabeled, minimized, made to disappear."',
    'Narrator: "An injury that never reaches the log never reaches the regulator, the insurer, or the average. Undercounting is not paperwork. It is policy."',
    '[CHOICE]',
    '- "Next file: Tesla\'s denial" -> rec_reveal_denial',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_reveal_denial',
  name: 'The Denial',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rrd_e', 'elon_musk', 30, 62),
    el('rrd_l', 'elon_hypebro', 70, 63),
  ],
  narraton: rn(32, 85),
  script: lines(
    'Narrator: "Tesla\'s response, same week: dispute everything. The company attacked the reporting as ideologically motivated and the outlet as an extremist operation."',
    'Elon (Pointing/Smug): "It\'s not an injury problem. It\'s a narrative problem. Fix the narrative."',
    'Lieutenant: "Drafting the rebuttal now, boss. Strong words. So many strong words."',
    'Elon: "And the injuries?"',
    'Lieutenant: "The rebuttal doesn\'t... strictly... mention those, boss."',
    'Narrator: "Note the shape — it recurs for a decade: dispute the count, attack the counter, leave the counted exactly where they were."',
    '[CHOICE]',
    '- "Back to the Record" -> elon_record',
    '- "Next file: the CRD suit" -> rec_crd',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_crd',
  name: 'Filing Day: The CRD Suit',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rcr_l', 'elon_lawyer', 50, 62, 2.6),
    balloon('rcr_card', 'CALIFORNIA CIVIL RIGHTS DEPARTMENT — 9 FEB 2022', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(55, 62),
  script: lines(
    'Narrator: "9 February 2022. After a nearly three-year investigation and hundreds of worker complaints, the State of California sues Tesla."',
    'Narrator: "Kevin Kish, the department\'s director, announcing the suit: Tesla operates \'a racially segregated workplace.\'"',
    'Lawyer: "Understand what a state filing is: an agency staking its own credibility on the pattern. Agencies do not do that for anecdotes."',
    'Lawyer: "Hundreds of complaints, three years of investigation, one sentence. That sentence took the longest."',
    'Narrator: "Four months after a federal jury believed Owen Diaz, the state put its name under his."',
    '[CHOICE]',
    '- "Next file: the EEOC suit" -> rec_eeoc',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_eeoc',
  name: 'The EEOC Suit',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('ree_l', 'elon_lawyer', 50, 62, 2.6),
    balloon('ree_card', 'U.S. EEOC v. TESLA — 28 SEP 2023', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(62, 55),
  script: lines(
    'Narrator: "28 September 2023. The federal Equal Employment Opportunity Commission files its own suit over the Fremont plant."',
    'Narrator: "The allegation: severe or pervasive racial harassment — and retaliation against workers who reported it."',
    'Lawyer: "Now count the layers, sir. A federal jury. A state agency. A federal agency. Same plant. Same pattern."',
    'Lawyer: "One of those you can call an outlier. Three is called a record."',
    'Narrator: "Retaliation is the tell. Harassment is a floor failing its workers. Retaliation is a company defending the failure."',
    '[CHOICE]',
    '- "Back to the Record" -> elon_record',
    '- "Next file: Trust & Safety" -> rec_tsc',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_tsc',
  name: 'Trust & Safety: The Final Meeting',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    balloon('rts_card', 'TRUST & SAFETY COUNCIL — DECEMBER 2022', 50, 22, { zIndex: 2 }),
    balloon('rts_screen', 'WAITING FOR HOST TO START THE MEETING…', 45, 95),
  ],
  narraton: rn(40, 78),
  script: lines(
    'Narrator: "December 2022. The Trust and Safety Council — outside experts on child safety, hate speech, self-harm — has a meeting on the calendar."',
    'Narrator: "The volunteers log on early. They always logged on early. The work was grim and they did it for free."',
    '[SET_TEXT rts_screen "INBOX (1): \'…the Council is no longer the best structure…\' — DISSOLVED, EFFECTIVE IMMEDIATELY"]',
    'Narrator: "The email arrives shortly before the meeting starts. The council is dissolved by form letter. The call never begins."',
    'Narrator: "Researchers auditing the platform afterward documented the rise in hate-speech impressions. The volunteers had been the unpaid brake."',
    'Narrator: "The final meeting of the Trust and Safety Council is an empty video call. Minutes: none. Attendance: everyone. Host: never came."',
    '[CHOICE]',
    '- "Back to the Record" -> elon_record',
    '- "Next file: the sink" -> rec_sink',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_sink',
  name: 'The Sink Walk-In',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rsk_e', 'elon_musk', 40, 62, 2.6),
    balloon('rsk_prop', 'ONE (1) SINK', 62, 40, { zIndex: 4 }),
    balloon('rsk_caption', 'THE MEME — LIVE', 45, 95),
  ],
  narraton: rn(20, 96),
  script: lines(
    'Narrator: "26 October 2022. He enters the platform\'s headquarters carrying a sink, films it, and posts the clip himself."',
    'Elon (Pointing/Smug): "\'Let that sink in.\' Do you get it? The sink. Is IN. I wrote it in the car."',
    '[SET_TEXT rsk_caption "POSTED: \'let that sink in\' — VIEWS: EVERYONE, INSTANTLY"]',
    'Narrator: "It is, on its own terms, a perfect meme. That was the point: a $44 billion acquisition premiered as content."',
    'Elon: "Nobody remembers a filing. EVERYBODY remembers a sink."',
    '[SET_TEXT rsk_caption "ALSO THAT WEEK: LAYOFF LISTS DRAFTED. MODERATION CUTS SCOPED."]',
    'Narrator: "The sink was staged for the cameras. The week around it wasn\'t. The record keeps both clips."',
    '[CHOICE]',
    '- "Back to the Record" -> elon_record',
    '- "Next file: the pay package" -> rec_pay_2018',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_pay_2018',
  name: 'The Pay Package: The 2018 Vote',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rp1_e', 'elon_musk', 30, 62),
    el('rp1_l', 'elon_hypebro', 70, 63),
    balloon('rp1_card', 'SHAREHOLDER VOTE — MARCH 2018', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(25, 92),
  script: lines(
    'Narrator: "March 2018. Tesla shareholders approve a CEO pay package unlike any in corporate history: all stock, tied to milestones, eventually valued around $56 billion — thirty-three times the next-largest executive package on record."',
    'Lieutenant: "Boss, if every target hits, it\'s the largest compensation deal ever constructed by mammals. Thirty-three times the silver medal."',
    'Elon (Pointing/Smug): "It\'s not pay. It\'s alignment. I only win if everybody wins."',
    'Narrator: "The fine print alignment: the targets reward market capitalization — the price of the story — not injury rates, not verdicts, not the floor."',
    'Narrator: "A pay deal is a company saying out loud what it actually optimizes. This one said: the number. File that for 2024."',
    '[CHOICE]',
    '- "Next file: voided" -> rec_pay_voided',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_pay_voided',
  name: 'The Pay Package: Voided',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rp2_l', 'elon_lawyer', 70, 62),
    el('rp2_e', 'elon_musk', 30, 62),
    balloon('rp2_card', 'DELAWARE COURT OF CHANCERY — JAN 2024', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(60, 60),
  script: lines(
    'Narrator: "30 January 2024. Tornetta v. Musk. Chancellor Kathaleen McCormick of the Delaware Court of Chancery voids the entire package — an estimated $55.8 billion — in a 201-page opinion that opens with a question: \'Was the richest person in the world overpaid?\'"',
    'Narrator: "Her answer, verbatim: it was \'the biggest compensation plan ever — an unfathomable sum.\' And the board that approved it? \'Swept up by the rhetoric of \'all upside,\' or perhaps starry eyed by Musk\'s superstar appeal.\'"',
    'Lawyer: "The finding, plainly: you \'controlled Tesla,\' \'enjoyed thick ties with the directors,\' and \'dominated the process.\' The people setting your pay were not independent of you."',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "A judge un-paid me $56 billion. UN-PAID. Is that even a verb?"',
    'Lawyer: "In Delaware it is now, sir."',
    'Narrator: "The same governance that waved through the package had also priced the fines, the floors, and the dashboards. One court finally read the minutes."',
    '[CHOICE]',
    '- "Next file: the re-vote" -> rec_pay_revote',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_pay_revote',
  name: 'The Pay Package: The Re-Vote',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rp3_e', 'elon_musk', 30, 62),
    el('rp3_l', 'elon_hypebro', 70, 63),
    balloon('rp3_card', 'SHAREHOLDER RE-VOTE — JUNE 2024', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(62, 62),
  script: lines(
    'Narrator: "June 2024. Tesla asks shareholders to approve the same package again — a ratification vote staged as a rally."',
    'Lieutenant: "The vibes are IMMACULATE, boss. Retail loves you. The proxy fight is a fan convention."',
    'Elon (Pointing/Smug): "The people are un-un-paying me. Democracy!"',
    'Narrator: "Shareholders approve it. In December 2024, McCormick upholds her ruling anyway, verbatim: \'A stockholder vote standing alone cannot ratify a conflicted-controller transaction.\' The proxy statement, she finds, carried \'multiple, material misstatements.\'"',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "Absolute corruption."',
    'Narrator: "That quote is his, verbatim — his review of the ruling. The appeal went up to the Delaware Supreme Court. His other answer went further: he moved the company out of Delaware entirely. That file is next."',
    'Narrator: "Meanwhile, for scale: the fine for Francisco Cabada\'s fractured skull was still being contested toward $475. Both numbers are true at once. That is the chapter."',
    '[CHOICE]',
    '- "Next file: the Delaware escape" -> rec_delaware',
    '- "Other files on this desk" -> rec_pay_more',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push(fanScene(
  'rec_pay_more', 'The Pay Package: The Rest of the Desk', 'elon_court_drop',
  [el('rpm_l', 'elon_lawyer', 50, 62, 2.2)],
  ['Narrator: "Two more from the same stack. One is the man with nine shares who started all of it. One is a shift change in Texas where the injury rate runs 4.8 per hundred."'],
  [
    '- "The shareholder with nine shares" -> rec_tornetta',
    '- "Starbase, shift change" -> rec_starbase',
    '- "Back to the Record" -> elon_record',
  ],
));

scenes.push({
  id: 'rec_starbase',
  name: 'Starbase: Shift Change',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('rsb_w', 'elon_worker', 30, 62),
    el('rsb_ws', 'elon_workers', 72, 63),
    balloon('rsb_card', 'STARBASE, BROWNSVILLE — SHIFT CHANGE', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(35, 80),
  script: lines(
    'Narrator: "Starbase, Brownsville. The gate at shift change — day crew out, night crew in. Two minutes of overlap."',
    'Worker: "Heads up tonight. Stand three\'s running hot again. Torres caught a pinch on it Tuesday."',
    'Workers: "Logged?"',
    'Worker: "Company log, \'first aid only.\' Our notebook: page nine."',
    'Workers: "You see the Reuters table? Us: 4.8 per 100. Industry: 0.8. We\'re the six-times site."',
    'Worker (Pointing/Angry): "Six times isn\'t bad luck. Six times is a management decision with a schedule attached."',
    'Workers: "...Watch stand three. Pass it down the line."',
    'Narrator: "\'Pass it down the line\' — the oldest safety system in the world, and at 4.8 per 100, still the most reliable one on site."',
    '[CHOICE]',
    '- "Next file: the testimony" -> rec_testimony',
    '- "Back to the Record" -> elon_record',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_testimony',
  name: 'The Testimony: Moline and Carson',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rtm_r', 'elon_reporter', 50, 62, 2.6),
    balloon('rtm_card', 'ON THE RECORD — REUTERS, 2023', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(70, 50),
  script: lines(
    'Narrator: "Two former SpaceX employees put their names on the record for the Reuters investigation. Names cost. Read what the names bought."',
    'Reporter: "Tom Moline, former SpaceX engineer: \'Elon\'s concept that SpaceX is on this mission to go to Mars as fast as possible and save humanity permeates every part of the company. The company justifies casting aside anything that could stand in the way… including worker safety.\'"',
    'Reporter (Closeup/Determined): "Travis Carson, former supervisor: \'SpaceX\'s idea of safety is: We\'ll let you decide what\'s safe for you\' — \'which really means there was no accountability.\'"',
    'Narrator: "Every anonymous tip needs a named source to stand behind it before it can print. Moline and Carson are why six hundred injuries read as fact, not rumor."',
    'Narrator: "The record is people. It always was."',
    '[CHOICE]',
    '- "Back to the Record" -> elon_record',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

// --------------------------------------------------------------- drawer two
// Pass 2 deep-dive files (HVB_RESEARCH_2.md ch.4): the SEC settlement, the
// released text troves, DealBook, Tornetta and the Delaware escape, the
// Foundation math, the prestige machine in Georgist terms, the injury
// taxonomy, the insulating executive layer, the Cabada suit, and the
// flagged DOGE beat. Verbatim quotes stay verbatim; victims stay dignified.

scenes.push({
  id: 'elon_record_2',
  name: 'The Record: The Second Drawer',
  sceneType: 'AGENCY',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rec2_hub_l', 'elon_lawyer', 26, 62, 2.2),
    el('rec2_hub_r', 'elon_reporter', 74, 62, 2.2),
  ],
  script: lines(
    'Narrator: "The second drawer: twelve deep-dive files. Settlements, text troves, a chancellor, a foundation, a flag on the newest one. Filed in three."',
    '[CHOICE]',
    '- "The texts, and the tweet" -> rec2g_texts',
    '- "The courtroom, and the escape" -> rec2g_court',
    '- "The machine around the man" -> rec2g_machine',
    '[/CHOICE]',
  ),
  status: 'work',
});

// Drawer two, filed in threes. All twelve deep-dive files are still here.
scenes.push(fanScene(
  'rec2g_texts', 'The Second Drawer — The Texts', 'elon_feedroom_drop',
  [el('rec2g_texts_a', 'elon_musk', 50, 62)],
  ['Narrator: "Three files where he is typing. A tweet that cost forty million dollars, a text thread with the man he was about to fire, and a text thread with the men lining up to fund him."'],
  [
    '- "2018: Funding secured" -> rec_sec',
    '- "2022: The Agrawal texts" -> rec_texts_agrawal',
    '- "2022: The believers\' texts" -> rec_texts_believers',
  ],
));

scenes.push(fanScene(
  'rec2g_court', 'The Second Drawer — The Courtroom', 'elon_court_drop',
  [el('rec2g_court_a', 'elon_lawyer', 50, 62, 2.2)],
  ['Narrator: "Three files with a docket number. A shareholder with nine shares, a state he moved a company out of rather than lose in, and a man suing over his own skull."'],
  [
    '- "The plaintiff with nine shares" -> rec_tornetta',
    '- "The Delaware escape" -> rec_delaware',
    '- "Cabada v. SpaceX" -> rec_cabada_suit',
  ],
));

scenes.push(fanScene(
  'rec2g_machine', 'The Second Drawer — The Machine Around the Man', 'elon_hq',
  [el('rec2g_machine_a', 'elon_hypebro', 50, 63, 2.2)],
  ['Narrator: "Nobody is a billionaire by themselves. There is a layer of people whose whole job is that the sentence above never gets said out loud."'],
  [
    '- "The prestige machine, and the money" -> rec2g_prestige',
    '- "The people around him" -> rec2g_people',
    '- "Back to drawer one" -> elon_record',
  ],
));

scenes.push(fanScene(
  'rec2g_prestige', 'The Second Drawer — Prestige and Money', 'elon_hq',
  [el('rec2g_prestige_a', 'elon_musk', 50, 62)],
  ['Narrator: "The charitable foundation that mostly holds, the shell of admiration around the fortune, and the evening he told an advertiser to go do something anatomically specific on a conference stage."'],
  [
    '- "The Foundation math" -> rec_foundation',
    '- "The prestige machine" -> rec_prestige',
    '- "2023: DealBook — \'Go. Fuck. Yourself.\'" -> rec_dealbook',
  ],
));

scenes.push(fanScene(
  'rec2g_people', 'The Second Drawer — The People', 'elon_factory_drop',
  [el('rec2g_people_a', 'elon_workers', 50, 63, 2.2)],
  ['Narrator: "Six hundred injuries, sorted by what part of a person got broken. The layer of managers that keeps those six hundred from reaching him. And the newest file, which carries a flag."'],
  [
    '- "The taxonomy of the 600" -> rec_six_hundred',
    '- "The insulating layer" -> rec_insulation',
    '- "2025: The flagged file" -> rec_doge',
  ],
));

scenes.push({
  id: 'rec_sec',
  name: 'Funding Secured',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rsec_e', 'elon_musk', 30, 62),
    el('rsec_l', 'elon_lawyer', 70, 62),
    balloon('rsec_card', 'SEC v. MUSK — 2018', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(35, 85),
  script: lines(
    'Narrator: "7 August 2018. He posts, verbatim: \'Am considering taking Tesla private at $420. Funding secured.\' Tesla stock spikes about 14% on the tweet."',
    'Lawyer: "The funding was not secured, sir. The SEC noticed. They charge securities fraud."',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "It was a joke. 420. A GOOD joke. The market laughed fourteen percent."',
    'Lawyer: "The settlement: you pay $20 million. Tesla pays another $20 million. You step down as chairman for three years. And every market-moving tweet now requires pre-approval by a lawyer — the press calls it the \'Twitter sitter.\'"',
    'Elon: "A babysitter. For MY posts. On MY feed."',
    'Narrator: "For the record\'s completeness: in 2023, a separate shareholder class action went to a jury — and found him not liable for the tweets. Two proceedings, two answers. Both are in the file."',
    'Narrator: "Note what the fine did not do: four years later he bought the whole feed. The sitter never stood a chance."',
    '[CHOICE]',
    '- "Next file: the Agrawal texts" -> rec_texts_agrawal',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_texts_agrawal',
  name: 'The Agrawal Texts',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('rta_e', 'elon_musk', 40, 62, 2.6),
    balloon('rta_card', 'RELEASED IN DELAWARE LITIGATION — SEPT 2022', 50, 20, { zIndex: 2 }),
    balloon('rta_phone', 'THE THREAD', 45, 95),
  ],
  narraton: rn(30, 88),
  script: lines(
    'Narrator: "April 2022. Parag Agrawal, Twitter\'s CEO, texts the man about to become his largest shareholder. The thread surfaces months later in the Delaware litigation — verbatim, timestamped."',
    '[SET_TEXT rta_phone "AGRAWAL: \'You are free to tweet \'is Twitter dying?\' or anything else about Twitter — but it\'s my responsibility to tell you that it\'s not helping me make Twitter better in the current context.\'"]',
    'Narrator: "A CEO, gently, to his incoming owner: please stop hurting the company. The reply lands in under a minute."',
    '[SET_TEXT rta_phone "MUSK: \'What did you get done this week?\'"]',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "What did you get done this week? I\'m not joining the board. This is a waste of time. Will make an offer to take Twitter private."',
    'Narrator: "All verbatim. A $44 billion decision, made in the time it takes to lose your temper at a text."',
    'Narrator: "And this, also his, also verbatim, from the same trove: \'Frankly, I hate doing mgmt stuff. I kinda don\'t think I should be the boss of anyone. But I love helping solve technical/product design problems.\' He then bought a company of 7,500 people."',
    '[CHOICE]',
    '- "Next file: the believers\' texts" -> rec_texts_believers',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_texts_believers',
  name: 'The Believers\' Texts',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('rtb_e', 'elon_musk', 40, 62, 2.6),
    balloon('rtb_card', 'THE TEXT TROVE — RELEASED SEPT 2022', 50, 20, { zIndex: 2 }),
    balloon('rtb_phone', 'INBOX', 45, 95),
  ],
  narraton: rn(25, 92),
  script: lines(
    'Narrator: "The same released trove shows Silicon Valley\'s most powerful jostling to get in on the deal. Read the inbox of a man nobody says no to."',
    '[SET_TEXT rtb_phone "ELLISON: COMMITS $2,000,000,000 — BY TEXT MESSAGE"]',
    'Narrator: "Larry Ellison put two billion dollars into the deal over text. Two billion. By text."',
    '[SET_TEXT rtb_phone "DORSEY: \'I tried my hardest to get you on our board, and the board said no… That\'s about the time I decided I need to work to leave.\'"]',
    'Narrator: "Jack Dorsey, Twitter\'s founder, verbatim. And publicly, 26 April 2022: \'Elon is the singular solution I trust… I trust his mission to extend the light of consciousness.\'"',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "The singular solution. That\'s me. Print it on the hats."',
    'Narrator: "Dorsey later brokered a meeting between Musk and Agrawal. It failed. His text afterward, verbatim and dry: \'At least it became clear that you can\'t work together. That was clarifying.\'"',
    'Narrator: "This is what the prestige machine looks like from inside: billions moving on belief, by text, between men who never have to explain. The court made it public. That is what courts are for."',
    '[CHOICE]',
    '- "Next file: DealBook" -> rec_dealbook',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_dealbook',
  name: 'DealBook, 29 November 2023',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rdb_e', 'elon_musk', 40, 62, 2.6),
    balloon('rdb_card', 'DEALBOOK SUMMIT — ON VIDEO, VERBATIM', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(78, 42),
  script: lines(
    'Narrator: "29 November 2023. Advertisers are fleeing X over his posts. On stage at the DealBook Summit, Andrew Ross Sorkin asks about the boycott. What follows is on video, verbatim."',
    '[POSE elon_musk pose=Sit expression=Angry]',
    'Elon: "If somebody\'s going to try to blackmail me with advertising, blackmail me with money? Go fuck yourself."',
    'Elon: "Go. Fuck. Yourself. Is that clear?"',
    'Narrator: "Then, to Disney\'s Bob Iger, sitting in the audience: \'Hey, Bob.\'"',
    'Elon: "I have no problem being hated. Hate away."',
    'Narrator: "And, quieter, in the same interview: \'I handed a loaded gun to those who hate me.\' Even he could hear it."',
    'Narrator: "Linda Yaccarino, the CEO he hired to win the advertisers back, publicly defended him afterward. Her job that week is not in the record. It is legible from orbit."',
    'Narrator: "The prestige shell, rupturing on camera, in real time, at the mission\'s own asking price: the advertisers were the revenue. That is what a PRESTIGE crisis looks like when the armor is the man."',
    '[CHOICE]',
    '- "Next file: the plaintiff with nine shares" -> rec_tornetta',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_tornetta',
  name: 'The Plaintiff With Nine Shares',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rtn_l', 'elon_lawyer', 50, 62, 2.6),
    balloon('rtn_card', 'TORNETTA v. MUSK', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(55, 60),
  script: lines(
    'Narrator: "The case that voided the largest pay package in human history was brought by Richard Tornetta — a heavy-metal drummer from Pennsylvania who owned nine shares of Tesla."',
    'Lawyer: "Nine shares. Against fifty-six billion dollars. Delaware law does not weigh the plaintiff. It weighs the process."',
    'Narrator: "Chancellor Kathaleen McCormick weighed the process for 201 pages and found the board was not independent, the negotiation was not adversarial, and the sum was \'unfathomable.\'"',
    'Lawyer: "Understand what that means structurally: any owner — nine shares or nine million — can make the record speak. That is the whole design. That is why the next file exists."',
    'Narrator: "Because when the process finally bit, the response was not to fix the process. It was to leave the state."',
    '[CHOICE]',
    '- "Next file: the Delaware escape" -> rec_delaware',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_delaware',
  name: 'The Delaware Escape',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rde_e', 'elon_musk', 30, 62),
    el('rde_l', 'elon_hypebro', 70, 63),
    balloon('rde_card', 'STATE OF INCORPORATION — DEPARTING', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(60, 58),
  script: lines(
    '[GAUGE regulation at 87,20 min=0 max=100 label="REGULATION"]',
    '[TICK 400ms]',
    '[IF regulation > 15]',
    '[SET regulation = max(regulation - 1, 15)]',
    '[ENDIF]',
    '[/TICK]',
    'Narrator: "The ruling lands. His response, verbatim: \'Never incorporate your company in the state of Delaware.\' Then he does it: SpaceX reincorporates in Texas, Neuralink in Nevada — and Tesla\'s shareholders vote the company out of Delaware to Texas."',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "If the referee calls a foul, you don\'t argue. You buy a league with friendlier referees."',
    'Lieutenant: "Filing the moving paperwork now, boss. Texas has GREAT weather for corporate charters."',
    'Narrator: "Watch the needle. This is the oldest move in the book, staged as a moving van: when regulation bites, you do not comply — you relocate to where it can\'t. Leopold bribed the press. Capone bought the aldermen. He shops jurisdictions."',
    'Narrator: "Same mechanic, every era: spend hoard or prestige to corrode the rule. And the same counter, every era — the corrosion is itself a document. The escape is now the most-cited exhibit for why the rule was needed."',
    '[CHOICE]',
    '- "Next file: the Foundation math" -> rec_foundation',
    '- "See it feed the Machine" -> el_machine',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_foundation',
  name: 'The Foundation Math',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rfm_r', 'elon_reporter', 50, 62, 2.6),
    balloon('rfm_card', 'THE MUSK FOUNDATION — NYT, 2024', 50, 20, { zIndex: 2 }),
    balloon('rfm_ticker', 'THE 5% RULE', 45, 95),
  ],
  narraton: rn(55, 68),
  script: lines(
    'Narrator: "US law asks one thing of a private foundation: disburse roughly 5% of assets a year. In 2024, the New York Times — David Fahrenthold, Ryan Mac, Teddy Schleifer — ran the Musk Foundation\'s numbers."',
    '[SET_TEXT rfm_ticker "2021: SHORT ~$41 MILLION"]',
    'Reporter: "Short $41 million in 2021."',
    '[SET_TEXT rfm_ticker "2022: SHORT ~$234 MILLION — ~2.25% GIVEN OF ~$7 BILLION IN ASSETS"]',
    'Reporter: "Short $234 million in 2022 — about 2.25% given, of roughly $7 billion."',
    '[SET_TEXT rfm_ticker "2023: SHORT ~$421 MILLION"]',
    'Reporter (Closeup/Determined): "Short $421 million in 2023. And of what it did give in 2021 and 2022, roughly half benefited his own interests, partners, or family — the Ad Astra school, where several students were his own children, and a $100 million grant to a charity run by Jared Birchall, the head of his family office."',
    'Narrator: "The foundation has no employees. Its directors reportedly spent about two hours a week on it. ProPublica later lists 2024 expenses of $475 million against $463 million in total assets — the numbers moving, at last, under scrutiny."',
    'Narrator: "This is the chapter\'s litmus question with a ledger attached: philanthropy as prestige-laundering, or extraction actually stopped? The 5% rule is the smallest possible test. Read the ticker again."',
    '[CHOICE]',
    '- "Next file: the prestige machine" -> rec_prestige',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_prestige',
  name: 'The Prestige Machine',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('rpm_e', 'elon_musk', 30, 62),
    el('rpm_f', 'elon_fans', 72, 63),
    balloon('rpm_card', 'PRESTIGE-AS-ARMOR — THE MECHANISM', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(45, 88),
  script: lines(
    '[GAUGE prestige at 87,20 min=0 max=100 label="PRESTIGE"]',
    '[GAUGE education at 87,44 min=0 max=100 label="EDUCATION"]',
    'Narrator: "Take the machine apart. Component one: the mission. \'Saving humanity\' reframes every cost — the injuries, the fines, the firings — as friction on the way to Mars. Nobody audits a mission."',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "Time Person of the Year, 2021. They gave the armor a cover shoot."',
    'Narrator: "Component two: the fan armies. Every exposé arrives pre-ratioed; the meme is the moat. Free reputational infantry, paid in belonging."',
    'Fans: "The haters have articles. WE have the mission."',
    'Narrator: "Component three: the megaphone itself, purchased for $44 billion. And yet — Community Notes, on his own platform, now sometimes corrects his own posts. The armor is showing seams from the inside."',
    'Narrator: "In the Machine\'s terms: prestige is a depletable buffer that repression can rupture and education corrodes. Leopold\'s buffer was a museum. Capone\'s was a soup kitchen. His is a mission — and every gauge on this wall says the same thing: buffers run out."',
    '[CHOICE]',
    '- "Next file: the taxonomy of the 600" -> rec_six_hundred',
    '- "See it feed the Machine" -> el_machine',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_six_hundred',
  name: 'The Taxonomy of the 600',
  sceneType: 'WITNESS',
  dropId: dropId('elon_factory_drop'),
  stage: [
    el('rsh_ws', 'elon_workers', 50, 64, 2.4),
    balloon('rsh_card', 'REUTERS, 10 NOV 2023 — THE COUNT, ITEMIZED', 50, 20, { zIndex: 2 }),
    balloon('rsh_ticker', 'AT LEAST 600 PREVIOUSLY UNREPORTED INJURIES SINCE 2014', 45, 95),
  ],
  narraton: rn(62, 52),
  script: lines(
    'Narrator: "Six hundred is a number. The record itemizes it. Read slowly — each line is people."',
    '[SET_TEXT rsh_ticker "MORE THAN 100 CUTS AND LACERATIONS"]',
    'Workers: "The gloves budget was \'under review\' for two quarters."',
    '[SET_TEXT rsh_ticker "29 BROKEN BONES AND DISLOCATIONS • 17 CRUSHED HANDS AND FINGERS"]',
    'Workers: "Seventeen crushed hands. We build rockets with our hands."',
    '[SET_TEXT rsh_ticker "9 HEAD INJURIES • 8 AMPUTATIONS"]',
    'Workers: "Eight amputations. Eight people learning to live in a different body, on a schedule that never slowed for any of them."',
    '[SET_TEXT rsh_ticker "5 BURNS • 5 ELECTROCUTIONS • 7 EYE INJURIES"]',
    'Workers: "And Lonnie. The count starts with Lonnie."',
    '[SET_TEXT rsh_ticker "ROUGHLY 400 CAME IN YEARS SPACEX REPORTED NOTHING TO OSHA"]',
    'Narrator: "Roughly four hundred of the six hundred happened in years the company filed no injury data to the regulator at all. An injury that is never reported never becomes a rate, and a rate that doesn\'t exist never slows a schedule. The taxonomy is the resistance."',
    '[CHOICE]',
    '- "Next file: the insulating layer" -> rec_insulation',
    '- "Witness: The Dashboard Is Green" -> el_cut_dashboard',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_insulation',
  name: 'The Insulating Layer',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('ril_e', 'elon_musk', 30, 62),
    el('ril_l', 'elon_hypebro', 70, 63),
    balloon('ril_card', 'THE OPERATIONAL LAYER', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(35, 82),
  script: lines(
    'Narrator: "Between the feed and the floor sits a layer of executives the public rarely sees: Gwynne Shotwell running SpaceX day to day, Steve Davis, Omead Afshar. The researchers call it the insulating layer."',
    'Lieutenant: "Boss posts at 3am, Shotwell answers the customers at 9am. It\'s a system. It\'s LOAD-BEARING."',
    '[POSE elon_musk pose=Pointing expression=Smug]',
    'Elon: "I do vision. Other people do... whichever days the vision isn\'t on."',
    'Narrator: "The layer works in both directions. It keeps the companies running through the chaos — and it keeps the chaos deniable. Contracts survive the posts because a professional is always standing just behind the man yelling at the feed."',
    'Narrator: "Note it in the mechanism: prestige armor is not only memes and missions. It is competent people whose competence gets billed to the myth. Every launch that lands is credited to the account that posts."',
    '[CHOICE]',
    '- "Next file: Cabada v. SpaceX" -> rec_cabada_suit',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_cabada_suit',
  name: 'Cabada v. SpaceX',
  sceneType: 'WITNESS',
  dropId: dropId('elon_court_drop'),
  stage: [
    el('rcs_l', 'elon_lawyer', 30, 62),
    el('rcs_w', 'elon_worker', 70, 62),
    balloon('rcs_card', 'FILED JANUARY 2024', 50, 22, { zIndex: 2 }),
  ],
  narraton: rn(58, 55),
  script: lines(
    'Narrator: "18 January 2022. Hawthorne. During a pressure test of a Raptor V2 engine, a part flies off and fractures the skull of Francisco Cabada, an integration technician. He does not wake up. Years pass. He still has not woken up."',
    'Worker: "Frank\'s wife, Ydy, kept visiting. Kept waiting for a call from the top that never came. Her words, to Reuters: \'It would have been nice to get a call from Elon Musk… But I guess workers are just disposable to them.\'"',
    'Lawyer: "The state\'s response: CalOSHA fined SpaceX $18,475. The company appealed — seeking a reduction toward $475."',
    'Worker (Pointing/Angry): "Four hundred seventy-five dollars. For Frank\'s skull."',
    'Lawyer: "In January 2024, Ydy Cabada filed a negligence suit. A fine can be ground down by an appeals board. A civil suit takes depositions. Discovery. Testimony under oath about what that test cell was like, on the record, forever."',
    'Narrator: "This file is a person: a technician who ran that cell for years, a family that would not be priced. The record is people. It always was."',
    '[CHOICE]',
    '- "Next file: the flagged one" -> rec_doge',
    '- "Back to the second drawer" -> elon_record_2',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'rec_doge',
  name: 'The Flagged File',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('rdg_r', 'elon_reporter', 50, 62, 2.6),
    balloon('rdg_card', 'FLAG: RECENT AND EVOLVING — NOT SETTLED HISTORY', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(72, 48),
  script: lines(
    'Narrator: "The last file in the drawer carries a flag, and the flag is the point: this one is still being written."',
    'Reporter: "2025. He is handed a government initiative — DOGE — and widely reported cuts sweep the federal workforce, including the agencies that regulate his own companies."',
    'Reporter (Closeup/Determined): "You\'ve seen this mechanic all chapter: corroding regulation with money and prestige. The reporting frames this as the same arc — but it is recent, contested, and evolving. So this game does what the record does: states the claim, states the flag, and waits for the documents."',
    'Narrator: "Every other file in these drawers began exactly here — as a developing story someone insisted was too soon to judge. The Worksafe study. The Reveal count. McGregor. Give it the years, and the FOIA requests, and the depositions."',
    'Narrator: "The drawer stays open. That is the ending this era can honestly offer: the record accumulates whether or not the feed acknowledges it."',
    '[CHOICE]',
    '- "Back to the second drawer" -> elon_record_2',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

const recordEnd = scenes.length;

// ============================================================== GOD GAMER
// The Path of Exile 2 affair, and the x-ray it gives you.
//
// Six scenes: the hub, the brag, the stream, what the players worked out,
// the question the biggest podcast on Earth never asked, and the psyche.
//
// Sourcing discipline, same as the Record: what he CLAIMED is labelled a
// claim, what players ALLEGED is labelled an allegation, and the one
// concession he made is given as reported. No verdict is asserted that the
// documents don't carry. The register is the Dialoguicon's optimistic
// rage — this is a small, sad, entirely human thing, and the game pities
// it while refusing to let it go. Doug's comic is a live BUTTON here and
// at the point where Musk is introduced (elon_feed).

scenes.push({
  id: 'el_poe_hub',
  name: 'The God Gamer',
  sceneType: 'AGENCY',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('poe_hub_e', 'elon_musk', 30, 62),
    el('poe_hub_f', 'elon_fans', 72, 63, 2.6),
    balloon('poe_hub_card', 'PATH OF EXILE 2 — JANUARY 2025', 50, 20, { zIndex: 2 }),
  ],
  script: lines(
    '[BUTTON el_comic_godgamer]',
    'Narrator: "Set the rockets down for ten minutes. Nobody died in this one. That is exactly why it is useful — it is the same machine running with the safety on, where you can see all the moving parts."',
    'Narrator: "A man with more money than any human has ever had wanted the internet to believe he was one of the best in the world at a video game. Watch what he did to get that, and then watch what it costs to want it."',
    '[CHOICE]',
    '- "The brag" -> el_poe_brag',
    '- "Straight to the x-ray" -> el_poe_psyche',
    '- "Back to the story" -> elon_feed',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'el_poe_brag',
  name: 'God Gamer: The Brag',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('poeb_e', 'elon_musk', 32, 62),
    el('poeb_l', 'elon_hypebro', 72, 63),
    balloon('poeb_card', 'THE CLAIM: TOP-TIER, GLOBALLY', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(20, 92),
  script: lines(
    'Narrator: "December 2024. Path of Exile 2 goes into early access — a brutal, fiddly action-RPG with a skill tree like a wiring diagram and a Hardcore mode where death is permanent. It is a game that eats months. That is the entire appeal."',
    'Narrator: "January 2025. He starts posting about his character, and then streaming it, on the platform he owns. The claim, made publicly and repeated: that he is among the very best players in the world — reported as a claim of top-twenty Hardcore standing."',
    '[POSE poeb_e pose=Pointing expression=Smug]',
    'Elon: "Top twenty. In the WORLD. And I run five companies."',
    'Lieutenant: "Incredible, boss. When do you sleep?"',
    'Elon: "I don\'t. That\'s the whole point of me."',
    'Narrator: "Hold those two sentences together, because the players did. The claim is not just that he is good. The claim is that he is doing hundreds of hours of the most time-hungry grind in gaming WHILE running SpaceX, Tesla, the platform, and a political operation."',
    'Narrator: "Nobody in this scene has done anything wrong yet. He has said a thing about himself. The chapter\'s whole method is what happens next: somebody checks."',
    '[CHOICE]',
    '- "Watch the stream" -> el_poe_stream',
    '- "Back to the God Gamer" -> el_poe_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'el_poe_stream',
  name: 'God Gamer: The Stream',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('poes_e', 'elon_musk', 34, 62),
    el('poes_f', 'elon_fans', 74, 63, 2.6),
    balloon('poes_chat', 'CHAT', 45, 95),
  ],
  narraton: rn(35, 80),
  script: lines(
    'Narrator: "He streams it. Live, on his own platform, at a level of character that takes most people a month of evenings to reach."',
    '[SET_TEXT poes_chat "CHAT: what does that gem even do"]',
    'Narrator: "And the thing that undoes him is not an accusation. It is the footage. Watching him play, viewers reported him unable to explain his own build — hesitating over his skills, misreading his gear, unfamiliar with basic mechanics of a character that was allegedly one of the twenty best on Earth."',
    'Elon (Neutral/Panicked): "This one is the... the big one. It does the damage. Obviously it does the damage."',
    '[SET_TEXT poes_chat "CHAT: that is your own passive tree my guy"]',
    'Fans: "He\'s multitasking. He\'s on a call. He\'s literally saving humanity between packs."',
    '[SET_TEXT poes_chat "CHAT: nobody who ground that character talks like that"]',
    'Narrator: "This is a real category of evidence and it is worth naming, because it recurs everywhere in this game: TACIT KNOWLEDGE. You cannot fake the small talk of work you have actually done. Ask a machinist about a finish. Ask a nurse about a shift. Ask a player about their own build."',
    'Fans: "...okay, but why doesn\'t he know what his own gems do."',
    'Narrator: "That is a community starting to check. It took about forty-eight hours."',
    '[CHOICE]',
    '- "What the players worked out" -> el_poe_ladder',
    '- "Back to the God Gamer" -> el_poe_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'el_poe_ladder',
  name: 'God Gamer: The Ladder, Audited',
  sceneType: 'WITNESS',
  dropId: dropId('elon_feedroom_drop'),
  stage: [
    el('poel_f', 'elon_fans', 28, 63, 2.6),
    el('poel_r', 'elon_reporter', 72, 62),
    balloon('poel_card', 'ALLEGED: BOOSTING AND ACCOUNT-SHARING', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(55, 65),
  script: lines(
    'Narrator: "What follows is an allegation made by players and reported by games press. Label it that way in your head and it stays useful."',
    'Fans: "The claim is boosting. Account-sharing. That the character was levelled and geared by other people, and he logged in on top of the finished work."',
    'Reporter: "The evidence they assembled is the ordinary evidence of any timesheet fraud, and it is not exotic. One: play sessions logged while he was documented elsewhere — posting, travelling, on a stage. Two: hours that do not fit in a day that also contains five companies. Three: the tell from the stream — not knowing his own build."',
    'Reporter (Closeup/Determined): "None of that is a confession. Any single item has an answer. All of it together is why the community stopped arguing about whether and started arguing about who."',
    'Narrator: "And then the part that actually settles the shape of it. Confronted, he did not deny that other people had played his accounts. In his own posts he acknowledged account-sharing — that others, including players in other timezones, had been on his characters — framing it as normal at the top of the ladder."',
    // Elon is off-stage here — the acting tag on the line does the work.
    'Elon (Pointing/Smug): "Everybody at the top shares accounts. It\'s a known thing. Anyway I\'m still better than you."',
    'Reporter: "Sir, \'someone else did the hours and I kept the ranking\' is not a defence. It is the allegation, agreed to."',
    'Narrator: "Note the shape, because you have seen it four times already in this chapter and you will see it again: dispute the count, attack the counter, then concede the thing quietly and keep the title. The ladder is a ledger. He was collecting rent on somebody else\'s grinding."',
    '[CHOICE]',
    '- "The question nobody asked him" -> el_poe_rogan',
    '- "Back to the God Gamer" -> el_poe_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'el_poe_rogan',
  name: 'God Gamer: The Question Not Asked',
  sceneType: 'WITNESS',
  dropId: dropId('elon_hq'),
  stage: [
    el('poer_e', 'elon_musk', 32, 62),
    el('poer_r', 'elon_reporter', 74, 62),
    balloon('poer_card', 'THREE HOURS. NO FOLLOW-UP.', 50, 20, { zIndex: 2 }),
  ],
  narraton: rn(45, 75),
  script: lines(
    'Narrator: "He is a repeat guest on the biggest podcast on Earth. Hours at a stretch, in a soft chair, in a room built for long answers — the format that could have got a real one."',
    'Elon: "I\'m a gamer. Genuinely one of the best in the world. People don\'t believe it."',
    'Narrator: "That is the moment. Right there, in the pause, is the easiest follow-up question in the history of interviewing: WHICH PART OF IT DID YOU PLAY?"',
    'Reporter: "Six words. No hostility required. He would have answered — he answers everything."',
    'Narrator: "It has not been put to him. Not on that show. As of this writing, the biggest interview real estate available to any human being has never once been used to ask the man about the smallest, most checkable lie he tells."',
    'Reporter (Closeup/Determined): "And that is not a failure of nerve. That is the product. Access journalism is a trade: you get the hours, he gets the absence of the question. Nobody signs anything. Everybody knows the terms."',
    'Elon: "Great conversation. Really substantive."',
    'Narrator: "Understand what the missing question funds. If you cannot ask him about a video game, you are never going to ask him about McGregor in June 2014, or the fine that got appealed toward four hundred and seventy-five dollars. The little unasked question is the audition for the big one."',
    '[CHOICE]',
    '- "X-ray the psyche" -> el_poe_psyche',
    '- "Back to the God Gamer" -> el_poe_hub',
    '[/CHOICE]',
  ),
  status: 'work',
});

scenes.push({
  id: 'el_poe_psyche',
  name: 'God Gamer: The X-Ray',
  sceneType: 'WITNESS',
  dropId: dropId('elon_bedroom_drop'),
  stage: [
    el('poep_e', 'elon_musk', 44, 62, 2.6),
    balloon('poep_card', 'X-RAY: WHY THIS ONE MATTERED TO HIM', 50, 18, { zIndex: 2 }),
    balloon('poep_screen', 'RANK: 20', 50, 92),
  ],
  narraton: rn(60, 55),
  script: lines(
    '[POSE poep_e pose=Sit expression=Angry]',
    'Narrator: "3am. Take the money out of the frame for a second and look at what is actually standing there."',
    'Narrator: "A man who can buy a rocket company, a car company, a social network and a slice of a government, and who cannot buy the one thing a game is FOR — the private knowledge that you did it yourself."',
    'Elon: "I could have done it. If I had the time, I\'d have done it easily."',
    'Narrator: "That is probably true, and it is the saddest sentence in the chapter. He didn\'t want to play. He wanted to have played. The hours are the whole product and the hours are the one thing that cannot be delegated, and he delegates everything, because delegating everything is how he got here."',
    '[SET_TEXT poep_screen "RANK: 20 — SOMEBODY ELSE\'S HOURS"]',
    'Elon (Neutral/Panicked): "It counts. It\'s my account. It\'s my name on the ladder."',
    'Narrator: "It is his name on the ladder. It is also his name on the rocket, and the car, and the tunnel, and the chatbot — none of which he personally welded, wrote, dug or trained. He has spent thirty years learning that the name on the thing IS the doing of the thing. The game is the one place that arithmetic breaks in public."',
    '[RANDOM]',
    'Narrator: "And he streamed it. That is the tell. A man who genuinely did the work does not need you watching him do it. He needed witnesses, at the top of the ladder, at three in the morning, with the richest bank balance in human history sitting there doing nothing for him at all."',
    '[OR]',
    'Narrator: "And he streamed it. Think about that. Not a private pleasure — a broadcast, an audience, a scoreboard. He was not playing a game. He was standing in a doorway holding up a report card, waiting for a room to say good job."',
    '[/RANDOM]',
    'Elon: "You people have no idea how hard I work."',
    'Narrator: "He does work. That is what makes it pitiable rather than funny. He works constantly, and it never once fills the hole, because the hole is not shaped like work. It is shaped like a specific person, a long time ago, saying you did well."',
    'Narrator: "No cheap laugh here. There is a boy in this somewhere who was told he was not enough, and there is nothing in a rocket, a ladder or a leaderboard that can go back and fix it. Money bought him every possible substitute and not one of them took."',
    'Narrator: "Which is the diagnosis, and here is the prescription this game actually believes in: the players caught it in two days. Not lawyers. Not regulators. Not the podcast. PLAYERS — unpaid, unimpressed, and expert, because they had done the hours he skipped."',
    'Narrator: "That is the good news the whole chapter runs on. Wealth can buy the claim. It cannot buy the tacit knowledge of the people who did the work — and those people are numerous, they are watching, and they compare notes for free."',
    '[BUTTON el_comic_godgamer]',
    'Narrator: "Doug Sharp drew this before the game did: ELON MUSK, GOD GAMER. Button, top of the stage, new tab."',
    '[CHOICE]',
    '- "Back to the God Gamer" -> el_poe_hub',
    '- "Back to the story" -> elon_feed',
    '- "Enter the Machine" -> el_machine',
    '[/CHOICE]',
  ),
  status: 'work',
});

const poeEnd = scenes.length;

// ---------------------------------------------------------------- game

const game = {
  info: {
    frame: 'flat',
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
    // Which build this is. Stamped, never hand-edited -- see scripts/stamp.mjs.
    ...buildStamp(),
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
  // The comic link. Shown with [BUTTON el_comic_godgamer] where Musk is
  // introduced (elon_feed) and at the end of the x-ray (el_poe_psyche);
  // pageUrl opens it in a new tab, targetSceneId deliberately omitted so
  // clicking it never moves the player off the scene they are reading.
  buttons: [
    {
      id: 'el_comic_godgamer',
      name: 'God Gamer comic',
      label: 'COMIC: GOD GAMER',
      x: 62, y: 3, width: 24, height: 8,
      pageUrl: 'https://dougsharpcomics.com/comic/elon-musk-god-gamer/',
      style: 'primary',
      note: 'Doug Sharp, dougsharpcomics.com — the Path of Exile cheating comic.',
      status: 'work',
    },
  ],
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
      sceneIds: scenes.slice(voicesSceneCount, expansionStart).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_duets',
      name: 'Duets',
      description: 'Seven two-handers: the three escalating interviews, the metrics meeting, the NDA, on-the-record negotiation, Elon versus his own feed, the organizing conversation, and the ratio. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(expansionStart, duetsEnd).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_aftermaths',
      name: 'Aftermaths',
      description: 'Four documented events — LeBlanc\'s death, the platform purchase, the Reuters investigation, the Diaz verdict — followed through that week, a year on, and the long view, from two perspectives each. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(duetsEnd, aftermathsEnd).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_record',
      name: 'The Record',
      description: 'Two drawers of uncovered files. Drawer one: the Worksafe study, the Reveal exposé and Tesla\'s denial, the CRD and EEOC suits, Trust & Safety\'s final meeting, the sink walk-in, the pay-package votes, Starbase at shift change, and the named testimony. Drawer two (the deep dive): the SEC settlement, the Agrawal and believers\' texts, DealBook, Tornetta and the Delaware escape, the Foundation math, the prestige machine, the taxonomy of the 600, the insulating layer, Cabada v. SpaceX, and the flagged 2025 file. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(aftermathsEnd, recordEnd).map((s) => s.id),
      status: 'work',
    },
    {
      id: 'ep_elon_godgamer',
      name: 'The God Gamer',
      description: 'The Path of Exile 2 affair: the claim of top-tier standing, the stream that did not survive contact with people who play, the boosting and account-sharing alleged by the community, the follow-up question the biggest podcast on Earth has never asked, and the x-ray — why a man with that much money needed to be seen as the best at a video game. Claims labelled claims; allegations labelled allegations. Narraton pool: elon_reactions.',
      sceneIds: scenes.slice(recordEnd, poeEnd).map((s) => s.id),
      status: 'work',
    },
  ],
};

const outPath = resolve(root, 'public', 'hvb-elon.json');
const json = JSON.stringify(game);
writeFileSync(outPath, json + '\n', 'utf8');
console.log(`Wrote ${outPath} (${(json.length / 1024 / 1024).toFixed(1)} MB, ${scenes.length} scenes [${storySceneCount} story + ${voicesSceneCount - storySceneCount} voices (${vignetteCount} vignettes) + ${machineSceneCount} machine + ${duetsEnd - expansionStart} duets + ${aftermathsEnd - duetsEnd} aftermaths + ${recordEnd - aftermathsEnd} record], ${drops.length} drops, ${game.actors.length} actors)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-elon.json');
