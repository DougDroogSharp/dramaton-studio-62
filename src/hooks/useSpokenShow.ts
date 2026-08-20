import { useEffect, useRef, useCallback } from 'react';
import { speak, stopSpeaking, styleForSpeaker, NARRATOR_STYLE, VoiceStyle } from '@/utils/speech';
import { loadBakedVoices, bakedUrlFor, playBaked, stopBaked } from '@/utils/bakedVoice';
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
  // Speech is part of the show, not an accessibility extra.
  //
  // This used to require presentation === 'sound' || describeAction — so a
  // player who chose "Play it as it comes" got silence, even though that
  // option's own description promises "Balloons, sound, and normal pacing".
  // Voice was only granted to players who declared they could not see.
  // That is backwards: the show speaks by default, and the mute button is
  // how anyone turns it off. Only 'visual' — captions instead of audio,
  // deliberately chosen — stays silent.
  const wanted = active && !muted && ability.presentation !== 'visual';

  // The manifest of recorded lines. Loaded once, on the first line that
  // wants speaking, so a game with no baked audio pays nothing for it.
  useEffect(() => { if (wanted) void loadBakedVoices(); }, [wanted]);

  // One decision, in one place: play the RECORDING if this exact line
  // was baked, and fall back to the synthesizer if it was not. A line
  // Doug has since edited will not match, so it speaks in the cheap
  // voice until the bake is re-run -- which is the honest signal that
  // it needs re-voicing, and never stale audio under new words.
  const say = useCallback((speaker: string, text: string, style: VoiceStyle, voiceName?: string) => {
    const recorded = bakedUrlFor(speaker, text);
    if (recorded) {
      stopSpeaking();
      playBaked(recorded);
      return;
    }
    stopBaked();
    speak(text, style, { voiceName });
  }, []);

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
      say('narrator', dialogue.text, NARRATOR_STYLE, narratorVoice);
    } else {
      // Say who is speaking, then what they said — a listener cannot
      // see the balloon or its colour.
      const recorded = bakedUrlFor(dialogue.actorName, dialogue.text);
      if (recorded) {
        stopSpeaking();
        playBaked(recorded);
      } else {
        stopBaked();
        speak(
          `${dialogue.actorName}. ${dialogue.text}`,
          styleForSpeaker(dialogue.actorName),
        );
      }
    }
  }, [wanted, dialogue, narratorVoice]);

  // Ambient narration from a running simulation
  useEffect(() => {
    if (!wanted || !ambient) return;
    if (lastAmbient.current === ambient.id) return;
    lastAmbient.current = ambient.id;
    say('narrator', ambient.text, NARRATOR_STYLE, narratorVoice);
  }, [wanted, ambient, narratorVoice, say]);

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
    if (!wanted) { stopSpeaking(); stopBaked(); }
  }, [wanted]);

  useEffect(() => () => { stopSpeaking(); stopBaked(); }, []);
}
