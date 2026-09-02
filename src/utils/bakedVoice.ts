// Play the voice that was recorded, not a synthesizer imitating it.
//
// scripts/bake-voice.mjs writes one mp3 per line to public/voice/, named
// by sha256(voiceId|model|text), plus a manifest mapping those hashes
// back to the lines. This module is the read side: given a line of
// dialogue, hand back the file that says it.
//
// The lookup is by TEXT, not by hash, so the browser never has to
// compute sha256 — the manifest already holds the answer. Which also
// gives the re-voice rule for free: change a line and its text no longer
// matches any entry, so it falls through to browser speech until the
// bake is run again. Stale audio never plays under new words.
//
// This is the whole no-AI-at-play-time contract in one file: the show
// plays FILES. Nothing here calls a model, needs a key, or touches the
// network beyond fetching audio the game ships with.

interface ManifestEntry {
  text: string;
  speaker: string;
  voiceId: string;
  scene?: string;
}

// OFF for now. Doug, 20 Aug: "no more droog voice. will think about full
// voicing later." The 274 recordings and the whole read path stay exactly
// where they are; flip this to true and the show speaks in his voice
// again. Nothing else needs changing.
const BAKED_VOICE_ENABLED = false;

let index: Map<string, string> | null = null;
let loading: Promise<Map<string, string>> | null = null;

/** Trim and collapse whitespace so trivial edits still match. */
function key(speaker: string, text: string): string {
  return `${speaker.trim().toLowerCase()}|${text.trim().replace(/\s+/g, ' ')}`;
}

/**
 * Load the manifest once. A game with no baked audio yields an empty
 * index and every caller quietly falls back to browser speech — a
 * missing manifest is a normal state, not an error.
 */
export function loadBakedVoices(): Promise<Map<string, string>> {
  if (!BAKED_VOICE_ENABLED) { index = new Map(); return Promise.resolve(index); }
  if (index) return Promise.resolve(index);
  if (loading) return loading;

  loading = fetch('/voice/manifest.json')
    .then(r => (r.ok ? r.json() : {}))
    .then((data: Record<string, ManifestEntry>) => {
      const m = new Map<string, string>();
      for (const [hash, entry] of Object.entries(data)) {
        if (entry?.text) m.set(key(entry.speaker ?? 'narrator', entry.text), hash);
      }
      index = m;
      return m;
    })
    .catch(() => {
      index = new Map();
      return index;
    });

  return loading;
}

/** The recorded file for a line, or null if this line was never baked. */
export function bakedUrlFor(speaker: string, text: string): string | null {
  if (!BAKED_VOICE_ENABLED) return null;
  if (!index) return null; // not loaded yet; caller falls back this once
  const hash = index.get(key(speaker, text));
  return hash ? `/voice/${hash}.mp3` : null;
}

// ---------------------------------------------------------------------
// Playback owns exactly one clip at a time.
//
// The same rule the theater's other audio had to learn today: a handle
// you drop on the floor is a sound you cannot stop. Two lines talking
// over each other is worse than a line arriving late.

let current: HTMLAudioElement | null = null;

export function playBaked(url: string, onEnded?: () => void): HTMLAudioElement {
  stopBaked();
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener('ended', () => {
    if (current === audio) current = null;
    onEnded?.();
  }, { once: true });
  // A browser that refuses autoplay before a user gesture is not an
  // error worth logging on every line; the show simply reads silently
  // until the player touches something.
  void audio.play().catch(() => {});
  return audio;
}

export function stopBaked(): void {
  if (!current) return;
  current.pause();
  current.src = '';
  current = null;
}

export function isBakedPlaying(): boolean {
  return !!current && !current.paused;
}
