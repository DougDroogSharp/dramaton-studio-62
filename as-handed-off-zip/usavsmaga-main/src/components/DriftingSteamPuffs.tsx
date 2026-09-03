import React, { useMemo } from 'react';

interface SteamPuff {
  id: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const DriftingSteamPuffs: React.FC<{ className?: string }> = ({ className = '' }) => {
  // Generate random steam puffs
  const puffs = useMemo<SteamPuff[]>(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      startX: 5 + Math.random() * 15, // Start from left side (where boiler is)
      startY: 40 + Math.random() * 40, // Vertical range in middle-lower area
      size: 30 + Math.random() * 60,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 15,
      opacity: 0.03 + Math.random() * 0.05,
    }));
  }, []);

  return (
    <div 
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      {puffs.map((puff) => (
        <div
          key={puff.id}
          className="absolute rounded-full"
          style={{
            left: `${puff.startX}%`,
            top: `${puff.startY}%`,
            width: `${puff.size}px`,
            height: `${puff.size}px`,
            background: `radial-gradient(circle, hsl(var(--diesel-cream) / ${puff.opacity}) 0%, transparent 70%)`,
            animation: `driftSteam ${puff.duration}s ease-in-out ${puff.delay}s infinite`,
            filter: 'blur(8px)',
          }}
        />
      ))}
      
      <style>{`
        @keyframes driftSteam {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(80vw, -20vh) scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
