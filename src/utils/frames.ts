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
    shell: 'bezel-band shadow-2xl',
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
      <stop offset='0' stop-color='#fff8dd'/><stop offset='.15' stop-color='#efd58c'/>
      <stop offset='.4' stop-color='#c19733'/><stop offset='.63' stop-color='#77560f'/>
      <stop offset='.84' stop-color='#dfbb66'/><stop offset='1' stop-color='#fdf1c9'/>
    </linearGradient>
    <linearGradient id='dia' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#ffffff'/><stop offset='.35' stop-color='#e9f6ff'/>
      <stop offset='.7' stop-color='#a5c6e8'/><stop offset='1' stop-color='#ffffff'/>
    </linearGradient>
    <radialGradient id='rub' cx='.34' cy='.3'>
      <stop offset='0' stop-color='#ff8d99'/><stop offset='.45' stop-color='#c9142a'/>
      <stop offset='1' stop-color='#4d0009'/>
    </radialGradient>
    <radialGradient id='emr' cx='.34' cy='.3'>
      <stop offset='0' stop-color='#9df0c2'/><stop offset='.45' stop-color='#0f7a41'/>
      <stop offset='1' stop-color='#012a15'/>
    </radialGradient>

    <g id='tulip'>
      <path d='M0 17 C -2 10, -1.6 4, 0 0' fill='none' stroke='#0f7a41' stroke-width='2.2' stroke-linecap='round'/>
      <path d='M-0.6 10 C -7 9, -10 4.4, -9.4 -0.6 C -4 1.2, -1.8 5, -0.6 10 Z' fill='url(#emr)'/>
      <path d='M0.6 12.4 C 6.6 11.8, 9.6 7.4, 9.4 2.6 C 4.2 4.2, 1.8 8, 0.6 12.4 Z' fill='url(#emr)'/>
      <path d='M0 1 C -7 0, -8.6 -7, -6.2 -11.2 C -4.2 -7.6, -1.8 -5.4, 0 -4.2 Z' fill='url(#rub)'/>
      <path d='M0 1 C 7 0, 8.6 -7, 6.2 -11.2 C 4.2 -7.6, 1.8 -5.4, 0 -4.2 Z' fill='url(#rub)'/>
      <path d='M0 -3 C -3.6 -5.2, -4 -11, 0 -14 C 4 -11, 3.6 -5.2, 0 -3 Z' fill='url(#rub)'/>
      <path d='M-1.9 -9.4 C -2.4 -7, -1.4 -5.4, -0.5 -4.7' fill='none' stroke='#ffd0d6' stroke-width='.9' opacity='.85'/>
      <circle cx='0' cy='-7.6' r='1.8' fill='url(#dia)'/><circle cx='0' cy='-7.6' r='.9' fill='#fff'/>
      <path d='M5 6 C 9 4, 11 0, 10.4 -3' fill='none' stroke='#0f7a41' stroke-width='1.4' stroke-linecap='round'/>
      <path d='M10.4 -3 C 8.6 -5.6, 11.4 -7.6, 13 -5.4 C 14.2 -3.6, 12.4 -1.6, 10.4 -3 Z' fill='url(#rub)'/>
    </g>

    <!-- the money, set in gold with diamond terminals -->
    <g id='dollar'>
      <path d='M0 -11 L0 11' stroke='#5e4413' stroke-width='3.4' stroke-linecap='round'/>
      <path d='M5.4 -6.6 C 4 -9.6, -5.4 -10.4, -5.4 -5.2 C -5.4 -0.6, 5.4 -0.8, 5.4 4.4 C 5.4 9.8, -4.2 9.4, -5.6 6.2'
            fill='none' stroke='#5e4413' stroke-width='3.4' stroke-linecap='round'/>
      <path d='M0 -11 L0 11' stroke='#ffeec2' stroke-width='1.5' stroke-linecap='round'/>
      <path d='M5.4 -6.6 C 4 -9.6, -5.4 -10.4, -5.4 -5.2 C -5.4 -0.6, 5.4 -0.8, 5.4 4.4 C 5.4 9.8, -4.2 9.4, -5.6 6.2'
            fill='none' stroke='#ffeec2' stroke-width='1.5' stroke-linecap='round'/>
      <circle cx='0' cy='-11' r='1.9' fill='url(#dia)'/><circle cx='0' cy='-11' r='.9' fill='#fff'/>
      <circle cx='0' cy='11' r='1.9' fill='url(#dia)'/><circle cx='0' cy='11' r='.9' fill='#fff'/>
    </g>

    <!-- a C-scroll to spring off the main line wherever it looks bare -->
    <g id='curl'>
      <path d='M0 0 C 5 -4, 9 -1, 7.4 3 C 6.2 6, 2.2 6, 1.6 3'
            fill='none' stroke='#5e4413' stroke-width='1.5' stroke-linecap='round'/>
      <path d='M0 .9 C 5 -3.1, 9 -.1, 7.4 3.9 C 6.2 6.9, 2.2 6.9, 1.6 3.9'
            fill='none' stroke='#ffeec2' stroke-width='.85' stroke-linecap='round' opacity='.8'/>
    </g>
  </defs>

  <rect width='120' height='120' fill='url(#gold)'/>
  <rect x='27' y='27' width='66' height='66' fill='none' stroke='#65490f' stroke-width='2.6'/>
  <rect x='30' y='30' width='60' height='60' fill='none' stroke='#fff2c8' stroke-width='.9' opacity='.7'/>

  <!-- MAIN SCROLLWORK, doubling back -->
  <g fill='none' stroke='#5e4413' stroke-width='1.7' opacity='.6' stroke-linecap='round'>
    <path d='M27 18 C 36 3, 47 24, 58 12 C 66 3, 74 22, 84 10 C 88 5, 92 8, 93 13'/>
    <path d='M27 102 C 36 117, 47 96, 58 108 C 66 117, 74 98, 84 110 C 88 115, 92 112, 93 107'/>
    <path d='M18 27 C 3 36, 24 47, 12 58 C 3 66, 22 74, 10 84 C 5 88, 8 92, 13 93'/>
    <path d='M102 27 C 117 36, 96 47, 108 58 C 117 66, 98 74, 110 84 C 115 88, 112 92, 107 93'/>
  </g>
  <g fill='none' stroke='#ffeec2' stroke-width='.95' opacity='.8' stroke-linecap='round'>
    <path d='M27 19.4 C 36 4.4, 47 25.4, 58 13.4 C 66 4.4, 74 23.4, 84 11.4'/>
    <path d='M27 103.4 C 36 118.4, 47 97.4, 58 109.4 C 66 118.4, 74 99.4, 84 111.4'/>
    <path d='M19.4 27 C 4.4 36, 25.4 47, 13.4 58 C 4.4 66, 23.4 74, 11.4 84'/>
    <path d='M103.4 27 C 118.4 36, 97.4 47, 109.4 58 C 118.4 66, 99.4 74, 111.4 84'/>
  </g>

  <!-- C-scrolls springing off it -->
  <use href='#curl' transform='translate(34,20) rotate(-25)'/>
  <use href='#curl' transform='translate(74,18) rotate(155) scale(.9)'/>
  <use href='#curl' transform='translate(34,100) rotate(25)'/>
  <use href='#curl' transform='translate(74,102) rotate(-155) scale(.9)'/>
  <use href='#curl' transform='translate(20,34) rotate(65)'/>
  <use href='#curl' transform='translate(18,74) rotate(-115) scale(.9)'/>
  <use href='#curl' transform='translate(100,34) rotate(115)'/>
  <use href='#curl' transform='translate(102,74) rotate(-65) scale(.9)'/>

  <!-- THE MONEY, mid-run on every side -->
  <use href='#dollar' transform='translate(60,15) scale(1.05)'/>
  <use href='#dollar' transform='translate(60,105) scale(1.05)'/>
  <use href='#dollar' transform='translate(15,60) scale(1.05)'/>
  <use href='#dollar' transform='translate(105,60) scale(1.05)'/>

  <!-- TULIPS, bigger, each turned its own way -->
  <use href='#tulip' transform='translate(15,18) rotate(-14) scale(1.15)'/>
  <use href='#tulip' transform='translate(105,18) rotate(16) scale(1.08)'/>
  <use href='#tulip' transform='translate(15,102) rotate(194) scale(1.08)'/>
  <use href='#tulip' transform='translate(105,102) rotate(166) scale(1.15)'/>

  <!-- DIAMONDS THAT DO NOT BEHAVE.
       Insets and radii hand-set to defeat any rhythm: one jammed at the
       edge beside one riding deep, two nearly touching then a gap. -->
  <g fill='url(#dia)'>
    <circle cx='31' cy='6.5' r='1.1'/><circle cx='34.5' cy='13.8' r='2.6'/><circle cx='37' cy='8.2' r='1.5'/>
    <circle cx='41.5' cy='20.5' r='1.3'/><circle cx='44' cy='9.4' r='2.9'/><circle cx='46.5' cy='16.2' r='1.1'/>
    <circle cx='50' cy='6.2' r='1.9'/><circle cx='52' cy='12.4' r='1.2'/><circle cx='71' cy='19.6' r='2.4'/>
    <circle cx='74.5' cy='7.4' r='1.4'/><circle cx='78' cy='14.8' r='2.8'/><circle cx='80.2' cy='9.2' r='1.1'/>
    <circle cx='84.5' cy='20.2' r='1.6'/><circle cx='88' cy='11' r='2.2'/><circle cx='90.5' cy='17.5' r='1.2'/>

    <circle cx='31' cy='113.5' r='1.1'/><circle cx='34.5' cy='106.2' r='2.6'/><circle cx='37' cy='111.8' r='1.5'/>
    <circle cx='41.5' cy='99.5' r='1.3'/><circle cx='44' cy='110.6' r='2.9'/><circle cx='46.5' cy='103.8' r='1.1'/>
    <circle cx='50' cy='113.8' r='1.9'/><circle cx='52' cy='107.6' r='1.2'/><circle cx='71' cy='100.4' r='2.4'/>
    <circle cx='74.5' cy='112.6' r='1.4'/><circle cx='78' cy='105.2' r='2.8'/><circle cx='80.2' cy='110.8' r='1.1'/>
    <circle cx='84.5' cy='99.8' r='1.6'/><circle cx='88' cy='109' r='2.2'/><circle cx='90.5' cy='102.5' r='1.2'/>

    <circle cx='6.5' cy='31' r='1.1'/><circle cx='13.8' cy='34.5' r='2.6'/><circle cx='8.2' cy='37' r='1.5'/>
    <circle cx='20.5' cy='41.5' r='1.3'/><circle cx='9.4' cy='44' r='2.9'/><circle cx='16.2' cy='46.5' r='1.1'/>
    <circle cx='6.2' cy='50' r='1.9'/><circle cx='12.4' cy='52' r='1.2'/><circle cx='19.6' cy='71' r='2.4'/>
    <circle cx='7.4' cy='74.5' r='1.4'/><circle cx='14.8' cy='78' r='2.8'/><circle cx='9.2' cy='80.2' r='1.1'/>
    <circle cx='20.2' cy='84.5' r='1.6'/><circle cx='11' cy='88' r='2.2'/><circle cx='17.5' cy='90.5' r='1.2'/>

    <circle cx='113.5' cy='31' r='1.1'/><circle cx='106.2' cy='34.5' r='2.6'/><circle cx='111.8' cy='37' r='1.5'/>
    <circle cx='99.5' cy='41.5' r='1.3'/><circle cx='110.6' cy='44' r='2.9'/><circle cx='103.8' cy='46.5' r='1.1'/>
    <circle cx='113.8' cy='50' r='1.9'/><circle cx='107.6' cy='52' r='1.2'/><circle cx='100.4' cy='71' r='2.4'/>
    <circle cx='112.6' cy='74.5' r='1.4'/><circle cx='105.2' cy='78' r='2.8'/><circle cx='110.8' cy='80.2' r='1.1'/>
    <circle cx='99.8' cy='84.5' r='1.6'/><circle cx='109' cy='88' r='2.2'/><circle cx='102.5' cy='90.5' r='1.2'/>
  </g>

  <!-- hard flashes on the big ones only -->
  <g fill='#ffffff' opacity='.95'>
    <circle cx='43.4' cy='8.6' r='1'/><circle cx='77.4' cy='14' r='1'/>
    <circle cx='43.4' cy='111.4' r='1'/><circle cx='77.4' cy='106' r='1'/>
    <circle cx='8.6' cy='43.4' r='1'/><circle cx='14' cy='77.4' r='1'/>
    <circle cx='111.4' cy='43.4' r='1'/><circle cx='106' cy='77.4' r='1'/>
  </g>

  <!-- colour caught in the curls, off every line -->
  <g>
    <circle cx='57.5' cy='4.8' r='2.2' fill='url(#rub)'/><circle cx='66' cy='22' r='2' fill='url(#emr)'/>
    <circle cx='57.5' cy='115.2' r='2.2' fill='url(#emr)'/><circle cx='66' cy='98' r='2' fill='url(#rub)'/>
    <circle cx='4.8' cy='57.5' r='2.2' fill='url(#emr)'/><circle cx='22' cy='66' r='2' fill='url(#rub)'/>
    <circle cx='115.2' cy='57.5' r='2.2' fill='url(#rub)'/><circle cx='98' cy='66' r='2' fill='url(#emr)'/>
  </g>
</svg>`)}")`,
      // NO 'fill' keyword. It paints the SVG's middle slice across the whole
      // element background, which flooded the entire cabinet gold and buried
      // the stage. The middle of a bezel is meant to be empty.
      borderImageSlice: '32',
      borderImageRepeat: 'round',
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
