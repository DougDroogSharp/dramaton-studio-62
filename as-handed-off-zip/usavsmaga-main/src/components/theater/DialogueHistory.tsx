import React, { useEffect, useRef } from 'react';
import { X, ScrollText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DialogueHistoryEntry {
  id: string;
  actorName: string;
  text: string;
  style: 'speech' | 'thought';
  timestamp: number;
}

interface DialogueHistoryProps {
  entries: DialogueHistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const DialogueHistory: React.FC<DialogueHistoryProps> = ({
  entries,
  isOpen,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when opened
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-diesel-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[80vh] bg-diesel-panel border-2 border-diesel-gold relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-diesel-border">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-diesel-gold" />
            <h2 className="text-diesel-paper font-bold uppercase tracking-wider">
              Dialogue History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-diesel-steel hover:text-diesel-paper transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-diesel-rust" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-diesel-rust" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-diesel-rust" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-diesel-rust" />

        {/* Content */}
        <ScrollArea className="h-[60vh]" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {entries.length === 0 ? (
              <p className="text-diesel-steel text-center py-8 italic">
                No dialogue yet...
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 border-l-2 ${
                    entry.style === 'thought' 
                      ? 'border-diesel-steel bg-diesel-black/30 italic' 
                      : 'border-diesel-gold bg-diesel-black/50'
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-diesel-rust font-bold text-sm uppercase tracking-wide">
                      {entry.actorName}
                    </span>
                  </div>
                  <p className="text-diesel-paper text-sm leading-relaxed">
                    {entry.style === 'thought' && <span className="text-diesel-steel">(</span>}
                    {entry.text}
                    {entry.style === 'thought' && <span className="text-diesel-steel">)</span>}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="p-3 border-t border-diesel-border text-center">
          <span className="text-diesel-steel text-xs">
            Press <kbd className="px-1.5 py-0.5 bg-diesel-black border border-diesel-border rounded text-diesel-gold">H</kbd> or <kbd className="px-1.5 py-0.5 bg-diesel-black border border-diesel-border rounded text-diesel-gold">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
