import React, { useEffect, useRef, useState } from 'react';

// THE BLING.
//
// Doug: "have a few of the jewels do a sparkle anim randomly. bling.
// subtle sparkles mainly but the occasional twinkle. a sparkle about
// every 2 seconds with twinkles 20 seconds apart… Every minute or so do
// a lot of sparkles and twinkles at once."
//
// So there are three events, not one, and the rarity is the point:
//
//   SPARKLE   ~every 2s   small, brief, easy to miss. The frame is alive.
//   TWINKLE   ~every 20s  a real four-point star with rays. You look up.
//   CASCADE   ~every 60s  eight or nine at once, staggered. Showing off.
//
// A jewelled case that glitters constantly is a slot machine. One that
// catches the light every few seconds is an expensive object in a room
// with a window. The gap between them is entirely in the timing, which
// is why the intervals are jittered rather than fixed — anything on an
// exact beat stops reading as light and starts reading as a cursor.
//
// The lights sit only on the FRAME BAND, never over the picture: each
// one is placed on the border ring, so nothing ever glitters across an
// actor's face.
//
// Under reduce-motion this renders nothing at all. Not slower, not
// dimmer — nothing. A player who asked for stillness did not ask for
// gentler flashing.

type Kind = 'sparkle' | 'twinkle';

interface Light {
  id: number;
  kind: Kind;
  /** CSS positions on the band -- see jewelPoint. */
  left: string;
  top: string;
  /** Extra delay so a cascade staggers instead of strobing. */
  delay: number;
  size: number;
}

interface FrameSparkleProps {
  /** Border width in px, so lights land on the band and not the art. */
  band?: number;
  /** Off entirely when the player asked for stillness. */
  enabled?: boolean;
}

/**
 * A point ON A STONE, not just anywhere on the band.
 *
 * Doug: "they should be bright twinkles that glint off jewels in the
 * bezel." Light scattered at random along the gold reads as noise; light
 * landing on a set stone reads as the stone catching it.
 *
 * The bezel is a repeating border-image, so exact gem coordinates are
 * not knowable at runtime -- but the PATTERN is: a big stone at every
 * corner, and more along each run. So the candidates are the corners
 * plus evenly spaced points on each edge, jittered so a repeat never
 * lands pixel-identical.
 *
 * Positions mix units on purpose: PIXELS across the band (its real
 * thickness) and PERCENT along it. One percentage cannot describe both
 * axes of a box far wider than it is tall.
 */
function jewelPoint(band: number): { left: string; top: string } {
  const mid = band / 2;
  const jx = () => (Math.random() - 0.5) * band * 0.5;
  const px = (v: number) => `${v}px`;

  // Corner stones first: the largest, and the only ones guaranteed to
  // be there whatever the window size.
  if (Math.random() < 0.45) {
    const l = Math.random() < 0.5 ? px(mid + jx()) : `calc(100% - ${mid + jx()}px)`;
    const t = Math.random() < 0.5 ? px(mid + jx()) : `calc(100% - ${mid + jx()}px)`;
    return { left: l, top: t };
  }

  // Otherwise a stone along one of the four runs.
  const stops = [1, 2, 3, 4, 5, 6, 7].map(i => (i / 8) * 100);
  const along = `${stops[Math.floor(Math.random() * stops.length)] + (Math.random() - 0.5) * 6}%`;
  switch (Math.floor(Math.random() * 4)) {
    case 0:  return { left: along, top: px(mid + jx()) };
    case 1:  return { left: `calc(100% - ${mid + jx()}px)`, top: along };
    case 2:  return { left: along, top: `calc(100% - ${mid + jx()}px)` };
    default: return { left: px(mid + jx()), top: along };
  }
}

export const FrameSparkle: React.FC<FrameSparkleProps> = ({ band = 34, enabled = true }) => {
  const [lights, setLights] = useState<Light[]>([]);
  const nextId = useRef(0);
  // Held in a ref so the scheduling loop never re-subscribes and never
  // needs the current list to add to it.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!enabled) { setLights([]); return; }


    const add = (kind: Kind, count = 1, spread = 0) => {
      const born: Light[] = [];
      for (let i = 0; i < count; i++) {
        const p = jewelPoint(band);
        born.push({
          id: nextId.current++,
          kind,
          left: p.left,
          top: p.top,
          delay: spread ? Math.random() * spread : 0,
          size: kind === 'twinkle'
            ? 40 + Math.random() * 22
            : 14 + Math.random() * 9,
        });
      }
      setLights(prev => [...prev, ...born]);
      // Retire them after the animation plus the longest stagger.
      const life = (kind === 'twinkle' ? 1000 : 560) + spread + 200;
      const t = setTimeout(() => {
        const ids = new Set(born.map(b => b.id));
        setLights(prev => prev.filter(l => !ids.has(l.id)));
      }, life);
      timers.current.push(t);
    };

    // Jittered self-rescheduling, rather than setInterval: a fixed beat
    // reads as a blinking cursor, and these are supposed to read as
    // light catching a stone.
    const loop = (fn: () => void, base: number, jitter: number) => {
      const tick = () => {
        fn();
        const t = setTimeout(tick, base + (Math.random() - 0.5) * jitter);
        timers.current.push(t);
      };
      const t = setTimeout(tick, base * (0.3 + Math.random() * 0.7));
      timers.current.push(t);
    };

    loop(() => add('sparkle'), 900, 700);
    loop(() => add('twinkle'), 7000, 4000);
    // The show-off moment: a handful of each, staggered over a second.
    loop(() => { add('sparkle', 14, 900); add('twinkle', 5, 700); }, 30000, 12000);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [enabled, band]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute"
      // An absolutely positioned child is laid out against the PADDING
      // box, so inset-0 covers the area INSIDE the bezel -- which is why
      // the glints were appearing on a rectangle smaller than the frame,
      // out on the linen instead of on the gold. Negative insets of the
      // border width push the overlay back out over the band itself.
      style={{ top: -band, right: -band, bottom: -band, left: -band, zIndex: 500 }}
      aria-hidden="true"
    >
      {lights.map(l => (
        <span
          key={l.id}
          className={l.kind === 'twinkle' ? 'animate-frame-twinkle' : 'animate-frame-sparkle'}
          style={{
            position: 'absolute',
            left: l.left,
            top: l.top,
            width: l.size,
            height: l.size,
            marginLeft: -l.size / 2,
            marginTop: -l.size / 2,
            animationDelay: `${l.delay}ms`,
            backgroundImage: l.kind === 'twinkle' ? TWINKLE_SPRITE : SPARKLE_SPRITE,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            // The bloom is what sells it as light rather than a decal.
            filter: l.kind === 'twinkle'
              ? 'drop-shadow(0 0 5px #fff) drop-shadow(0 0 12px rgba(255,245,205,1)) drop-shadow(0 0 26px rgba(255,220,120,.85))'
              : 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 9px rgba(255,248,215,.95))',
          }}
        />
      ))}
    </div>
  );
};

// The sprites, inline so they cost no request and stay crisp at any size.
//
// SPARKLE — a soft four-point gleam. Mostly a bright core with short
// arms; at 9-16px it reads as a glint rather than a shape.
const SPARKLE_SPRITE = `url("data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
  <defs>
    <radialGradient id='c'>
      <stop offset='0' stop-color='#ffffff'/>
      <stop offset='.4' stop-color='#fff3c4' stop-opacity='.9'/>
      <stop offset='1' stop-color='#ffdf7e' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <circle cx='12' cy='12' r='7' fill='url(#c)'/>
  <path d='M12 3 L13.1 10.9 L21 12 L13.1 13.1 L12 21 L10.9 13.1 L3 12 L10.9 10.9 Z' fill='#fffdf0' opacity='.95'/>
</svg>`)}")`;

// TWINKLE — the same star with long rays and a halo. Bigger, slower,
// and rare enough that it is worth looking up for.
const TWINKLE_SPRITE = `url("data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>
  <defs>
    <radialGradient id='h'>
      <stop offset='0' stop-color='#ffffff' stop-opacity='.95'/>
      <stop offset='.35' stop-color='#fff0b8' stop-opacity='.55'/>
      <stop offset='1' stop-color='#ffd76a' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <circle cx='24' cy='24' r='18' fill='url(#h)'/>
  <path d='M24 1 L26 22 L47 24 L26 26 L24 47 L22 26 L1 24 L22 22 Z' fill='#ffffff'/>
  <path d='M24 8 L25 23 L40 24 L25 25 L24 40 L23 25 L8 24 L23 23 Z' fill='#fff6d0' opacity='.9'/>
  <path d='M13 13 L25 23 L35 13 L25 25 L35 35 L23 25 L13 35 L23 23 Z' fill='#ffffff' opacity='.45'/>
</svg>`)}")`;
