import React from 'react';
import { Volume2, Type, Wind, Timer, Radar, Frame } from 'lucide-react';
import { AbilitySettings } from '@/utils/accessibility';

// The adjustments worth reaching for MID-SCENE, on the cabinet itself.
//
// The settings drawer already holds everything. But a player who finds
// the text too fast, or the motion unpleasant, or who needs the show to
// speak, should not have to stop, open a drawer, read a list, and find
// the right control while the scene waits. These six are the ones you
// change because of something happening right now, so they live on the
// frame where a thumb can reach them.
//
// Each is a toggle with a visible pressed state and a real label, so
// this is a row of five switches to a screen reader too, not five
// mystery glyphs.

interface AbilityBarProps {
  settings: AbilitySettings;
  onChange: (next: AbilitySettings) => void;
  /** Small caps colour from the cabinet skin. */
  labelClass?: string;
}

export const AbilityBar: React.FC<AbilityBarProps> = ({ settings, onChange, labelClass = '' }) => {
  const set = (patch: Partial<AbilitySettings>) => onChange({ ...settings, ...patch });

  const controls = [
    {
      key: 'speak',
      icon: Volume2,
      label: 'Read aloud',
      on: settings.presentation !== 'visual',
      hint: 'Speak every line',
      toggle: () => set({ presentation: settings.presentation === 'visual' ? 'both' : 'visual' }),
    },
    {
      key: 'text',
      icon: Type,
      label: 'Whole lines',
      on: settings.textSpeed === 0,
      hint: 'Show text at once instead of typing it out',
      // 100 cps is the authored default; 0 means "appear complete".
      toggle: () => set({ textSpeed: settings.textSpeed === 0 ? 100 : 0 }),
    },
    {
      key: 'motion',
      icon: Wind,
      label: 'Less motion',
      on: settings.reduceMotion,
      hint: 'Actors and camera settle instantly',
      toggle: () => set({ reduceMotion: !settings.reduceMotion }),
    },
    {
      key: 'time',
      icon: Timer,
      label: 'No timers',
      on: settings.noTimeLimits,
      hint: 'Nothing is ever taken away from you on a clock',
      toggle: () => set({ noTimeLimits: !settings.noTimeLimits }),
    },
    {
      key: 'bezel',
      icon: Frame,
      label: 'Bezel',
      on: settings.showBezel,
      hint: 'The jewelled case. Off gives the picture more room',
      toggle: () => set({ showBezel: !settings.showBezel }),
    },
    {
      key: 'scan',
      icon: Radar,
      label: 'Scanning',
      on: settings.scanChoices,
      hint: 'Choices cycle by themselves; any key takes the highlighted one',
      toggle: () => set({ scanChoices: !settings.scanChoices, noTimeLimits: true }),
    },
  ] as const;

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      role="group"
      aria-label="How you play — change any of this mid-scene"
    >
      {controls.map(c => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            onClick={c.toggle}
            aria-pressed={c.on}
            title={`${c.label} — ${c.hint}`}
            className={`
              flex items-center gap-1.5 px-2 py-1 border text-[10px] uppercase tracking-wider
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold
              ${c.on
                ? 'border-current opacity-100 font-bold'
                : 'border-current/25 opacity-55 hover:opacity-90 hover:border-current/60'}
              ${labelClass}
            `}
          >
            <Icon size={13} aria-hidden="true" />
            <span className="hidden sm:inline">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
};
