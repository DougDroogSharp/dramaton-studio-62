import React from 'react';
import { ScriptCommand, ScriptCommandType, createDefaultCommand } from '@/utils/scriptParser';
import { GameData } from '@/types';
import { CommandTypeSelector, getCategoryColor, getCommandCategory } from './CommandTypeSelector';
import { ParameterControls } from './ParameterControls';
import { ChevronUp, ChevronDown, Plus, Trash2, GripVertical } from 'lucide-react';

interface CommandRowProps {
  command: ScriptCommand;
  index: number;
  game: GameData;
  onChange: (updated: ScriptCommand) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertBefore: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const CommandRow: React.FC<CommandRowProps> = ({
  command,
  index,
  game,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertBefore,
  isFirst,
  isLast,
}) => {
  const category = getCommandCategory(command.type);
  const categoryColor = category ? getCategoryColor(category) : 'bg-diesel-steel/20';

  const handleTypeChange = (newType: ScriptCommandType) => {
    if (newType === command.type) return;
    // Create a new default command of the new type
    const newCmd = createDefaultCommand(newType, game);
    onChange(newCmd);
  };

  return (
    <div className={`group flex items-start gap-1 p-2 bg-diesel-dark border border-diesel-border hover:border-diesel-rust/50 transition-colors`}>
      {/* Grip handle */}
      <div className="flex flex-col items-center pt-1 opacity-30 group-hover:opacity-60">
        <GripVertical size={14} className="text-diesel-steel" />
        <span className="text-[9px] text-diesel-steel">{index + 1}</span>
      </div>

      {/* Command type selector */}
      <div className="flex-shrink-0">
        <CommandTypeSelector value={command.type} onChange={handleTypeChange} />
      </div>

      {/* Parameter controls */}
      <div className="flex-1 min-w-0 flex items-start">
        <ParameterControls command={command} onChange={onChange} game={game} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onInsertBefore}
          className="p-1 text-diesel-brass hover:bg-diesel-brass/20 rounded-sm"
          title="Insert command before"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 text-diesel-steel hover:bg-diesel-steel/20 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 text-diesel-steel hover:bg-diesel-steel/20 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-diesel-rust hover:bg-diesel-rust/20 rounded-sm"
          title="Delete command"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
