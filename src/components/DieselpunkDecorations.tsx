import React from 'react';

// Rotating Gear SVG
export const Gear: React.FC<{ className?: string; size?: number; teeth?: number }> = ({ 
  className = '', 
  size = 100,
  teeth = 12 
}) => {
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.6;
  const holeRadius = outerRadius * 0.25;
  const toothDepth = outerRadius * 0.15;
  
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i * Math.PI) / teeth;
    const radius = i % 2 === 0 ? outerRadius : outerRadius - toothDepth;
    const x = size / 2 + Math.cos(angle - Math.PI / 2) * radius;
    const y = size / 2 + Math.sin(angle - Math.PI / 2) * radius;
    points.push(`${x},${y}`);
  }
  
  return (
    <svg 
      viewBox={`0 0 ${size} ${size}`} 
      className={className}
      style={{ width: size, height: size }}
    >
      <polygon 
        points={points.join(' ')} 
        fill="currentColor" 
        opacity="0.8"
      />
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={innerRadius} 
        fill="currentColor"
        opacity="0.6"
      />
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={holeRadius} 
        fill="hsl(24 8% 3%)"
      />
      {/* Cross spokes */}
      <rect x={size/2 - 2} y={holeRadius + size/2 - innerRadius + 5} width={4} height={innerRadius - holeRadius - 10} fill="hsl(24 8% 3%)" />
      <rect x={size/2 - 2} y={size/2 + holeRadius + 5} width={4} height={innerRadius - holeRadius - 10} fill="hsl(24 8% 3%)" />
      <rect x={holeRadius + size/2 - innerRadius + 5} y={size/2 - 2} width={innerRadius - holeRadius - 10} height={4} fill="hsl(24 8% 3%)" />
      <rect x={size/2 + holeRadius + 5} y={size/2 - 2} width={innerRadius - holeRadius - 10} height={4} fill="hsl(24 8% 3%)" />
    </svg>
  );
};

// Rivet/Bolt SVG
export const Rivet: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 12 }) => (
  <svg viewBox="0 0 20 20" className={className} style={{ width: size, height: size }}>
    <circle cx="10" cy="10" r="9" fill="hsl(40 15% 25%)" />
    <circle cx="10" cy="10" r="7" fill="hsl(40 15% 35%)" />
    <ellipse cx="8" cy="8" rx="3" ry="2" fill="hsl(40 15% 45%)" opacity="0.6" />
    <line x1="6" y1="10" x2="14" y2="10" stroke="hsl(40 15% 20%)" strokeWidth="1.5" />
    <line x1="10" y1="6" x2="10" y2="14" stroke="hsl(40 15% 20%)" strokeWidth="1.5" />
  </svg>
);

// Steam Pipe SVG - Horizontal
export const PipeHorizontal: React.FC<{ className?: string; width?: number }> = ({ className = '', width = 200 }) => (
  <svg viewBox={`0 0 ${width} 24`} className={className} style={{ width, height: 24 }}>
    <defs>
      <linearGradient id="pipeGradH" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(40 15% 35%)" />
        <stop offset="30%" stopColor="hsl(40 15% 25%)" />
        <stop offset="70%" stopColor="hsl(40 15% 20%)" />
        <stop offset="100%" stopColor="hsl(40 15% 30%)" />
      </linearGradient>
    </defs>
    <rect x="0" y="4" width={width} height="16" fill="url(#pipeGradH)" />
    {/* Joints every 50px */}
    {Array.from({ length: Math.floor(width / 50) }).map((_, i) => (
      <g key={i}>
        <rect x={i * 50} y="2" width="8" height="20" fill="hsl(40 15% 30%)" />
        <rect x={i * 50 + 2} y="4" width="4" height="16" fill="hsl(40 15% 40%)" />
      </g>
    ))}
    {/* Highlight */}
    <rect x="0" y="5" width={width} height="2" fill="hsl(40 15% 45%)" opacity="0.4" />
  </svg>
);

// Steam Pipe SVG - Vertical
export const PipeVertical: React.FC<{ className?: string; height?: number }> = ({ className = '', height = 200 }) => (
  <svg viewBox={`0 0 24 ${height}`} className={className} style={{ width: 24, height }}>
    <defs>
      <linearGradient id="pipeGradV" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(40 15% 35%)" />
        <stop offset="30%" stopColor="hsl(40 15% 25%)" />
        <stop offset="70%" stopColor="hsl(40 15% 20%)" />
        <stop offset="100%" stopColor="hsl(40 15% 30%)" />
      </linearGradient>
    </defs>
    <rect x="4" y="0" width="16" height={height} fill="url(#pipeGradV)" />
    {/* Joints every 50px */}
    {Array.from({ length: Math.floor(height / 50) }).map((_, i) => (
      <g key={i}>
        <rect x="2" y={i * 50} width="20" height="8" fill="hsl(40 15% 30%)" />
        <rect x="4" y={i * 50 + 2} width="16" height="4" fill="hsl(40 15% 40%)" />
      </g>
    ))}
    {/* Highlight */}
    <rect x="5" y="0" width="2" height={height} fill="hsl(40 15% 45%)" opacity="0.4" />
  </svg>
);

// Steam Vent - animated
export const SteamVent: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 40 60" className={className} style={{ width: 40, height: 60 }}>
    <defs>
      <linearGradient id="ventGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(40 15% 25%)" />
        <stop offset="50%" stopColor="hsl(40 15% 35%)" />
        <stop offset="100%" stopColor="hsl(40 15% 25%)" />
      </linearGradient>
    </defs>
    {/* Vent body */}
    <rect x="8" y="30" width="24" height="30" fill="url(#ventGrad)" />
    <rect x="5" y="28" width="30" height="6" fill="hsl(40 15% 30%)" />
    {/* Slats */}
    {[0, 8, 16, 24].map(y => (
      <rect key={y} x="10" y={35 + y} width="20" height="3" fill="hsl(24 8% 8%)" />
    ))}
    {/* Steam puffs */}
    <g className="animate-steam">
      <ellipse cx="20" cy="20" rx="8" ry="6" fill="hsl(40 5% 70%)" opacity="0.3" />
      <ellipse cx="15" cy="12" rx="6" ry="5" fill="hsl(40 5% 70%)" opacity="0.2" />
      <ellipse cx="25" cy="8" rx="5" ry="4" fill="hsl(40 5% 70%)" opacity="0.15" />
    </g>
    <style>{`
      .animate-steam {
        animation: steam-rise 2s ease-in-out infinite;
      }
      @keyframes steam-rise {
        0%, 100% { transform: translateY(0); opacity: 1; }
        50% { transform: translateY(-10px); opacity: 0.5; }
      }
    `}</style>
  </svg>
);

// Corner Bracket - decorative corner piece
export const CornerBracket: React.FC<{ className?: string; flip?: 'none' | 'h' | 'v' | 'both' }> = ({ 
  className = '', 
  flip = 'none' 
}) => {
  const transforms = {
    none: '',
    h: 'scale(-1, 1) translate(-50, 0)',
    v: 'scale(1, -1) translate(0, -50)',
    both: 'scale(-1, -1) translate(-50, -50)',
  };
  
  return (
    <svg viewBox="0 0 50 50" className={className} style={{ width: 50, height: 50 }}>
      <g transform={transforms[flip]}>
        <path 
          d="M0 0 L50 0 L50 8 L8 8 L8 50 L0 50 Z" 
          fill="hsl(40 15% 25%)"
        />
        <path 
          d="M0 0 L45 0 L45 5 L5 5 L5 50 L0 50 Z" 
          fill="hsl(40 15% 35%)"
        />
        {/* Rivets */}
        <circle cx="20" cy="4" r="3" fill="hsl(40 15% 40%)" />
        <circle cx="35" cy="4" r="3" fill="hsl(40 15% 40%)" />
        <circle cx="4" cy="20" r="3" fill="hsl(40 15% 40%)" />
        <circle cx="4" cy="35" r="3" fill="hsl(40 15% 40%)" />
      </g>
    </svg>
  );
};

// Gauge/Meter
export const Gauge: React.FC<{ className?: string; value?: number; label?: string }> = ({ 
  className = '', 
  value = 0.7,
  label = 'PSI'
}) => {
  const angle = -135 + (value * 270); // -135 to 135 degrees
  
  return (
    <svg viewBox="0 0 80 80" className={className} style={{ width: 80, height: 80 }}>
      {/* Outer ring */}
      <circle cx="40" cy="40" r="38" fill="hsl(40 15% 15%)" stroke="hsl(40 15% 30%)" strokeWidth="3" />
      <circle cx="40" cy="40" r="32" fill="hsl(24 8% 8%)" />
      
      {/* Tick marks */}
      {Array.from({ length: 11 }).map((_, i) => {
        const tickAngle = (-135 + i * 27) * Math.PI / 180;
        const x1 = 40 + Math.cos(tickAngle) * 26;
        const y1 = 40 + Math.sin(tickAngle) * 26;
        const x2 = 40 + Math.cos(tickAngle) * 30;
        const y2 = 40 + Math.sin(tickAngle) * 30;
        return (
          <line 
            key={i} 
            x1={x1} y1={y1} x2={x2} y2={y2} 
            stroke={i > 7 ? 'hsl(15 70% 45%)' : 'hsl(40 50% 55%)'} 
            strokeWidth="2" 
          />
        );
      })}
      
      {/* Needle */}
      <g transform={`rotate(${angle} 40 40)`}>
        <polygon points="40,15 38,40 40,45 42,40" fill="hsl(15 70% 50%)" />
      </g>
      
      {/* Center cap */}
      <circle cx="40" cy="40" r="6" fill="hsl(40 15% 35%)" />
      <circle cx="40" cy="40" r="4" fill="hsl(40 15% 45%)" />
      
      {/* Label */}
      <text x="40" y="60" textAnchor="middle" fill="hsl(40 50% 55%)" fontSize="8" fontFamily="monospace">
        {label}
      </text>
    </svg>
  );
};

// Art Deco Divider
export const ArtDecoDivider: React.FC<{ className?: string; width?: number }> = ({ className = '', width = 300 }) => (
  <svg viewBox={`0 0 ${width} 20`} className={className} style={{ width, height: 20 }}>
    {/* Center diamond */}
    <polygon points={`${width/2},0 ${width/2+10},10 ${width/2},20 ${width/2-10},10`} fill="currentColor" opacity="0.8" />
    
    {/* Lines */}
    <rect x="0" y="9" width={width/2 - 15} height="2" fill="currentColor" opacity="0.6" />
    <rect x={width/2 + 15} y="9" width={width/2 - 15} height="2" fill="currentColor" opacity="0.6" />
    
    {/* Small diamonds */}
    <polygon points={`${width/2 - 40},7 ${width/2 - 35},10 ${width/2 - 40},13 ${width/2 - 45},10`} fill="currentColor" opacity="0.4" />
    <polygon points={`${width/2 + 40},7 ${width/2 + 45},10 ${width/2 + 40},13 ${width/2 + 35},10`} fill="currentColor" opacity="0.4" />
    
    {/* End caps */}
    <rect x="0" y="6" width="4" height="8" fill="currentColor" opacity="0.4" />
    <rect x={width - 4} y="6" width="4" height="8" fill="currentColor" opacity="0.4" />
  </svg>
);

// Industrial Panel Border
export const IndustrialPanel: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glowing?: boolean;
}> = ({ children, className = '', glowing = false }) => (
  <div className={`relative ${className}`}>
    {/* Corner brackets */}
    <CornerBracket className="absolute -top-1 -left-1 text-diesel-border" flip="none" />
    <CornerBracket className="absolute -top-1 -right-1 text-diesel-border" flip="h" />
    <CornerBracket className="absolute -bottom-1 -left-1 text-diesel-border" flip="v" />
    <CornerBracket className="absolute -bottom-1 -right-1 text-diesel-border" flip="both" />
    
    {/* Content */}
    <div className={`
      relative bg-diesel-panel border-2 border-diesel-border p-8
      ${glowing ? 'shadow-diesel-glow' : ''}
    `}>
      {children}
    </div>
  </div>
);
