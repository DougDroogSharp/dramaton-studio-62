import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { DramatonLogo } from '@/components/DramatonLogo';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SecurityDialog } from '@/components/SecurityDialog';
import kingOfChicagoImage from '@/assets/king-of-chicago.jpg';

interface StageButtonStripProps {
  onLogoClick?: () => void;
}

export const StageButtonStrip: React.FC<StageButtonStripProps> = ({ onLogoClick }) => {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      setShowAboutDialog(true);
    }
  };

  return (
    <>
      {/* Button Strip */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-diesel-black/80 border-t border-diesel-border">
        <button
          onClick={handleLogoClick}
          className="p-1.5 hover:bg-diesel-panel/50 transition-colors rounded border border-diesel-border hover:border-diesel-gold"
          title="About Dramaton"
        >
          <DramatonLogo className="w-6 h-6 text-diesel-gold" />
        </button>
        <button
          onClick={() => setShowSecurityDialog(true)}
          className="p-1.5 hover:bg-diesel-panel/50 transition-colors rounded border border-diesel-border hover:border-diesel-gold"
          title="Security & Privacy"
        >
          <Shield className="w-5 h-5 text-diesel-gold" />
        </button>
      </div>

      {/* About Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="bg-diesel-panel border-diesel-border max-w-2xl">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <DramatonLogo className="w-12 h-12 text-diesel-gold" />
              <h2 className="text-2xl text-diesel-gold font-bold uppercase tracking-wider">Dramaton</h2>
            </div>
            <p className="text-diesel-paper text-sm leading-relaxed">
              A tool for authoring interactive experiences in the tradition of visual novels, 
              point-and-click adventures, and cinematic games.
            </p>
            <p className="text-diesel-steel text-xs">
              Created by Doug Sharp • Version 0.1.0
            </p>
            {/* King of Chicago Section */}
            <div className="bg-diesel-black/50 border border-diesel-border p-4 rounded">
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => setShowFullImage(true)}
                  className="flex-shrink-0 group"
                  title="Click to view full size"
                >
                  <img 
                    src={kingOfChicagoImage} 
                    alt="King of Chicago box art" 
                    className="w-28 rounded shadow-lg border-2 border-diesel-border group-hover:border-diesel-gold transition-colors"
                  />
                </button>
                <div className="text-left flex-1">
                  <p className="text-diesel-paper text-sm leading-relaxed mb-2">
                    The Dramaton design is inspired by Doug's previous game, 
                    <span className="text-diesel-gold font-bold"> The King of Chicago</span>
                    —the pioneering 1987 interactive movie.
                  </p>
                  <div className="space-y-2 text-xs text-diesel-steel italic">
                    <p>"A brilliantly devised game that far outstrips others of its genre." <span className="text-diesel-gold not-italic">— Personal Computer World</span></p>
                    <p>"One of the best gangster games ever made." <span className="text-diesel-gold not-italic">— Home of The Underdogs</span></p>
                    <p>"A masterwork of interactive cinema." <span className="text-diesel-gold not-italic">— Interactive Fiction Database</span></p>
                  </div>
                </div>
              </div>
            </div>
            <a 
              href="https://dougsharp.wordpress.com/talks-and-papers-about-games-and-interactive-narrative/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-diesel-cyan hover:text-diesel-gold text-sm underline"
            >
              More About Dramaton
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Dialog */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="bg-diesel-black border-diesel-border max-w-3xl p-2">
          <img 
            src={kingOfChicagoImage} 
            alt="King of Chicago box art - full size" 
            className="w-full rounded"
          />
        </DialogContent>
      </Dialog>

      {/* Security Dialog */}
      <SecurityDialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog} />
    </>
  );
};

