import React from 'react';
import { cn } from '@/lib/utils';

interface CyberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  compact?: boolean;
}

export const CyberInput: React.FC<CyberInputProps> = ({ label, compact = false, className = '', ...props }) => {
  if (compact) {
    return (
      <input
        className={cn(
          "bg-diesel-black border border-diesel-border text-diesel-paper px-2 py-1 text-sm focus:outline-none focus:border-diesel-gold transition-all placeholder-diesel-steel disabled:opacity-50",
          className
        )}
        autoComplete="off"
        onFocus={(e) => e.target.select()}
        {...props}
      />
    );
  }
  
  return (
    <div className="flex flex-col gap-1 mb-2 shrink-0">
      {label && (
        <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">
          {label}
        </label>
      )}
      <input
        className={cn(
          "bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold focus:shadow-diesel-glow transition-all placeholder-diesel-steel disabled:opacity-50",
          className
        )}
        autoComplete="off"
        onFocus={(e) => e.target.select()}
        {...props}
      />
    </div>
  );
};
