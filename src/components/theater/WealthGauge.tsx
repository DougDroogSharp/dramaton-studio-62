import React from 'react';
import { gaugeArtFor } from '@/utils/gaugeArt';

// WEALTH — one dial, two needles.
//
// HOARD and SHARED are not two facts, they are one fact: the same
// product, divided. Two separate gauges let a reader look at either
// number and feel nothing. One dial with two needles makes the GAP
// between them the thing you see, and the gap is the argument.
//
// The needles sweep a 240° arc, open at the bottom, the way a real
// instrument does.

interface WealthGaugeProps {
  hoard: number;
  shared: number;
  /** Scale both needles against this; hoard is unbounded so it is clamped. */
  max?: number;
  /** Highlight when either needle just moved. */
  lit?: boolean;
  size?: number;
  /** Cabinet skin: picks the era dial face and needle sprites. */
  frame?: string;
}

const ARC = 240;          // degrees swept
const START = 150;        // 0 sits here, sweeping clockwise

const angleFor = (v: number, max: number) =>
  START + (Math.min(Math.max(v, 0), max) / max) * ARC;

/** Point on the dial face at a given angle, in SVG coordinates. */
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const WealthGauge: React.FC<WealthGaugeProps> = ({
  hoard,
  shared,
  max = 100,
  lit = false,
  size = 116,
  frame,
}) => {
  // When the era has a photographed dial, the SVG becomes the MOVEMENT
  // and the art becomes the FACE: the linen face sits behind, the
  // stitched needles sit on top, and the drawn gap-arc stays between
  // them because the gap is the argument and must not be hidden by
  // chrome. No art -> everything below draws exactly as it always did.
  const art = gaugeArtFor(frame);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const hoardAngle = angleFor(hoard, max);
  const sharedAngle = angleFor(shared, max);

  // The gap: an arc drawn between the two needles. This is the whole
  // point of the component, so it is drawn first and thickest.
  const gapFrom = Math.min(hoardAngle, sharedAngle);
  const gapTo = Math.max(hoardAngle, sharedAngle);
  const gapSweep = gapTo - gapFrom;
  const a = pt(cx, cy, r - 6, gapFrom);
  const b = pt(cx, cy, r - 6, gapTo);
  const largeArc = gapSweep > 180 ? 1 : 0;

  // Who is ahead decides the colour of the gap: hoard ahead is the
  // harm case.
  const hoardLeads = hoard > shared;

  const needle = (deg: number, colour: string, width: number) => {
    const tip = pt(cx, cy, r - 12, deg);
    const tail = pt(cx, cy, 7, deg + 180);
    return (
      <line
        x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y}
        stroke={colour} strokeWidth={width} strokeLinecap="round"
        style={{ transition: 'all 700ms cubic-bezier(.2,.8,.3,1)' }}
      />
    );
  };

  // A stitched needle, hung from its own pivot.
  //
  // The sprite's boss is at art.pivot (measured from the photograph, not
  // assumed), so the image is positioned so that point lands on the dial
  // centre, and rotated about that same point. Rotating about the centre
  // of the bounding box instead makes the needle orbit rather than sweep
  // -- which is why prep-gauge-art.mjs goes to the trouble of finding it.
  const artNeedle = (deg: number, opacity: number) => {
    if (!art) return null;
    const h = size * 0.78;                 // needle length on the face
    const w = h * 0.32;                    // sprites are roughly 1:3
    const x = cx - w * art.pivot.x;
    const y = cy - h * art.pivot.y;
    return (
      <image
        href={art.needle}
        x={x} y={y} width={w} height={h}
        opacity={opacity}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `rotate(${deg + 90}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 700ms cubic-bezier(.2,.8,.3,1)',
        }}
      />
    );
  };

  const trackFrom = pt(cx, cy, r, START);
  const trackTo = pt(cx, cy, r, START + ARC);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={lit ? 'animate-meter-lit' : undefined}
      role="img"
      aria-label={
        `Wealth. Hoard ${Math.round(hoard)}, shared ${Math.round(shared)}. ` +
        (hoardLeads
          ? `The hoard leads by ${Math.round(hoard - shared)}.`
          : `Shared leads by ${Math.round(shared - hoard)}.`)
      }
    >
      {/* THE DIAL FACE — the photographed one when the era has it, the
          drawn arc when it does not. */}
      {art ? (
        <image href={art.frame} x={0} y={0} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <path
          d={`M ${trackFrom.x} ${trackFrom.y} A ${r} ${r} 0 1 1 ${trackTo.x} ${trackTo.y}`}
          fill="none"
          stroke="hsl(var(--diesel-border))"
          strokeWidth={3}
        />
      )}

      {/* THE GAP — the argument, drawn as an arc between the needles */}
      {gapSweep > 0.5 && (
        <path
          d={`M ${a.x} ${a.y} A ${r - 6} ${r - 6} 0 ${largeArc} 1 ${b.x} ${b.y}`}
          fill="none"
          stroke={hoardLeads ? 'hsl(var(--diesel-rust))' : 'hsl(var(--diesel-green))'}
          strokeWidth={7}
          strokeOpacity={0.45}
          strokeLinecap="round"
          style={{ transition: 'all 700ms cubic-bezier(.2,.8,.3,1)' }}
        />
      )}

      {art ? (
        <>
          {artNeedle(sharedAngle, 0.62)}
          {artNeedle(hoardAngle, 1)}
        </>
      ) : (
        <>
          {needle(sharedAngle, 'hsl(var(--diesel-green))', 2.5)}
          {needle(hoardAngle, 'hsl(var(--diesel-rust))', 2.5)}
          {/* pivot */}
          <circle cx={cx} cy={cy} r={4} fill="hsl(var(--diesel-steel))" />
          <circle cx={cx} cy={cy} r={1.6} fill="hsl(var(--diesel-black))" />
        </>
      )}

      <text
        x={cx} y={size - 2}
        textAnchor="middle"
        fontSize={9}
        letterSpacing={2}
        fill="hsl(var(--diesel-steel))"
      >
        WEALTH
      </text>
    </svg>
  );
};
