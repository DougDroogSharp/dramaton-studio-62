import React from 'react';
import { MeterPanel, MeterRow } from './MeterPanel';
import { WorldVars } from '@/utils/expression';
import { frameFor } from '@/utils/frames';
import { MachineDiagram } from './MachineDiagram';

// The cabinet the show is played inside.
//
// The stage NEVER resizes. Every region of this frame reserves its
// height whether or not it currently has anything in it, so nothing
// on screen moves when a gauge starts reading or a line of narration
// arrives. Watching the picture jump is worse than any information
// the jump was carrying.
//
// LANDSCAPE — switched on ORIENTATION, not width. A phone held sideways
// is 800px wide and 390px tall: wide enough to pass a width breakpoint,
// far too short to stack a 356px console under a stage. It got no stage
// at all. An iPad upright is 768px wide and must stack. Width cannot
// tell those two apart; aspect ratio can.
// Stacking the console UNDER the stage on a wide screen throws away the
// whole width and squeezes the picture into a strip. So the console
// stands beside the stage instead, and the stage gets the room:
//
//   ┌───────────────────────────┬──────────────┐
//   │                           │   meters     │
//   │   stage — 16:9, as big    ├──────────────┤
//   │   as the window allows    │   abilities  │
//   │                           ├──────────────┤
//   │                           │  speaker     │
//   │                           │  line        │
//   │                           │  choices     │
//   └───────────────────────────┴──────────────┘
//
// PORTRAIT (phone or iPad upright) falls back to the stack, where
// vertical space is the thing there is more of:
//
//   ┌──────────────────────────────┐
//   │   stage — 16:9               │
//   ├──────────────────────────────┤
//   │   meters                     │
//   ├──────────────────────────────┤
//   │   abilities                  │
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
  /** The five mid-scene accessibility switches, mounted on the frame. */
  abilityBar?: React.ReactNode;
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
  abilityBar,
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
      className={`w-full h-full flex flex-col [@media(min-aspect-ratio:1/1)]:flex-row ${skin.shell} ${moodClass}`}
      style={skin.shellStyle}
    >
      {/* THE STAGE — never changes size for any reason.
          It is also the advance target. On a touchscreen there is no
          space bar and no click-the-sentence: tapping the picture is the
          obvious gesture, so the whole stage takes it. Guarded twice —
          never while choices are up (the player is deciding, and a stray
          tap must not choose for them), and never when the tap landed on
          something interactive like a BUTTON or the settings drawer. */}
      <div
        // In PORTRAIT the console stacks underneath and its regions add
        // up to ~500px — on a phone that left the picture a sliver. The
        // stage is guaranteed 40% of the viewport there, and the console
        // takes what is left and scrolls inside itself if it needs more.
        // The show is the point; the instruments are the margin.
        className="relative overflow-hidden flex-1 min-w-0 flex items-center justify-center [@media(max-aspect-ratio:1/1)]:min-h-[40vh]"
        onClick={(e) => {
          if (!onAdvance || choices?.length) return;
          if ((e.target as HTMLElement).closest('button,a,input,select,textarea,[role="dialog"]')) return;
          onAdvance();
        }}
      >
        {/* Stage sizes itself from its WIDTH (w-full + aspectRatio 16/9),
            which overflows a cell that is height-constrained. This
            wrapper drives from height instead — fill the available
            height, derive the width, and cap at 100% so a tall narrow
            window falls back to width-limited. The picture stays 16:9
            either way and is as large as the window permits. */}
        <div
          className="relative"
          style={{ height: '100%', aspectRatio: '16 / 9', maxWidth: '100%', maxHeight: '100%' }}
        >
          {children}
        </div>

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

      {/* THE CONSOLE — beside the stage on a wide screen, beneath it on a
          narrow one. Fixed width when it stands beside, so the stage gets
          every pixel left over and never has to guess. */}
      <div className="w-full [@media(min-aspect-ratio:1/1)]:w-[22rem] shrink-0 flex flex-col [@media(min-aspect-ratio:1/1)]:border-l-2 [@media(min-aspect-ratio:1/1)]:border-current/20 [@media(max-aspect-ratio:1/1)]:flex-1 [@media(max-aspect-ratio:1/1)]:min-h-0 [@media(max-aspect-ratio:1/1)]:overflow-y-auto">

      {/* THE MACHINE, RUNNING — the mechanism under the scene. The
          gauges say a number moved; this says what it feeds. Fixed
          height, like every region of this cabinet. */}
      <div
        className={`${skin.divider} [@media(min-aspect-ratio:1/1)]:border-t-0 ${skin.shelf} ${skin.label} px-3 py-1 shrink-0`}
        style={{ height: '118px' }}
      >
        <MachineDiagram rows={meterRows} />
      </div>

      {/* THE INSTRUMENT SHELF — fixed height, empty when nothing moved */}
      <div
        className={`${skin.divider} ${skin.shelf} overflow-y-auto shrink-0`}
        style={{ height: '132px' }}
      >
        {showMeters ? (
          <MeterPanel
            rows={meterRows}
            worldState={worldState}
            moneyFormat={moneyFormat}
            maxRows={3}
            // The cabinet decides which era's instruments get drawn:
            // linen dials for William, brass for Leopold, and so on.
            frame={frame}
          />
        ) : (
          <div className={`h-full flex items-center justify-center opacity-40 text-[10px] uppercase tracking-[0.3em] ${skin.label}`}>
            instruments off
          </div>
        )}
      </div>

      {/* THE ABILITY RAIL — five switches on the cabinet itself, so the
          adjustments you make BECAUSE OF what is happening right now do
          not require stopping the show and opening a drawer. Fixed
          height, like everything else here. */}
      {abilityBar && (
        <div
          // skin.label is what gives the switches a colour: they draw
          // themselves in `currentColor` so they suit any cabinet, which
          // means they are INVISIBLE unless the rail sets one.
          className={`${skin.divider} ${skin.shelf} ${skin.label} px-3 py-1 flex items-center shrink-0 overflow-hidden`}
          style={{ height: '62px' }}
        >
          {abilityBar}
        </div>
      )}

      {/* THE SPEAKING PLATE — fixed height; an empty plate is correct.
          Everything said and every choice offered happens here, in one
          place, at one size. No balloons over the stage: the picture is
          never covered, the reader's eye never hunts, and a player who
          needs large text or a screen reader gets one predictable region
          instead of text scattered across the art. */}
      <div
        // Beside the stage it takes whatever height is left (flex-1);
        // stacked beneath, it keeps its reserved 188px so nothing on
        // screen moves when a line or a choice arrives.
        className={`${skin.divider} ${skin.plate} px-4 py-2 flex flex-col justify-center gap-1.5 overflow-y-auto h-[188px] [@media(min-aspect-ratio:1/1)]:h-auto [@media(min-aspect-ratio:1/1)]:flex-1 [@media(min-aspect-ratio:1/1)]:min-h-0`}
        // The plate advances on tap too, so a reader whose eyes are on
        // the words does not have to reach back up to the picture.
        onClick={(e) => {
          if (!onAdvance || choices?.length) return;
          if ((e.target as HTMLElement).closest('button')) return;
          onAdvance();
        }}
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
    </div>
  );
};
