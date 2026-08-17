import { useMemo } from 'react';
import { GameData } from '@/types';
import { estimateProjectTokens, formatTokens } from '@/utils/tokenEstimate';
import { Zap } from 'lucide-react';

interface CostMeterProps {
  game: GameData;
}

/**
 * Always-visible cost readout: the estimated AI tokens represented by the
 * project's prompts and images. Observation only — no limits, no warnings.
 */
export const CostMeter: React.FC<CostMeterProps> = ({ game }) => {
  const total = useMemo(() => estimateProjectTokens(game), [game]);

  return (
    <div
      className="h-full px-2 flex items-center gap-1 border-l border-diesel-border text-diesel-gold font-mono text-[10px]"
      title="Estimated AI tokens across this project's prompts and images"
    >
      <Zap size={12} />
      <span>~{formatTokens(total)}</span>
    </div>
  );
};
