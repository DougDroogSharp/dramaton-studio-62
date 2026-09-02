import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GameData, Drawing } from '@/types';
import { POSES, EXPRESSIONS } from '@/constants';
import { PenTool } from 'lucide-react';

// One picker for "use a drawing here": the Drop editor and the Actor pose
// library both open it over the shared store. With `askPose` it also asks
// which pose/expression the drawing stands for (an actor sprite is keyed
// by that triple).

interface DrawingPickerProps {
  game: GameData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (drawing: Drawing, pose?: { pose: string; expression: string }) => void;
  title?: string;
  askPose?: boolean;
}

export const DrawingPicker = ({ game, open, onOpenChange, onPick, title, askPose }: DrawingPickerProps) => {
  const drawings = game.drawings ?? [];
  const [pose, setPose] = useState('Neutral');
  const [expression, setExpression] = useState('Neutral');
  const poses = [...POSES, ...(game.info.customPoses ?? [])];
  const expressions = [...EXPRESSIONS, ...(game.info.customExpressions ?? [])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-diesel-dark border-diesel-border">
        <DialogTitle className="text-sm font-bold text-diesel-cyan uppercase tracking-widest mb-1 flex items-center gap-2">
          <PenTool size={14} />
          {title ?? 'Choose a Drawing'}
        </DialogTitle>
        <DialogDescription className="text-xs text-diesel-steel mb-3">
          From the shared drawings store (DW tab). The drawing keeps one copy of its bytes; this use points at it.
        </DialogDescription>

        {askPose && (
          <div className="flex gap-3 mb-3">
            <label className="flex-1 text-[10px] uppercase tracking-widest text-diesel-steel">
              Pose
              <input
                list="drawing-picker-poses"
                value={pose}
                onChange={e => setPose(e.target.value)}
                className="mt-1 w-full bg-diesel-black border border-diesel-border px-2 py-1 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
              />
              <datalist id="drawing-picker-poses">
                {poses.map(p => <option key={p} value={p} />)}
              </datalist>
            </label>
            <label className="flex-1 text-[10px] uppercase tracking-widest text-diesel-steel">
              Expression
              <input
                list="drawing-picker-expressions"
                value={expression}
                onChange={e => setExpression(e.target.value)}
                className="mt-1 w-full bg-diesel-black border border-diesel-border px-2 py-1 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
              />
              <datalist id="drawing-picker-expressions">
                {expressions.map(x => <option key={x} value={x} />)}
              </datalist>
            </label>
          </div>
        )}

        {drawings.length === 0 ? (
          <p className="text-diesel-rust text-xs py-6 text-center">
            No drawings yet — import some in the DW tab first.
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {drawings.map(d => (
              <button
                key={d.id}
                onClick={() => {
                  onPick(d, askPose ? { pose: pose.trim() || 'Neutral', expression: expression.trim() || 'Neutral' } : undefined);
                  onOpenChange(false);
                }}
                className="group border border-diesel-border hover:border-diesel-cyan transition-colors text-left bg-diesel-black"
                title={d.fileName ?? d.name}
              >
                <div className="aspect-square overflow-hidden flex items-center justify-center">
                  <img src={d.image} alt={d.name} className="w-full h-full object-contain" />
                </div>
                <p className="p-1.5 text-xs text-diesel-paper truncate group-hover:text-diesel-cyan">{d.name}</p>
                {d.artist && <p className="px-1.5 pb-1.5 text-[10px] text-diesel-steel truncate">{d.artist}</p>}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
