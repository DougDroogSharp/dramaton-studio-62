import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Shield, X } from 'lucide-react';
import { PlayerData, getPlaceholderName } from '@/utils/playerStore';

interface PlayerNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: PlayerData;
  onSaveName: (name: string) => void;
  onShowSecurity: () => void;
}

export const PlayerNameDialog: React.FC<PlayerNameDialogProps> = ({ 
  open, 
  onOpenChange,
  currentPlayer,
  onSaveName,
  onShowSecurity,
}) => {
  const [name, setName] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [hasStartedEditing, setHasStartedEditing] = useState(false);

  useEffect(() => {
    if (open) {
      // Generate a funny placeholder
      const funnyName = getPlaceholderName();
      setPlaceholder(funnyName);
      
      // If user already has a chosen name, show it
      if (currentPlayer.hasChosenName) {
        setName(currentPlayer.name);
        setHasStartedEditing(true);
      } else {
        setName(funnyName);
        setHasStartedEditing(false);
      }
    }
  }, [open, currentPlayer]);

  const handleFocus = () => {
    if (!hasStartedEditing) {
      setName('');
      setHasStartedEditing(true);
    }
  };

  const handleSave = () => {
    const finalName = name.trim() || placeholder;
    onSaveName(finalName);
    onOpenChange(false);
  };

  const handleSkip = () => {
    // Use the placeholder name
    onSaveName(placeholder);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-diesel-panel border-2 border-diesel-gold max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-diesel-gold text-xl">
            <User size={24} />
            Welcome, Player
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="text-xs uppercase tracking-widest text-diesel-steel mb-2 block">
              Player Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={handleFocus}
              placeholder={placeholder}
              className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-3 text-lg focus:outline-none focus:border-diesel-gold"
            />
            <p className="text-[10px] text-diesel-steel mt-2 italic">
              Name is not mandatory. Leave blank to play as "{placeholder}"
            </p>
          </div>
          
          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 bg-diesel-green/10 border border-diesel-green/30">
            <Shield size={16} className="text-diesel-green shrink-0 mt-0.5" />
            <div className="text-xs text-diesel-steel">
              <strong className="text-diesel-green">Your privacy is protected.</strong>
              {' '}Your name is stored locally on your device and is{' '}
              <strong className="text-diesel-paper">never transmitted</strong> to our servers.
            </div>
          </div>
          
          {/* Security link */}
          <button
            onClick={onShowSecurity}
            className="flex items-center gap-2 text-diesel-cyan hover:text-diesel-gold text-sm transition-colors"
          >
            <Shield size={14} />
            Learn more about our security practices
          </button>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSkip}
              className="flex-1 py-2 border border-diesel-border text-diesel-steel font-bold uppercase hover:border-diesel-paper hover:text-diesel-paper transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
