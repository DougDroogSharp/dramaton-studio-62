import React, { useRef, useCallback } from 'react';
import { SliderCommand, GaugeCommand } from '@/utils/scriptParser';

// Dieselpunk instrument panel controls: a drag slider and a needle
// gauge, both positioned as percentages of the stage. Placeholder-grade
// but themed — panels and brass, not naked range inputs.

interface DieselSliderProps {
  config: SliderCommand;
  value: number;
  onChange: (value: number) => void;
}

export const DieselSlider: React.FC<DieselSliderProps> = ({ config, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const { min, max, step } = config;
  const range = max - min || 1;
  const clamped = Math.min(max, Math.max(min, value));
  const fraction = (clamped - min) / range;

  const valueFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return null;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    let v = min + pct * range;
    if (step > 0) v = Math.round(v / step) * step;
    // Kill float noise from step rounding (0.05 steps etc.)
    v = Math.round(v * 1e6) / 1e6;
    return Math.min(max, Math.max(min, v));
  }, [min, max, step, range]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFromPointer(e.clientX);
    if (v !== null) onChange(v);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = valueFromPointer(e.clientX);
    if (v !== null) onChange(v);
  };

  const decimals = step >= 1 || step <= 0 ? 0 : step >= 0.01 ? 2 : 3;

  return (
    <div
      className="absolute w-[14%] min-w-24 bg-diesel-panel border border-diesel-border shadow-lg px-2 py-1.5 select-none"
      style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)', zIndex: 200 }}
    >
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold truncate">
          {config.label ?? config.variable}
        </span>
        <span className="text-[10px] text-diesel-paper font-mono ml-1">{clamped.toFixed(decimals)}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-3 bg-diesel-black border border-diesel-border cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* fill */}
        <div className="absolute inset-y-0 left-0 bg-diesel-gold/40" style={{ width: `${fraction * 100}%` }} />
        {/* knob */}
        <div
          className="absolute top-1/2 w-2 h-4 bg-diesel-gold border border-diesel-black shadow"
          style={{ left: `${fraction * 100}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  );
};

interface DieselGaugeProps {
  config: GaugeCommand;
  value: number;
}

export const DieselGauge: React.FC<DieselGaugeProps> = ({ config, value }) => {
  const { min, max } = config;
  const range = max - min || 1;
  const clamped = Math.min(max, Math.max(min, value));
  const fraction = (clamped - min) / range;
  // Needle sweeps -90° (min) to +90° (max)
  const angle = -90 + fraction * 180;

  return (
    <div
      className="absolute w-[10%] min-w-20 bg-diesel-panel border border-diesel-border shadow-lg px-2 py-1.5 select-none"
      style={{ left: `${config.x}%`, top: `${config.y}%`, transform: 'translate(-50%, -50%)', zIndex: 200 }}
    >
      <svg viewBox="0 0 100 58" className="w-full block">
        {/* dial face */}
        <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" stroke="hsl(var(--diesel-black))" strokeWidth="14" />
        {/* arc scale */}
        <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" stroke="hsl(var(--diesel-steel))" strokeWidth="2" opacity="0.6" />
        {/* ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a = (-90 + t * 180) * (Math.PI / 180);
          const x1 = 50 + Math.sin(a) * 36;
          const y1 = 50 - Math.cos(a) * 36;
          const x2 = 50 + Math.sin(a) * 42;
          const y2 = 50 - Math.cos(a) * 42;
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--diesel-paper))" strokeWidth="2" opacity="0.7" />;
        })}
        {/* needle */}
        <line
          x1="50" y1="50" x2="50" y2="14"
          stroke="hsl(var(--diesel-rust))" strokeWidth="3" strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
          style={{ transition: 'transform 200ms ease-out' }}
        />
        {/* hub */}
        <circle cx="50" cy="50" r="4" fill="hsl(var(--diesel-gold))" stroke="hsl(var(--diesel-black))" />
      </svg>
      <div className="flex justify-between items-baseline mt-0.5">
        <span className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold truncate">
          {config.label ?? config.variable}
        </span>
        <span className="text-[10px] text-diesel-paper font-mono ml-1">{Math.round(clamped)}</span>
      </div>
    </div>
  );
};
