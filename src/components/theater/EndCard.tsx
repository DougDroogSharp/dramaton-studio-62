import React, { useState } from 'react';
import { GameData } from '@/types';
import { DramatonLogo } from '@/components/DramatonLogo';

// The end of a game: a curtain, then credits. The credits carry the
// one commercial ask in the whole project — Doug's ChipWits on Steam.

const CHIPWITS_URL = 'https://store.steampowered.com/app/2330720/ChipWits/';

interface EndCardProps {
  game: GameData;
  onReturnToTitle: () => void;
}

export const EndCard: React.FC<EndCardProps> = ({ game, onReturnToTitle }) => {
  const [showCredits, setShowCredits] = useState(false);

  if (!showCredits) {
    return (
      <div className="text-center py-6">
        <p className="text-diesel-gold text-2xl uppercase tracking-[0.3em] mb-6">
          — The End —
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setShowCredits(true)}
            className="px-6 py-3 bg-diesel-gold/20 border-2 border-diesel-gold text-diesel-gold font-bold uppercase tracking-wide hover:bg-diesel-gold/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
          >
            Credits
          </button>
          <button
            onClick={onReturnToTitle}
            className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-rust"
          >
            Return to Title
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-8 px-4">
      <DramatonLogo className="w-16 h-16 mx-auto text-diesel-gold" />

      <h2 className="text-2xl md:text-3xl text-diesel-paper font-bold mt-6 tracking-wide">
        {game.info.title}
      </h2>
      <p className="text-diesel-steel mt-1">by {game.info.author}</p>

      <div className="mt-8 text-diesel-steel text-sm leading-relaxed space-y-1">
        <p>Written, designed and directed by {game.info.author}</p>
        <p>Built on the Dramaton engine</p>
        <p className="text-diesel-steel/70">
          Historical quotations are sourced; disputed attributions are marked as disputed.
        </p>
      </div>

      {/* The one ask. Big, because Doug asked for big. */}
      <a
        href={CHIPWITS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-10 px-6 py-5 bg-diesel-gold/15 border-2 border-diesel-gold text-diesel-gold hover:bg-diesel-gold/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
      >
        <span className="block font-bold uppercase tracking-wide text-lg">
          Check out Doug Sharp&rsquo;s game ChipWits on Steam
        </span>
        <span className="block text-diesel-steel text-xs mt-1 normal-case tracking-normal">
          Program a robot with icons. Since 1984.
        </span>
      </a>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReturnToTitle}
          className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-rust"
        >
          Return to Title
        </button>
        <button
          onClick={() => setShowCredits(false)}
          className="px-4 py-3 text-diesel-steel text-sm underline hover:text-diesel-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
        >
          Back
        </button>
      </div>
    </div>
  );
};
