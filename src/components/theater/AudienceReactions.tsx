import React, { useState } from 'react';
import { WITNESS_REACTIONS } from '@/constants';

export type WitnessReaction = (typeof WITNESS_REACTIONS)[number];

interface AudienceReactionsProps {
  sceneName: string;
}

/**
 * Audience reaction palette for WITNESS scenes, salvaged from Dramaton Editor 2.0.
 * The player watches, but reacts: CHEER / BOO / SILENCE / WALK AWAY.
 * Display/log only for now — no gameplay effects.
 */
export const AudienceReactions: React.FC<AudienceReactionsProps> = ({ sceneName }) => {
  const [lastReaction, setLastReaction] = useState<WitnessReaction | null>(null);

  const react = (reaction: WitnessReaction) => {
    setLastReaction(reaction);
    console.log(`[WITNESS] Audience reaction in "${sceneName}": ${reaction}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-3">
      <p className="text-center text-diesel-steel text-[10px] uppercase tracking-widest mb-2">
        ▸ Witness Scene — Audience Reaction ◂
      </p>
      <div className="flex gap-2">
        {WITNESS_REACTIONS.map(reaction => (
          <button
            key={reaction}
            onClick={() => react(reaction)}
            className={`flex-1 py-2 px-1 border-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              lastReaction === reaction
                ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold'
                : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold'
            }`}
          >
            {reaction}
          </button>
        ))}
      </div>
      {lastReaction && (
        <p className="text-center text-diesel-gold/70 text-[10px] uppercase tracking-wider mt-2">
          The audience: {lastReaction}
        </p>
      )}
    </div>
  );
};
