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
    <linearGradient id='gold' x1='0' y1='0' x2='.3' y2='1'>
      <stop offset='0' stop-color='#fff4cf'/><stop offset='.18' stop-color='#e8c874'/>
      <stop offset='.45' stop-color='#b98f2e'/><stop offset='.68' stop-color='#7d5c14'/>
      <stop offset='.86' stop-color='#d9b45f'/><stop offset='1' stop-color='#f7e6b2'/>
    </linearGradient>
    <linearGradient id='rope' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#ffeeb8'/><stop offset='1' stop-color='#8a6a20'/>
    </linearGradient>
  </defs>

  <!-- the metal -->
  <rect width='120' height='120' fill='url(#gold)'/>
  <rect x='2.5' y='2.5' width='115' height='115' fill='none' stroke='#fff6d8' stroke-width='1.6' opacity='.85'/>
  <rect x='26' y='26' width='68' height='68' fill='none' stroke='#6b4f14' stroke-width='2.4'/>
  <rect x='29.5' y='29.5' width='61' height='61' fill='none' stroke='#ffeec2' stroke-width='1' opacity='.7'/>

  <!-- CORNERS: round brilliants, claw-set -->
  <g>
    <g transform='translate(15,15)'>
      <g fill='#f3d888'><circle cx='0' cy='-12' r='2.6'/><circle cx='12' cy='0' r='2.6'/><circle cx='0' cy='12' r='2.6'/><circle cx='-12' cy='0' r='2.6'/></g>
      <circle r='11' fill='#3d0007'/>
      <polygon points='0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7' fill='#c9142a'/>
      <polygon points='0,-6.5 4.6,-4.6 6.5,0 4.6,4.6 0,6.5 -4.6,4.6 -6.5,0 -4.6,-4.6' fill='#ef4b5c'/>
      <polygon points='0,-3.4 2.4,-2.4 3.4,0 2.4,2.4 0,3.4 -2.4,2.4 -3.4,0 -2.4,-2.4' fill='#ff9aa4'/>
      <path d='M-6 -6 L-1 -3 L-3 -1 Z' fill='#ffffff' opacity='.92'/>
    </g>
    <g transform='translate(105,15)'>
      <g fill='#f3d888'><circle cx='0' cy='-12' r='2.6'/><circle cx='12' cy='0' r='2.6'/><circle cx='0' cy='12' r='2.6'/><circle cx='-12' cy='0' r='2.6'/></g>
      <circle r='11' fill='#00113d'/>
      <polygon points='0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7' fill='#1b3fae'/>
      <polygon points='0,-6.5 4.6,-4.6 6.5,0 4.6,4.6 0,6.5 -4.6,4.6 -6.5,0 -4.6,-4.6' fill='#3f74e8'/>
      <polygon points='0,-3.4 2.4,-2.4 3.4,0 2.4,2.4 0,3.4 -2.4,2.4 -3.4,0 -2.4,-2.4' fill='#a8c9ff'/>
      <path d='M-6 -6 L-1 -3 L-3 -1 Z' fill='#ffffff' opacity='.92'/>
    </g>
    <g transform='translate(15,105)'>
      <g fill='#f3d888'><circle cx='0' cy='-12' r='2.6'/><circle cx='12' cy='0' r='2.6'/><circle cx='0' cy='12' r='2.6'/><circle cx='-12' cy='0' r='2.6'/></g>
      <circle r='11' fill='#00220f'/>
      <polygon points='0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7' fill='#0f7a41'/>
      <polygon points='0,-6.5 4.6,-4.6 6.5,0 4.6,4.6 0,6.5 -4.6,4.6 -6.5,0 -4.6,-4.6' fill='#2fb96c'/>
      <polygon points='0,-3.4 2.4,-2.4 3.4,0 2.4,2.4 0,3.4 -2.4,2.4 -3.4,0 -2.4,-2.4' fill='#adf5cd'/>
      <path d='M-6 -6 L-1 -3 L-3 -1 Z' fill='#ffffff' opacity='.92'/>
    </g>
    <g transform='translate(105,105)'>
      <g fill='#f3d888'><circle cx='0' cy='-12' r='2.6'/><circle cx='12' cy='0' r='2.6'/><circle cx='0' cy='12' r='2.6'/><circle cx='-12' cy='0' r='2.6'/></g>
      <circle r='11' fill='#3d0007'/>
      <polygon points='0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7' fill='#c9142a'/>
      <polygon points='0,-6.5 4.6,-4.6 6.5,0 4.6,4.6 0,6.5 -4.6,4.6 -6.5,0 -4.6,-4.6' fill='#ef4b5c'/>
      <polygon points='0,-3.4 2.4,-2.4 3.4,0 2.4,2.4 0,3.4 -2.4,2.4 -3.4,0 -2.4,-2.4' fill='#ff9aa4'/>
      <path d='M-6 -6 L-1 -3 L-3 -1 Z' fill='#ffffff' opacity='.92'/>
    </g>
  </g>

  <!-- MID-RUN: marquise cuts, set lengthwise along each edge -->
  <g>
    <g transform='translate(60,14)'>
      <polygon points='0,-9 4,0 0,9 -4,0' fill='#00220f'/>
      <polygon points='0,-7.4 3,0 0,7.4 -3,0' fill='#17924f'/>
      <polygon points='0,-4 1.6,0 0,4 -1.6,0' fill='#8ff0bd'/>
      <path d='M-1.6 -3 L0 -1 L-1 0 Z' fill='#ffffff' opacity='.9'/>
      <g fill='#f3d888'><circle cx='0' cy='-9' r='1.8'/><circle cx='0' cy='9' r='1.8'/></g>
    </g>
    <g transform='translate(60,106)'>
      <polygon points='0,-9 4,0 0,9 -4,0' fill='#00113d'/>
      <polygon points='0,-7.4 3,0 0,7.4 -3,0' fill='#2350c8'/>
      <polygon points='0,-4 1.6,0 0,4 -1.6,0' fill='#b3d0ff'/>
      <path d='M-1.6 -3 L0 -1 L-1 0 Z' fill='#ffffff' opacity='.9'/>
      <g fill='#f3d888'><circle cx='0' cy='-9' r='1.8'/><circle cx='0' cy='9' r='1.8'/></g>
    </g>
    <g transform='translate(14,60) rotate(90)'>
      <polygon points='0,-9 4,0 0,9 -4,0' fill='#00113d'/>
      <polygon points='0,-7.4 3,0 0,7.4 -3,0' fill='#2350c8'/>
      <polygon points='0,-4 1.6,0 0,4 -1.6,0' fill='#b3d0ff'/>
      <path d='M-1.6 -3 L0 -1 L-1 0 Z' fill='#ffffff' opacity='.9'/>
      <g fill='#f3d888'><circle cx='0' cy='-9' r='1.8'/><circle cx='0' cy='9' r='1.8'/></g>
    </g>
    <g transform='translate(106,60) rotate(90)'>
      <polygon points='0,-9 4,0 0,9 -4,0' fill='#00220f'/>
      <polygon points='0,-7.4 3,0 0,7.4 -3,0' fill='#17924f'/>
      <polygon points='0,-4 1.6,0 0,4 -1.6,0' fill='#8ff0bd'/>
      <path d='M-1.6 -3 L0 -1 L-1 0 Z' fill='#ffffff' opacity='.9'/>
      <g fill='#f3d888'><circle cx='0' cy='-9' r='1.8'/><circle cx='0' cy='9' r='1.8'/></g>
    </g>
  </g>

  <!-- BETWEEN: little pear cuts and gold beading, because sixteen
       stones is vulgar and vulgar is the brief -->
  <g>
    <g transform='translate(37,13)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(83,13)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(37,107)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(83,107)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(13,37) rotate(90)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(13,83) rotate(90)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(107,37) rotate(90)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
    <g transform='translate(107,83) rotate(90)'><polygon points='0,-6 3.4,1 0,6 -3.4,1' fill='#5a4a00'/><polygon points='0,-4.6 2.4,.8 0,4.6 -2.4,.8' fill='#ffd23f'/><polygon points='0,-2.4 1.2,.4 0,2.4 -1.2,.4' fill='#fff6c2'/></g>
  </g>

  <!-- rope beading, so no run of gold is ever plain -->
  <g fill='url(#rope)'>
    <circle cx='26' cy='13' r='1.5'/><circle cx='48' cy='13' r='1.5'/><circle cx='72' cy='13' r='1.5'/><circle cx='94' cy='13' r='1.5'/>
    <circle cx='26' cy='107' r='1.5'/><circle cx='48' cy='107' r='1.5'/><circle cx='72' cy='107' r='1.5'/><circle cx='94' cy='107' r='1.5'/>
    <circle cx='13' cy='26' r='1.5'/><circle cx='13' cy='48' r='1.5'/><circle cx='13' cy='72' r='1.5'/><circle cx='13' cy='94' r='1.5'/>
    <circle cx='107' cy='26' r='1.5'/><circle cx='107' cy='48' r='1.5'/><circle cx='107' cy='72' r='1.5'/><circle cx='107' cy='94' r='1.5'/>
  </g>
</svg>`)}")`,
      // NO 'fill' keyword. It paints the SVG's middle slice across the whole
      // element background, which flooded the entire cabinet gold and buried
      // the stage. The middle of a bezel is meant to be empty.
      borderImageSlice: '30',
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
