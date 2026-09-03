import { useState, useEffect } from 'react';
import { subscribeToUsage, formatCost, SessionUsage } from '@/utils/aiUsageTracker';
import { DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const AIUsageDisplay: React.FC = () => {
  const [usage, setUsage] = useState<SessionUsage>({
    totalGenerations: 0,
    totalEstimatedCost: 0,
    lastGenerationCost: 0,
  });
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const unsubscribe = subscribeToUsage(setUsage);
    return unsubscribe;
  }, []);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 text-diesel-gold hover:text-diesel-paper"
          title="View AI usage costs"
        >
          <DollarSign size={14} />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-diesel-dark border-diesel-border max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-diesel-gold text-sm uppercase tracking-widest">
            AI Generation Costs
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-diesel-panel border border-diesel-border">
            <span className="text-diesel-steel text-xs uppercase">Last Generation</span>
            <span className="text-diesel-green font-mono text-sm">{formatCost(usage.lastGenerationCost)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-diesel-panel border border-diesel-border">
            <span className="text-diesel-steel text-xs uppercase">Session Total</span>
            <span className="text-diesel-gold font-mono text-sm">{formatCost(usage.totalEstimatedCost)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-diesel-panel border border-diesel-border">
            <span className="text-diesel-steel text-xs uppercase">Generations</span>
            <span className="text-diesel-paper font-mono text-sm">{usage.totalGenerations}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};