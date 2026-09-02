import React from 'react';
import { ActiveDialogue } from '@/hooks/useScriptRunner';
import { Actor } from '@/types';

interface DialogueBoxProps {
  dialogue: ActiveDialogue;
  actor?: Actor;
  onAdvance: () => void;
}

// Per-speaker text colors: stable (hashed from the name), distinct,
// and readable on the near-black box. Narration stays neutral.
const SPEAKER_COLORS = [
  '#e8c878', // amber
  '#8fd0e8', // sky
  '#a8d8a0', // green
  '#e8a0a4', // rose
  '#c8a8e8', // violet
  '#e89860', // orange
  '#88c8b8', // teal
  '#d8d0a0', // sand
];

const speakerColor = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
};

// Pick a portrait for this utterance: prefer Closeup graphics, and vary
// the expression per line (stable hash of the text) so a speaker's face
// changes utterance to utterance as their pose matrix fills in.
const pickPortrait = (actor: Actor | undefined, text: string, expression?: string) => {
  const graphics = (actor?.graphics ?? []).filter(g => g.image);
  if (graphics.length === 0) return undefined;
  // Match the expression chosen for this utterance (stage sprite sync)
  if (expression) {
    const matching = graphics.filter(g => g.expression === expression);
    if (matching.length > 0) {
      return matching.find(g => g.pose === 'Closeup') ?? matching[0];
    }
  }
  const closeups = graphics.filter(g => g.pose === 'Closeup');
  const pool = closeups.length > 0 ? closeups : graphics;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
};

export const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogue, actor, onAdvance }) => {
  const isThought = dialogue.style === 'thought';
  const isNarration = dialogue.actorName.trim().toLowerCase() === 'narrator';
  const color = isNarration ? undefined : speakerColor(dialogue.actorName.trim().toLowerCase());
  const portrait = isNarration ? undefined : pickPortrait(actor, dialogue.text, dialogue.expression);

  return (
    <div
      className="w-full max-w-4xl mx-auto cursor-pointer select-none"
      onClick={onAdvance}
    >
      <div className={`relative ${isThought ? 'italic' : ''}`}>
        {/* Name plate: neutral steel for narration, speaker color otherwise */}
        <div className="absolute -top-6 left-4">
          <div
            className={`px-4 py-1 bg-diesel-black border-2 ${isNarration ? 'border-diesel-steel' : ''}`}
            style={color ? { borderColor: color } : undefined}
          >
            <span
              className={`font-bold uppercase tracking-wider text-sm ${isNarration ? 'text-diesel-steel' : ''}`}
              style={color ? { color } : undefined}
            >
              {dialogue.actorName}
            </span>
          </div>
        </div>
        
        {/* Dialogue box */}
        <div className={`
          relative p-6 pt-4 min-h-[120px]
          bg-diesel-black/95 
          border-2 ${isThought ? 'border-dashed border-diesel-steel' : 'border-diesel-gold'}
        `}>
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-diesel-rust" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-diesel-rust" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-diesel-rust" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-diesel-rust" />
          
          <div className="flex gap-4 items-start">
            {/* Speaker portrait beside the speech: head-cropped, framed
                in the speaker's color; expression varies per utterance */}
            {portrait && (
              <div
                className="shrink-0 w-20 h-20 md:w-24 md:h-24 bg-diesel-panel border-2 overflow-hidden"
                style={{ borderColor: color }}
              >
                <img
                  src={portrait.image}
                  alt={`${dialogue.actorName} (${portrait.expression})`}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'top' }}
                />
              </div>
            )}

            {/* Text content: narration is italic neutral; speech carries
                the speaker's color */}
            <p
              className={`text-lg leading-relaxed flex-1 ${isNarration ? 'italic text-diesel-paper/75' : 'text-diesel-paper'}`}
              style={color ? { color } : undefined}
            >
              {isThought && <span className="text-diesel-steel">(</span>}
              {dialogue.displayedText}
              <span className={`inline-block w-2 h-5 ml-1 align-middle ${
                dialogue.isComplete ? 'bg-diesel-gold animate-pulse' : 'bg-diesel-paper'
              }`} />
              {isThought && dialogue.displayedText.length === dialogue.text.length && (
                <span className="text-diesel-steel">)</span>
              )}
            </p>
          </div>
          
          {/* Continue indicator */}
          {dialogue.isComplete && (
            <div className="absolute bottom-2 right-4 flex items-center gap-1 text-diesel-gold text-xs uppercase tracking-wider animate-pulse">
              <span>Click to continue</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
