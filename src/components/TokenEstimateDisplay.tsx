import React from 'react';
import { TokenEstimate, formatTokens } from '@/utils/tokenEstimate';
import { Zap } from 'lucide-react';

interface TokenEstimateDisplayProps {
  estimate: TokenEstimate;
  compact?: boolean;
}

export const TokenEstimateDisplay: React.FC<TokenEstimateDisplayProps> = ({ estimate, compact = false }) => {
  const levelColors = {
    low: 'text-diesel-green',
    medium: 'text-diesel-gold',
    high: 'text-diesel-rust',
  };
  
  const levelBgColors = {
    low: 'bg-diesel-green/10 border-diesel-green/30',
    medium: 'bg-diesel-gold/10 border-diesel-gold/30',
    high: 'bg-diesel-rust/10 border-diesel-rust/30',
  };
  
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${levelColors[estimate.level]}`}>
        <Zap size={10} />
        ~{formatTokens(estimate.total)} tokens
      </span>
    );
  }
  
  return (
    <div className={`p-2 border text-xs ${levelBgColors[estimate.level]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 font-bold uppercase tracking-wider">
          <Zap size={12} />
          Est. Tokens
        </span>
        <span className={`font-mono font-bold ${levelColors[estimate.level]}`}>
          ~{formatTokens(estimate.total)}
        </span>
      </div>
      <div className="flex gap-3 text-diesel-steel">
        <span>Prompt: {estimate.breakdown.prompt}</span>
        {estimate.breakdown.styleGuide > 0 && (
          <span>Style: {estimate.breakdown.styleGuide}</span>
        )}
        {estimate.breakdown.references > 0 && (
          <span>Refs: {estimate.breakdown.references}</span>
        )}
      </div>
    </div>
  );
};
