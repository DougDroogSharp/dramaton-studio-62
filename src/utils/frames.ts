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
      <stop offset='0' stop-color='#fff6d6'/><stop offset='.16' stop-color='#ecd083'/>
      <stop offset='.42' stop-color='#bd932f'/><stop offset='.66' stop-color='#7a5910'/>
      <stop offset='.85' stop-color='#dcb75f'/><stop offset='1' stop-color='#fbeec0'/>
    </linearGradient>
    <linearGradient id='dia' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#ffffff'/><stop offset='.4' stop-color='#dff0ff'/>
      <stop offset='.7' stop-color='#a9c8e8'/><stop offset='1' stop-color='#ffffff'/>
    </linearGradient>
  </defs>

  <rect width='120' height='120' fill='url(#gold)'/>
  <rect x='2' y='2' width='116' height='116' fill='none' stroke='#fff8e2' stroke-width='1.5' opacity='.9'/>
  <rect x='25' y='25' width='70' height='70' fill='none' stroke='#65490f' stroke-width='2.6'/>
  <rect x='28.5' y='28.5' width='63' height='63' fill='none' stroke='#fff2c8' stroke-width='1' opacity='.75'/>

  <!-- ============ CORNERS: four different stones ============ -->

  <!-- NW: emerald-cut ruby, stepped -->
  <g transform='translate(14,14)'>
    <rect x='-11' y='-8.5' width='22' height='17' rx='1.5' fill='#40000a'/>
    <rect x='-9.2' y='-6.9' width='18.4' height='13.8' fill='#a10f22'/>
    <rect x='-6.8' y='-5' width='13.6' height='10' fill='#d81f36'/>
    <rect x='-4' y='-2.9' width='8' height='5.8' fill='#f4626f'/>
    <path d='M-9 -6.6 L-4 -3 L-7 -1 Z' fill='#fff' opacity='.95'/>
    <g fill='#f7dd93'><circle cx='-11' cy='-8.5' r='2.3'/><circle cx='11' cy='-8.5' r='2.3'/><circle cx='-11' cy='8.5' r='2.3'/><circle cx='11' cy='8.5' r='2.3'/></g>
  </g>

  <!-- NE: trillion sapphire -->
  <g transform='translate(106,14)'>
    <polygon points='0,-11 10,7 -10,7' fill='#000c33'/>
    <polygon points='0,-8.4 7.6,5.4 -7.6,5.4' fill='#1c42b8'/>
    <polygon points='0,-4.8 4.4,3 -4.4,3' fill='#5286f0'/>
    <polygon points='0,-2 1.9,1.3 -1.9,1.3' fill='#c2dcff'/>
    <path d='M-6 3 L-1 -2 L-2 2 Z' fill='#fff' opacity='.95'/>
    <g fill='#f7dd93'><circle cx='0' cy='-11' r='2.2'/><circle cx='10' cy='7' r='2.2'/><circle cx='-10' cy='7' r='2.2'/></g>
  </g>

  <!-- SW: round brilliant DIAMOND, the big one -->
  <g transform='translate(14,106)'>
    <circle r='11.5' fill='#8fb6da'/>
    <circle r='10' fill='url(#dia)'/>
    <polygon points='0,-10 7,-7 10,0 7,7 0,10 -7,7 -10,0 -7,-7' fill='#f2fbff'/>
    <g stroke='#7ea7cf' stroke-width='.7' fill='none'>
      <polygon points='0,-6 4.2,-4.2 6,0 4.2,4.2 0,6 -4.2,4.2 -6,0 -4.2,-4.2'/>
      <path d='M0 -10 L0 -6 M7 -7 L4.2 -4.2 M10 0 L6 0 M7 7 L4.2 4.2 M0 10 L0 6 M-7 7 L-4.2 4.2 M-10 0 L-6 0 M-7 -7 L-4.2 -4.2'/>
    </g>
    <polygon points='0,-4 2.8,-2.8 4,0 0,2 -3,-1' fill='#ffffff'/>
    <path d='M-7 -5 L-2 -2 L-4 0 Z' fill='#fff'/>
    <g fill='#f7dd93'><circle cx='-8' cy='-8' r='2.4'/><circle cx='8' cy='-8' r='2.4'/><circle cx='-8' cy='8' r='2.4'/><circle cx='8' cy='8' r='2.4'/></g>
  </g>

  <!-- SE: pear emerald with a diamond shoulder each side -->
  <g transform='translate(106,106)'>
    <polygon points='0,-11 6.5,2 0,10 -6.5,2' fill='#00240f'/>
    <polygon points='0,-8.6 4.9,1.4 0,7.8 -4.9,1.4' fill='#0e8043'/>
    <polygon points='0,-5 2.8,.8 0,4.6 -2.8,.8' fill='#39cd7f'/>
    <polygon points='0,-2.2 1.2,.4 0,2 -1.2,.4' fill='#c6ffe2'/>
    <path d='M-3.6 -2 L-.6 -.4 L-1.8 1 Z' fill='#fff' opacity='.95'/>
    <g><circle cx='-9' cy='-2' r='3' fill='url(#dia)'/><circle cx='-9' cy='-2' r='1.3' fill='#fff'/></g>
    <g><circle cx='9' cy='-2' r='3' fill='url(#dia)'/><circle cx='9' cy='-2' r='1.3' fill='#fff'/></g>
  </g>

  <!-- ============ RUNS: a different rhythm on each edge ============ -->

  <!-- TOP: baguette diamond flanked by a stepping trio -->
  <g transform='translate(60,13)'>
    <rect x='-9' y='-5' width='18' height='10' rx='1' fill='#8fb6da'/>
    <rect x='-7.6' y='-3.8' width='15.2' height='7.6' fill='url(#dia)'/>
    <g stroke='#82abd2' stroke-width='.6'><path d='M-4 -3.8 L-4 3.8 M0 -3.8 L0 3.8 M4 -3.8 L4 3.8'/></g>
    <path d='M-7 -3.4 L-3 -1 L-5.4 .4 Z' fill='#fff'/>
  </g>
  <g fill='#c9142a'><circle cx='36' cy='13' r='4.6'/><circle cx='30' cy='13' r='2.8'/><circle cx='25.5' cy='13' r='1.7'/></g>
  <g fill='#ff8a95' opacity='.85'><circle cx='36' cy='11.6' r='1.7'/><circle cx='30' cy='12' r='1'/></g>
  <g><circle cx='84' cy='13' r='3.4' fill='url(#dia)'/><circle cx='84' cy='13' r='1.5' fill='#fff'/>
     <circle cx='90' cy='13' r='2.2' fill='url(#dia)'/><circle cx='95' cy='13' r='1.4' fill='url(#dia)'/></g>

  <!-- BOTTOM: off-centre marquise, pavé run, then one fat cabochon -->
  <g transform='translate(46,107) rotate(-14)'>
    <polygon points='0,-10 4.4,0 0,10 -4.4,0' fill='#000c33'/>
    <polygon points='0,-8 3.3,0 0,8 -3.3,0' fill='#2350c8'/>
    <polygon points='0,-4.2 1.7,0 0,4.2 -1.7,0' fill='#bcd6ff'/>
    <path d='M-1.8 -3.2 L0 -1 L-1 .4 Z' fill='#fff'/>
  </g>
  <g fill='url(#dia)'><circle cx='60' cy='107' r='1.6'/><circle cx='65' cy='107' r='1.6'/><circle cx='70' cy='107' r='1.6'/><circle cx='75' cy='107' r='1.6'/><circle cx='80' cy='107' r='1.6'/></g>
  <g><circle cx='92' cy='107' r='5.2' fill='#5a3d00'/><circle cx='92' cy='107' r='4.1' fill='#ffc21f'/><circle cx='90.6' cy='105.6' r='1.6' fill='#fff6c8'/></g>
  <g fill='#8ff0bd'><circle cx='28' cy='107' r='3.2'/></g><circle cx='27' cy='106' r='1.2' fill='#fff'/>

  <!-- LEFT: three sizes falling, then a diamond pair -->
  <g fill='#0f7a41'><circle cx='13' cy='34' r='4.4'/><circle cx='13' cy='42' r='2.6'/><circle cx='13' cy='48' r='1.6'/></g>
  <circle cx='11.8' cy='32.8' r='1.6' fill='#c9ffe4'/>
  <g><circle cx='13' cy='62' r='3.2' fill='url(#dia)'/><circle cx='13' cy='62' r='1.4' fill='#fff'/>
     <circle cx='13' cy='70' r='2' fill='url(#dia)'/></g>
  <g transform='translate(13,84) rotate(90)'>
    <polygon points='0,-7 3.9,1 0,7 -3.9,1' fill='#40000a'/>
    <polygon points='0,-5.4 2.7,.6 0,5.2 -2.7,.6' fill='#d81f36'/>
    <polygon points='0,-2.6 1.3,.3 0,2.4 -1.3,.3' fill='#ffb3bb'/>
  </g>

  <!-- RIGHT: pavé, then one enormous stone off the centre -->
  <g fill='url(#dia)'><circle cx='107' cy='32' r='1.7'/><circle cx='107' cy='37' r='1.7'/><circle cx='107' cy='42' r='1.7'/></g>
  <g transform='translate(107,56)'>
    <circle r='6.4' fill='#2a0034'/>
    <polygon points='0,-5.6 4,-4 5.6,0 4,4 0,5.6 -4,4 -5.6,0 -4,-4' fill='#8324a8'/>
    <polygon points='0,-3.2 2.3,-2.3 3.2,0 2.3,2.3 0,3.2 -2.3,2.3 -3.2,0 -2.3,-2.3' fill='#cf7ef0'/>
    <path d='M-3.4 -3 L-.6 -1.2 L-1.8 .2 Z' fill='#fff'/>
  </g>
  <g fill='#ffc21f'><circle cx='107' cy='72' r='2.6'/><circle cx='107' cy='79' r='1.6'/></g>
  <g><circle cx='107' cy='90' r='3.6' fill='url(#dia)'/><circle cx='107' cy='90' r='1.6' fill='#fff'/></g>
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
