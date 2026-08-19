// Shared Machine core: the Georgist rig, panel, tick rules, witness
// pool, and tuning cockpit — used by build-machine-toy.mjs (the toy)
// and build-campaign.mjs (Humans vs Billionaires campaign scaffold).
//
// Everything tunable is a worldState variable. No hardcoded constants.

// ---------------------------------------------------------------- helpers

export const lines = (...xs) => xs.flat().join('\n');

export const balloon = (id, text, x, y, { scale = 1, zIndex = 2, rotation = 0 } = {}) => ({
  id,
  assetId: '',
  type: 'BALLOON',
  x, y, scale, zIndex, rotation,
  text,
  balloonType: 'SPEECH',
});

export const actorEl = (id, assetId, x, y, { scale = 1, zIndex = 3 } = {}) => ({
  id,
  assetId,
  type: 'ACTOR',
  x, y, scale, zIndex,
  rotation: 0,
});

// ---------------------------------------------------------------- world state

export const WORLD_BASE = {
  // Player levers (SLIDERs)
  greed: 50,
  speculation: 30,
  education: 20,
  regulation: 30,
  hierarchy: 50,
  repression: 20,
  singleTax: 0, // the lever: 0/1 snap slider

  // Simulation state
  productivity: 1.5,
  laborForce: 40,
  marginHeight: 100,
  product: 0,
  rent: 0,
  wages: 30,
  interest: 9,
  hoard: 0,
  prestige: 20,
  publicFund: 0,
  flareUps: 0,
  flareThreshold: 20,
  crisis: 0,
  wheelAngle: 0,
  crisisRoll: 0,
  commentaryTimer: 0,
  narratonGo: 0,

  // Campaign state (unused by the toy; harmless there)
  chapter: 0,
  collapseTimer: 0,
  reconTimer: 0,
  autopilot: 0, // 1 = the billionaire runs the machine himself

  // Coefficients — tune live in the tuning cockpit
  c_prodGrowth: 0.01,
  c_prodMax: 3,
  c_specMargin: 0.5,
  c_greedMargin: 0.3,
  c_regMargin: 0.2,
  c_taxMargin: 30,
  c_rentGreedDiv: 50,
  c_interestShare: 0.3,
  c_survivalFloor: 5,
  c_prestigeSpend: 0.2,
  c_eduPrestige: 0.005,
  c_repressionCost: 0.02,
  c_crisisSpecMin: 70,
  c_crisisChance: 0.05,
  c_taxRedirect: 0.9,
  c_fundMargin: 0.01,
  c_fundEdu: 0.005,
  c_flareBase: 20,
  c_flareHier: 0.3,
  c_flareEdu: 0.2,
  c_flareDiv: 4,
  c_wheelSpeed: 0.5,
  c_commentaryCooldown: 40,
  c_commentaryFlareMin: 3,
  c_collapseTicks: 40,
  c_reconTicks: 40,
  c_reconEduMin: 80,

  // Legacy carry-over between campaign chapters: how much of the
  // previous century survives the transition
  c_legacyHoard: 0.6,     // the fortune endures, diminished
  c_legacyPrestige: 0.7,  // the name still opens doors
  c_legacyEdu: 0.5,       // the humans forget — but not everything

  // Autopilot: how hard the billionaire drives when playing himself
  c_autoDrift: 1,
};

// Variables reset when a chapter (or the toy) starts fresh
export const SIM_RESET = {
  productivity: 1.5,
  marginHeight: 100,
  product: 0,
  rent: 0,
  wages: 30,
  interest: 9,
  hoard: 0,
  prestige: 20,
  publicFund: 0,
  flareUps: 0,
  crisis: 0,
  wheelAngle: 0,
  commentaryTimer: 0,
  collapseTimer: 0,
  reconTimer: 0,
  singleTax: 0,
};

export const setLines = (obj) =>
  Object.entries(obj).map(([k, v]) => `[SET ${k} = ${v}]`);

// ---------------------------------------------------------------- assets

export const ACTORS = [
  { id: 'billionaire', name: 'The Billionaire', graphics: [], status: 'work' },
  { id: 'human', name: 'Human', graphics: [], status: 'work' },
  { id: 'witness', name: 'Witness', graphics: [], status: 'work' },
  { id: 'narrator', name: 'Narrator', graphics: [], status: 'work' },
  { id: 'lieutenant', name: 'Lieutenant', graphics: [], status: 'work' },
];

export const SFX = [
  { id: 'electric_flare', name: 'Electric Flare', type: 'electric', category: 'ATTACH', params: { intensity: 70 }, status: 'work' },
  { id: 'flame_burn', name: 'Flame', type: 'flame', category: 'ATTACH', params: { intensity: 80 }, status: 'work' },
  { id: 'shake_all', name: 'Crisis Shake', type: 'shake', category: 'DO', params: { intensity: 70 }, status: 'work' },
  { id: 'gold_glow', name: 'Gold Glow', type: 'glow', category: 'ATTACH', params: { intensity: 60 }, status: 'work' },
];

// ---------------------------------------------------------------- the rig

export const machineStage = () => [
  // Billionaire tier (top)
  balloon('prestige_shell', 'PRESTIGE SHELL', 32, 14),
  actorEl('billionaire', 'billionaire', 45, 13, { scale: 1.2, zIndex: 4 }),
  balloon('hoard_reservoir', 'HOARD', 60, 14),

  // Middle mechanism
  balloon('production_wheel', 'PRODUCTION WHEEL', 38, 38),
  balloon('rent_siphon', 'RENT SIPHON', 56, 30),
  balloon('speculation_brake', 'SPECULATION BRAKE', 71, 38),
  balloon('wage_pipe', 'WAGE PIPE', 38, 55),
  balloon('interest_pipe', 'INTEREST PIPE', 56, 55),
  balloon('margin_floor', 'THE MARGIN', 47, 64, { zIndex: 1 }),

  // Human tier (bottom)
  ...[0, 1, 2, 3, 4, 5].map(i => actorEl(`human_${i + 1}`, 'human', 24 + i * 7, 82)),

  // News ticker (bottom strip; text driven by SET_TEXT from the tick)
  balloon('news_ticker', 'THE DAILY LEDGER', 45, 95, { zIndex: 5 }),
];

// panel modes:
//   'full'  — every lever on a slider (toy / sandbox)
//   'drama' — gauges + the Single Tax lever only; every other variable
//             moves through dramatic ORDERS scenes (campaign chapters)
export const panelLines = (mode = 'full') => [
  ...(mode === 'full' ? [
    '# --- Instrument panel: right = levers, left = readouts ---',
    '[SLIDER greed at 90,8 min=0 max=100 label="GREED"]',
    '[SLIDER speculation at 90,20 min=0 max=100 label="SPECULATION"]',
    '[SLIDER education at 90,32 min=0 max=100 label="EDUCATION"]',
    '[SLIDER regulation at 90,44 min=0 max=100 label="REGULATION"]',
    '[SLIDER hierarchy at 90,56 min=0 max=100 label="HIERARCHY"]',
    '[SLIDER repression at 90,68 min=0 max=100 label="REPRESSION"]',
    '[SLIDER singleTax at 90,82 min=0 max=1 step=1 label="SINGLE TAX"]',
  ] : [
    '# --- Drama panel: readouts + the lever; levers move via ORDERS ---',
    '[SLIDER singleTax at 90,82 min=0 max=1 step=1 label="SINGLE TAX"]',
  ]),
  '',
  '[GAUGE wages at 8,12 min=0 max=60 label="WAGES"]',
  '[GAUGE rent at 8,34 min=0 max=40 label="RENT"]',
  '[GAUGE marginHeight at 8,56 min=0 max=100 label="MARGIN"]',
  '[GAUGE hoard at 8,78 min=0 max=600 label="HOARD"]',
];

export const bindLines = () => [
  '# --- The rig: transforms driven by the economy ---',
  '[BIND production_wheel.rotation to wheelAngle]',
  '[BIND rent_siphon.rotation to clamp(rent * 2, 0, 75)]',
  '[BIND speculation_brake.y to 30 + speculation * 0.12]',
  '[BIND wage_pipe.scale to clamp(wages / 30, 0.3, 2.5)]',
  '[BIND interest_pipe.scale to clamp(interest / 10, 0.3, 2.5)]',
  '[BIND margin_floor.y to 78 - marginHeight * 0.14]',
  '[BIND hoard_reservoir.scale to clamp(0.6 + hoard / 300, 0.6, 3)]',
  '[BIND prestige_shell.opacity to 0.25 + prestige / 130]',
  '[BIND prestige_shell.scale to 0.8 + prestige / 120]',
];

// ---------------------------------------------------------------- tick sections

export const tickEcon = () => [
  '# progress raises productivity; education accelerates it',
  '[SET productivity = clamp(productivity + c_prodGrowth * (1 + education / 200), 0.5, c_prodMax)]',
  '',
  '# speculation and greed LOWER the margin; regulation and the single tax raise it',
  '[SET marginHeight = clamp(100 - speculation * c_specMargin - greed * c_greedMargin + regulation * c_regMargin + singleTax * c_taxMargin, 5, 100)]',
  '',
  '# product of labor (wages\' true source — anti-wage-fund)',
  '[SET product = laborForce * productivity * (marginHeight / 100)]',
  '',
  '# rent captures the gap between best land and the margin',
  '[SET rent = product * (1 - marginHeight / 100) * (greed / c_rentGreedDiv)]',
  '[IF singleTax == 1]',
  '[SET publicFund = publicFund + rent * c_taxRedirect]',
  '[SET rent = rent * (1 - c_taxRedirect)]',
  '[ENDIF]',
  '',
  '# wages and interest move together, squeezed by rent',
  '[SET wages = max(product - rent, c_survivalFloor)]',
  '[SET interest = wages * c_interestShare]',
  '',
  '# hoard and prestige',
  '[SET hoard = max(hoard + rent - repression * c_repressionCost - c_prestigeSpend, 0)]',
  '[SET prestige = clamp(prestige + c_prestigeSpend - education * c_eduPrestige, 0, 100)]',
  '',
  '# flare-ups: poverty past threshold; hierarchy raises tolerance, education lowers it',
  '[SET flareThreshold = c_flareBase + hierarchy * c_flareHier - education * c_flareEdu]',
  '[SET flareUps = clamp(floor((flareThreshold - wages) / c_flareDiv), 0, 6)]',
  '',
  '# crisis: speculative prices outrun production',
  '[SET crisisRoll = rand()]',
  '[IF speculation > c_crisisSpecMin]',
  '[IF crisisRoll < c_crisisChance]',
  '[SET crisis = 1]',
  '[SET product = product * 0.5]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF speculation <= c_crisisSpecMin]',
  '[SET crisis = 0]',
  '[ENDIF]',
  '',
  '# single tax feedback: the fund raises the margin and education',
  '[IF singleTax == 1]',
  '[SET marginHeight = clamp(marginHeight + publicFund * c_fundMargin, 5, 100)]',
  '[SET education = clamp(education + publicFund * c_fundEdu, 0, 100)]',
  '[ENDIF]',
  '',
  '# spin the wheel at product speed',
  '[SET wheelAngle = wheelAngle + product * c_wheelSpeed]',
];

export const tickEffects = () => {
  // Escalating distress: humans spark as flare-ups spread, then catch
  // fire two levels deeper. (Visual thresholds are presentation, not
  // economics, so they stay hardcoded.)
  const out = ['# flare-up visuals: distress sparks, deep distress burns'];
  for (let i = 1; i <= 6; i++) {
    out.push(
      `[IF flareUps >= ${i}]`,
      `[EFFECT electric_flare on human_${i}]`,
      '[ENDIF]',
      `[IF flareUps < ${i}]`,
      `[CLEAR_EFFECT electric_flare from human_${i}]`,
      '[ENDIF]',
      `[IF flareUps >= ${i + 2}]`,
      `[EFFECT flame_burn on human_${i}]`,
      '[ENDIF]',
      `[IF flareUps < ${i + 2}]`,
      `[CLEAR_EFFECT flame_burn from human_${i}]`,
      '[ENDIF]',
    );
  }
  out.push(
    '',
    '# the billionaire basks while the hoard grows',
    '[IF hoard > 100]',
    '[EFFECT gold_glow on billionaire]',
    '[ENDIF]',
    '[IF hoard <= 100]',
    '[CLEAR_EFFECT gold_glow from billionaire]',
    '[ENDIF]',
    '',
    '# crisis shakes the wheel; a vast hoard glows',
    '[IF crisis == 1]',
    '[EFFECT shake_all on production_wheel]',
    '[ENDIF]',
    '[IF crisis == 0]',
    '[CLEAR_EFFECT shake_all from production_wheel]',
    '[ENDIF]',
    '[IF hoard > 300]',
    '[EFFECT gold_glow on hoard_reservoir]',
    '[ENDIF]',
    '[IF hoard <= 300]',
    '[CLEAR_EFFECT gold_glow from hoard_reservoir]',
    '[ENDIF]',
  );
  return out;
};

// Live news readout: default status line first, then escalating
// overrides — the LAST matching SET_TEXT wins, so order = severity.
export const tickNews = () => [
  '# news ticker: the most dramatic true headline wins',
  '[SET_TEXT news_ticker "THE DAILY LEDGER — PRODUCT {product} · WAGES {wages} · RENT {rent}"]',
  '[IF hoard > 300]',
  '[SET_TEXT news_ticker "FORTUNE OF {hoard} — SOCIETY PAGES SWOON — WAGES {wages}"]',
  '[ENDIF]',
  '[IF wages <= c_survivalFloor + 2]',
  '[SET_TEXT news_ticker "WAGES AT SURVIVAL — {wages} — BREADLINES LENGTHEN"]',
  '[ENDIF]',
  '[IF flareUps >= 2]',
  '[SET_TEXT news_ticker "UNREST REPORTED — {flareUps} DISTRICTS RESTIVE — WAGES {wages}"]',
  '[ENDIF]',
  '[IF flareUps >= 4]',
  '[SET_TEXT news_ticker "UPRISINGS SPREAD — {flareUps} DISTRICTS BURNING"]',
  '[ENDIF]',
  '[IF singleTax == 1]',
  '[SET_TEXT news_ticker "SINGLE TAX IN EFFECT — PUBLIC FUND AT {publicFund} — MARGIN {marginHeight}"]',
  '[ENDIF]',
  '[IF crisis == 1]',
  '[SET_TEXT news_ticker "PANIC! SPECULATION OUTRUNS PRODUCTION — MARKETS SEIZE"]',
  '[ENDIF]',
];

// Autopilot: the billionaire plays himself — greed and speculation
// creep upward, repression follows unrest. Biased random walk.
export const tickAutopilot = () => [
  '# autopilot: the billionaire runs the machine',
  '[IF autopilot == 1]',
  '[SET greed = clamp(greed + c_autoDrift * (rand() - 0.35), 0, 100)]',
  '[SET speculation = clamp(speculation + c_autoDrift * (rand() - 0.4), 0, 100)]',
  '[IF flareUps >= 3]',
  '[SET repression = clamp(repression + c_autoDrift, 0, 100)]',
  '[ENDIF]',
  '[ENDIF]',
];

export const tickCommentary = (pool) => [
  '# Narraton commentary cadence',
  '[SET commentaryTimer = commentaryTimer + 1]',
  '[SET narratonGo = 0]',
  '[IF commentaryTimer > c_commentaryCooldown]',
  '[IF crisis == 1]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[IF flareUps >= c_commentaryFlareMin]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[IF singleTax == 1]',
  '[IF publicFund > 40]',
  '[SET narratonGo = 1]',
  '[ENDIF]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF narratonGo == 1]',
  '[SET commentaryTimer = 0]',
  `[NARRATON pool=${pool}]`,
  '[ENDIF]',
];

// Campaign win/lose checks. Last in the tick body so an ending wins the
// pass even if commentary fired earlier in it.
export const tickEndings = () => [
  '# COLLAPSE: wages pinned at survival with mass flare-ups, sustained',
  '[IF wages <= c_survivalFloor + 1]',
  '[IF flareUps >= 5]',
  '[SET collapseTimer = collapseTimer + 1]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF wages > c_survivalFloor + 1]',
  '[SET collapseTimer = 0]',
  '[ENDIF]',
  '[IF collapseTimer > c_collapseTicks]',
  '[SCENE ending_collapse]',
  '[ENDIF]',
  '',
  '# RECONSTITUTION: single tax held while education climbs, sustained',
  '[IF singleTax == 1]',
  '[IF education >= c_reconEduMin]',
  '[SET reconTimer = reconTimer + 1]',
  '[ENDIF]',
  '[ENDIF]',
  '[IF singleTax == 0]',
  '[SET reconTimer = 0]',
  '[ENDIF]',
  '[IF reconTimer > c_reconTicks]',
  '[SCENE ending_reconstitution]',
  '[ENDIF]',
];

// ---------------------------------------------------------------- machine hub

// A full machine scene: rig + panel + binds + ticking economy.
// opts: { id, name, pool, intro?: {gateVar, line}, endings?: boolean,
//         buttons?: string[] (always shown), ordersButton?: string
//         (shown only when autopilot is off), panel?: 'full'|'drama',
//         autopilot?: boolean (include the self-playing drift) }
export const machineHubScene = ({
  id, name, pool, intro, endings = false, buttons = [],
  ordersButton, panel = 'full', autopilot = false,
}) => ({
  id,
  name,
  sceneType: 'AGENCY',
  dropId: null,
  stage: machineStage(),
  script: lines(
    `# ============ ${name.toUpperCase()} — Georgist economy ============`,
    '# Every c_* coefficient is a worldState variable: tune live.',
    '',
    panelLines(panel),
    '',
    bindLines(),
    '',
    buttons.map(b => `[BUTTON ${b}]`),
    ordersButton ? [
      '# orders are for commanders, not spectators',
      '[IF autopilot == 0]',
      `[BUTTON ${ordersButton}]`,
      '[ENDIF]',
    ] : [],
    '',
    intro ? [
      `[IF ${intro.gateVar} == 0]`,
      `[SET ${intro.gateVar} = 1]`,
      `Narrator: "${intro.line}"`,
      '[ENDIF]',
    ] : [],
    '',
    '[TICK 500ms]',
    tickEcon(),
    '',
    ...(autopilot ? [tickAutopilot(), ''] : []),
    tickEffects(),
    '',
    tickNews(),
    '',
    tickCommentary(pool),
    ...(endings ? ['', tickEndings()] : []),
    '[/TICK]',
    '',
    '# hold the scene open: the machine never "ends" on its own',
    '[WAIT 999999s]',
  ),
  status: 'work',
});

// ---------------------------------------------------------------- witness pool

export const witnessScene = (id, name, narraton, returnTo, ...dialogue) => ({
  id,
  name,
  sceneType: 'WITNESS',
  dropId: null,
  stage: [actorEl('witness_figure', 'witness', 50, 60, { scale: 1.4 })],
  script: lines(...dialogue, `[SCENE ${returnTo}]`),
  narraton,
  status: 'work',
});

// The sandbox/toy commentary pool, keyed to economic states.
export const toyWitnessScenes = (returnTo, pool = 'witness') => [
  witnessScene(
    'witness_poverty', 'Witness: Poverty',
    { pool, keys: { wages: { target: 5, scale: 60 }, flareUps: { target: 5, scale: 6 } }, repeatable: true },
    returnTo,
    'Witness: "The margin has fallen to nothing. They work harder every year, and every year they are poorer."',
    'Witness: "Progress, they call it."',
  ),
  witnessScene(
    'witness_crisis', 'Witness: Crisis',
    { pool, requires: [{ variable: 'crisis', operator: '==', value: 1 }], keys: { speculation: { target: 95, scale: 100 } }, repeatable: true },
    returnTo,
    'Witness: "The speculators priced the land beyond what any labor could pay. Now the whole machine seizes."',
    'Witness: "They will call it a mystery. It is not a mystery."',
  ),
  witnessScene(
    'witness_complacency', 'Witness: Complacency',
    { pool, keys: { wages: { target: 40, scale: 60 }, flareUps: { target: 0, scale: 6 }, greed: { target: 15, scale: 100 } }, repeatable: true },
    returnTo,
    'Witness: "Wages hold. The humans are quiet. The machine hums."',
    'Witness: "Quiet is not the same as just. Watch what happens when the hand on the greed lever tires of moderation."',
  ),
  witnessScene(
    'witness_hoard', 'Witness: The Hoard',
    { pool, keys: { hoard: { target: 500, scale: 200 } }, repeatable: true },
    returnTo,
    'Witness: "Look at the reservoir. Every drop passed through hands that made something — and stuck to hands that made nothing."',
    'Witness: "Rent is the price of permission to exist somewhere."',
  ),
  witnessScene(
    'witness_margin_collapse', 'Witness: The Floor Falls',
    { pool, keys: { marginHeight: { target: 5, scale: 100 } }, repeatable: true },
    returnTo,
    'Witness: "The margin of production — the best land free labor can still reach — has sunk to the sea floor."',
    'Witness: "When the margin falls, wages fall with it. Everywhere. Always."',
  ),
  witnessScene(
    'witness_singletax', 'Witness: The Lever',
    { pool, requires: [{ variable: 'singleTax', operator: '==', value: 1 }], keys: { publicFund: { target: 60, scale: 60 } }, repeatable: false, weight: 2 },
    returnTo,
    'Witness: "Someone pulled the lever. Rent flows to the public fund now — the value the community creates, returned to the community."',
    'Witness: "Watch the margin rise. Watch the schools fill. This is the whole argument, moving."',
  ),
];

// ---------------------------------------------------------------- tuning cockpit

// Every tunable: [variable, label, min, max, step]
export const TUNING_SLIDERS = [
  // Column 1 — production & margin
  ['c_prodGrowth', 'PROD GROWTH', 0, 0.05, 0.002],
  ['c_prodMax', 'PROD MAX', 1, 6, 0.5],
  ['c_specMargin', 'SPEC>MARGIN', 0, 1, 0.05],
  ['c_greedMargin', 'GREED>MARGIN', 0, 1, 0.05],
  ['c_regMargin', 'REG>MARGIN', 0, 1, 0.05],
  ['c_taxMargin', 'TAX>MARGIN', 0, 60, 2],
  ['laborForce', 'LABOR FORCE', 5, 100, 5],
  ['c_survivalFloor', 'SURVIVAL FLR', 0, 20, 1],
  // Column 2 — rent, hoard, prestige
  ['c_rentGreedDiv', 'RENT DIV', 10, 200, 5],
  ['c_interestShare', 'INT SHARE', 0, 1, 0.05],
  ['c_prestigeSpend', 'PRSTG SPEND', 0, 2, 0.1],
  ['c_eduPrestige', 'EDU>PRSTG', 0, 0.05, 0.002],
  ['c_repressionCost', 'REPR COST', 0, 0.2, 0.01],
  ['c_taxRedirect', 'TAX REDIRECT', 0, 1, 0.05],
  ['c_fundMargin', 'FUND>MARGIN', 0, 0.05, 0.002],
  ['c_fundEdu', 'FUND>EDU', 0, 0.05, 0.002],
  // Column 3 — flares, crisis, pacing
  ['c_flareBase', 'FLARE BASE', 0, 50, 1],
  ['c_flareHier', 'HIER>FLARE', 0, 1, 0.05],
  ['c_flareEdu', 'EDU>FLARE', 0, 1, 0.05],
  ['c_flareDiv', 'FLARE DIV', 1, 10, 0.5],
  ['c_crisisSpecMin', 'CRISIS SPEC', 0, 100, 5],
  ['c_crisisChance', 'CRISIS ODDS', 0, 0.5, 0.01],
  ['c_commentaryCooldown', 'STORY CD', 0, 120, 5],
  ['c_commentaryFlareMin', 'STORY FLARES', 0, 6, 1],
  ['c_wheelSpeed', 'WHEEL SPEED', 0, 2, 0.1],
  ['c_legacyHoard', 'LGCY HOARD', 0, 1, 0.05],
  ['c_legacyPrestige', 'LGCY PRSTG', 0, 1, 0.05],
  ['c_legacyEdu', 'LGCY EDU', 0, 1, 0.05],
  ['c_autoDrift', 'AUTO DRIFT', 0, 5, 0.25],
  // Column 4 — the player levers, for context while tuning
  ['greed', 'GREED', 0, 100, 1],
  ['speculation', 'SPECULATION', 0, 100, 1],
  ['education', 'EDUCATION', 0, 100, 1],
  ['regulation', 'REGULATION', 0, 100, 1],
  ['hierarchy', 'HIERARCHY', 0, 100, 1],
  ['repression', 'REPRESSION', 0, 100, 1],
  ['singleTax', 'SINGLE TAX', 0, 1, 1],
];

// The tuning cockpit: every coefficient on a slider, live gauges on
// top, the economy still ticking underneath (no rig, no commentary).
// worldState persists across scenes, so tuned values carry back.
export const tuningScene = ({ id = 'machine_tuning', backButton }) => {
  const cols = [14, 38, 62, 86];
  const rows = [21, 30.5, 40, 49.5, 59, 68.5, 78, 87.5, 96];
  const sliderCmds = TUNING_SLIDERS.map(([variable, label, min, max, step], i) => {
    const x = cols[Math.floor(i / rows.length)];
    const y = rows[i % rows.length];
    const stepStr = step !== 1 ? ` step=${step}` : '';
    return `[SLIDER ${variable} at ${x},${y} min=${min} max=${max}${stepStr} label="${label}"]`;
  });

  return {
    id,
    name: 'Tuning Cockpit',
    sceneType: 'AGENCY',
    dropId: null,
    stage: [],
    script: lines(
      '# ============ TUNING COCKPIT ============',
      '# Every coefficient live. The economy keeps ticking while you turn',
      '# the dials; tuned values persist when you go back.',
      '',
      '[GAUGE wages at 14,8 min=0 max=60 label="WAGES"]',
      '[GAUGE rent at 32,8 min=0 max=40 label="RENT"]',
      '[GAUGE marginHeight at 50,8 min=0 max=100 label="MARGIN"]',
      '[GAUGE product at 68,8 min=0 max=150 label="PRODUCT"]',
      '[GAUGE hoard at 86,8 min=0 max=600 label="HOARD"]',
      '',
      sliderCmds,
      '',
      `[BUTTON ${backButton}]`,
      '',
      '[TICK 500ms]',
      tickEcon(),
      '[/TICK]',
      '',
      '[WAIT 999999s]',
    ),
    status: 'work',
  };
};
