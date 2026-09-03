import React from 'react';

interface DieselpunkLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DieselpunkLoader: React.FC<DieselpunkLoaderProps> = ({ 
  message = "GENERATING...", 
  size = 'md' 
}) => {
  const sizeConfig = {
    sm: { container: 'w-24 h-24', gear1: 40, gear2: 28, gear3: 20 },
    md: { container: 'w-40 h-40', gear1: 64, gear2: 44, gear3: 32 },
    lg: { container: 'w-56 h-56', gear1: 88, gear2: 60, gear3: 44 }
  };
  
  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main gear assembly */}
      <div className={`relative ${config.container}`}>
        {/* Steam vents */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2">
          <SteamJet direction="left" />
        </div>
        <div className="absolute -right-4 top-1/2 -translate-y-1/2">
          <SteamJet direction="right" />
        </div>
        
        {/* Central large gear */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedGear size={config.gear1} speed={3} direction="cw" />
        </div>
        
        {/* Top-right interlocking gear */}
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4">
          <AnimatedGear size={config.gear2} speed={4} direction="ccw" teeth={10} />
        </div>
        
        {/* Bottom-left interlocking gear */}
        <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4">
          <AnimatedGear size={config.gear2} speed={4} direction="ccw" teeth={10} />
        </div>
        
        {/* Small accent gear */}
        <div className="absolute top-1/4 left-0 -translate-x-1/2">
          <AnimatedGear size={config.gear3} speed={5} direction="cw" teeth={8} />
        </div>
        
        {/* Piston assembly */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <Piston />
        </div>
        
        {/* Center indicator light */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-diesel-rust animate-pulse shadow-[0_0_10px_hsl(var(--diesel-rust))]" />
        </div>
      </div>
      
      {/* Status display */}
      <div className="relative mt-8">
        {/* Frame */}
        <div className="border-2 border-diesel-border bg-diesel-dark px-6 py-2 relative">
          {/* Corner rivets */}
          <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-diesel-steel border border-diesel-border" />
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-diesel-steel border border-diesel-border" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-diesel-steel border border-diesel-border" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-diesel-steel border border-diesel-border" />
          
          {/* Text with scanline effect */}
          <div className="relative overflow-hidden">
            <span className="font-mono text-diesel-gold tracking-widest text-sm glitch-text">
              {message}
            </span>
            {/* Scanline */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-diesel-gold/10 to-transparent animate-[slideUp_2s_linear_infinite]" />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-diesel-dark border border-diesel-border overflow-hidden">
          <div className="h-full bg-diesel-gold animate-[progressPulse_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};

// Animated gear component
interface AnimatedGearProps {
  size: number;
  speed?: number;
  direction?: 'cw' | 'ccw';
  teeth?: number;
}

const AnimatedGear: React.FC<AnimatedGearProps> = ({ 
  size, 
  speed = 3, 
  direction = 'cw',
  teeth = 12 
}) => {
  const toothHeight = size * 0.15;
  const innerRadius = size * 0.35;
  const outerRadius = size * 0.45;
  const centerHole = size * 0.15;
  
  const teethPath = Array.from({ length: teeth }, (_, i) => {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
    const halfAngle = ((i + 0.25) / teeth) * Math.PI * 2;
    const threeQuarterAngle = ((i + 0.75) / teeth) * Math.PI * 2;
    
    const x1 = Math.cos(angle) * innerRadius;
    const y1 = Math.sin(angle) * innerRadius;
    const x2 = Math.cos(halfAngle) * outerRadius;
    const y2 = Math.sin(halfAngle) * outerRadius;
    const x3 = Math.cos(threeQuarterAngle) * outerRadius;
    const y3 = Math.sin(threeQuarterAngle) * outerRadius;
    const x4 = Math.cos(nextAngle) * innerRadius;
    const y4 = Math.sin(nextAngle) * innerRadius;
    
    return `L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}`;
  }).join(' ');
  
  const animationClass = direction === 'cw' 
    ? `animate-[spin_${speed}s_linear_infinite]`
    : `animate-[spin_${speed}s_linear_infinite_reverse]`;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`${-size/2} ${-size/2} ${size} ${size}`}
      className={animationClass}
      style={{ animationDuration: `${speed}s`, animationDirection: direction === 'ccw' ? 'reverse' : 'normal' }}
    >
      {/* Gear body */}
      <path
        d={`M ${Math.cos(0) * innerRadius} ${Math.sin(0) * innerRadius} ${teethPath} Z`}
        fill="hsl(var(--diesel-steel))"
        stroke="hsl(var(--diesel-border))"
        strokeWidth="1"
      />
      {/* Center hole */}
      <circle
        cx="0"
        cy="0"
        r={centerHole}
        fill="hsl(var(--diesel-dark))"
        stroke="hsl(var(--diesel-border))"
        strokeWidth="1"
      />
      {/* Inner detail ring */}
      <circle
        cx="0"
        cy="0"
        r={innerRadius * 0.7}
        fill="none"
        stroke="hsl(var(--diesel-border))"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
    </svg>
  );
};

// Steam jet effect
interface SteamJetProps {
  direction: 'left' | 'right';
}

const SteamJet: React.FC<SteamJetProps> = ({ direction }) => {
  const transform = direction === 'left' ? 'scaleX(-1)' : '';
  
  return (
    <div className="relative" style={{ transform }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-diesel-steel/30 blur-sm"
          style={{
            animation: `steamPuff 1s ease-out infinite`,
            animationDelay: `${i * 0.3}s`,
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      ))}
    </div>
  );
};

// Piston component
const Piston: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Piston rod */}
      <div className="w-2 h-6 bg-diesel-steel border-x border-diesel-border animate-[pistonPump_0.5s_ease-in-out_infinite]" />
      {/* Piston head */}
      <div className="w-6 h-3 bg-diesel-steel border border-diesel-border animate-[pistonPump_0.5s_ease-in-out_infinite]">
        <div className="w-full h-0.5 bg-diesel-border mt-1" />
      </div>
    </div>
  );
};

export default DieselpunkLoader;
