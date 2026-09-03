import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Keyboard, X } from 'lucide-react';
import { KeyboardShortcut, formatShortcut, groupShortcuts } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  navigation: 'Navigation',
  actions: 'Editor Actions',
  file: 'File Operations',
  playback: 'Playback',
};

const categoryColors: Record<string, string> = {
  navigation: 'text-diesel-gold',
  actions: 'text-diesel-green',
  file: 'text-diesel-paper',
  playback: 'text-diesel-rust',
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  isOpen,
  onClose,
}) => {
  const groups = groupShortcuts(shortcuts);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-diesel-dark border-diesel-border p-0 overflow-hidden">
        <div className="p-4 border-b border-diesel-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-diesel-gold">
            <Keyboard size={20} />
            <h2 className="text-lg font-bold uppercase tracking-widest">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-diesel-steel hover:text-diesel-paper transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <p className="text-xs text-diesel-steel mb-4">
            Press <span className="text-diesel-gold font-mono bg-diesel-panel px-1.5 py-0.5 border border-diesel-border">?</span> to toggle this help.
            TourBox users: program these combos for one-handed control.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groups).map(([category, categoryShortcuts]) => {
              if (categoryShortcuts.length === 0) return null;
              
              // Filter out duplicate shortcuts (like Delete and Backspace)
              const uniqueShortcuts = categoryShortcuts.filter((s, i, arr) => 
                arr.findIndex(x => x.description === s.description) === i
              );
              
              return (
                <div key={category}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${categoryColors[category] || 'text-diesel-paper'}`}>
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-1">
                    {uniqueShortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2 bg-diesel-black border border-diesel-border/50 hover:border-diesel-border transition-colors"
                      >
                        <span className="text-sm text-diesel-paper">{shortcut.description}</span>
                        <kbd className="font-mono text-xs bg-diesel-panel px-2 py-1 border border-diesel-border text-diesel-gold">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-3 bg-diesel-panel border border-diesel-gold/30">
            <h4 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-2">TourBox Tips</h4>
            <ul className="text-xs text-diesel-steel space-y-1">
              <li>• Map Ctrl+1-8 to the dial for quick editor switching</li>
              <li>• Map Ctrl+G (Generate) to a main button for fast AI generation</li>
              <li>• Map Escape to a knob press for easy back navigation</li>
              <li>• Map Ctrl+S and Ctrl+L to side buttons for saving</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Floating button to open help
export const KeyboardShortcutsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-3 bg-diesel-panel border border-diesel-border text-diesel-steel hover:text-diesel-gold hover:border-diesel-gold transition-colors shadow-lg"
      title="Keyboard Shortcuts (?)"
    >
      <Keyboard size={20} />
    </button>
  );
};
