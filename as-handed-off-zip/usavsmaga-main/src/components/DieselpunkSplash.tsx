import React, { useState, useEffect } from 'react';
import { Gear, VacuumTube, Gauge, PipeHorizontal, PipeVertical, Rivet, CornerBracket } from './DieselpunkDecorations';
import dramatonLogoImageSrc from '@/assets/dramaton-logo.png';
import { removeBackground } from '@/utils/removeBackground';

interface DieselpunkSplashProps {
  onComplete?: () => void;
  duration?: number; // in ms
}

// Animated piston component
const Piston: React.FC<{ side: 'left' | 'right'; delay?: number }> = ({ side, delay = 0 }) => (
  <div 
    className="absolute flex flex-col items-center"
    style={{ 
      [side]: '80px',
      top: '50%',
      transform: 'translateY(-50%)',
    }}
  >
    <div className="w-4 h-24 bg-diesel-steel border border-diesel-border relative overflow-hidden">
      {/* Piston rod */}
      <div 
        className="absolute w-3 left-0.5 bg-gradient-to-b from-diesel-paper/40 to-diesel-steel h-12"
        style={{ 
          animation: `pistonPump 0.8s ease-in-out infinite`,
          animationDelay: `${delay}ms`
        }}
      />
    </div>
    {/* Piston housing */}
    <div className="w-8 h-4 bg-diesel-border border border-diesel-steel" />
  </div>
);

// Steam vent with animated puffs
const SteamPuff: React.FC<{ x: number; y: number; direction: 'up' | 'left' | 'right' }> = ({ x, y, direction }) => {
  const directionStyles = {
    up: { transform: 'translateY(-100%)', animation: 'steamRise 2s ease-out infinite' },
    left: { transform: 'translateX(-100%)', animation: 'steamLeft 2s ease-out infinite' },
    right: { transform: 'translateX(100%)', animation: 'steamRight 2s ease-out infinite' },
  };
  
  return (
    <div 
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-4 h-4 rounded-full bg-diesel-steel/30 blur-sm"
          style={{
            ...directionStyles[direction],
            animationDelay: `${i * 0.5}s`,
            opacity: 0.4 - i * 0.1,
          }}
        />
      ))}
    </div>
  );
};

// Pressure dial with animated needle
const PressureDial: React.FC<{ value: number; label: string; size?: number }> = ({ value, label, size = 60 }) => {
  const [currentValue, setCurrentValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setCurrentValue(value), 500);
    return () => clearTimeout(timer);
  }, [value]);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Gauge value={currentValue} label={label} className="w-full h-full" />
    </div>
  );
};

// Pipe junction connector
const PipeJunction: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} style={{ width: 32, height: 32 }}>
    <circle cx="16" cy="16" r="14" fill="hsl(40 15% 25%)" stroke="hsl(40 15% 35%)" strokeWidth="2" />
    <circle cx="16" cy="16" r="8" fill="hsl(24 8% 8%)" />
    {/* Bolts */}
    {[0, 90, 180, 270].map((angle) => (
      <circle 
        key={angle} 
        cx={16 + Math.cos(angle * Math.PI / 180) * 11} 
        cy={16 + Math.sin(angle * Math.PI / 180) * 11} 
        r="2" 
        fill="hsl(40 15% 40%)" 
      />
    ))}
  </svg>
);

// Valve wheel
const ValveWheel: React.FC<{ size?: number; spinning?: boolean }> = ({ size = 40, spinning = false }) => (
  <svg viewBox="0 0 40 40" style={{ width: size, height: size }} className={spinning ? 'animate-spin' : ''}>
    <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(40 15% 30%)" strokeWidth="4" />
    <circle cx="20" cy="20" r="8" fill="hsl(40 15% 25%)" stroke="hsl(40 15% 35%)" strokeWidth="2" />
    {/* Spokes */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <line 
        key={angle}
        x1={20 + Math.cos(angle * Math.PI / 180) * 8}
        y1={20 + Math.sin(angle * Math.PI / 180) * 8}
        x2={20 + Math.cos(angle * Math.PI / 180) * 16}
        y2={20 + Math.sin(angle * Math.PI / 180) * 16}
        stroke="hsl(40 15% 35%)"
        strokeWidth="3"
      />
    ))}
    {/* Center */}
    <circle cx="20" cy="20" r="4" fill="hsl(40 15% 40%)" />
  </svg>
);

const DieselpunkSplash: React.FC<DieselpunkSplashProps> = ({ 
  onComplete,
  duration = 3000 
}) => {
  const [progress, setProgress] = useState(0);
  const [gaugeValues, setGaugeValues] = useState({ psi: 0, rpm: 0, temp: 0 });
  const [phase, setPhase] = useState<'boot' | 'power' | 'ready'>('boot');
  const [processedLogoImage, setProcessedLogoImage] = useState<string | null>(null);
  
  // Process the logo image on mount (remove background)
  useEffect(() => {
    const processLogo = async () => {
      try {
        // Convert imported URL to data URL then process
        const response = await fetch(dramatonLogoImageSrc);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const processedUrl = await removeBackground(dataUrl);
          setProcessedLogoImage(processedUrl);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to process logo:', error);
        // Fallback to original
        setProcessedLogoImage(dramatonLogoImageSrc);
      }
    };
    processLogo();
  }, []);
  
  useEffect(() => {
    // Animate progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      // Update gauges based on progress
      setGaugeValues({
        psi: newProgress * 0.85,
        rpm: newProgress * 0.7,
        temp: 0.2 + newProgress * 0.5,
      });
      
      // Update phase
      if (newProgress < 0.3) setPhase('boot');
      else if (newProgress < 0.8) setPhase('power');
      else setPhase('ready');
      
      if (newProgress >= 1) {
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 500);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [duration, onComplete]);
  
  const statusMessages = {
    boot: 'INITIALIZING DRAMATON ENGINE...',
    power: 'BUILDING PRESSURE...',
    ready: 'SYSTEMS ONLINE',
  };
  
  return (
    <div className="fixed inset-0 bg-diesel-black flex items-center justify-center overflow-hidden z-50">
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--diesel-border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--diesel-border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* === TOP EDGE - Pipes and Gauges === */}
      <div className="absolute top-0 left-0 right-0 h-24 flex items-start">
        {/* Left pipe system */}
        <div className="absolute left-8 top-6">
          <PipeHorizontal width={180} />
          <div className="absolute -right-4 -top-1">
            <PipeJunction />
          </div>
        </div>
        
        {/* Left gauge cluster */}
        <div className="absolute left-52 top-3 flex gap-2">
          <PressureDial value={gaugeValues.psi} label="PSI" size={50} />
          <PressureDial value={gaugeValues.rpm} label="RPM" size={50} />
        </div>
        
        {/* Center decorative bar */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 flex items-center gap-4">
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-diesel-gold/60 to-transparent" />
          <Rivet size={8} />
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-diesel-gold/60 to-transparent" />
        </div>
        
        {/* Right gauge cluster */}
        <div className="absolute right-52 top-3 flex gap-2">
          <PressureDial value={gaugeValues.temp} label="TEMP" size={50} />
          <ValveWheel size={50} spinning={phase === 'power'} />
        </div>
        
        {/* Right pipe system */}
        <div className="absolute right-8 top-6">
          <PipeHorizontal width={180} />
          <div className="absolute -left-4 -top-1">
            <PipeJunction />
          </div>
        </div>
      </div>
      
      {/* === LEFT EDGE - Vacuum Tubes and Vertical Pipes === */}
      <div className="absolute left-0 top-0 bottom-0 w-32 flex flex-col">
        {/* Upper vacuum tube cluster */}
        <div className="absolute left-4 top-32 flex flex-col gap-2">
          <VacuumTube size={36} glowColor="orange" pulseSpeed={2} />
          <VacuumTube size={36} glowColor="green" pulseSpeed={2.5} />
          <VacuumTube size={36} glowColor="orange" pulseSpeed={1.8} />
        </div>
        
        {/* Vertical pipe */}
        <div className="absolute left-10 top-1/3">
          <PipeVertical height={200} />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <PipeJunction />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <PipeJunction />
          </div>
        </div>
        
        {/* Lower gear cluster */}
        <div className="absolute left-2 bottom-32">
          <Gear 
            size={60} 
            teeth={10} 
            className="text-diesel-steel animate-[spin_8s_linear_infinite]" 
          />
          <div className="absolute -right-6 top-6">
            <Gear 
              size={40} 
              teeth={8} 
              className="text-diesel-steel animate-[spin_5s_linear_infinite_reverse]" 
            />
          </div>
        </div>
        
        {/* Steam vent */}
        <SteamPuff x={60} y={300} direction="right" />
      </div>
      
      {/* === RIGHT EDGE - Vacuum Tubes and Gears === */}
      <div className="absolute right-0 top-0 bottom-0 w-32 flex flex-col">
        {/* Upper gear cluster */}
        <div className="absolute right-2 top-32">
          <Gear 
            size={70} 
            teeth={12} 
            className="text-diesel-steel animate-[spin_10s_linear_infinite]" 
          />
          <div className="absolute -left-8 top-10">
            <Gear 
              size={45} 
              teeth={9} 
              className="text-diesel-steel animate-[spin_6s_linear_infinite_reverse]" 
            />
          </div>
        </div>
        
        {/* Vertical pipe */}
        <div className="absolute right-10 top-1/3">
          <PipeVertical height={200} />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <PipeJunction />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <PipeJunction />
          </div>
        </div>
        
        {/* Lower vacuum tube cluster */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-2">
          <VacuumTube size={36} glowColor="blue" pulseSpeed={2.2} />
          <VacuumTube size={36} glowColor="orange" pulseSpeed={1.9} />
          <VacuumTube size={36} glowColor="green" pulseSpeed={2.3} />
        </div>
        
        {/* Steam vent */}
        <SteamPuff x={20} y={300} direction="left" />
      </div>
      
      {/* === BOTTOM EDGE - Pipes and Rivets === */}
      <div className="absolute bottom-0 left-0 right-0 h-24 flex items-end">
        {/* Left pipe system */}
        <div className="absolute left-8 bottom-6">
          <PipeHorizontal width={200} />
          <div className="absolute left-16 -top-8">
            <ValveWheel size={32} spinning={progress > 0.5} />
          </div>
        </div>
        
        {/* Center rivet line */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <Rivet key={i} size={10} className="opacity-60" />
          ))}
        </div>
        
        {/* Right pipe system */}
        <div className="absolute right-8 bottom-6">
          <PipeHorizontal width={200} />
          <div className="absolute right-16 -top-8">
            <ValveWheel size={32} spinning={progress > 0.5} />
          </div>
        </div>
      </div>
      
      {/* === CORNER BRACKETS === */}
      <CornerBracket className="absolute top-2 left-2 text-diesel-border" flip="none" />
      <CornerBracket className="absolute top-2 right-2 text-diesel-border" flip="h" />
      <CornerBracket className="absolute bottom-2 left-2 text-diesel-border" flip="v" />
      <CornerBracket className="absolute bottom-2 right-2 text-diesel-border" flip="both" />
      
      {/* === PISTONS === */}
      <Piston side="left" delay={0} />
      <Piston side="right" delay={400} />
      
      {/* === CENTER CONTENT === */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Main logo with glow */}
        <div className="relative">
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 rounded-full blur-xl transition-all duration-1000"
            style={{ 
              background: `radial-gradient(circle, hsl(var(--diesel-gold) / ${0.3 + progress * 0.3}) 0%, transparent 70%)`,
              transform: `scale(${1.5 + progress * 0.5})`,
            }}
          />
          
          {/* Logo */}
          {processedLogoImage && (
            <img 
              src={processedLogoImage} 
              alt="Dramaton Logo" 
              className="w-40 h-40 relative z-10"
              style={{
                filter: `drop-shadow(0 0 ${10 + progress * 20}px hsl(var(--diesel-gold) / 0.5))`,
              }}
            />
          )}
          
          {/* Spinning gear ring around logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-dashed border-diesel-border/30 rounded-full animate-[spin_20s_linear_infinite]" />
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="mt-8 text-4xl font-bold tracking-[0.3em] text-diesel-gold uppercase"
          style={{
            textShadow: '0 0 20px hsl(var(--diesel-gold) / 0.5), 0 0 40px hsl(var(--diesel-gold) / 0.3)',
          }}
        >
          DRAMATON
        </h1>
        
        {/* Subtitle */}
        <p className="mt-2 text-sm tracking-widest text-diesel-steel uppercase">
          Interactive Story Engine
        </p>
        
        {/* Status display */}
        <div className="mt-8 relative">
          <div className="border-2 border-diesel-border bg-diesel-dark/80 px-8 py-3 relative">
            {/* Corner rivets */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
              <div 
                key={pos}
                className={`absolute w-2 h-2 rounded-full bg-diesel-steel border border-diesel-border
                  ${pos.includes('top') ? '-top-1' : '-bottom-1'}
                  ${pos.includes('left') ? '-left-1' : '-right-1'}
                `}
              />
            ))}
            
            {/* Status text */}
            <div className="font-mono text-diesel-gold tracking-wider text-sm">
              {statusMessages[phase]}
            </div>
            
            {/* Scanline effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-b from-transparent via-diesel-gold/5 to-transparent pointer-events-none"
              style={{ animation: 'scanline 2s linear infinite' }}
            />
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-diesel-dark border border-diesel-border overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-diesel-rust via-diesel-gold to-diesel-gold transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Progress percentage markers */}
            <div className="absolute inset-0 flex justify-between px-1 items-center">
              {[25, 50, 75].map((mark) => (
                <div 
                  key={mark}
                  className="w-px h-full bg-diesel-border/50"
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="mt-1 text-right text-xs font-mono text-diesel-steel">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
      
      {/* CSS for custom animations */}
      <style>{`
        @keyframes pistonPump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(40px); }
        }
        @keyframes steamRise {
          0% { transform: translateY(0); opacity: 0.4; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes steamLeft {
          0% { transform: translateX(0); opacity: 0.4; }
          100% { transform: translateX(-40px); opacity: 0; }
        }
        @keyframes steamRight {
          0% { transform: translateX(0); opacity: 0.4; }
          100% { transform: translateX(40px); opacity: 0; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
};

export default DieselpunkSplash;
