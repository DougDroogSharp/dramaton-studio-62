import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserPlus, Package, X } from 'lucide-react';
import { ScriptCommand } from '@/utils/scriptParser';

export interface ScriptError {
  type: 'MISSING_ACTOR' | 'MISSING_ITEM';
  command: ScriptCommand;
  itemId: string;
  itemName: string; // Formatted display name
  commandType: string; // MOVE, POSE, ZORDER, SAY, etc.
}

interface ScriptErrorDialogProps {
  error: ScriptError | null;
  onClose: () => void;
  onCreateActor: (name: string, itemId: string) => void;
  onCreateItem: (name: string, itemId: string) => void;
}

// Format itemId to display name (libby -> Libby, the_detective -> The Detective)
export function formatItemName(itemId: string): string {
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const ScriptErrorDialog: React.FC<ScriptErrorDialogProps> = ({
  error,
  onClose,
  onCreateActor,
  onCreateItem,
}) => {
  if (!error) return null;

  const getCommandDescription = (cmdType: string): string => {
    switch (cmdType) {
      case 'MOVE':
        return 'MOVE requires the target to be on stage first using an ENTER command.';
      case 'POSE':
        return 'POSE requires the actor to be on stage first using an ENTER command.';
      case 'ZORDER':
        return 'ZORDER requires the target to be on stage first using an ENTER command.';
      case 'SAY':
        return 'SAY requires the target to be on stage first using an ENTER command.';
      case 'EXIT':
        return 'EXIT targets an element that hasn\'t entered the scene.';
      default:
        return 'This command targets an element that hasn\'t entered the scene.';
    }
  };

  return (
    <Dialog open={!!error} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-diesel-dark border-diesel-rust max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-diesel-rust">
            <AlertTriangle className="h-5 w-5" />
            Missing Target: "{error.itemName}"
          </DialogTitle>
          <DialogDescription className="text-diesel-paper/80">
            The {error.commandType} command references "{error.itemName}" but this 
            {error.type === 'MISSING_ACTOR' ? ' actor' : ' item'} hasn't entered 
            the scene yet.
            <br /><br />
            <span className="text-diesel-steel">
              {getCommandDescription(error.commandType)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-diesel-steel text-xs uppercase tracking-wide">
            What would you like to do?
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => onCreateActor(error.itemName, error.itemId)}
              className="w-full justify-start gap-2 bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30"
            >
              <UserPlus size={16} />
              Create Actor "{error.itemName}"
            </Button>
            
            <Button
              onClick={() => onCreateItem(error.itemName, error.itemId)}
              className="w-full justify-start gap-2 bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan hover:bg-diesel-cyan/30"
            >
              <Package size={16} />
              Create Item "{error.itemName}"
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-diesel-steel hover:text-diesel-paper"
          >
            <X size={14} className="mr-1" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
