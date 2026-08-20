import React from 'react';
import { MeterRow } from './MeterPanel';

// THE MACHINE, RUNNING — a live, abstract view of the thing the scene
// is actually doing to the economy.
//
// The gauges say a number moved. They do not say WHY, or what it feeds.
// This does: five lettered nodes and the flows between them, where the
// flow the current scene is driving lights up. The scene tells the
// story; this shows the mechanism underneath it, at the same moment.
//
// The shape is Henry George's argument, drawn:
//
//        L ──▶ R ──▶ H
//        │     ▲     │
//        ▼     └─────┘        the loop is the whole point
//        W ──▶ S
//
//   L  LAND      the source. Nobody made it; it was here first.
//   R  RENT      what is charged for access to it. Unearned.
//   W  WAGES     what is earned by working it.
//   H  HOARD     where rent accumulates.
//   S  SHARED    what stays with the people who did the work.
//
// The edge H▶R is the engine: a hoard buys more land, which raises
// rent, which feeds the hoard. Progress and Poverty in one arrow. When
// a scene drives that loop, the player watches it turn.
//
// Deliberately abstract — letters and boxes, not a mill with belts. A
// diagram invites you to read a system; a picture invites you to watch
// a machine. This is meant to be read.

interface MachineDiagramProps {
  /** The moves this scene has made. Same feed the gauges read. */
  rows: MeterRow[];
  labelClass?: string;
}

type NodeId = 'L' | 'R' | 'W' | 'H' | 'S';

// Which world variables light which node. A game may not use all of
// them; an unknown variable simply lights nothing.
const NODE_FOR_VARIABLE: Record<string, NodeId> = {
  rent: 'R',
  land: 'L',
  landValue: 'L',
  wages: 'W',
  hoard: 'H',
  shared: 'S',
  singleTax: 'S',
  squeeze: 'R',
  greed: 'H',
  hierarchy: 'H',
  education: 'S',
  health: 'S',
  care: 'S',
};

const NODES: Record<NodeId, { x: number; y: number; label: string; title: string }> = {
  L: { x: 26,  y: 22, label: 'L', title: 'Land' },
  R: { x: 104, y: 22, label: 'R', title: 'Rent' },
  H: { x: 182, y: 22, label: 'H', title: 'Hoard' },
  W: { x: 26,  y: 66, label: 'W', title: 'Wages' },
  S: { x: 104, y: 66, label: 'S', title: 'Shared' },
};

const EDGES: Array<{ from: NodeId; to: NodeId; curve?: number }> = [
  { from: 'L', to: 'R' },
  { from: 'R', to: 'H' },
  { from: 'L', to: 'W' },
  { from: 'W', to: 'S' },
  // The loop: the hoard buys land back and rent climbs again.
  { from: 'H', to: 'R', curve: -26 },
];

const BOX_W = 30;
const BOX_H = 22;

// WHY this flow is happening — one plain sentence per edge.
//
// The diagram shows what moved and what it feeds. It does not say why
// that follows, and a player who has not read Progress and Poverty has
// no reason to know. So the box underneath says it, in the fewest words
// that are still true.
//
// Ordered by which explains the most: the loop first, because the loop
// is the argument and everything else is setup.
const WHY: Array<{ from: NodeId; to: NodeId; text: string }> = [
  { from: 'H', to: 'R', text: 'The hoard buys more land. Rent climbs because of it, and the hoard grows again. That circle is the engine.' },
  { from: 'R', to: 'H', text: 'Rent does not stay where it was earned. It collects with whoever owns the ground.' },
  { from: 'L', to: 'R', text: 'Rent is what gets charged for reaching land that nobody made.' },
  { from: 'W', to: 'S', text: 'Wages are the part that stays with the people who did the work.' },
  { from: 'L', to: 'W', text: 'Land worked by people makes wages. That much is earned.' },
];

export const MachineDiagram: React.FC<MachineDiagramProps> = ({ rows, labelClass = '' }) => {
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
    const live = !!a && !!b;
    return { ...e, live, seq: Math.max(a?.seq ?? 0, b?.seq ?? 0), up: b?.up ?? false };
  });

  const anyMovement = moved.size > 0;

  // The single most explanatory live flow. WHY is ordered by which says
  // the most, so the first match is the best available sentence.
  const why = WHY.find(w =>
    edgeState.some(e => e.live && e.from === w.from && e.to === w.to)
  )?.text ?? null;

  return (
    <div className={`w-full h-full flex flex-col ${labelClass}`}>
    <svg
      viewBox="0 0 224 92"
      className="w-full flex-1 min-h-0"
      role="img"
      aria-label={
        anyMovement
          ? `The model: ${[...moved.entries()]
              .map(([n, m]) => `${NODES[n].title} ${m.up ? 'rising' : 'falling'}`)
              .join(', ')}.`
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
        const x1 = a.x + BOX_W / 2, y1 = a.y;
        const x2 = b.x - BOX_W / 2, y2 = b.y;
        // Vertical and looping edges need their own geometry.
        const vertical = a.x === b.x;
        const d = e.curve
          ? `M ${b.x} ${b.y - BOX_H / 2} C ${b.x + 20} ${b.y + e.curve}, ${a.x - 20} ${a.y + e.curve}, ${a.x} ${a.y - BOX_H / 2}`
          : vertical
            ? `M ${a.x} ${a.y + BOX_H / 2} L ${b.x} ${b.y - BOX_H / 2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`;
        return (
          <path
            key={`${e.from}${e.to}`}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={e.live ? 2.4 : 1}
            strokeOpacity={e.live ? 0.95 : 0.22}
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
        return (
          <g
            key={`${id}-${m?.seq ?? 0}`}
            className={m ? 'animate-meter-lit' : undefined}
          >
            <rect
              x={n.x - BOX_W / 2}
              y={n.y - BOX_H / 2}
              width={BOX_W}
              height={BOX_H}
              fill="none"
              stroke="currentColor"
              strokeWidth={m ? 2 : 1}
              strokeOpacity={m ? 1 : 0.3}
              style={{ transition: 'stroke-width 500ms, stroke-opacity 500ms' }}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="currentColor"
              fillOpacity={m ? 1 : 0.45}
              style={{ transition: 'fill-opacity 500ms' }}
            >
              {n.label}
            </text>
            {/* Which way it went, only while it is moving. */}
            {m && (
              <text
                x={n.x + BOX_W / 2 + 4}
                y={n.y + 4}
                fontSize="9"
                fill="currentColor"
                fillOpacity={0.9}
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
          <p key={why} className="text-[10px] leading-tight opacity-80 animate-fade-in">
            {why}
          </p>
        )}
      </div>
    </div>
  );
};
