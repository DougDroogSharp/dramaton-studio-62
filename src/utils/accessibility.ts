// Ability settings — the player describes what they need, and the
// engine adapts. Not a pile of toggles bolted on at the end: the
// runner reads these while it executes, so pacing, timing and motion
// change at the source.
//
// Persisted per-browser, shared across every game.

/** How the words reach the player. 'sound' drops the balloons and
 *  captions entirely and carries everything by voice; 'visual' is the
 *  silent reading experience; 'both' shows and speaks. */
export type PresentationMode = 'both' | 'sound' | 'visual';

export interface AbilitySettings {
  /** Balloons and captions, voice, or both. */
  presentation: PresentationMode;
  /** WCAG 2.2.1 Timing Adjustable: timed choices never expire. */
  noTimeLimits: boolean;
  /** WCAG 2.3.3 Animation from Interactions: camera moves, tweens and
   *  walk-cycle flipping resolve instantly instead of animating. */
  reduceMotion: boolean;
  /** Characters per second for narration typewriter. 0 = instant. */
  textSpeed: number;
  /** How long a [NARRATE] line stays up, as a multiplier on its
   *  scripted duration. Readers who need longer raise this. */
  readingTime: number;
  /** Announce stage action ("Capone walks to the bar stool") as well as
   *  speech — audio description for players who cannot see the stage. */
  describeAction: boolean;
  /** Choices cycle one at a time and are taken with a single input
   *  (key, switch, sound, blink) rather than requiring pointer or
   *  number keys. */
  scanChoices: boolean;
  /** Seconds each option is held during scanning. */
  scanSeconds: number;
  /** Browser voice name for the narrator; empty = the system default. */
  narratorVoice?: string;
}

export const DEFAULT_ABILITY_SETTINGS: AbilitySettings = {
  presentation: 'both',
  noTimeLimits: false,
  reduceMotion: false,
  textSpeed: 100,
  readingTime: 1,
  describeAction: false,
  scanChoices: false,
  scanSeconds: 3,
};

const STORAGE_KEY = 'dramaton.ability';

/** Respect the OS-level motion preference as the initial default. */
export function systemDefaults(): AbilitySettings {
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { ...DEFAULT_ABILITY_SETTINGS, reduceMotion: prefersReduced };
}

export function loadAbilitySettings(): AbilitySettings {
  const base = systemDefaults();
  if (typeof localStorage === 'undefined') return base;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<AbilitySettings>;
    // Merge field by field so a setting added later gets its default
    // instead of undefined.
    return {
      presentation: saved.presentation === 'sound' || saved.presentation === 'visual' ? saved.presentation : base.presentation,
      noTimeLimits: saved.noTimeLimits ?? base.noTimeLimits,
      reduceMotion: saved.reduceMotion ?? base.reduceMotion,
      textSpeed: typeof saved.textSpeed === 'number' ? saved.textSpeed : base.textSpeed,
      readingTime: typeof saved.readingTime === 'number' ? saved.readingTime : base.readingTime,
      describeAction: saved.describeAction ?? base.describeAction,
      scanChoices: saved.scanChoices ?? base.scanChoices,
      scanSeconds: typeof saved.scanSeconds === 'number' ? saved.scanSeconds : base.scanSeconds,
      narratorVoice: typeof saved.narratorVoice === 'string' ? saved.narratorVoice : base.narratorVoice,
    };
  } catch {
    return base;
  }
}

const ONBOARDED_KEY = 'dramaton.ability.onboarded';

/** Has this player been through the "how do you want to play?" screen? */
export function hasOnboarded(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* storage disabled — they'll simply see it again */
  }
}

export function saveAbilitySettings(settings: AbilitySettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage disabled — settings just won't persist */
  }
}

// ---------------------------------------------------------------- presets
// Players describe a need in their own terms; each preset is a
// starting point they can then adjust. Ordered from most to least
// commonly needed.

export interface AbilityPreset {
  id: string;
  need: string;        // in the player's words
  detail: string;      // what changes
  apply: (s: AbilitySettings) => AbilitySettings;
}

export const ABILITY_PRESETS: AbilityPreset[] = [
  {
    id: 'blind',
    need: "I can't see the screen",
    detail: 'Describes the action aloud, never expires a choice, reads options one at a time for a single keypress.',
    apply: s => ({ ...s, presentation: 'sound', describeAction: true, noTimeLimits: true, scanChoices: true, textSpeed: 0, readingTime: 1.5 }),
  },
  {
    id: 'low-vision',
    need: 'I have trouble seeing detail',
    detail: 'Describes the action aloud and gives you longer to read.',
    apply: s => ({ ...s, describeAction: true, readingTime: 2, noTimeLimits: true }),
  },
  {
    id: 'time',
    need: 'I need more time',
    detail: 'Nothing is ever timed, text appears at once, lines stay up twice as long.',
    apply: s => ({ ...s, noTimeLimits: true, textSpeed: 0, readingTime: 2 }),
  },
  {
    id: 'motion',
    need: 'Motion makes me unwell',
    detail: 'Camera moves, zooms and animations settle instantly.',
    apply: s => ({ ...s, reduceMotion: true }),
  },
  {
    id: 'switch',
    need: 'I use one switch, key, or sound to act',
    detail: 'Choices cycle by themselves; one input takes the highlighted one.',
    apply: s => ({ ...s, scanChoices: true, noTimeLimits: true }),
  },
  {
    id: 'reading',
    need: 'Reading is hard for me',
    detail: 'Text appears whole rather than typing out, and stays up longer.',
    apply: s => ({ ...s, textSpeed: 0, readingTime: 2, noTimeLimits: true }),
  },
];
