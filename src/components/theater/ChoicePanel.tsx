import React from 'react';
import { ChoiceState } from '@/hooks/useScriptRunner';

interface ChoicePanelProps {
  choices: ChoiceState;
  onSelect: (index: number) => void;
}

export const ChoicePanel: React.FC<ChoicePanelProps> = ({ choices, onSelect }) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-3">
        {choices.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className="
              w-full p-4 text-left
              bg-diesel-panel border-2 border-diesel-border
              hover:border-diesel-gold hover:bg-diesel-gold/10
              transition-all duration-200
              group
            "
          >
            <div className="flex items-center gap-4">
              {/* Choice number */}
              <div className="
                w-8 h-8 flex items-center justify-center
                border-2 border-diesel-steel
                text-diesel-steel font-bold
                group-hover:border-diesel-gold group-hover:text-diesel-gold
                transition-colors
              ">
                {index + 1}
              </div>
              
              {/* Choice text */}
              <span className="
                flex-1 text-diesel-paper text-lg
                group-hover:text-diesel-gold
                transition-colors
              ">
                {option.text}
              </span>
              
              {/* Arrow indicator */}
              <svg 
                className="w-5 h-5 text-diesel-steel group-hover:text-diesel-gold group-hover:translate-x-1 transition-all"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
      
      {/* Keyboard hint */}
      <p className="text-center text-diesel-steel text-xs mt-4 uppercase tracking-wider">
        Press 1-{choices.options.length} or click to select
      </p>
    </div>
  );
};
