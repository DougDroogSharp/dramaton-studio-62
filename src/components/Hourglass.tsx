import React, { useMemo } from 'react';

interface HourglassProps {
  remainingMinutes: number; // 0-30, where 30 is full and 0 is empty
  className?: string;
}

const Hourglass: React.FC<HourglassProps> = ({ remainingMinutes, className = '' }) => {
  // Calculate fill percentages (0-30 minutes mapped to percentage)
  const fillPercent = Math.max(0, Math.min(100, (remainingMinutes / 30) * 100));
  const topFill = fillPercent; // Top bulb empties as time passes
  const bottomFill = 100 - fillPercent; // Bottom bulb fills as time passes

  // Generate sparkle particles
  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      delay: i * 0.3,
      x: 48 + (Math.random() - 0.5) * 10,
      duration: 1.5 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 96 160" style={{ width: 120, height: 200 }}>
        <defs>
          {/* Sand gradient */}
          <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(40 50% 55%)" />
            <stop offset="100%" stopColor="hsl(35 45% 40%)" />
          </linearGradient>
          
          {/* Glass gradient */}
          <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(40 15% 35%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(40 15% 50%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(40 15% 35%)" stopOpacity="0.6" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="sandGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Sparkle filter */}
          <filter id="sparkleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Clip paths for sand in bulbs */}
          <clipPath id="topBulb">
            <path d="M 20 10 Q 20 5, 28 5 L 68 5 Q 76 5, 76 10 L 76 55 Q 76 70, 48 78 Q 20 70, 20 55 Z" />
          </clipPath>
          <clipPath id="bottomBulb">
            <path d="M 48 82 Q 76 90, 76 105 L 76 150 Q 76 155, 68 155 L 28 155 Q 20 155, 20 150 L 20 105 Q 20 90, 48 82 Z" />
          </clipPath>
        </defs>
        
        {/* Frame - top cap */}
        <rect x="16" y="0" width="64" height="8" rx="2" fill="hsl(40 15% 30%)" stroke="hsl(40 15% 40%)" strokeWidth="1" />
        <rect x="20" y="2" width="56" height="4" fill="hsl(40 15% 35%)" />
        
        {/* Frame - bottom cap */}
        <rect x="16" y="152" width="64" height="8" rx="2" fill="hsl(40 15% 30%)" stroke="hsl(40 15% 40%)" strokeWidth="1" />
        <rect x="20" y="154" width="56" height="4" fill="hsl(40 15% 35%)" />
        
        {/* Glass outer shape */}
        <path 
          d="M 20 10 Q 20 5, 28 5 L 68 5 Q 76 5, 76 10 L 76 55 Q 76 75, 48 80 Q 20 75, 20 55 Z" 
          fill="hsl(24 8% 12%)" 
          stroke="hsl(40 15% 40%)" 
          strokeWidth="2"
        />
        <path 
          d="M 48 80 Q 76 85, 76 105 L 76 150 Q 76 155, 68 155 L 28 155 Q 20 155, 20 150 L 20 105 Q 20 85, 48 80 Z" 
          fill="hsl(24 8% 12%)" 
          stroke="hsl(40 15% 40%)" 
          strokeWidth="2"
        />
        
        {/* Neck connection */}
        <ellipse cx="48" cy="80" rx="6" ry="3" fill="hsl(40 15% 25%)" stroke="hsl(40 15% 40%)" strokeWidth="1" />
        
        {/* Glass reflection */}
        <path 
          d="M 24 15 Q 22 15, 22 20 L 22 50 Q 22 55, 26 55" 
          fill="none" 
          stroke="url(#glassGradient)" 
          strokeWidth="2"
          opacity="0.5"
        />
        <path 
          d="M 24 115 Q 22 115, 22 120 L 22 145 Q 22 150, 26 150" 
          fill="none" 
          stroke="url(#glassGradient)" 
          strokeWidth="2"
          opacity="0.5"
        />
        
        {/* Top sand - fills from bottom up based on remaining time */}
        <g clipPath="url(#topBulb)">
          <rect 
            x="18" 
            y={10 + (70 * (1 - topFill / 100))} 
            width="60" 
            height={70 * (topFill / 100)} 
            fill="url(#sandGradient)"
            filter="url(#sandGlow)"
          >
            <animate 
              attributeName="y" 
              dur="60s" 
              repeatCount="indefinite"
              values={`${10 + (70 * (1 - topFill / 100))};${10 + (70 * (1 - topFill / 100)) + 1};${10 + (70 * (1 - topFill / 100))}`}
            />
          </rect>
          {/* Sand surface texture */}
          <ellipse 
            cx="48" 
            cy={10 + (70 * (1 - topFill / 100)) + 2} 
            rx="28" 
            ry="4" 
            fill="hsl(40 55% 60%)"
            opacity={topFill > 5 ? 0.6 : 0}
          />
        </g>
        
        {/* Bottom sand - fills from bottom up */}
        <g clipPath="url(#bottomBulb)">
          <rect 
            x="18" 
            y={155 - (70 * bottomFill / 100)} 
            width="60" 
            height={70 * bottomFill / 100} 
            fill="url(#sandGradient)"
            filter="url(#sandGlow)"
          />
          {/* Sand pile top - cone shape */}
          {bottomFill > 10 && (
            <ellipse 
              cx="48" 
              cy={155 - (70 * bottomFill / 100) + 2} 
              rx={20 + (bottomFill / 100) * 8} 
              ry="5" 
              fill="hsl(40 55% 60%)"
              opacity="0.6"
            />
          )}
        </g>
        
        {/* Falling sand stream */}
        {remainingMinutes > 0 && (
          <g>
            <line 
              x1="48" 
              y1="78" 
              x2="48" 
              y2={85 + Math.min(65, 70 * bottomFill / 100)} 
              stroke="url(#sandGradient)" 
              strokeWidth="3"
              opacity="0.9"
            >
              <animate 
                attributeName="stroke-width" 
                values="2;3;2" 
                dur="0.5s" 
                repeatCount="indefinite" 
              />
            </line>
            {/* Sand particles in stream */}
            <circle cx="48" cy="85" r="1.5" fill="hsl(40 50% 55%)">
              <animate attributeName="cy" values="78;140" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="47" cy="95" r="1" fill="hsl(40 50% 55%)">
              <animate attributeName="cy" values="78;140" dur="0.9s" repeatCount="indefinite" begin="0.2s" />
              <animate attributeName="opacity" values="1;0" dur="0.9s" repeatCount="indefinite" begin="0.2s" />
            </circle>
            <circle cx="49" cy="100" r="1.2" fill="hsl(40 50% 55%)">
              <animate attributeName="cy" values="78;140" dur="0.7s" repeatCount="indefinite" begin="0.4s" />
              <animate attributeName="opacity" values="1;0" dur="0.7s" repeatCount="indefinite" begin="0.4s" />
            </circle>
          </g>
        )}
        
        {/* Sparkles in bottom chamber */}
        {remainingMinutes > 0 && sparkles.map((sparkle) => (
          <g key={sparkle.id} filter="url(#sparkleGlow)">
            <circle 
              cx={sparkle.x} 
              cy="140" 
              r="1.5" 
              fill="hsl(45 80% 70%)"
            >
              <animate 
                attributeName="cy" 
                values={`${150 - (bottomFill * 0.6)};${145 - (bottomFill * 0.6)};${150 - (bottomFill * 0.6)}`}
                dur={`${sparkle.duration}s`} 
                repeatCount="indefinite" 
                begin={`${sparkle.delay}s`}
              />
              <animate 
                attributeName="opacity" 
                values="0;1;0" 
                dur={`${sparkle.duration}s`} 
                repeatCount="indefinite" 
                begin={`${sparkle.delay}s`}
              />
              <animate 
                attributeName="r" 
                values="0.5;2;0.5" 
                dur={`${sparkle.duration}s`} 
                repeatCount="indefinite" 
                begin={`${sparkle.delay}s`}
              />
            </circle>
          </g>
        ))}
        
        {/* Additional sparkle bursts when sand lands */}
        {remainingMinutes > 0 && (
          <>
            <circle cx="45" cy="145" r="1" fill="hsl(50 90% 75%)" filter="url(#sparkleGlow)">
              <animate attributeName="cx" values="48;42;48" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="51" cy="143" r="0.8" fill="hsl(50 90% 80%)" filter="url(#sparkleGlow)">
              <animate attributeName="cx" values="48;54;48" dur="1.7s" repeatCount="indefinite" begin="0.5s" />
              <animate attributeName="opacity" values="0;0.9;0" dur="1.7s" repeatCount="indefinite" begin="0.5s" />
            </circle>
            <circle cx="48" cy="142" r="1.2" fill="hsl(45 85% 72%)" filter="url(#sparkleGlow)">
              <animate attributeName="cy" values="145;138;145" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
              <animate attributeName="opacity" values="0;1;0" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
            </circle>
          </>
        )}
        
        {/* Frame rivets */}
        <circle cx="22" cy="4" r="2" fill="hsl(40 15% 40%)" />
        <circle cx="74" cy="4" r="2" fill="hsl(40 15% 40%)" />
        <circle cx="22" cy="156" r="2" fill="hsl(40 15% 40%)" />
        <circle cx="74" cy="156" r="2" fill="hsl(40 15% 40%)" />
      </svg>
    </div>
  );
};

export default Hourglass;
