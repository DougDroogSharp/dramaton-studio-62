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
//   │   speaker · line · choices   │
//   └──────────────────────────────┘

interface StageConsoleProps {
  /** The stage itself, already sized 16:9 by the caller. */
  children: React.ReactNode;
  meterRows: MeterRow[];
  worldState?: WorldVars;
  moneyFormat?: string;
  /** Hide the meter READOUT; the frame keeps its height regardless. */
  showMeters?: boolean;
  /** The line on the plate: dialogue or narration, null for empty. */
  narration?: string | null;
  /** Keyed so a screen reader re-announces each new line. */
  narrationKey?: string | number;
  /** Who is speaking — an icon and a name. Null while narrating. */
  speaker?: { name: string; imageUrl?: string } | null;
  /** Choices, offered on the plate rather than floating over the art. */
  choices?: { text: string }[] | null;
  onSelectChoice?: (index: number) => void;
  /** Which choice the one-switch scanner is resting on. */
  scanIndex?: number | null;
  /** Click the line to move the show along. */
  onAdvance?: () => void;
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
  speaker,
  choices,
  onSelectChoice,
  scanIndex,
  onAdvance,
  frame,
  drawer,
  drawerTitle,
  onCloseDrawer,
  frameMood,
}) => {
  const skin = frameFor(frame);
  const line = narration;
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

      {/* THE SPEAKING PLATE — fixed height; an empty plate is correct.
          Everything said and every choice offered happens here, in one
          place, at one size. No balloons over the stage: the picture is
          never covered, the reader's eye never hunts, and a player who
          needs large text or a screen reader gets one predictable region
          instead of text scattered across the art. */}
      <div
        className={`${skin.divider} ${skin.plate} px-4 py-2 flex flex-col justify-center gap-1.5 overflow-y-auto`}
        style={{ height: '188px' }}
      >
        {/* Who is talking */}
        {speaker && (
          <div className="flex items-center gap-2 shrink-0">
            {speaker.imageUrl ? (
              <img
                src={speaker.imageUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-current opacity-90"
                style={{ objectPosition: 'top center' }}
              />
            ) : (
              <span
                className={`w-8 h-8 rounded-full border border-current flex items-center justify-center text-xs font-bold ${skin.label}`}
                aria-hidden="true"
              >
                {speaker.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className={`text-[11px] uppercase tracking-[0.2em] font-bold ${skin.label}`}>
              {speaker.name}
            </span>
          </div>
        )}

        {/* What was said, or the narration */}
        {line ? (
          <p
            key={narrationKey}
            className={`${skin.plateText} text-sm md:text-base leading-snug animate-fade-in`}
            onClick={onAdvance}
          >
            {line}
          </p>
        ) : !choices?.length ? (
          <span className={`opacity-30 text-[10px] uppercase tracking-[0.3em] ${skin.label}`}>
            &mdash;
          </span>
        ) : null}

        {/* What can be done about it */}
        {!!choices?.length && (
          <div className="flex flex-col gap-1 mt-0.5 shrink-0" role="group" aria-label="Choices">
            {choices.map((c, i) => (
              <button
                key={i}
                onClick={() => onSelectChoice?.(i)}
                aria-current={scanIndex === i ? 'true' : undefined}
                className={`
                  text-left text-sm px-3 py-1.5 border transition-colors
                  ${scanIndex === i
                    ? 'border-current font-bold opacity-100'
                    : 'border-current/30 opacity-80 hover:opacity-100 hover:border-current'}
                  ${skin.plateText}
                `}
              >
                <span className={`mr-2 text-[10px] tracking-widest ${skin.label}`}>{i + 1}</span>
                {c.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
