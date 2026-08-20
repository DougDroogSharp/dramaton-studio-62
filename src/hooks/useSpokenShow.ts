import { useEffect, useRef } from 'react';
import { speak, stopSpeaking, styleForSpeaker, NARRATOR_STYLE } from '@/utils/speech';
import { ActiveDialogue } from './useScriptRunner';
import { AbilitySettings } from '@/utils/accessibility';

// Reads the show aloud.
//
// Speaks a line ONCE when it arrives, never re-speaking the same line
// on an unrelated re-render — which is the bug that makes text-to-
// speech unbearable. Each speaker keeps a consistent voice; the
// narrator has their own, choosable.

interface SpokenShowOptions {
  dialogue: ActiveDialogue | null;
  /** [NARRATE] and other ambient lines. */
  ambient: { text: string; id: number } | null;
  /** The current choice list, read out when it appears. */
  choices?: { text: string }[] | null;
  ability: AbilitySettings;
  muted: boolean;
  /** Player's chosen narrator voice name, if any. */
  narratorVoice?: string;
  /** Whether the show has started; nothing speaks on the title card. */
  active: boolean;
}

export function useSpokenShow({
  dialogue,
  ambient,
  choices,
  ability,
  muted,
  narratorVoice,
  active,
}: SpokenShowOptions) {
  // Speech is on when the player is relying on audio at all.
  const wanted = active && !muted &&
    (ability.presentation === 'sound' || ability.describeAction);

  // Track what has already been spoken so a re-render is silent.
  const lastDialogue = useRef<string | null>(null);
  const lastAmbient = useRef<number | null>(null);
  const lastChoices = useRef<string | null>(null);

  // Dialogue and narration
  useEffect(() => {
    if (!wanted || !dialogue) return;
    // Wait for the full line: speaking a half-typed sentence is worse
    // than waiting a beat for it.
    if (!dialogue.isComplete) return;
    const key = `${dialogue.actorName}|${dialogue.text}`;
    if (lastDialogue.current === key) return;
    lastDialogue.current = key;

    const isNarrator = dialogue.actorName.trim().toLowerCase() === 'narrator';
    if (isNarrator) {
      speak(dialogue.text, NARRATOR_STYLE, { voiceName: narratorVoice });
    } else {
      // Say who is speaking, then what they said — a listener cannot
      // see the balloon or its colour.
      speak(
        `${dialogue.actorName}. ${dialogue.text}`,
        styleForSpeaker(dialogue.actorName),
      );
    }
  }, [wanted, dialogue, narratorVoice]);

  // Ambient narration from a running simulation
  useEffect(() => {
    if (!wanted || !ambient) return;
    if (lastAmbient.current === ambient.id) return;
    lastAmbient.current = ambient.id;
    speak(ambient.text, NARRATOR_STYLE, { voiceName: narratorVoice });
  }, [wanted, ambient, narratorVoice]);

  // Choices, read out when they appear
  useEffect(() => {
    if (!wanted || !choices || choices.length === 0) return;
    const key = choices.map(c => c.text).join('|');
    if (lastChoices.current === key) return;
    lastChoices.current = key;
    const spoken = choices.length === 1
      ? choices[0].text
      : `Choose. ${choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}`;
    speak(spoken, NARRATOR_STYLE, { voiceName: narratorVoice });
  }, [wanted, choices, narratorVoice]);

  // Going quiet — muting, leaving, or turning speech off — stops the
  // voice immediately rather than letting it finish into an empty room.
  useEffect(() => {
    if (!wanted) stopSpeaking();
  }, [wanted]);

  useEffect(() => () => stopSpeaking(), []);
}
