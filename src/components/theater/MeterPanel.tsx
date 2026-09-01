import React from 'react';
import { MeterMeaning } from '@/types';
import { interpolateWithMoney } from '@/utils/interpolate';
import { WorldVars } from '@/utils/expression';
import { WealthGauge } from './WealthGauge';
import { gaugeArtFor } from '@/utils/gaugeArt';

// The model, showing its work.
//
// Only the meters THIS scene has actually moved appear — an unmoved
// gauge is noise. Each one shows where it started, where it is now,
// and underneath, in words, what the movement means: once in general
// terms, once in concrete ones, because "rent rose 12" means nothing
// to someone who has not already agreed to care about rent.

export interface MeterRow {
  meaning: MeterMeaning;
  from: number;
  to: number;
  seq: number;
}

interface MeterPanelProps {
  rows: MeterRow[];
  /** Live world state, so commentary can quote real numbers. */
  worldState?: WorldVars;
  /** Era coin for {var:money}, e.g. "pence" for Norman England. */
  moneyFormat?: string;
  /** Newest move first; the top row gets the commentary. */
  maxRows?: number;
  /** Cabinet skin; picks which era instruments to draw. */
  frame?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const MeterPanel: React.FC<MeterPanelProps> = ({ rows, worldState, moneyFormat, maxRows = 6, frame }) => {
  // Null whenever the era has no prepped art, in which case every meter
  // below draws exactly the plain CSS track it always drew.
  const art = gaugeArtFor(frame);
  const say = (t: string) => (worldState ? interpolateWithMoney(t, worldState, moneyFormat) : t);
  if (rows.length === 0) {
    return (
      <div className="px-4 py-3 text-diesel-steel/60 text-xs italic">
        Nothing in the model has moved in this scene yet.
      </div>
    );
  }

  // HOARD and SHARED are one fact divided, so they collapse into a
  // single dial with two needles — the gap between them is the point,
  // and two separate bars hide it.
  const hoardRow = rows.find(r => r.meaning.variable === 'hoard');
  const sharedRow = rows.find(r => r.meaning.variable === 'shared');
  const showWealth = !!(hoardRow && sharedRow);
  const wealthLit = showWealth &&
    Math.max(hoardRow!.seq, sharedRow!.seq) === Math.max(...rows.map(r => r.seq));

  const rest = showWealth
    ? rows.filter(r => r.meaning.variable !== 'hoard' && r.meaning.variable !== 'shared')
    : rows;

  const shown = [...rest].sort((a, b) => b.seq - a.seq).slice(0, maxRows);
  // Commentary still follows whatever moved last, wealth included.
  const newest = [...rows].sort((a, b) => b.seq - a.seq)[0];
  const rising = newest.to > newest.from;
  const harm = newest.meaning.risingIsHarm === undefined
    ? undefined
    : rising === newest.meaning.risingIsHarm;

  return (
    <div className="w-full">
      <div className="flex gap-2 px-3 pt-2">
        {showWealth && (
          <div className="shrink-0 flex items-center">
            <WealthGauge
              hoard={hoardRow!.to}
              shared={sharedRow!.to}
              lit={wealthLit}
              size={104}
              frame={frame}
            />
          </div>
        )}
        <div className="flex-1 grid gap-1.5 sm:grid-cols-2 min-w-0">
        {shown.map((row, i) => {
          const min = row.meaning.min ?? 0;
          const max = row.meaning.max ?? 100;
          const span = max - min || 1;
          const fromPct = clamp01((row.from - min) / span) * 100;
          const toPct = clamp01((row.to - min) / span) * 100;
          const up = row.to > row.from;
          const delta = row.to - row.from;
          const isNewest = row.seq === newest.seq;

          return (
            <div
              key={`${row.meaning.variable}-${row.seq}`}
              // The needle lights when it moves. Keying on `seq` restarts
              // the animation on every fresh move, so a gauge nudged
              // again flashes again instead of sitting quietly lit.
              className={`px-2 py-1.5 border animate-meter-lit ${
                isNewest ? 'border-diesel-gold/70 bg-diesel-gold/5' : 'border-diesel-border'
              }`}
              style={{ animationDelay: `${Math.min(i * 60, 240)}ms` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-diesel-steel">
                  {row.meaning.label}
                </span>
                <span
                  className="text-xs font-mono tabular-nums text-diesel-paper"
                  aria-label={`${row.meaning.label} ${up ? 'rose' : 'fell'} from ${Math.round(row.from)} to ${Math.round(row.to)}`}
                >
                  {Math.round(row.to)}
                  <span className={`ml-1.5 ${up ? 'text-diesel-rust' : 'text-diesel-green'}`}>
                    {up ? '▲' : '▼'}{Math.abs(Math.round(delta * 10) / 10)}
                  </span>
                </span>
              </div>
              {/* the track: a ghost of where it started, and where it is,
                  wearing the era bar when the era has one */}
              <div
                className={`relative mt-1 overflow-hidden ${art ? 'h-3' : 'h-1.5 bg-diesel-black/60'}`}
                style={art ? {
                  backgroundImage: `url(${art.bar})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                } : undefined}
              >
                <div
                  className={`absolute inset-y-0 ${art ? 'bg-black/10' : 'bg-diesel-steel/30'}`}
                  style={{ width: `${fromPct}%` }}
                />
                <div
                  className={`absolute inset-y-0 transition-all duration-700 ${
                    up ? 'bg-diesel-rust' : 'bg-diesel-green'
                  } ${art ? 'opacity-60 mix-blend-multiply' : ''}`}
                  style={{
                    left: `${Math.min(fromPct, toPct)}%`,
                    width: `${Math.abs(toPct - fromPct)}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-diesel-paper transition-all duration-700"
                  style={{ left: `${toPct}%` }}
                />
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Commentary: what the newest movement MEANS. */}
      <div
        className={`mx-3 mt-2 mb-2 px-3 py-2 border-l-2 ${
          harm === true ? 'border-diesel-rust' : harm === false ? 'border-diesel-green' : 'border-diesel-steel'
        }`}
      >
        <p className="text-diesel-paper text-sm leading-snug">
          <span className="text-diesel-steel text-[10px] uppercase tracking-widest mr-2">
            {newest.meaning.label} {rising ? 'rises' : 'falls'}
          </span>
          {say(rising ? newest.meaning.rising : newest.meaning.falling)}
        </p>
        {newest.meaning.concrete && (
          <p className="text-diesel-steel text-xs italic mt-1 leading-snug">
            {say(newest.meaning.concrete)}
          </p>
        )}
      </div>
    </div>
  );
};
