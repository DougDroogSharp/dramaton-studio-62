import React from 'react';
import { ActiveDialogue } from '@/hooks/useScriptRunner';
import { Actor } from '@/types';

interface DialogueBoxProps {
  dialogue: ActiveDialogue;
  actor?: Actor;
  onAdvance: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogue, actor, onAdvance }) => {
  const isThought = dialogue.style === 'thought';
  
  return (
    <div
      className="w-full max-w-4xl mx-auto cursor-pointer select-none"
      onClick={onAdvance}
    >
      <div className={`relative ${isThought ? 'italic' : ''}`}>
        {/* Name plate */}
        <div className="absolute -top-6 left-4">
          <div className="px-4 py-1 bg-diesel-rust border-2 border-diesel-gold">
            <span className="text-diesel-paper font-bold uppercase tracking-wider text-sm">
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
          
          {/* Actor portrait (if available) */}
          {actor?.graphics[0]?.image && (
            <div className="absolute -left-20 bottom-0 w-16 h-20 hidden md:block">
              <img
                src={actor.graphics[0].image}
                alt={actor.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Text content */}
          <p className="text-diesel-paper text-lg leading-relaxed">
            {isThought && <span className="text-diesel-steel">(</span>}
            {dialogue.displayedText}
            <span className={`inline-block w-2 h-5 ml-1 align-middle ${
              dialogue.isComplete ? 'bg-diesel-gold animate-pulse' : 'bg-diesel-paper'
            }`} />
            {isThought && dialogue.displayedText.length === dialogue.text.length && (
              <span className="text-diesel-steel">)</span>
            )}
          </p>
          
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
