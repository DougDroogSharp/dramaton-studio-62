import React from 'react';
import { Pause } from 'lucide-react';
import { formatTime } from '@/utils/sceneDuration';
import { Progress } from '@/components/ui/progress';

interface TheaterProgressBarProps {
  currentCommandIndex: number;
  totalCommands: number;
  elapsedSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
  hasChoices: boolean;
}

export const TheaterProgressBar: React.FC<TheaterProgressBarProps> = ({
  currentCommandIndex,
  totalCommands,
  elapsedSeconds,
  totalSeconds,
  isPaused,
  hasChoices,
}) => {
  // Calculate progress percentage
  const progress = totalSeconds > 0 
    ? Math.min((elapsedSeconds / totalSeconds) * 100, 100)
    : (totalCommands > 0 ? (currentCommandIndex / totalCommands) * 100 : 0);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-diesel-black/50">
      {/* Time elapsed */}
      <span className="text-diesel-steel text-xs font-mono min-w-[40px]">
        {formatTime(elapsedSeconds)}
      </span>
      
      {/* Progress bar */}
      <div className="flex-1 relative">
        <Progress 
          value={progress} 
          className="h-2 bg-diesel-panel border border-diesel-border"
        />
        
        {/* Pause indicator overlay */}
        {isPaused && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <Pause size={12} className="text-diesel-gold animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Total time */}
      <span className="text-diesel-steel text-xs font-mono min-w-[40px] text-right">
        {formatTime(totalSeconds)}
        {hasChoices && '+'}
      </span>
      
      {/* Command counter */}
      <span className="text-diesel-steel/50 text-xs font-mono">
        [{currentCommandIndex}/{totalCommands}]
      </span>
    </div>
  );
};
