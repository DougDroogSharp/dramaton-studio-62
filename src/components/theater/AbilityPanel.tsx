import React from 'react';
import {
  AbilitySettings,
  ABILITY_PRESETS,
  DEFAULT_ABILITY_SETTINGS,
} from '@/utils/accessibility';

// The player says what they need; the engine adapts. Presets come
// first and are written in the player's words, not the engine's —
// the individual switches below are for adjusting afterwards, not for
// making people assemble their own accommodation from parts.

interface AbilityPanelProps {
  settings: AbilitySettings;
  onChange: (next: AbilitySettings) => void;
}

const Toggle: React.FC<{
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}> = ({ label, hint, on, onToggle }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="text-diesel-paper text-sm">
      {label}
      <span className="block text-diesel-steel text-xs mt-0.5">{hint}</span>
    </span>
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`shrink-0 px-3 py-1.5 border text-xs uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold ${
        on ? 'border-diesel-green text-diesel-green' : 'border-diesel-steel text-diesel-steel'
      }`}
    >
      {on ? 'On' : 'Off'}
    </button>
  </div>
);

export const AbilityPanel: React.FC<AbilityPanelProps> = ({ settings, onChange }) => {
  const set = (patch: Partial<AbilitySettings>) => onChange({ ...settings, ...patch });

  return (
    <section aria-label="Ability settings">
      <h3 className="text-diesel-gold text-sm uppercase tracking-widest mb-1">
        What do you need?
      </h3>
      <p className="text-diesel-steel text-xs mb-3">
        Pick anything that fits. You can change it any time, and adjust the details below.
      </p>

      <div className="space-y-1.5 mb-5">
        {ABILITY_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.apply(settings))}
            className="w-full text-left px-3 py-2 border border-diesel-border hover:border-diesel-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold transition-colors"
          >
            <span className="block text-diesel-paper text-sm">{preset.need}</span>
            <span className="block text-diesel-steel text-xs mt-0.5">{preset.detail}</span>
          </button>
        ))}
      </div>

      <h3 className="text-diesel-gold text-sm uppercase tracking-widest mb-2">Details</h3>

      <div className="py-2">
        <span className="block text-diesel-paper text-sm">How you follow the story</span>
        <span className="block text-diesel-steel text-xs mt-0.5 mb-2">
          Sound only hides the balloons and captions and carries everything by voice.
        </span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="How you follow the story">
          {([
            ['both', 'Both'],
            ['sound', 'Sound only'],
            ['visual', 'Text only'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              role="radio"
              aria-checked={settings.presentation === mode}
              onClick={() => set({ presentation: mode })}
              className={`flex-1 px-2 py-1.5 border text-xs uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold ${
                settings.presentation === mode
                  ? 'border-diesel-gold text-diesel-gold'
                  : 'border-diesel-steel text-diesel-steel'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-diesel-border/50">
        <Toggle
          label="Never run out of time"
          hint="No choice expires on its own."
          on={settings.noTimeLimits}
          onToggle={() => set({ noTimeLimits: !settings.noTimeLimits })}
        />
        <Toggle
          label="Describe the action aloud"
          hint="Announces what happens on stage, not just what is said."
          on={settings.describeAction}
          onToggle={() => set({ describeAction: !settings.describeAction })}
        />
        <Toggle
          label="Reduce motion"
          hint="Camera moves and animations settle instantly."
          on={settings.reduceMotion}
          onToggle={() => set({ reduceMotion: !settings.reduceMotion })}
        />
        <Toggle
          label="Show text all at once"
          hint="No typing-out effect."
          on={settings.textSpeed <= 0}
          onToggle={() => set({ textSpeed: settings.textSpeed <= 0 ? 100 : 0 })}
        />
        <Toggle
          label="Cycle through choices"
          hint="Options highlight one at a time; any key or click takes the highlighted one."
          on={settings.scanChoices}
          onToggle={() => set({ scanChoices: !settings.scanChoices })}
        />

        <div className="py-3">
          <label htmlFor="reading-time" className="block text-diesel-paper text-sm">
            Reading time
            <span className="block text-diesel-steel text-xs mt-0.5">
              How long narration stays up — {settings.readingTime}&times; normal
            </span>
          </label>
          <input
            id="reading-time"
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={settings.readingTime}
            onChange={e => set({ readingTime: Number(e.target.value) })}
            className="w-full mt-2 accent-diesel-gold"
          />
        </div>

        {settings.scanChoices && (
          <div className="py-3">
            <label htmlFor="scan-seconds" className="block text-diesel-paper text-sm">
              Time on each option
              <span className="block text-diesel-steel text-xs mt-0.5">
                {settings.scanSeconds} seconds before moving to the next
              </span>
            </label>
            <input
              id="scan-seconds"
              type="range"
              min={1}
              max={10}
              step={1}
              value={settings.scanSeconds}
              onChange={e => set({ scanSeconds: Number(e.target.value) })}
              className="w-full mt-2 accent-diesel-gold"
            />
          </div>
        )}
      </div>

      <button
        onClick={() => onChange({ ...DEFAULT_ABILITY_SETTINGS })}
        className="mt-4 text-diesel-steel text-xs underline hover:text-diesel-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
      >
        Reset to defaults
      </button>
    </section>
  );
};
