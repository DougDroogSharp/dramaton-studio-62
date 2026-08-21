import type React from 'react';
// The cabinet the show is played inside, dressed for its century.
//
// Same layout every time — stage, instrument shelf, narration plate,
// none of them ever resizing — but the materials change so a game
// looks like it belongs to its own world rather than to a web page.
//
// A game picks one with GameInfo.frame; unknown or missing falls back
// to 'diesel', the engine's own dieselpunk console.

export type FrameId = 'diesel' | 'linen' | 'brass' | 'amiga' | 'flat';

export interface FrameSkin {
  id: FrameId;
  name: string;
  /** outer cabinet */
  shell: string;
  /** the rule between regions */
  divider: string;
  /** instrument shelf background */
  shelf: string;
  /** narration plate background */
  plate: string;
  /** narration type */
  plateText: string;
  /** small caps labels on the shelf */
  label: string;
  /** Set stones that catch the light. Only a jewelled case sparkles. */
  jewelled?: boolean;
  /** optional decorative styles applied to the shell */
  shellStyle?: React.CSSProperties;
}

export const FRAMES: Record<FrameId, FrameSkin> = {
  // The engine's own: riveted iron and gold needles.
  diesel: {
    id: 'diesel',
    name: 'Dieselpunk console',
    shell: 'border-[14px] border-diesel-border bg-diesel-panel/40 shadow-2xl ring-1 ring-inset ring-diesel-steel/25',
    divider: 'border-t-2 border-diesel-border',
    shelf: 'bg-diesel-black/40',
    plate: 'bg-diesel-black/60',
    plateText: 'text-diesel-paper',
    label: 'text-diesel-steel',
  },

  // WILLIAM — a looted treasure, hung on a wall in 2026.
  //
  // Doug: "i would like the frame around the stage in William be richly
  // inlaid with jewels. Royal bling." And then the brief that made sense
  // of it: "i want the game to look like it is a work of art hung on the
  // wall of a 2026 norman scion."
  //
  // So this is not a decorative border. It is a DISPLAY CASE. The
  // tapestry is a fragment somebody's ancestor took, mounted behind
  // glass, gilt-framed, gem-set, and hung in the townhouse of the man
  // who inherited both the object and the ground it was paid for. The
  // frame is the chapter's argument in furniture: the plunder is still
  // in the family, and it is beautifully looked after.
  //
  // The gold and the gems are a border-image — an inline SVG, so it
  // stays crisp at any size and costs no network request. Corners carry
  // a large table-cut stone; the runs between them alternate cabochons
  // with gold beading, the way a reliquary is set.
  linen: {
    id: 'linen',
    name: 'Bayeux linen, framed',
    jewelled: true,
    shell: 'border-[34px] shadow-2xl',
    divider: 'border-t border-[#8d7a52]/40',
    shelf: '',
    plate: '',
    plateText: 'text-[#2b2118]',
    label: 'text-[#6b5a3a]',
    shellStyle: {
      // The linen itself, lit slightly from above the way a mounted
      // textile is lit in a hall.
      background: 'linear-gradient(#f3ecda, #e6dcc2)',
      borderStyle: 'solid',
      borderColor: '#b8933f',
      borderImageSource: `url("data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#f6e3a8'/><stop offset='.35' stop-color='#c9a145'/>
      <stop offset='.62' stop-color='#8a6a22'/><stop offset='1' stop-color='#e2c476'/>
    </linearGradient>
    <radialGradient id='ruby' cx='.35' cy='.3'>
      <stop offset='0' stop-color='#ff9a9a'/><stop offset='.45' stop-color='#b3151f'/>
      <stop offset='1' stop-color='#5c0009'/>
    </radialGradient>
    <radialGradient id='sap' cx='.35' cy='.3'>
      <stop offset='0' stop-color='#9fc4ff'/><stop offset='.45' stop-color='#1b3f9e'/>
      <stop offset='1' stop-color='#08103f'/>
    </radialGradient>
    <radialGradient id='eme' cx='.35' cy='.3'>
      <stop offset='0' stop-color='#9ff0c0'/><stop offset='.45' stop-color='#127a45'/>
      <stop offset='1' stop-color='#03301a'/>
    </radialGradient>
    <radialGradient id='prl' cx='.35' cy='.3'>
      <stop offset='0' stop-color='#fffdf4'/><stop offset='1' stop-color='#cfc3a4'/>
    </radialGradient>
  </defs>
  <rect width='120' height='120' fill='url(#g)'/>
  <rect x='27' y='27' width='66' height='66' fill='none' stroke='#5e4718' stroke-width='2'/>
  <rect x='3' y='3' width='114' height='114' fill='none' stroke='#f7e9b8' stroke-width='1.5' opacity='.8'/>
  <g stroke='#5e4718' stroke-width='1'>
    <circle cx='15' cy='15' r='10' fill='url(#ruby)'/>
    <circle cx='105' cy='15' r='10' fill='url(#sap)'/>
    <circle cx='15' cy='105' r='10' fill='url(#eme)'/>
    <circle cx='105' cy='105' r='10' fill='url(#ruby)'/>
    <circle cx='60' cy='13' r='6' fill='url(#eme)'/>
    <circle cx='60' cy='107' r='6' fill='url(#sap)'/>
    <circle cx='13' cy='60' r='6' fill='url(#sap)'/>
    <circle cx='107' cy='60' r='6' fill='url(#eme)'/>
    <circle cx='37' cy='13' r='3.4' fill='url(#prl)'/>
    <circle cx='83' cy='13' r='3.4' fill='url(#prl)'/>
    <circle cx='37' cy='107' r='3.4' fill='url(#prl)'/>
    <circle cx='83' cy='107' r='3.4' fill='url(#prl)'/>
    <circle cx='13' cy='37' r='3.4' fill='url(#prl)'/>
    <circle cx='13' cy='83' r='3.4' fill='url(#prl)'/>
    <circle cx='107' cy='37' r='3.4' fill='url(#prl)'/>
    <circle cx='107' cy='83' r='3.4' fill='url(#prl)'/>
  </g>
</svg>`)}")`,
      borderImageSlice: '30 fill',
      borderImageRepeat: 'round',
      borderImageWidth: '34px',
      // Two shadows doing two jobs: the inner one recesses the linen
      // behind the frame the way glass and a mount do, the outer one
      // hangs the whole case off a wall.
      boxShadow: 'inset 0 0 40px rgba(92,70,26,.35), inset 0 2px 3px rgba(0,0,0,.35), 0 22px 50px rgba(0,0,0,.6)',
    },
  },

  // Leopold: a brass survey instrument on a dark mahogany bench —
  // the machinery of an administration that measured everything.
  brass: {
    id: 'brass',
    name: 'Colonial brass',
    shell: 'border-[15px] shadow-2xl ring-1 ring-inset ring-[#8a6a3a]/50',
    divider: 'border-t border-[#8a6a3a]',
    shelf: 'bg-[#171009]/90',
    plate: 'bg-[#0f0a06]/95',
    plateText: 'text-[#e6d9bd]',
    label: 'text-[#b08d55]',
    shellStyle: {
      borderColor: '#8a6a3a',
      background: '#120c07',
      boxShadow: 'inset 0 0 40px rgba(180,140,80,.18), 0 10px 40px rgba(0,0,0,.6)',
    },
  },

  // Capone: a 1986 machine's chrome bezel, hard pixel edges, the
  // limited palette of the Amiga the original ran on.
  amiga: {
    id: 'amiga',
    name: 'Amiga bezel',
    shell: 'border-[14px] shadow-2xl ring-1 ring-inset ring-[#5b5b7a]/50',
    divider: 'border-t-2 border-[#5b5b7a]',
    shelf: 'bg-[#0b0b16]',
    plate: 'bg-[#12121f]',
    plateText: 'text-[#d8d8f0]',
    label: 'text-[#8f8fc0]',
    shellStyle: {
      borderColor: '#5b5b7a',
      background: '#080810',
      imageRendering: 'pixelated',
      boxShadow: 'inset 0 0 0 2px #22223a, 0 10px 40px rgba(0,0,0,.6)',
    },
  },

  // Musk: no cabinet at all. A flat white product surface that would
  // rather you did not notice it is a frame.
  flat: {
    id: 'flat',
    name: 'Product surface',
    shell: 'border-[12px] shadow-xl ring-1 ring-inset ring-black/10',
    divider: 'border-t',
    shelf: 'bg-[#f2f3f5]',
    plate: 'bg-white',
    plateText: 'text-[#15181c]',
    label: 'text-[#7c848d]',
    shellStyle: {
      borderColor: '#dfe2e6',
      background: '#ffffff',
      boxShadow: '0 10px 40px rgba(0,0,0,.35)',
    },
  },
};

export function frameFor(id?: string): FrameSkin {
  return FRAMES[(id as FrameId)] ?? FRAMES.diesel;
}
