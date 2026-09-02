import { describe, it, expect, beforeEach, vi } from 'vitest';
import { voiceForSpeaker, styleForSpeaker, castableVoices } from '@/utils/speech';

// A believable Windows voice list: several English voices plus one
// that must never be cast for an English show.
const VOICES = [
  { name: 'Microsoft David - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Zira - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Mark - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Hazel - English (Great Britain)', lang: 'en-GB' },
  { name: 'Microsoft Paulina - Spanish (Mexico)', lang: 'es-MX' },
  // The one Doug heard: 'a whisper mixed with a bubbler'.
  { name: 'Microsoft Eva Mobile - English (United States)', lang: 'en-US' },
  { name: 'eSpeak English', lang: 'en-GB' },
];

describe('voice casting', () => {
  beforeEach(() => {
    vi.stubGlobal('speechSynthesis', { getVoices: () => VOICES });
    vi.stubGlobal('navigator', { language: 'en-US' });
  });

  it('casts only voices matching the page language', () => {
    const pool = castableVoices();
    expect(pool).toHaveLength(4);
    expect(pool.some(v => v.lang === 'es-MX')).toBe(false);
  });

  it('gives a speaker the same voice every time', () => {
    const a = voiceForSpeaker('Odo');
    const b = voiceForSpeaker('Odo');
    expect(a).not.toBeNull();
    expect(a?.name).toBe(b?.name);
  });

  it('gives different speakers different voices', () => {
    // The bug this closes: every character shared the browser default,
    // so the whole cast read in one voice.
    const names = ['William', 'Odo', 'Harold', 'Edith'];
    const assigned = new Set(names.map(n => voiceForSpeaker(n)?.name));
    expect(assigned.size).toBeGreaterThan(1);
  });

  it('tells speak() who is talking', () => {
    // rate/pitch alone cannot separate a cast -- Windows voices ignore
    // pitch -- so the speaker name has to reach speak() to pick a voice.
    expect(styleForSpeaker('William').speakerKey).toBe('William');
  });

  it('never casts a low-quality synthesizer', () => {
    // Windows ships legacy mobile-profile voices next to the good ones
    // and getVoices() gives no quality signal. One got cast into a role.
    const names = castableVoices().map(v => v.name);
    expect(names.some(n => /mobile/i.test(n))).toBe(false);
    expect(names.some(n => /espeak/i.test(n))).toBe(false);
  });

  it('speaks anyway if a bad voice is the only voice', () => {
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ name: 'eSpeak English', lang: 'en-GB' }] });
    expect(castableVoices()).toHaveLength(1);
  });

  it('survives a browser with no voices loaded yet', () => {
    vi.stubGlobal('speechSynthesis', { getVoices: () => [] });
    expect(castableVoices()).toEqual([]);
    expect(voiceForSpeaker('William')).toBeNull();
  });
});
