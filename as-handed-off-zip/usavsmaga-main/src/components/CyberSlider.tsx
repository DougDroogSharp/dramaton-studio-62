import React from 'react';
import { cn } from '@/lib/utils';

interface CyberSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void; // Fires when user releases slider
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const CyberSlider: React.FC<CyberSliderProps> = ({ 
  label, 
  value, 
  onChange,
  onChangeEnd,
  min = 0, 
  max = 100, 
  step = 1,
  className 
}) => {
  const handlePointerUp = () => {
    onChangeEnd?.(value);
  };

  return (
    <div className={cn("flex flex-col gap-1 mb-3", className)}>
      <div className="flex justify-between items-center">
        <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">
          {label}
        </label>
        <span className="text-xs text-diesel-paper font-mono">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        className="w-full h-2 bg-diesel-black border border-diesel-border appearance-none cursor-pointer accent-diesel-gold"
      />
    </div>
  );
};
