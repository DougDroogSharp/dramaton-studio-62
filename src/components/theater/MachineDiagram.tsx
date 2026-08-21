import React from 'react';
import { MeterRow } from './MeterPanel';
import { WorldVars } from '@/utils/expression';
import { metersFor } from '@/utils/meters';

// THE MACHINE, RUNNING — a live, abstract view of the thing the scene
// is actually doing to the economy.
//
// The gauges on the shelf say a number moved. They do not say what it
// feeds. This does: five named nodes and the flows between them, where
// the flow the current scene is driving lights up. The scene tells the
// story; this shows the mechanism underneath it, at the same moment.
//
// The shape is Henry George's argument, drawn:
//
//        LAND ──▶ RENT ──▶ HOARD
//          │        ▲         │
//          ▼        └─────────┘     the loop is the whole point
//        WAGES ─▶ SHARED
//
//   LAND    the source. Nobody made it; it was here first.
//   RENT    what is charged for reaching it. Unearned.
//   WAGES   what is earned by working it.
//   HOARD   where rent accumulates.
//   SHARED  what stays with the people who did the work.
//
// The edge HOARD▶RENT is the engine: a hoard buys more land, which
// raises rent, which feeds the hoard. Progress and Poverty in one
// arrow. When a scene drives that loop, the player watches it turn.
//
// EVERY NODE IS A GAUGE. A node that only lit up told you something had
// changed, but never how much or how bad it had got — so each one now
// carries its own arc and needle reading its live value, with its name
// and its number. Abstract, but not vague: a diagram you can take a
// measurement off.

interface MachineDiagramProps {
  /** The moves this scene has made. Same feed the shelf gauges read. */
  rows: MeterRow[];
  /** Live values, so each node can read its own dial. */
  worldState?: WorldVars;
  labelClass?: string;
}

type NodeId = 'L' | 'R' | 'W' | 'H' | 'S';

// Which world variable each node READS for its dial. One variable per
// node — the node's own quantity, not a basket.
const NODE_VARIABLE: Record<NodeId, string> = {
  L: 'land',
  R: 'rent',
  W: 'wages',
  H: 'hoard',
  S: 'shared',
};

// Which variables LIGHT a node when they move. Broader than the dial
// variable: a game without `land` still lights LAND when landValue
// moves, and squeeze is a rent story even where rent is not tracked.
const NODE_FOR_VARIABLE: Record<string, NodeId> = {
  land: 'L', landValue: 'L',
  rent: 'R', squeeze: 'R',
  wages: 'W',
  hoard: 'H', greed: 'H', hierarchy: 'H',
  shared: 'S', singleTax: 'S', education: 'S', health: 'S', care: 'S',
};

// Laid out on a 300x150 field. Bigger than the old 224x92, because a
// node carrying a dial, a name and a number cannot be 30px wide.
const NODES: Record<NodeId, { x: number; y: number; title: string }> = {
  L: { x: 42,  y: 34,  title: 'LAND' },
  R: { x: 150, y: 34,  title: 'RENT' },
  H: { x: 258, y: 34,  title: 'HOARD' },
  W: { x: 42,  y: 108, title: 'WAGES' },
  S: { x: 150, y: 108, title: 'SHARED' },
};

const EDGES: Array<{ from: NodeId; to: NodeId; curve?: number }> = [
  { from: 'L', to: 'R' },
  { from: 'R', to: 'H' },
  { from: 'L', to: 'W' },
  { from: 'W', to: 'S' },
  // The loop: the hoard buys land back and rent climbs again.
  { from: 'H', to: 'R', curve: -30 },
];

const NODE_R = 21;      // dial radius
const ARC = 240;        // degrees a dial sweeps
const ARC_START = 150;  // where zero sits, sweeping clockwise

// WHY this flow is happening — one plain sentence per edge.
//
// The diagram shows what moved and what it feeds. It cannot say why that
// follows, and a player who has not read George has no reason to know.
// Ordered by which explains the most: the loop first, because the loop
// is the argument and everything else is setup.
const WHY: Array<{ from: NodeId; to: NodeId; text: string }> = [
  { from: 'H', to: 'R', text: 'The hoard buys more land. Rent climbs because of it, and the hoard grows again. That circle is the engine.' },
  { from: 'R', to: 'H', text: 'Rent does not stay where it was earned. It collects with whoever owns the ground.' },
  { from: 'L', to: 'R', text: 'Rent is what gets charged for reaching land that nobody made.' },
  { from: 'W', to: 'S', text: 'Wages are the part that stays with the people who did the work.' },
  { from: 'L', to: 'W', text: 'Land worked by people makes wages. That much is earned.' },
];

/** A point on a dial face. */
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const MachineDiagram: React.FC<MachineDiagramProps> = ({ rows, worldState, labelClass = '' }) => {
  const meanings = metersFor();

  // Which nodes moved this scene, and in which direction. Later moves
  // win, so a variable nudged twice reads as its most recent move.
  const moved = new Map<NodeId, { up: boolean; seq: number }>();
  for (const row of rows) {
    const node = NODE_FOR_VARIABLE[row.meaning.variable];
    if (!node) continue;
    const prev = moved.get(node);
    if (!prev || row.seq >= prev.seq) {
      moved.set(node, { up: row.to > row.from, seq: row.seq });
    }
  }

  // An edge is live when BOTH ends moved — that is a flow, not two
  // unrelated nudges. The newest seq keys the animation so a flow that
  // fires twice pulses twice.
  const edgeState = EDGES.map(e => {
    const a = moved.get(e.from);
    const b = moved.get(e.to);
    return { ...e, live: !!a && !!b, seq: Math.max(a?.seq ?? 0, b?.seq ?? 0) };
  });

  const anyMovement = moved.size > 0;
  const why = WHY.find(w =>
    edgeState.some(e => e.live && e.from === w.from && e.to === w.to)
  )?.text ?? null;

  /** The live reading for a node: its value, and where its needle sits. */
  const readingFor = (id: NodeId) => {
    const variable = NODE_VARIABLE[id];
    const raw = worldState?.[variable];
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) return null;
    const m = meanings.get(variable);
    const min = m?.min ?? 0;
    const max = m?.max ?? 100;
    // Clamp rather than let an unbounded hoard spin the needle past the
    // post. Pinned at the end of the scale is still an honest reading.
    const t = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
    return { value, angle: ARC_START + t * ARC };
  };

  return (
    <div className={`w-full h-full flex flex-col ${labelClass}`}>
      <svg
        viewBox="0 0 300 150"
        className="w-full flex-1 min-h-0"
        role="img"
        aria-label={
          anyMovement
            ? `The model: ${[...moved.entries()]
                .map(([n, m]) => {
                  const r = readingFor(n);
                  return `${NODES[n].title} ${m.up ? 'rising' : 'falling'}${r ? `, now ${Math.round(r.value)}` : ''}`;
                })
                .join('. ')}.`
            : 'The model: nothing moving in this scene.'
        }
      >
        <defs>
          <marker id="md-arrow" viewBox="0 0 8 8" refX="7" refY="4"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 7 4 L 0 7 z" fill="currentColor" />
          </marker>
        </defs>

        {edgeState.map((e, i) => {
          const a = NODES[e.from];
          const b = NODES[e.to];
          const vertical = a.x === b.x;
          const d = e.curve
            ? `M ${b.x} ${b.y - NODE_R} C ${b.x + 26} ${b.y + e.curve}, ${a.x - 26} ${a.y + e.curve}, ${a.x} ${a.y - NODE_R}`
            : vertical
              ? `M ${a.x} ${a.y + NODE_R} L ${b.x} ${b.y - NODE_R}`
              : `M ${a.x + NODE_R} ${a.y} L ${b.x - NODE_R} ${b.y}`;
          return (
            <path
              key={`${e.from}${e.to}`}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={e.live ? 3 : 1.4}
              strokeOpacity={e.live ? 1 : 0.42}
              markerEnd="url(#md-arrow)"
              className={e.live ? 'animate-meter-lit' : undefined}
              style={{
                transition: 'stroke-width 500ms, stroke-opacity 500ms',
                animationDelay: `${Math.min(i * 70, 280)}ms`,
              }}
            />
          );
        })}

        {(Object.keys(NODES) as NodeId[]).map(id => {
          const n = NODES[id];
          const m = moved.get(id);
          const reading = readingFor(id);
          const trackFrom = pt(n.x, n.y, NODE_R - 4, ARC_START);
          const trackTo = pt(n.x, n.y, NODE_R - 4, ARC_START + ARC);
          const tip = reading ? pt(n.x, n.y, NODE_R - 7, reading.angle) : null;
          return (
            <g key={`${id}-${m?.seq ?? 0}`} className={m ? 'animate-meter-lit' : undefined}>
              {/* the dial face */}
              <circle
                cx={n.x} cy={n.y} r={NODE_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={m ? 2 : 1}
                strokeOpacity={m ? 1 : 0.55}
                style={{ transition: 'stroke-width 500ms, stroke-opacity 500ms' }}
              />
              {/* the sweep it reads across */}
              <path
                d={`M ${trackFrom.x} ${trackFrom.y} A ${NODE_R - 4} ${NODE_R - 4} 0 1 1 ${trackTo.x} ${trackTo.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeOpacity={0.4}
              />
              {/* the needle, only when there is a value to show */}
              {tip && (
                <line
                  x1={n.x} y1={n.y} x2={tip.x} y2={tip.y}
                  stroke="currentColor"
                  strokeWidth={m ? 2.2 : 1.6}
                  strokeLinecap="round"
                  strokeOpacity={m ? 1 : 0.85}
                  style={{ transition: 'all 700ms cubic-bezier(.2,.8,.3,1)' }}
                />
              )}
              <circle cx={n.x} cy={n.y} r={1.8} fill="currentColor" fillOpacity={m ? 1 : 0.75} />

              {/* the reading */}
              {reading && (
                <text
                  x={n.x} y={n.y + NODE_R - 5}
                  textAnchor="middle" fontSize="9"
                  fill="currentColor" fillOpacity={m ? 1 : 0.9}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {Math.round(reading.value)}
                </text>
              )}

              {/* the name, always — an unlabelled dial is decoration */}
              <text
                x={n.x} y={n.y + NODE_R + 11}
                textAnchor="middle" fontSize="8.5" fontWeight="bold"
                letterSpacing="0.5"
                fill="currentColor" fillOpacity={m ? 1 : 0.8}
                style={{ transition: 'fill-opacity 500ms' }}
              >
                {n.title}
              </text>

              {/* which way it just went */}
              {m && (
                <text
                  x={n.x + NODE_R - 2} y={n.y - NODE_R + 8}
                  fontSize="10" fill="currentColor" fillOpacity={0.95}
                >
                  {m.up ? '▲' : '▼'}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* THE WHY — reserved height whether or not there is a sentence, so
          the diagram above never shifts when one arrives. */}
      <div className="h-[26px] shrink-0 flex items-center">
        {why && (
          <p key={why} className="text-[10px] leading-tight opacity-95 animate-fade-in">
            {why}
          </p>
        )}
      </div>
    </div>
  );
};
