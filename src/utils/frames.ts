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
      <stop offset='0' stop-color='#ffffff'/><stop offset='.35' stop-color='#e6f4ff'/>
      <stop offset='.7' stop-color='#a9c8e8'/><stop offset='1' stop-color='#ffffff'/>
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
      
      <path d='M0 15 C -1.6 9, -1.4 4, 0 0' fill='none' stroke='#0f7a41' stroke-width='1.9' stroke-linecap='round'/>
      <path d='M-0.5 9 C -6 8, -8.5 4, -8 -0.5 C -3.5 1, -1.5 4.5, -0.5 9 Z' fill='url(#emr)'/>
      <path d='M0.5 11 C 5.6 10.4, 8.2 6.6, 8 2.4 C 3.6 3.8, 1.5 7, 0.5 11 Z' fill='url(#emr)'/>
      <path d='M0 1 C -6 0, -7.4 -6, -5.4 -9.6 C -3.6 -6.6, -1.6 -4.6, 0 -3.6 Z' fill='url(#rub)'/>
      <path d='M0 1 C 6 0, 7.4 -6, 5.4 -9.6 C 3.6 -6.6, 1.6 -4.6, 0 -3.6 Z' fill='url(#rub)'/>
      <path d='M0 -2.6 C -3 -4.4, -3.4 -9.4, 0 -12 C 3.4 -9.4, 3 -4.4, 0 -2.6 Z' fill='url(#rub)'/>
      <path d='M-1.6 -8 C -2 -6, -1.2 -4.6, -0.4 -4' fill='none' stroke='#ffd0d6' stroke-width='.8' opacity='.85'/>
      <circle cx='0' cy='-6.4' r='1.5' fill='url(#dia)'/>
      <circle cx='0' cy='-6.4' r='.7' fill='#fff'/>
    </g>
  </defs>

  <rect width='120' height='120' fill='url(#gold)'/>

  <!-- the only straight lines in the piece: hairlines holding the linen -->
  <rect x='24.5' y='24.5' width='71' height='71' fill='none' stroke='#65490f' stroke-width='2.4'/>
  <rect x='28' y='28' width='64' height='64' fill='none' stroke='#fff2c8' stroke-width='.9' opacity='.7'/>

  <!-- ============ SCROLLWORK: the metal curls, everywhere ============ -->
  <g fill='none' stroke='#5e4413' stroke-width='1.5' opacity='.55' stroke-linecap='round'>
    <path d='M30 16 C 40 4, 52 26, 62 14 C 72 3, 80 24, 90 13'/>
    <path d='M30 104 C 40 116, 52 94, 62 106 C 72 117, 80 96, 90 107'/>
    <path d='M16 30 C 4 40, 26 52, 14 62 C 3 72, 24 80, 13 90'/>
    <path d='M104 30 C 116 40, 94 52, 106 62 C 117 72, 96 80, 107 90'/>
  </g>
  <g fill='none' stroke='#ffeec2' stroke-width='.9' opacity='.75' stroke-linecap='round'>
    <path d='M30 17.4 C 40 5.4, 52 27.4, 62 15.4 C 72 4.4, 80 25.4, 90 14.4'/>
    <path d='M30 105.4 C 40 117.4, 52 95.4, 62 107.4 C 72 118.4, 80 97.4, 90 108.4'/>
    <path d='M17.4 30 C 5.4 40, 27.4 52, 15.4 62 C 4.4 72, 25.4 80, 14.4 90'/>
    <path d='M105.4 30 C 117.4 40, 95.4 52, 107.4 62 C 118.4 72, 96.4 80, 107.4 90'/>
  </g>

  <!-- ============ TULIPS at the corners, each turned differently ===== -->
  <use href='#tulip' transform='translate(15,17) rotate(-12) scale(1.05)'/>
  <use href='#tulip' transform='translate(105,17) rotate(14) scale(1)'/>
  <use href='#tulip' transform='translate(15,103) rotate(190) scale(1)'/>
  <use href='#tulip' transform='translate(105,103) rotate(168) scale(1.05)'/>

  <!-- ============ DIAMONDS THREADED ALONG THE SWIRLS ============ -->
  <!-- sizes rise and fall with the curve, so no two sit at one inset -->
  <g>
    <g fill='url(#dia)'>
      <circle cx='33' cy='12.6' r='1.3'/><circle cx='37' cy='8.6' r='1.8'/>
      <circle cx='42' cy='7.4' r='2.3'/><circle cx='47' cy='10.4' r='1.9'/>
      <circle cx='52' cy='15.4' r='1.4'/><circle cx='57' cy='18' r='1.9'/>
      <circle cx='62' cy='15' r='2.4'/><circle cx='67' cy='9.6' r='1.9'/>
      <circle cx='72' cy='7.4' r='1.4'/><circle cx='77' cy='10.6' r='2'/>
      <circle cx='82' cy='16' r='2.5'/><circle cx='87' cy='14' r='1.5'/>
    </g>
    <g fill='#ffffff' opacity='.9'>
      <circle cx='41.4' cy='6.8' r='.8'/><circle cx='61.4' cy='14.4' r='.9'/><circle cx='81.4' cy='15.4' r='.9'/>
    </g>
  </g>

  <g>
    <g fill='url(#dia)'>
      <circle cx='33' cy='107.4' r='1.3'/><circle cx='37' cy='111.4' r='1.8'/>
      <circle cx='42' cy='112.6' r='2.3'/><circle cx='47' cy='109.6' r='1.9'/>
      <circle cx='52' cy='104.6' r='1.4'/><circle cx='57' cy='102' r='1.9'/>
      <circle cx='62' cy='105' r='2.4'/><circle cx='67' cy='110.4' r='1.9'/>
      <circle cx='72' cy='112.6' r='1.4'/><circle cx='77' cy='109.4' r='2'/>
      <circle cx='82' cy='104' r='2.5'/><circle cx='87' cy='106' r='1.5'/>
    </g>
    <g fill='#ffffff' opacity='.9'>
      <circle cx='41.4' cy='113.2' r='.8'/><circle cx='61.4' cy='105.6' r='.9'/><circle cx='81.4' cy='104.6' r='.9'/>
    </g>
  </g>

  <g>
    <g fill='url(#dia)'>
      <circle cx='12.6' cy='33' r='1.3'/><circle cx='8.6' cy='37' r='1.8'/>
      <circle cx='7.4' cy='42' r='2.3'/><circle cx='10.4' cy='47' r='1.9'/>
      <circle cx='15.4' cy='52' r='1.4'/><circle cx='18' cy='57' r='1.9'/>
      <circle cx='15' cy='62' r='2.4'/><circle cx='9.6' cy='67' r='1.9'/>
      <circle cx='7.4' cy='72' r='1.4'/><circle cx='10.6' cy='77' r='2'/>
      <circle cx='16' cy='82' r='2.5'/><circle cx='14' cy='87' r='1.5'/>
    </g>
    <g fill='#ffffff' opacity='.9'>
      <circle cx='6.8' cy='41.4' r='.8'/><circle cx='14.4' cy='61.4' r='.9'/><circle cx='15.4' cy='81.4' r='.9'/>
    </g>
  </g>

  <g>
    <g fill='url(#dia)'>
      <circle cx='107.4' cy='33' r='1.3'/><circle cx='111.4' cy='37' r='1.8'/>
      <circle cx='112.6' cy='42' r='2.3'/><circle cx='109.6' cy='47' r='1.9'/>
      <circle cx='104.6' cy='52' r='1.4'/><circle cx='102' cy='57' r='1.9'/>
      <circle cx='105' cy='62' r='2.4'/><circle cx='110.4' cy='67' r='1.9'/>
      <circle cx='112.6' cy='72' r='1.4'/><circle cx='109.4' cy='77' r='2'/>
      <circle cx='104' cy='82' r='2.5'/><circle cx='106' cy='87' r='1.5'/>
    </g>
    <g fill='#ffffff' opacity='.9'>
      <circle cx='113.2' cy='41.4' r='.8'/><circle cx='105.6' cy='61.4' r='.9'/><circle cx='104.6' cy='81.4' r='.9'/>
    </g>
  </g>

  <!-- a few coloured stones caught in the curls, off any line at all -->
  <g>
    <circle cx='54' cy='6.6' r='2.1' fill='url(#rub)'/>
    <circle cx='70' cy='19.6' r='1.9' fill='url(#emr)'/>
    <circle cx='54' cy='113.4' r='2.1' fill='url(#emr)'/>
    <circle cx='70' cy='100.4' r='1.9' fill='url(#rub)'/>
    <circle cx='6.6' cy='54' r='2.1' fill='url(#emr)'/>
    <circle cx='19.6' cy='70' r='1.9' fill='url(#rub)'/>
    <circle cx='113.4' cy='54' r='2.1' fill='url(#rub)'/>
    <circle cx='100.4' cy='70' r='1.9' fill='url(#emr)'/>
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
