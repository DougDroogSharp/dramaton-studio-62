// Bake spoken lines to audio files.
//
// The games never call a model while someone is playing. Voice is a
// PRODUCTION tool: this walks a game's script, generates each line once,
// and writes an mp3 to disk. The shipped game plays files.
//
// Re-runnable and idempotent. A line is keyed by sha256(voiceId|model|text),
// so re-running after editing three lines pays for three lines. Nothing
// already on disk is ever regenerated or re-billed.
//
//   node scripts/bake-voice.mjs --game public/hvb-william.json --who narrator
//   node scripts/bake-voice.mjs --game public/hvb-william.json --who all
//   node scripts/bake-voice.mjs --game ... --dry-run       # cost, spends nothing
//   node scripts/bake-voice.mjs --game ... --limit 5       # audition first
//
// Voices come from voices.json at the repo root (see VOICES below).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = 'public/voice';
const MODEL = 'eleven_multilingual_v2';
const RATE_PER_100K = 22; // Creator tier, for the cost estimate only

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const gamePath = arg('game');
const who = (arg('who', 'narrator') || 'narrator').toLowerCase();
const limit = Number(arg('limit', '0')) || 0;
const dryRun = has('dry-run');

if (!gamePath) {
  console.error('usage: node scripts/bake-voice.mjs --game public/hvb-william.json [--who narrator|all] [--limit N] [--dry-run]');
  process.exit(1);
}

// -------------------------------------------------------------- voices
// Who speaks with which voice. Add a name here to cast them.
const VOICES_FILE = 'voices.json';
let VOICES = { narrator: '2rLZ6kYWubjDAt3zAF96' }; // Droog
if (fs.existsSync(VOICES_FILE)) {
  VOICES = { ...VOICES, ...JSON.parse(fs.readFileSync(VOICES_FILE, 'utf8')) };
}

// ----------------------------------------------------------------- key
function apiKey() {
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/ELEVENLABS_API_KEY\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return process.env.ELEVENLABS_API_KEY || '';
}

// --------------------------------------------------------- collect work
// Dialogue lines look like:   Narrator: "text"
const LINE = /^\s*([A-Za-z_][\w '-]*?)\s*:\s*"([^"]*)"/;

const game = JSON.parse(fs.readFileSync(gamePath, 'utf8'));
const seen = new Set();
const work = [];

for (const scene of game.scenes ?? []) {
  if (!scene.script) continue;
  for (const raw of scene.script.split('\n')) {
    const m = raw.match(LINE);
    if (!m) continue;
    const speaker = m[1].trim();
    const text = m[2].trim();
    if (!text) continue;

    const key = speaker.toLowerCase();
    if (who === 'narrator' && key !== 'narrator') continue;

    const voiceId = VOICES[key];
    if (!voiceId) {
      if (who !== 'narrator') console.warn(`  no voice cast for "${speaker}" — skipped`);
      continue;
    }

    // Same line twice in a game is one file and one payment.
    const hash = crypto.createHash('sha256').update(`${voiceId}|${MODEL}|${text}`).digest('hex');
    if (seen.has(hash)) continue;
    seen.add(hash);

    work.push({ hash, text, speaker, voiceId, sceneId: scene.id });
  }
}

// Anything already on disk is done. This is what makes re-runs cheap.
fs.mkdirSync(OUT_DIR, { recursive: true });
const todo = work.filter(w => !fs.existsSync(path.join(OUT_DIR, `${w.hash}.mp3`)));
const already = work.length - todo.length;
const chars = todo.reduce((n, w) => n + w.text.length, 0);

console.log(`game      ${gamePath}`);
console.log(`speakers  ${who}`);
console.log(`lines     ${work.length} unique  (${already} already baked, ${todo.length} to do)`);
console.log(`chars     ${chars.toLocaleString()}`);
console.log(`est cost  $${(chars / 100000 * RATE_PER_100K).toFixed(2)}  at $${RATE_PER_100K}/100k`);

if (dryRun) { console.log('\n--dry-run: nothing generated, nothing billed.'); process.exit(0); }
if (todo.length === 0) { console.log('\nNothing to do — every line is already on disk.'); process.exit(0); }

const key = apiKey();
if (!key) { console.error('\nNo ELEVENLABS_API_KEY found in .env.local'); process.exit(1); }

// ------------------------------------------------------------- generate
const batch = limit > 0 ? todo.slice(0, limit) : todo;
if (limit > 0) console.log(`\n--limit ${limit}: generating the first ${batch.length} only.`);

const manifest = {};
const manifestPath = path.join(OUT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) Object.assign(manifest, JSON.parse(fs.readFileSync(manifestPath, 'utf8')));

let done = 0, failed = 0, spentChars = 0;
for (const w of batch) {
  const file = path.join(OUT_DIR, `${w.hash}.mp3`);
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${w.voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: w.text, model_id: MODEL }),
    });
    if (!res.ok) {
      failed++;
      console.error(`  FAIL ${res.status}  ${w.speaker}: ${w.text.slice(0, 55)}`);
      // 401/402 will not fix themselves; stop rather than burn the list.
      if (res.status === 401 || res.status === 402) {
        console.error(`  ${(await res.text()).slice(0, 200)}`);
        console.error('\nStopping: this is an account or key problem, not a bad line.');
        break;
      }
      continue;
    }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    manifest[w.hash] = { text: w.text, speaker: w.speaker, voiceId: w.voiceId, scene: w.sceneId };
    done++; spentChars += w.text.length;
    if (done % 10 === 0 || done === batch.length) {
      process.stdout.write(`  ${done}/${batch.length}  ($${(spentChars / 100000 * RATE_PER_100K).toFixed(2)})\r`);
    }
  } catch (e) {
    failed++;
    console.error(`  ERROR ${w.speaker}: ${e.message}`);
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n\nbaked   ${done}`);
if (failed) console.log(`failed  ${failed}`);
console.log(`chars   ${spentChars.toLocaleString()}   ~$${(spentChars / 100000 * RATE_PER_100K).toFixed(2)}`);
console.log(`files   ${OUT_DIR}/  (manifest.json maps hash -> line)`);
