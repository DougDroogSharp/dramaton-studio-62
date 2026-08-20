import React from 'react';
import { Menu, Play, Pause, FastForward, Volume2, VolumeX, Settings, Home, ArrowLeft, Gauge } from 'lucide-react';

interface TheaterControlsProps {
  isAutoPlay: boolean;
  isMuted: boolean;
  onToggleAutoPlay: () => void;
  onToggleMute: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
  onBackToMenu: () => void;
  onSkip?: () => void;
  // The model, showing its work: the console shelf readout
  showMeters?: boolean;
  onToggleMeters?: () => void;
}

export const TheaterControls: React.FC<TheaterControlsProps> = ({
  showMeters,
  onToggleMeters,
  isAutoPlay,
  isMuted,
  onToggleAutoPlay,
  onToggleMute,
  onOpenMenu,
  onOpenSettings,
  onGoHome,
  onBackToMenu,
  onSkip,
}) => {
  return (
    <div className="w-full bg-diesel-black/90 border-t-2 border-diesel-border">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToMenu}
              className="p-2 text-diesel-steel hover:text-diesel-rust transition-colors"
              title="Back to Menu"
            >
              <ArrowLeft size={20} />
            </button>
            
            <button
              onClick={onOpenMenu}
              className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
              title="Menu"
            >
              <Menu size={20} />
            </button>
            
            <button
              onClick={onGoHome}
              className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
              title="Return to Title"
            >
              <Home size={20} />
            </button>
          </div>
          
          {/* Center controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoPlay}
              className={`
                flex items-center gap-2 px-4 py-2 border-2 
                ${isAutoPlay 
                  ? 'border-diesel-gold bg-diesel-gold/20 text-diesel-gold' 
                  : 'border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold'
                }
                transition-colors text-xs font-bold uppercase
              `}
              title={isAutoPlay ? 'Stop Auto-Play' : 'Start Auto-Play'}
            >
              {isAutoPlay ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden sm:inline">Auto</span>
            </button>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="
                  flex items-center gap-2 px-4 py-2 border-2 border-diesel-border
                  text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold
                  transition-colors text-xs font-bold uppercase
                "
                title="Skip"
              >
                <FastForward size={14} />
                <span className="hidden sm:inline">Skip</span>
              </button>
            )}
          </div>
          
          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className={`
                p-2 transition-colors
                ${isMuted ? 'text-diesel-rust' : 'text-diesel-steel hover:text-diesel-gold'}
              `}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            {onToggleMeters && (
              <button
                onClick={onToggleMeters}
                aria-pressed={!!showMeters}
                className={`p-2 transition-colors ${
                  showMeters ? 'text-diesel-gold' : 'text-diesel-steel hover:text-diesel-gold'
                }`}
                title={showMeters ? 'Hide the model' : 'Show the model: what this scene is changing'}
              >
                <Gauge size={20} />
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
