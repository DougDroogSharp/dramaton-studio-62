import React from 'react';
import { Quote } from '@/types';

// Quote pop-up card (Design Addendum 01 §6): paper texture, dieselpunk
// attribution line, DISPUTED tag when the attribution is contested.

interface QuoteCardProps {
  quote: Quote;
  onDismiss: () => void;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onDismiss }) => (
  <div
    className="absolute right-3 top-16 w-[34%] min-w-[260px] max-w-[420px] cursor-pointer select-none animate-in fade-in slide-in-from-right-4 duration-300"
    style={{ zIndex: 340 }}
    onClick={onDismiss}
    title="Click to dismiss"
  >
    <div className="bg-diesel-paper text-diesel-black border-2 border-diesel-black shadow-2xl px-4 py-3 rounded-sm">
      <div className="text-3xl leading-none text-diesel-rust font-serif">“</div>
      <p className="text-sm leading-snug -mt-3 font-serif italic">{quote.text}</p>
      <div className="mt-2 pt-1.5 border-t border-diesel-black/20 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide">
          — {quote.speaker}
        </span>
        <span className="text-[10px] text-diesel-black/60 font-mono truncate">
          {quote.source}{quote.year ? `, ${quote.year}` : ''}
        </span>
      </div>
      {quote.sourcing === 'DISPUTED' && (
        <div className="mt-1 text-[9px] uppercase tracking-widest text-diesel-rust">
          ⚠ attribution contested
        </div>
      )}
    </div>
  </div>
);
