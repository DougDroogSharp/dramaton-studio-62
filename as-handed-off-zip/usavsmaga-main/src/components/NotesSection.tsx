import { useState } from 'react';
import { ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NotesSectionProps {
  note: string;
  onChange: (note: string) => void;
  inline?: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ note, onChange, inline = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasNote = note && note.trim().length > 0;

  // Inline mode - compact popover for header placement
  if (inline) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-1 px-2 py-1 border text-[10px] font-bold uppercase transition-colors ${
              hasNote 
                ? 'border-diesel-gold/50 text-diesel-gold hover:bg-diesel-gold/20' 
                : 'border-diesel-border text-diesel-steel hover:border-diesel-steel'
            }`}
            title={hasNote ? note.slice(0, 100) : 'Add notes'}
          >
            <StickyNote size={12} />
            {hasNote && <span className="max-w-16 truncate">{note.slice(0, 15)}{note.length > 15 ? '…' : ''}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-2 bg-diesel-panel border-diesel-border" 
          align="start"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-1 mb-2">
            <StickyNote size={12} className="text-diesel-gold" />
            <span className="text-[10px] font-bold uppercase text-diesel-gold">Notes</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add notes, TODOs, or references..."
            className="w-full h-24 bg-diesel-dark border border-diesel-border p-2 text-sm text-diesel-paper placeholder:text-diesel-steel/50 resize-y focus:outline-none focus:border-diesel-gold/50"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Default expanded mode
  return (
    <div className="border border-diesel-border bg-diesel-dark/50">
      {/* Header - click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-diesel-border/20 transition-colors"
      >
        <span className="text-diesel-steel">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <StickyNote size={14} className={hasNote ? 'text-diesel-gold' : 'text-diesel-steel'} />
        <span className={`text-xs font-bold uppercase tracking-wider ${hasNote ? 'text-diesel-gold' : 'text-diesel-steel'}`}>
          Notes
        </span>
        {hasNote && !isExpanded && (
          <span className="text-[10px] text-diesel-steel truncate flex-1 text-left ml-2 italic">
            {note.slice(0, 50)}{note.length > 50 ? '...' : ''}
          </span>
        )}
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add notes, TODOs, or references..."
            className="w-full h-24 bg-diesel-panel border border-diesel-border p-2 text-sm text-diesel-paper placeholder:text-diesel-steel/50 resize-y focus:outline-none focus:border-diesel-gold/50"
          />
        </div>
      )}
    </div>
  );
};
