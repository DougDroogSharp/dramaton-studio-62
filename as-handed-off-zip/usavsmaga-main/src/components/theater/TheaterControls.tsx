import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Settings, 
  Package, 
  Search,
  Menu,
  Home,
  ArrowLeft
} from 'lucide-react';

interface TheaterControlsProps {
  isAutoPlay: boolean;
  isMuted: boolean;
  isPaused: boolean;
  onToggleAutoPlay: () => void;
  onToggleMute: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onOpenCollection: () => void;
  onOpenSearch?: () => void;
  collectedCount: number;
  onGoHome: () => void;
  onBackToMenu: () => void;
  onPlay?: () => void;
  onStepBack?: () => void;
  onRestart?: () => void;
  canStepBack?: boolean;
}

export const TheaterControls: React.FC<TheaterControlsProps> = ({
  isAutoPlay,
  isMuted,
  isPaused,
  onToggleAutoPlay,
  onToggleMute,
  onOpenMenu,
  onOpenSettings,
  onOpenCollection,
  onOpenSearch,
  collectedCount,
  onGoHome,
  onBackToMenu,
  onPlay,
  onStepBack,
  onRestart,
  canStepBack,
}) => {
  return (
    <div className="w-full bg-diesel-black/90 border-t-2 border-diesel-border">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left controls - Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToMenu}
              className="p-2 text-diesel-steel hover:text-diesel-rust transition-colors"
              title="Exit to Editor"
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
          
          {/* Center controls - Video Player Style */}
          <div className="flex items-center gap-1">
            {/* Restart button */}
            {onRestart && (
              <button
                onClick={onRestart}
                className="
                  p-2 border border-diesel-border text-diesel-steel 
                  hover:border-diesel-gold hover:text-diesel-gold
                  transition-colors
                "
                title="Restart Scene"
              >
                <RotateCcw size={18} />
              </button>
            )}
            
            {/* Step Back button */}
            {onStepBack && (
              <button
                onClick={onStepBack}
                disabled={!canStepBack}
                className="
                  p-2 border border-diesel-border text-diesel-steel
                  hover:border-diesel-cyan hover:text-diesel-cyan
                  transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-diesel-border disabled:hover:text-diesel-steel
                "
                title="Step Back"
              >
                <SkipBack size={18} />
              </button>
            )}
            
            {/* Play/Pause button - main control */}
            <button
              onClick={onToggleAutoPlay}
              className={`
                px-4 py-2 border-2 flex items-center gap-2
                ${isAutoPlay 
                  ? 'border-diesel-rust bg-diesel-rust/20 text-diesel-rust hover:bg-diesel-rust/30' 
                  : 'border-diesel-green bg-diesel-green/20 text-diesel-green hover:bg-diesel-green/30'
                }
                transition-colors font-bold text-xs uppercase
              `}
              title={isAutoPlay ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isAutoPlay ? <Pause size={16} /> : <Play size={16} />}
              <span className="hidden sm:inline">{isAutoPlay ? 'Pause' : 'Play'}</span>
            </button>
            
            {/* Skip Forward / Advance button */}
            {onPlay && (
              <button
                onClick={onPlay}
                disabled={isPaused && !isAutoPlay}
                className="
                  p-2 border border-diesel-border text-diesel-steel
                  hover:border-diesel-gold hover:text-diesel-gold
                  transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
                title="Advance (→)"
              >
                <SkipForward size={18} />
              </button>
            )}
          </div>
          
          {/* Right controls - Utilities */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
                title="Search (Ctrl+K)"
              >
                <Search size={20} />
              </button>
            )}
            
            {/* Collection button */}
            <button
              onClick={onOpenCollection}
              className="flex items-center gap-1 px-2 py-1.5 border border-diesel-gold
                       text-diesel-gold hover:bg-diesel-gold/20 transition-colors text-xs font-bold uppercase"
              title="View Collection"
            >
              <Package size={14} />
              <span className="hidden sm:inline">
                {collectedCount > 0 ? collectedCount : ''}
              </span>
            </button>
            
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
