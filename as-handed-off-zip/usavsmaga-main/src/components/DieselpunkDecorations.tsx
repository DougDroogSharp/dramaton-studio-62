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

// Vacuum Tube / Electronic Valve - Glowing glass tube
export const VacuumTube: React.FC<{ 
  className?: string; 
  size?: number;
  glowColor?: 'orange' | 'green' | 'blue';
  pulseSpeed?: number;
}> = ({ 
  className = '', 
  size = 80,
  glowColor = 'orange',
  pulseSpeed = 2
}) => {
  const colors = {
    orange: { glow: 'hsl(25 90% 55%)', inner: 'hsl(35 100% 65%)', filament: 'hsl(40 100% 70%)' },
    green: { glow: 'hsl(120 60% 45%)', inner: 'hsl(120 70% 55%)', filament: 'hsl(120 80% 65%)' },
    blue: { glow: 'hsl(200 80% 50%)', inner: 'hsl(200 90% 60%)', filament: 'hsl(200 100% 70%)' },
  };
  const c = colors[glowColor];
  
  const height = size * 1.8;
  const width = size;
  
  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className={className} 
      style={{ width, height }}
    >
      <defs>
        {/* Glass gradient */}
        <linearGradient id={`tubeGlass-${glowColor}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(200 10% 40%)" stopOpacity="0.3" />
          <stop offset="20%" stopColor="hsl(200 10% 60%)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="hsl(200 10% 70%)" stopOpacity="0.1" />
          <stop offset="80%" stopColor="hsl(200 10% 60%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(200 10% 40%)" stopOpacity="0.3" />
        </linearGradient>
        
        {/* Inner glow */}
        <radialGradient id={`tubeGlow-${glowColor}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={c.inner} stopOpacity="0.8" />
          <stop offset="40%" stopColor={c.glow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        
        {/* Filament glow filter */}
        <filter id={`filamentGlow-${glowColor}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Base / Socket */}
      <rect x={width * 0.2} y={height * 0.78} width={width * 0.6} height={height * 0.22} fill="hsl(40 15% 20%)" />
      <rect x={width * 0.15} y={height * 0.75} width={width * 0.7} height={height * 0.06} fill="hsl(40 15% 30%)" />
      <rect x={width * 0.25} y={height * 0.82} width={width * 0.5} height={height * 0.03} fill="hsl(40 15% 25%)" />
      
      {/* Pin contacts at bottom */}
      {[0.3, 0.4, 0.5, 0.6, 0.7].map((xPos, i) => (
        <rect key={i} x={width * xPos - 2} y={height * 0.95} width={4} height={height * 0.05} fill="hsl(40 30% 50%)" />
      ))}
      
      {/* Glass envelope - dome top */}
      <ellipse cx={width / 2} cy={height * 0.15} rx={width * 0.35} ry={height * 0.12} fill={`url(#tubeGlass-${glowColor})`} stroke="hsl(200 10% 50%)" strokeWidth="1" />
      
      {/* Glass envelope - body */}
      <rect x={width * 0.15} y={height * 0.15} width={width * 0.7} height={height * 0.6} fill={`url(#tubeGlass-${glowColor})`} stroke="hsl(200 10% 50%)" strokeWidth="1" />
      
      {/* Inner glow - animated pulse */}
      <ellipse 
        cx={width / 2} 
        cy={height * 0.35} 
        rx={width * 0.25} 
        ry={height * 0.2} 
        fill={`url(#tubeGlow-${glowColor})`}
        style={{ animation: `tubePulse ${pulseSpeed}s ease-in-out infinite` }}
      />
      
      {/* Internal plates/grids */}
      <rect x={width * 0.35} y={height * 0.2} width={width * 0.3} height={height * 0.35} fill="none" stroke="hsl(40 15% 35%)" strokeWidth="1.5" />
      <rect x={width * 0.38} y={height * 0.23} width={width * 0.24} height={height * 0.29} fill="none" stroke="hsl(40 15% 30%)" strokeWidth="1" />
      
      {/* Grid wires */}
      {[0.28, 0.33, 0.38, 0.43, 0.48].map((yPos, i) => (
        <line key={i} x1={width * 0.38} y1={height * yPos} x2={width * 0.62} y2={height * yPos} stroke="hsl(40 15% 40%)" strokeWidth="0.5" />
      ))}
      
      {/* Filament - glowing heater element */}
      <path 
        d={`M ${width * 0.42} ${height * 0.55} 
            Q ${width * 0.45} ${height * 0.5} ${width * 0.5} ${height * 0.52}
            Q ${width * 0.55} ${height * 0.54} ${width * 0.58} ${height * 0.5}
            Q ${width * 0.55} ${height * 0.46} ${width * 0.5} ${height * 0.48}
            Q ${width * 0.45} ${height * 0.5} ${width * 0.42} ${height * 0.55}`}
        fill="none"
        stroke={c.filament}
        strokeWidth="2"
        filter={`url(#filamentGlow-${glowColor})`}
        style={{ animation: `filamentFlicker ${pulseSpeed * 0.5}s ease-in-out infinite` }}
      />
      
      {/* Support wires from base */}
      <line x1={width * 0.35} y1={height * 0.55} x2={width * 0.35} y2={height * 0.75} stroke="hsl(40 20% 45%)" strokeWidth="1" />
      <line x1={width * 0.65} y1={height * 0.55} x2={width * 0.65} y2={height * 0.75} stroke="hsl(40 20% 45%)" strokeWidth="1" />
      <line x1={width * 0.5} y1={height * 0.57} x2={width * 0.5} y2={height * 0.75} stroke="hsl(40 20% 45%)" strokeWidth="1" />
      
      {/* Glass highlight/reflection */}
      <ellipse cx={width * 0.3} cy={height * 0.3} rx={width * 0.05} ry={height * 0.1} fill="white" opacity="0.15" />
      
      {/* Outer glow effect */}
      <ellipse 
        cx={width / 2} 
        cy={height * 0.4} 
        rx={width * 0.45} 
        ry={height * 0.35} 
        fill="none"
        stroke={c.glow}
        strokeWidth="1"
        opacity="0.3"
        style={{ animation: `tubeGlowOuter ${pulseSpeed}s ease-in-out infinite` }}
      />
      
      <style>{`
        @keyframes tubePulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          15% { opacity: 1; transform: scale(1.15); }
          30% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          70% { opacity: 0.6; transform: scale(0.95); }
          85% { opacity: 0.9; transform: scale(1.1); }
        }
        @keyframes filamentFlicker {
          0%, 100% { opacity: 1; filter: brightness(1); }
          10% { opacity: 0.6; filter: brightness(0.7); }
          20% { opacity: 1; filter: brightness(1.3); }
          35% { opacity: 0.8; filter: brightness(0.9); }
          50% { opacity: 1; filter: brightness(1.2); }
          65% { opacity: 0.7; filter: brightness(0.8); }
          80% { opacity: 1; filter: brightness(1.1); }
          90% { opacity: 0.85; filter: brightness(1); }
        }
        @keyframes tubeGlowOuter {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          25% { opacity: 0.5; transform: scale(1.05); }
          50% { opacity: 0.25; transform: scale(1.02); }
          75% { opacity: 0.6; transform: scale(1.08); }
        }
      `}</style>
    </svg>
  );
};

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

// Synchronized Gear Mechanism with Connecting Rod
// This creates two gears connected by a piston/connecting rod that moves up and down
export const GearMechanism: React.FC<{ 
  className?: string; 
  side?: 'left' | 'right';
  animationDuration?: number;
}> = ({ 
  className = '', 
  side = 'left',
  animationDuration = 4 
}) => {
  // Large gear params
  const gearSize = 120;
  const gearRadius = gearSize / 2;
  const crankOffset = 35; // Distance from gear center to connecting rod attachment
  
  // Animation keyframes for synchronized motion
  const animationName = `gear-mechanism-${side}`;
  const rodAnimationName = `rod-pump-${side}`;
  
  return (
    <div className={`relative ${className}`} style={{ width: 160, height: 300 }}>
      <style>{`
        @keyframes ${animationName} {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ${rodAnimationName} {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(${crankOffset * 2}px); }
        }
      `}</style>
      
      {/* Main Drive Gear */}
      <div 
        className="absolute"
        style={{ 
          left: side === 'left' ? 10 : 30,
          top: 20,
          animation: `${animationName} ${animationDuration}s linear infinite ${side === 'right' ? 'reverse' : ''}`,
          transformOrigin: 'center center'
        }}
      >
        <svg viewBox={`0 0 ${gearSize} ${gearSize}`} style={{ width: gearSize, height: gearSize }}>
          {/* Gear teeth */}
          <g>
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360 / 16) * Math.PI / 180;
              const innerR = gearRadius - 12;
              const outerR = gearRadius;
              const toothWidth = 8;
              const x1 = gearRadius + Math.cos(angle - toothWidth/gearRadius) * innerR;
              const y1 = gearRadius + Math.sin(angle - toothWidth/gearRadius) * innerR;
              const x2 = gearRadius + Math.cos(angle - toothWidth/gearRadius/2) * outerR;
              const y2 = gearRadius + Math.sin(angle - toothWidth/gearRadius/2) * outerR;
              const x3 = gearRadius + Math.cos(angle + toothWidth/gearRadius/2) * outerR;
              const y3 = gearRadius + Math.sin(angle + toothWidth/gearRadius/2) * outerR;
              const x4 = gearRadius + Math.cos(angle + toothWidth/gearRadius) * innerR;
              const y4 = gearRadius + Math.sin(angle + toothWidth/gearRadius) * innerR;
              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill="hsl(40 15% 30%)"
                />
              );
            })}
          </g>
          {/* Gear body */}
          <circle cx={gearRadius} cy={gearRadius} r={gearRadius - 12} fill="hsl(40 15% 25%)" />
          <circle cx={gearRadius} cy={gearRadius} r={gearRadius - 18} fill="hsl(40 15% 30%)" />
          {/* Spokes */}
          {[0, 60, 120, 180, 240, 300].map(angle => (
            <line
              key={angle}
              x1={gearRadius}
              y1={gearRadius}
              x2={gearRadius + Math.cos(angle * Math.PI / 180) * (gearRadius - 25)}
              y2={gearRadius + Math.sin(angle * Math.PI / 180) * (gearRadius - 25)}
              stroke="hsl(24 8% 8%)"
              strokeWidth="8"
            />
          ))}
          {/* Center hub */}
          <circle cx={gearRadius} cy={gearRadius} r={20} fill="hsl(40 15% 35%)" />
          <circle cx={gearRadius} cy={gearRadius} r={12} fill="hsl(40 15% 25%)" />
          <circle cx={gearRadius} cy={gearRadius} r={6} fill="hsl(24 8% 8%)" />
          {/* Crank pin (offset from center) */}
          <circle 
            cx={gearRadius + crankOffset} 
            cy={gearRadius} 
            r={8} 
            fill="hsl(40 15% 40%)"
            stroke="hsl(40 15% 25%)"
            strokeWidth="2"
          />
        </svg>
      </div>
      
      {/* Connecting Rod */}
      <div
        className="absolute"
        style={{
          left: side === 'left' ? 55 : 85,
          top: 80,
          animation: `${rodAnimationName} ${animationDuration}s ease-in-out infinite`,
        }}
      >
        <svg viewBox="0 0 30 180" style={{ width: 30, height: 180 }}>
          <defs>
            <linearGradient id={`rodGrad-${side}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(40 15% 35%)" />
              <stop offset="30%" stopColor="hsl(40 15% 45%)" />
              <stop offset="70%" stopColor="hsl(40 15% 30%)" />
              <stop offset="100%" stopColor="hsl(40 15% 25%)" />
            </linearGradient>
          </defs>
          {/* Rod body */}
          <rect x="8" y="10" width="14" height="160" fill={`url(#rodGrad-${side})`} rx="3" />
          {/* Top joint */}
          <circle cx="15" cy="15" r="12" fill="hsl(40 15% 30%)" stroke="hsl(40 15% 40%)" strokeWidth="2" />
          <circle cx="15" cy="15" r="6" fill="hsl(24 8% 8%)" />
          {/* Bottom joint */}
          <circle cx="15" cy="165" r="12" fill="hsl(40 15% 30%)" stroke="hsl(40 15% 40%)" strokeWidth="2" />
          <circle cx="15" cy="165" r="6" fill="hsl(24 8% 8%)" />
          {/* Highlight */}
          <rect x="10" y="20" width="3" height="140" fill="hsl(40 15% 50%)" opacity="0.3" rx="1" />
        </svg>
      </div>
      
      {/* Piston Cylinder */}
      <div
        className="absolute"
        style={{
          left: side === 'left' ? 35 : 65,
          top: 230,
        }}
      >
        <svg viewBox="0 0 70 70" style={{ width: 70, height: 70 }}>
          <defs>
            <linearGradient id={`cylinderGrad-${side}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(40 15% 25%)" />
              <stop offset="20%" stopColor="hsl(40 15% 35%)" />
              <stop offset="80%" stopColor="hsl(40 15% 30%)" />
              <stop offset="100%" stopColor="hsl(40 15% 20%)" />
            </linearGradient>
          </defs>
          {/* Cylinder body */}
          <rect x="5" y="0" width="60" height="70" fill={`url(#cylinderGrad-${side})`} rx="4" />
          {/* Top flange */}
          <rect x="0" y="0" width="70" height="12" fill="hsl(40 15% 35%)" rx="2" />
          <rect x="5" y="4" width="60" height="4" fill="hsl(40 15% 45%)" rx="1" />
          {/* Bolts */}
          {[10, 30, 50, 70].map((x, i) => (
            <g key={i}>
              <circle cx={x - 5} cy="6" r="4" fill="hsl(40 15% 40%)" />
              <circle cx={x - 5} cy="6" r="2" fill="hsl(40 15% 25%)" />
            </g>
          ))}
          {/* Bottom plate */}
          <rect x="0" y="58" width="70" height="12" fill="hsl(40 15% 30%)" rx="2" />
        </svg>
      </div>
    </div>
  );
};

// Interactive Steam Boiler with explosion animation
export const SteamBoiler: React.FC<{ 
  className?: string;
  onExplosionStateChange?: (isExploded: boolean) => void;
}> = ({ 
  className = '',
  onExplosionStateChange,
}) => {
  const [isExploded, setIsExploded] = React.useState(false);
  const [steamPuff, setSteamPuff] = React.useState(false);
  const [reassembling, setReassembling] = React.useState(false);
  
  // Random steam puffs
  React.useEffect(() => {
    if (isExploded) return;
    
    let timer: NodeJS.Timeout;
    const scheduleNextPuff = () => {
      const delay = 2000 + Math.random() * 4000; // 2-6 seconds
      timer = setTimeout(() => {
        setSteamPuff(true);
        setTimeout(() => setSteamPuff(false), 800);
        scheduleNextPuff();
      }, delay);
    };
    
    scheduleNextPuff();
    return () => clearTimeout(timer);
  }, [isExploded]);
  
  // Handle explosion click
  const handleClick = () => {
    if (isExploded || reassembling) return;
    
    setIsExploded(true);
    onExplosionStateChange?.(true);
    
    // Start reassembly after 3 seconds
    setTimeout(() => {
      setReassembling(true);
      // Complete reassembly after animation
      setTimeout(() => {
        setIsExploded(false);
        setReassembling(false);
        onExplosionStateChange?.(false);
      }, 1500);
    }, 3000);
  };
  
  return (
    <div 
      className={`relative cursor-pointer select-none ${className}`} 
      style={{ width: 120, height: 180 }}
      onClick={handleClick}
      title="Click to release pressure!"
    >
      <style>{`
        @keyframes boiler-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-0.5deg); }
          75% { transform: translateX(2px) rotate(0.5deg); }
        }
        @keyframes steam-puff {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          30% { opacity: 0.8; transform: translateY(-10px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(1.5); }
        }
        @keyframes explode-part {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--ex), var(--ey)) rotate(var(--er)); }
        }
        @keyframes reassemble-part {
          0% { opacity: 0; transform: translate(var(--ex), var(--ey)) rotate(var(--er)); }
          100% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes pressure-gauge {
          0%, 100% { transform: rotate(-45deg); }
          50% { transform: rotate(45deg); }
        }
        .boiler-body {
          animation: ${isExploded ? 'none' : 'boiler-shake 0.3s ease-in-out infinite'};
        }
        .steam-active {
          animation: steam-puff 0.8s ease-out forwards;
        }
        .exploding {
          animation: explode-part 0.5s ease-out forwards;
        }
        .reassembling {
          animation: reassemble-part 0.8s ease-out forwards;
        }
      `}</style>
      
      {/* Main Boiler Body */}
      <div 
        className={`absolute boiler-body ${isExploded && !reassembling ? 'exploding' : ''} ${reassembling ? 'reassembling' : ''}`}
        style={{ 
          left: 10, 
          top: 40,
          '--ex': '-20px',
          '--ey': '-30px', 
          '--er': '-15deg',
        } as React.CSSProperties}
      >
        <svg viewBox="0 0 100 120" style={{ width: 100, height: 120 }}>
          <defs>
            <linearGradient id="boilerBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(15 60% 25%)" />
              <stop offset="30%" stopColor="hsl(15 60% 35%)" />
              <stop offset="70%" stopColor="hsl(15 60% 30%)" />
              <stop offset="100%" stopColor="hsl(15 60% 20%)" />
            </linearGradient>
            <radialGradient id="boilerRivetGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="hsl(40 20% 50%)" />
              <stop offset="100%" stopColor="hsl(40 20% 30%)" />
            </radialGradient>
          </defs>
          
          {/* Boiler tank */}
          <ellipse cx="50" cy="20" rx="40" ry="15" fill="url(#boilerBodyGrad)" />
          <rect x="10" y="20" width="80" height="80" fill="url(#boilerBodyGrad)" />
          <ellipse cx="50" cy="100" rx="40" ry="15" fill="url(#boilerBodyGrad)" />
          
          {/* Rivets */}
          {[25, 50, 75].map(y => (
            <React.Fragment key={y}>
              <circle cx="15" cy={y} r="4" fill="url(#boilerRivetGrad)" />
              <circle cx="85" cy={y} r="4" fill="url(#boilerRivetGrad)" />
            </React.Fragment>
          ))}
          
          {/* Bands */}
          <rect x="8" y="35" width="84" height="6" fill="hsl(40 15% 30%)" rx="2" />
          <rect x="8" y="75" width="84" height="6" fill="hsl(40 15% 30%)" rx="2" />
          
          {/* Firebox door */}
          <rect x="30" y="50" width="40" height="35" fill="hsl(24 8% 10%)" rx="3" />
          <rect x="33" y="53" width="34" height="29" fill="hsl(15 70% 15%)" rx="2" />
          {/* Glow inside */}
          <ellipse cx="50" cy="68" rx="12" ry="8" fill="hsl(25 100% 50%)" opacity="0.6" />
          <ellipse cx="50" cy="68" rx="8" ry="5" fill="hsl(40 100% 60%)" opacity="0.8" />
          
          {/* Grate lines */}
          {[58, 63, 68, 73, 78].map(y => (
            <line key={y} x1="35" y1={y} x2="65" y2={y} stroke="hsl(24 8% 8%)" strokeWidth="2" />
          ))}
          
          {/* Highlight */}
          <ellipse cx="25" cy="50" rx="5" ry="20" fill="hsl(15 60% 45%)" opacity="0.3" />
        </svg>
      </div>
      
      {/* Chimney/Stack */}
      <div 
        className={`absolute ${isExploded && !reassembling ? 'exploding' : ''} ${reassembling ? 'reassembling' : ''}`}
        style={{ 
          left: 40, 
          top: 0,
          '--ex': '30px',
          '--ey': '-50px', 
          '--er': '25deg',
        } as React.CSSProperties}
      >
        <svg viewBox="0 0 40 50" style={{ width: 40, height: 50 }}>
          <defs>
            <linearGradient id="chimneyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(40 15% 25%)" />
              <stop offset="50%" stopColor="hsl(40 15% 35%)" />
              <stop offset="100%" stopColor="hsl(40 15% 25%)" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="20" height="40" fill="url(#chimneyGrad)" />
          <rect x="5" y="5" width="30" height="8" fill="hsl(40 15% 30%)" rx="2" />
          <rect x="8" y="0" width="24" height="6" fill="hsl(40 15% 35%)" rx="1" />
        </svg>
      </div>
      
      {/* Pressure Gauge */}
      <div 
        className={`absolute ${isExploded && !reassembling ? 'exploding' : ''} ${reassembling ? 'reassembling' : ''}`}
        style={{ 
          left: 85, 
          top: 50,
          '--ex': '40px',
          '--ey': '-20px', 
          '--er': '45deg',
        } as React.CSSProperties}
      >
        <svg viewBox="0 0 30 30" style={{ width: 30, height: 30 }}>
          <circle cx="15" cy="15" r="14" fill="hsl(40 15% 15%)" stroke="hsl(40 20% 40%)" strokeWidth="2" />
          <circle cx="15" cy="15" r="10" fill="hsl(24 8% 8%)" />
          {/* Needle */}
          <line 
            x1="15" y1="15" x2="15" y2="7" 
            stroke="hsl(0 70% 50%)" 
            strokeWidth="2"
            style={{ 
              transformOrigin: '15px 15px',
              animation: isExploded ? 'none' : 'pressure-gauge 1s ease-in-out infinite'
            }}
          />
          <circle cx="15" cy="15" r="3" fill="hsl(40 15% 35%)" />
        </svg>
      </div>
      
      {/* Steam Valve */}
      <div 
        className={`absolute ${isExploded && !reassembling ? 'exploding' : ''} ${reassembling ? 'reassembling' : ''}`}
        style={{ 
          left: 0, 
          top: 60,
          '--ex': '-35px',
          '--ey': '10px', 
          '--er': '-30deg',
        } as React.CSSProperties}
      >
        <svg viewBox="0 0 25 25" style={{ width: 25, height: 25 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(40 15% 35%)" strokeWidth="3" />
          <circle cx="12" cy="12" r="4" fill="hsl(40 15% 30%)" />
          {[0, 90, 180, 270].map(angle => (
            <line
              key={angle}
              x1={12 + Math.cos(angle * Math.PI / 180) * 4}
              y1={12 + Math.sin(angle * Math.PI / 180) * 4}
              x2={12 + Math.cos(angle * Math.PI / 180) * 9}
              y2={12 + Math.sin(angle * Math.PI / 180) * 9}
              stroke="hsl(40 15% 40%)"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      
      {/* Steam Puffs */}
      {(steamPuff || isExploded) && !reassembling && (
        <div className="absolute" style={{ left: 45, top: -10 }}>
          {isExploded ? (
            // Explosion steam burst
            <>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: Math.cos(i * 60 * Math.PI / 180) * 20,
                    top: Math.sin(i * 60 * Math.PI / 180) * 20 - 20,
                    animation: `steam-puff 1s ease-out ${i * 0.1}s forwards`,
                  }}
                >
                  <svg viewBox="0 0 30 30" style={{ width: 30, height: 30 }}>
                    <ellipse cx="15" cy="15" rx="12" ry="10" fill="hsl(40 5% 80%)" opacity="0.7" />
                  </svg>
                </div>
              ))}
            </>
          ) : (
            // Normal steam puff
            <div className="steam-active">
              <svg viewBox="0 0 40 40" style={{ width: 40, height: 40 }}>
                <ellipse cx="20" cy="20" rx="15" ry="12" fill="hsl(40 5% 75%)" opacity="0.6" />
                <ellipse cx="15" cy="15" rx="10" ry="8" fill="hsl(40 5% 80%)" opacity="0.4" />
                <ellipse cx="28" cy="12" rx="8" ry="6" fill="hsl(40 5% 85%)" opacity="0.3" />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Legs/Stand */}
      <div 
        className={`absolute ${isExploded && !reassembling ? 'exploding' : ''} ${reassembling ? 'reassembling' : ''}`}
        style={{ 
          left: 15, 
          top: 155,
          '--ex': '0px',
          '--ey': '20px', 
          '--er': '5deg',
        } as React.CSSProperties}
      >
        <svg viewBox="0 0 90 25" style={{ width: 90, height: 25 }}>
          {/* Left leg */}
          <polygon points="10,0 20,0 25,25 5,25" fill="hsl(40 15% 25%)" />
          {/* Right leg */}
          <polygon points="70,0 80,0 85,25 65,25" fill="hsl(40 15% 25%)" />
          {/* Cross brace */}
          <rect x="20" y="10" width="50" height="5" fill="hsl(40 15% 30%)" />
        </svg>
      </div>
    </div>
  );
};

// Flywheel with Belt
export const FlywheelWithBelt: React.FC<{ 
  className?: string;
  isPaused?: boolean;
  animationDuration?: number;
}> = ({ 
  className = '',
  isPaused = false,
  animationDuration = 4,
}) => {
  return (
    <div className={`relative ${className}`} style={{ width: 140, height: 200 }}>
      <style>{`
        @keyframes flywheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes belt-move {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -40; }
        }
        @keyframes small-pulley-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-720deg); }
        }
      `}</style>
      
      {/* Belt path */}
      <svg 
        viewBox="0 0 140 200" 
        style={{ 
          width: 140, 
          height: 200, 
          position: 'absolute',
          left: 0,
          top: 0,
        }}
      >
        <defs>
          <linearGradient id="beltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(24 30% 15%)" />
            <stop offset="50%" stopColor="hsl(24 30% 25%)" />
            <stop offset="100%" stopColor="hsl(24 30% 15%)" />
          </linearGradient>
        </defs>
        {/* Belt - figure-8 style connection */}
        <path
          d="M 70 45 
             C 120 45, 130 80, 130 100
             C 130 120, 120 155, 70 155
             C 20 155, 10 120, 10 100
             C 10 80, 20 45, 70 45"
          fill="none"
          stroke="url(#beltGrad)"
          strokeWidth="6"
          strokeDasharray="10 5"
          style={{
            animation: isPaused ? 'none' : `belt-move ${animationDuration / 2}s linear infinite`,
          }}
        />
        {/* Belt texture overlay */}
        <path
          d="M 70 45 
             C 120 45, 130 80, 130 100
             C 130 120, 120 155, 70 155
             C 20 155, 10 120, 10 100
             C 10 80, 20 45, 70 45"
          fill="none"
          stroke="hsl(24 20% 20%)"
          strokeWidth="4"
          opacity="0.5"
        />
      </svg>
      
      {/* Main Flywheel */}
      <div 
        className="absolute"
        style={{ 
          left: 20, 
          top: 50,
          animation: isPaused ? 'none' : `flywheel-spin ${animationDuration}s linear infinite`,
          transformOrigin: 'center center',
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: 100, height: 100 }}>
          <defs>
            <linearGradient id="flywheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(40 15% 35%)" />
              <stop offset="50%" stopColor="hsl(40 15% 45%)" />
              <stop offset="100%" stopColor="hsl(40 15% 30%)" />
            </linearGradient>
          </defs>
          
          {/* Outer rim */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="hsl(40 15% 25%)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#flywheelGrad)" strokeWidth="6" />
          
          {/* Inner ring */}
          <circle cx="50" cy="50" r="35" fill="none" stroke="hsl(40 15% 30%)" strokeWidth="4" />
          
          {/* Spokes */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line
              key={angle}
              x1={50 + Math.cos(angle * Math.PI / 180) * 15}
              y1={50 + Math.sin(angle * Math.PI / 180) * 15}
              x2={50 + Math.cos(angle * Math.PI / 180) * 38}
              y2={50 + Math.sin(angle * Math.PI / 180) * 38}
              stroke="hsl(40 15% 35%)"
              strokeWidth="6"
            />
          ))}
          
          {/* Hub */}
          <circle cx="50" cy="50" r="15" fill="hsl(40 15% 30%)" />
          <circle cx="50" cy="50" r="10" fill="hsl(40 15% 40%)" />
          <circle cx="50" cy="50" r="5" fill="hsl(24 8% 8%)" />
          
          {/* Weight markers on rim */}
          {[0, 90, 180, 270].map(angle => (
            <circle
              key={angle}
              cx={50 + Math.cos(angle * Math.PI / 180) * 44}
              cy={50 + Math.sin(angle * Math.PI / 180) * 44}
              r="4"
              fill="hsl(40 20% 50%)"
            />
          ))}
        </svg>
      </div>
      
      {/* Small Pulley (at top, connected to something above) */}
      <div 
        className="absolute"
        style={{ 
          left: 55, 
          top: 0,
          animation: isPaused ? 'none' : `small-pulley-spin ${animationDuration}s linear infinite`,
          transformOrigin: 'center center',
        }}
      >
        <svg viewBox="0 0 30 30" style={{ width: 30, height: 30 }}>
          <circle cx="15" cy="15" r="13" fill="hsl(40 15% 30%)" stroke="hsl(40 15% 40%)" strokeWidth="2" />
          <circle cx="15" cy="15" r="8" fill="hsl(40 15% 25%)" />
          {/* Spokes */}
          {[0, 60, 120, 180, 240, 300].map(angle => (
            <line
              key={angle}
              x1={15 + Math.cos(angle * Math.PI / 180) * 4}
              y1={15 + Math.sin(angle * Math.PI / 180) * 4}
              x2={15 + Math.cos(angle * Math.PI / 180) * 11}
              y2={15 + Math.sin(angle * Math.PI / 180) * 11}
              stroke="hsl(40 15% 35%)"
              strokeWidth="2"
            />
          ))}
          <circle cx="15" cy="15" r="4" fill="hsl(24 8% 8%)" />
        </svg>
      </div>
      
      {/* Mounting bracket */}
      <svg 
        viewBox="0 0 30 60" 
        style={{ 
          width: 30, 
          height: 60,
          position: 'absolute',
          left: 55,
          top: 140,
        }}
      >
        <rect x="5" y="0" width="20" height="60" fill="hsl(40 15% 25%)" />
        <rect x="0" y="50" width="30" height="10" fill="hsl(40 15% 30%)" rx="2" />
        {/* Bolts */}
        <circle cx="8" cy="55" r="3" fill="hsl(40 20% 40%)" />
        <circle cx="22" cy="55" r="3" fill="hsl(40 20% 40%)" />
      </svg>
    </div>
  );
};
