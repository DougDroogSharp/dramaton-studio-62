import React from 'react';
import { Link } from 'react-router-dom';
import { DramatonLogo } from '@/components/DramatonLogo';

// Public landing page for shared web deploys: lists the playable games.
// The editor is dev-only and is not routed in production builds.

// The chapters Humans vs Billionaires ships.
//
// Musk is deliberately NOT here. Doug, 20 Aug: "we are ditching Elon and
// putting him into the next release: Humans vs Billionaires: USA vs
// MAGA... ditch elon." He is too entangled in the present money-grab to
// be one historical chapter among four; he gets the release built around
// him instead.
//
// Nothing is deleted. hvb-elon.json, scripts/chapters/build-elon.mjs and
// the art all stay exactly where they are, the editor still lists him so
// Doug can keep working on him, and the smoke test still plays him so he
// cannot rot between now and USA vs MAGA. He is only off the PLAYER'S
// menu for this release.
//
// The fourth chapter that replaces him is AIPOTU (Utopia reversed,
// ay-po-TOO) — a 3D primitive island society builder. Not written yet.
const GAMES = [
  { file: 'hvb-william.json', title: 'William the Conqueror', year: '1066', style: 'Bayeux tapestry' },
  { file: 'hvb-leopold.json', title: 'King Leopold', year: '1885–1908', style: 'documentary photograph' },
  { file: 'hvb-capone.json', title: 'King of Chicago', year: '1920–1931', style: 'Amiga pixel art' },
  { file: 'hvb-machine.json', title: 'The Machine', year: 'every century', style: 'the model itself' },
  { file: 'hvb-campaign.json', title: 'The Campaign', year: 'nine centuries', style: 'economy prototype' },
];

const GameLanding: React.FC = () => (
  <div className="min-h-screen bg-diesel-black flex items-center justify-center p-6">
    <div className="max-w-2xl w-full text-center">
      <DramatonLogo className="w-20 h-20 mx-auto text-diesel-gold" />
      <h1 className="text-3xl md:text-5xl text-diesel-paper font-bold mt-6 tracking-wider">
        HUMANS VS BILLIONAIRES
      </h1>
      <p className="text-diesel-steel mt-2 mb-8 text-sm">
        Who wins? · A work in progress by Doug Sharp · development preview
      </p>
      <div className="space-y-2 text-left">
        {GAMES.map(g => (
          <Link
            key={g.file}
            to={`/theater?game=/${g.file}`}
            className="block px-4 py-3 bg-diesel-panel/60 border border-diesel-border hover:border-diesel-gold transition-colors group"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-diesel-paper font-bold group-hover:text-diesel-gold">
                {g.title}
              </span>
              <span className="text-diesel-steel text-xs shrink-0">{g.year}</span>
            </div>
            <span className="text-diesel-steel/70 text-xs">{g.style}</span>
          </Link>
        ))}
      </div>
      <p className="text-diesel-steel/40 text-[10px] mt-8 font-mono">
        DRAMATON · legendary interactive narrative system
      </p>
    </div>
  </div>
);

export default GameLanding;
