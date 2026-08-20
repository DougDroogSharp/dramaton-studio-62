// The voice familiar.
//
// One interface, two engines behind it:
//   'browser'    — SpeechSynthesis. Free, offline, instant, everywhere.
//   'elevenlabs' — real voice acting. Needs a PAID plan; the free tier
//                  returns 402 for API text-to-speech.
//
// Browser speech is not voice acting, but it reads the show aloud
// today, which is what a player who cannot see the screen actually
// needs. When the paid backend arrives, nothing here changes except
// which engine answers.

export type SpeechEngine = 'browser' | 'elevenlabs' | 'off';

export interface VoiceStyle {
  /** Browser voice name substring to prefer, e.g. "Male", "George". */
  prefer?: string;
  /** 0.1–10, default 1. Lower = slower. */
  rate?: number;
  /** 0–2, default 1. */
  pitch?: number;
  /** 0–1. */
  volume?: number;
  /** ElevenLabs voice id, used when that engine is active. */
  elevenVoiceId?: string;
}

/** Distinct default styles so speakers do not all sound the same. */
export const NARRATOR_STYLE: VoiceStyle = { rate: 0.98, pitch: 0.92 };

const SPEAKER_STYLES: VoiceStyle[] = [
  { rate: 1.0,  pitch: 1.0 },
  { rate: 0.94, pitch: 0.78 },
  { rate: 1.08, pitch: 1.18 },
  { rate: 0.9,  pitch: 1.05 },
  { rate: 1.04, pitch: 0.86 },
  { rate: 0.97, pitch: 1.28 },
];

/** A stable style per speaker name, so a character sounds consistent. */
export function styleForSpeaker(name: string): VoiceStyle {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SPEAKER_STYLES[h % SPEAKER_STYLES.length];
}

export function browserSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Voices the browser can offer, once it has loaded them. */
export function listBrowserVoices(): SpeechSynthesisVoice[] {
  if (!browserSpeechAvailable()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Browser voice loading is asynchronous on most engines: getVoices()
 * returns [] until a voiceschanged event fires. Resolve either way.
 */
export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!browserSpeechAvailable()) return resolve([]);
    const have = window.speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    // Never hang if the event does not come.
    setTimeout(done, 1200);
  });
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Say a line. A new line cancels the one before it — the show has
 * moved on, and two voices over each other is worse than silence.
 */
export function speak(
  text: string,
  style: VoiceStyle = {},
  opts: { voiceName?: string } = {},
): void {
  if (!browserSpeechAvailable() || !text.trim()) return;
  stopSpeaking();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = style.rate ?? 1;
  u.pitch = style.pitch ?? 1;
  u.volume = style.volume ?? 1;

  const voices = window.speechSynthesis.getVoices();
  const wanted = opts.voiceName || style.prefer;
  if (wanted) {
    const hit = voices.find(v => v.name === wanted)
      || voices.find(v => v.name.toLowerCase().includes(wanted.toLowerCase()));
    if (hit) u.voice = hit;
  }

  currentUtterance = u;
  u.onend = () => { if (currentUtterance === u) currentUtterance = null; };
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (!browserSpeechAvailable()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return browserSpeechAvailable() && window.speechSynthesis.speaking;
}

// ------------------------------------------------------------------
// ElevenLabs backend — wired but dormant.
//
// The engine calls this the same way it calls browser speech; it only
// answers on a paid plan. Verified Aug 20 2026: a free-tier key
// authenticates but returns 402 "Free users cannot use library voices
// via the API" for /text-to-speech, and lacks voices_read. Nothing
// here is broken — it is waiting for a plan.

export interface ElevenLabsResult {
  ok: boolean;
  audio?: Blob;
  /** Human-readable reason when ok is false. */
  reason?: string;
}

export async function elevenLabsSpeak(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<ElevenLabsResult> {
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    });
    if (r.status === 402) {
      return { ok: false, reason: 'ElevenLabs API text-to-speech needs a paid plan.' };
    }
    if (!r.ok) {
      return { ok: false, reason: `ElevenLabs returned ${r.status}.` };
    }
    return { ok: true, audio: await r.blob() };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'network error' };
  }
}
