import React from 'react';
import { MeterPanel, MeterRow } from './MeterPanel';
import { WorldVars } from '@/utils/expression';
import { frameFor } from '@/utils/frames';

// The cabinet the show is played inside.
//
// The stage NEVER resizes. Every region of this frame reserves its
// height whether or not it currently has anything in it, so nothing
// on screen moves when a gauge starts reading or a line of narration
// arrives. Watching the picture jump is worse than any information
// the jump was carrying.
//
//   ┌──────────────────────────────┐
//   │   stage — fixed 16:9         │
//   ├──────────────────────────────┤
//   │   meters (reserved height)   │
//   ├──────────────────────────────┤
//   │   narration (reserved height)│
//   └──────────────────────────────┘

interface StageConsoleProps {
  /** The stage itself, already sized 16:9 by the caller. */
  children: React.ReactNode;
  meterRows: MeterRow[];
  worldState?: WorldVars;
  moneyFormat?: string;
  /** Hide the meter READOUT; the frame keeps its height regardless. */
  showMeters?: boolean;
  /** The narration line for the plate, or null for an empty plate. */
  narration?: string | null;
  /** Keyed so a screen reader re-announces each new line. */
  narrationKey?: string | number;
  /** Which cabinet: diesel | linen | brass | amiga | flat. */
  frame?: string;
  /** Content for the drawer that rises over the stage; null = closed. */
  drawer?: React.ReactNode;
  drawerTitle?: string;
  onCloseDrawer?: () => void;
  /** [FRAME mood]: the cabinet reacting for a beat. */
  frameMood?: { mood: string; seq: number } | null;
}

export const StageConsole: React.FC<StageConsoleProps> = ({
  children,
  meterRows,
  worldState,
  moneyFormat,
  showMeters = true,
  narration,
  narrationKey,
  frame,
  drawer,
  drawerTitle,
  onCloseDrawer,
  frameMood,
}) => {
  const skin = frameFor(frame);
  // Known moods only, so a typo in a script cannot inject a class.
  const moodClass = frameMood && ['fun', 'scary', 'sad'].includes(frameMood.mood)
    ? `animate-frame-${frameMood.mood}`
    : '';
  return (
    <div
      key={frameMood?.seq ?? 0}
      className={`w-full ${skin.shell} ${moodClass}`}
      style={skin.shellStyle}
    >
      {/* THE STAGE — never changes size for any reason */}
      <div className="relative overflow-hidden">
        {children}

        {/* The drawer rises out of the console and covers the stage.
            The show is still there behind it, and closing it puts
            everything back exactly where it was — no modal, no blanked
            screen, no layout moved. */}
        {drawer && (
          <div
            className="absolute inset-0 flex flex-col animate-drawer-up"
            style={{ zIndex: 400 }}
            role="dialog"
            aria-modal="true"
            aria-label={drawerTitle ?? 'Settings'}
          >
            <div
              className={`flex items-center justify-between px-4 py-2 ${skin.divider} ${skin.plate}`}
            >
              <span className={`text-[11px] uppercase tracking-[0.25em] ${skin.label}`}>
                {drawerTitle ?? 'Settings'}
              </span>
              <button
                onClick={onCloseDrawer}
                autoFocus
                className={`px-3 py-1 text-xs uppercase tracking-widest border ${skin.label} hover:opacity-100 opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold`}
              >
                Close
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto px-4 py-3 ${skin.shelf}`}>
              {drawer}
            </div>
          </div>
        )}
      </div>

      {/* THE INSTRUMENT SHELF — fixed height, empty when nothing moved */}
      <div
        className={`${skin.divider} ${skin.shelf} overflow-y-auto`}
        style={{ height: '132px' }}
      >
        {showMeters ? (
          <MeterPanel
            rows={meterRows}
            worldState={worldState}
            moneyFormat={moneyFormat}
            maxRows={3}
          />
        ) : (
          <div className={`h-full flex items-center justify-center opacity-40 text-[10px] uppercase tracking-[0.3em] ${skin.label}`}>
            instruments off
          </div>
        )}
      </div>

      {/* THE NARRATION PLATE — fixed height; an empty plate is correct */}
      <div
        className={`${skin.divider} ${skin.plate} px-4 py-2 flex items-center`}
        style={{ height: '74px' }}
      >
        {narration ? (
          <p
            key={narrationKey}
            className={`${skin.plateText} text-sm md:text-base leading-snug animate-fade-in`}
          >
            {narration}
          </p>
        ) : (
          <span className={`opacity-30 text-[10px] uppercase tracking-[0.3em] ${skin.label}`}>
            &mdash;
          </span>
        )}
      </div>
    </div>
  );
};
