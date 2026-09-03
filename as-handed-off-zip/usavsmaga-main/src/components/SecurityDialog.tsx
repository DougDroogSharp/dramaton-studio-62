import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Lock, Server, Eye, Database, Globe } from 'lucide-react';

interface SecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SecurityDialog: React.FC<SecurityDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-diesel-panel border-2 border-diesel-gold max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-diesel-gold text-xl">
            <Shield size={24} />
            Security & Privacy
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-diesel-paper">
          {/* Main message */}
          <p className="text-sm leading-relaxed">
            <strong className="text-diesel-gold">We take your security absolutely seriously.</strong> 
            {' '}Dramaton is designed with privacy-first principles.
          </p>
          
          {/* Key points */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-diesel-black/50 border border-diesel-border">
              <Lock size={18} className="text-diesel-green shrink-0 mt-0.5" />
              <div>
                <h4 className="text-diesel-gold font-bold text-sm">Local Storage Only</h4>
                <p className="text-xs text-diesel-steel">
                  Your player data (including your name) is stored locally on your device. 
                  It is <strong className="text-diesel-paper">never transmitted</strong> to our servers.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-diesel-black/50 border border-diesel-border">
              <Eye size={18} className="text-diesel-green shrink-0 mt-0.5" />
              <div>
                <h4 className="text-diesel-gold font-bold text-sm">No Tracking</h4>
                <p className="text-xs text-diesel-steel">
                  We don't use cookies for tracking. No analytics scripts are watching you. 
                  Your gameplay is your own.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-diesel-black/50 border border-diesel-border">
              <Database size={18} className="text-diesel-green shrink-0 mt-0.5" />
              <div>
                <h4 className="text-diesel-gold font-bold text-sm">You Control Your Data</h4>
                <p className="text-xs text-diesel-steel">
                  Clear your browser's local storage anytime to remove all Dramaton data from your device.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-diesel-black/50 border border-diesel-border">
              <Server size={18} className="text-diesel-cyan shrink-0 mt-0.5" />
              <div>
                <h4 className="text-diesel-gold font-bold text-sm">Icelandic Hosting</h4>
                <p className="text-xs text-diesel-steel">
                  Our servers are hosted by{' '}
                  <a 
                    href="https://1984.is" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-diesel-cyan hover:text-diesel-gold underline"
                  >
                    1984.is
                  </a>
                  , an Icelandic provider known for strong privacy laws and commitment to digital freedom.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-diesel-black/50 border border-diesel-border">
              <Globe size={18} className="text-diesel-purple shrink-0 mt-0.5" />
              <div>
                <h4 className="text-diesel-gold font-bold text-sm">Open Philosophy</h4>
                <p className="text-xs text-diesel-steel">
                  Dramaton is built on the belief that interactive storytelling should be 
                  accessible, private, and free from surveillance capitalism.
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="pt-4 border-t border-diesel-border">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
