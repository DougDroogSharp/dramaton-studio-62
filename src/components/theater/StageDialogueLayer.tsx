import React from 'react';
import { Scene, StageElementOverride } from '@/types';
import { ActiveDialogue, ChoiceState } from '@/hooks/useScriptRunner';
import { speakerColor } from '@/utils/speakerColor';

// Comic-style presentation layer over the stage:
// - actor speech renders as a talk balloon anchored near the speaker
// - (thinking) lines render as a thought balloon (dashed, italic)
// - choices render as the player's own thought balloon
// Narration stays in the top narration window (handled by the caller).

interface StageDialogueLayerProps {
  scene: Scene | undefined;
  dialogue: ActiveDialogue | null; // non-narrator dialogue only
  choices: ChoiceState | null;
  elementOverrides: Map<string, StageElementOverride>;
  onAdvance: () => void;
  onSelectChoice: (index: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const StageDialogueLayer: React.FC<StageDialogueLayerProps> = ({
  scene,
  dialogue,
  choices,
  elementOverrides,
  onAdvance,
  onSelectChoice,
}) => {
  // Anchor the balloon near the speaking actor's stage element
  let anchorX = 50;
  let anchorY = 68;
  let speakerScale = 1;
  let foundSpeaker = false;
  if (dialogue?.actorId && scene?.stage) {
    const el = scene.stage.find(e => e.type === 'ACTOR' && e.assetId === dialogue.actorId);
    if (el) {
      const ov = elementOverrides.get(el.id);
      anchorX = ov?.x ?? el.x;
      anchorY = ov?.y ?? el.y;
      speakerScale = ov?.scale ?? el.scale ?? 1;
      foundSpeaker = true;
    }
  }
  // Intelligent placement: the balloon's BOTTOM edge sits above the
  // speaker's head (estimated from element center + scale), shifted
  // sideways toward the emptier half of the stage so it never covers
  // the face; the tail points back at the speaker.
  const headTop = anchorY - clamp(12 * speakerScale, 12, 32); // % above element center
  const sideShift = anchorX <= 50 ? 15 : -15;
  const balloonLeft = clamp(anchorX + sideShift, 20, 80);
  const balloonBottom = foundSpeaker ? clamp(100 - headTop + 2, 40, 92) : 88;
  const isThought = dialogue?.style === 'thought';
  const color = dialogue ? speakerColor(dialogue.actorName) : undefined;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 300 }}>
      {/* Talk / thought balloon for the current speech */}
      {dialogue && (
        <div
          className="absolute pointer-events-auto cursor-pointer select-none"
          style={{ left: `${balloonLeft}%`, bottom: `${balloonBottom}%`, transform: 'translateX(-50%)', width: '36%', minWidth: '240px', maxWidth: '480px' }}
          onClick={onAdvance}
        >
          <div
            className={`relative px-4 py-3 bg-diesel-paper/95 shadow-lg ${
              isThought
                ? 'rounded-3xl border-2 border-dashed border-diesel-steel italic'
                : 'rounded-2xl border-2 border-diesel-black'
            }`}
          >
            {/* Speaker name chip */}
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color }}
            >
              {dialogue.actorName}
            </div>
            <p className="text-diesel-black text-base leading-snug">
              {dialogue.text}
            </p>
            <div className="text-right text-diesel-steel text-[10px] mt-0.5 animate-pulse">▸</div>

            {/* Tail: pointed for speech, bubbles for thought — aimed at the speaker */}
            {foundSpeaker && !isThought && (
              <div
                className="absolute -bottom-[13px]"
                style={{
                  left: `${clamp(50 + (anchorX - balloonLeft) * 2.2, 10, 90)}%`,
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '14px solid hsl(var(--diesel-paper))',
                  transform: `translateX(-50%) ${anchorX < balloonLeft ? 'skewX(14deg)' : anchorX > balloonLeft ? 'skewX(-14deg)' : ''}`,
                }}
              />
            )}
            {foundSpeaker && isThought && (
              <div
                className="absolute -bottom-6 flex flex-col gap-0.5"
                style={{ left: `${clamp(50 + (anchorX - balloonLeft) * 2.2, 10, 90)}%`, transform: 'translateX(-50%)', alignItems: anchorX < balloonLeft ? 'flex-start' : 'flex-end' }}
              >
                <span className="w-3 h-3 rounded-full bg-diesel-paper/90 border border-dashed border-diesel-steel" />
                <span className="w-2 h-2 rounded-full bg-diesel-paper/80 border border-dashed border-diesel-steel" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Choices: the player's own thought balloon */}
      {choices && (
        <div
          className="absolute pointer-events-auto select-none"
          style={{ left: '50%', top: '26%', transform: 'translate(-50%, -50%)', width: '44%', minWidth: '280px', maxWidth: '560px' }}
        >
          <div className="relative px-4 py-3 bg-diesel-paper/95 rounded-3xl border-2 border-dashed border-diesel-steel shadow-xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-diesel-steel mb-2 italic">
              What do I do…
            </div>
            <div>
              {choices.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => onSelectChoice(i)}
                  className="w-full text-left px-3 py-2 text-diesel-black text-sm font-medium italic border-b border-diesel-steel/25 last:border-0 hover:bg-diesel-gold/30 transition-colors rounded"
                >
                  <span className="text-diesel-steel mr-2 not-italic">{i + 1}.</span>
                  {option.text}
                </button>
              ))}
            </div>
            {/* thought-bubble trail */}
            <div className="absolute -bottom-7 left-[38%] flex flex-col items-start gap-1">
              <span className="w-4 h-4 rounded-full bg-diesel-paper/90 border-2 border-dashed border-diesel-steel" />
              <span className="w-2.5 h-2.5 rounded-full bg-diesel-paper/80 border border-dashed border-diesel-steel ml-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
