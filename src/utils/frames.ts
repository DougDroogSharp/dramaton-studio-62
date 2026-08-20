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
  /** optional decorative styles applied to the shell */
  shellStyle?: React.CSSProperties;
}

export const FRAMES: Record<FrameId, FrameSkin> = {
  // The engine's own: riveted iron and gold needles.
  diesel: {
    id: 'diesel',
    name: 'Dieselpunk console',
    shell: 'border-2 border-diesel-border bg-diesel-panel/40 shadow-2xl',
    divider: 'border-t-2 border-diesel-border',
    shelf: 'bg-diesel-black/40',
    plate: 'bg-diesel-black/60',
    plateText: 'text-diesel-paper',
    label: 'text-diesel-steel',
  },

  // William: the show is a strip of embroidery, and the instruments
  // are stitched into the border the way the tapestry keeps its
  // commentary in the margins.
  linen: {
    id: 'linen',
    name: 'Bayeux linen',
    shell: 'border-[6px] shadow-2xl',
    divider: 'border-t-2',
    shelf: '',
    plate: '',
    plateText: 'text-[#2b2118]',
    label: 'text-[#7a6a4a]',
    shellStyle: {
      borderColor: '#c9bb9a',
      background: '#efe7d4',
      boxShadow: 'inset 0 0 60px rgba(160,140,100,.25), 0 10px 40px rgba(0,0,0,.5)',
    },
  },

  // Leopold: a brass survey instrument on a dark mahogany bench —
  // the machinery of an administration that measured everything.
  brass: {
    id: 'brass',
    name: 'Colonial brass',
    shell: 'border-[5px] shadow-2xl',
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
    shell: 'border-[6px] shadow-2xl',
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
    shell: 'border shadow-xl',
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
