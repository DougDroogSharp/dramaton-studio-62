import React, { useState } from 'react';
import {
  AbilitySettings,
  ABILITY_PRESETS,
  DEFAULT_ABILITY_SETTINGS,
} from '@/utils/accessibility';

// Onboarding, shown once before the first game and reachable any time
// after. Two jobs, in this order:
//
// 1. Get every player set up the way they need. Everyone answers the
//    same question, so nobody is singled out or sent to a special menu.
//
// 2. Let every player see what the others need. Most games decide who
//    can play them by accident; this screen makes that decision
//    visible, once, in about fifteen seconds — no lecture, no guilt,
//    and you can try any of it on yourself and turn it off again.

interface AbilityOnboardingProps {
  settings: AbilitySettings;
  onChange: (next: AbilitySettings) => void;
  onDone: () => void;
  /** First run gets the framing; later visits go straight to the choices. */
  firstRun?: boolean;
}

export const AbilityOnboarding: React.FC<AbilityOnboardingProps> = ({
  settings,
  onChange,
  onDone,
  firstRun = true,
}) => {
  const [chosen, setChosen] = useState<string | null>(null);

  const pick = (id: string) => {
    const preset = ABILITY_PRESETS.find(p => p.id === id);
    if (preset) onChange(preset.apply(settings));
    setChosen(id);
  };

  const pickStandard = () => {
    onChange({ ...DEFAULT_ABILITY_SETTINGS });
    setChosen('standard');
  };

  return (
    <div className="min-h-screen bg-diesel-black flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full py-8">
        <h1 className="text-3xl md:text-4xl text-diesel-paper font-bold tracking-wide">
          How do you want to play?
        </h1>

        {firstRun && (
          <p className="text-diesel-steel mt-3 leading-relaxed">
            Games usually decide who can play them by accident. This one asks first.
            Pick whatever fits — and feel free to try one that doesn&rsquo;t. Turning
            these on for an evening is the fastest way to understand what other
            players are up against.
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={pickStandard}
            aria-pressed={chosen === 'standard'}
            className={`w-full text-left px-4 py-3 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold ${
              chosen === 'standard'
                ? 'border-diesel-gold bg-diesel-gold/10'
                : 'border-diesel-border hover:border-diesel-gold'
            }`}
          >
            <span className="block text-diesel-paper">Play it as it comes</span>
            <span className="block text-diesel-steel text-sm mt-0.5">
              Balloons, sound, and normal pacing.
            </span>
          </button>

          {ABILITY_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => pick(preset.id)}
              aria-pressed={chosen === preset.id}
              className={`w-full text-left px-4 py-3 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold ${
                chosen === preset.id
                  ? 'border-diesel-gold bg-diesel-gold/10'
                  : 'border-diesel-border hover:border-diesel-gold'
              }`}
            >
              <span className="block text-diesel-paper">{preset.need}</span>
              <span className="block text-diesel-steel text-sm mt-0.5">{preset.detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onDone}
            className="px-6 py-3 bg-diesel-gold/20 border-2 border-diesel-gold text-diesel-gold font-bold uppercase tracking-wide hover:bg-diesel-gold/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
          >
            {chosen ? 'Continue' : 'Skip for now'}
          </button>
          <span className="text-diesel-steel/70 text-sm">
            You can change any of this mid-scene — the settings gear, any time.
          </span>
        </div>

        {firstRun && (
          <p className="text-diesel-steel/50 text-xs mt-8 leading-relaxed border-t border-diesel-border/50 pt-4">
            About one player in five needs at least one of these. None of it is a
            concession — it is the same story, told so it arrives.
          </p>
        )}
      </div>
    </div>
  );
};
