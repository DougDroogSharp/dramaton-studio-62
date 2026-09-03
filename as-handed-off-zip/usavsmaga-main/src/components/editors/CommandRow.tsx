import React from 'react';
import { ScriptCommand, ScriptCommandType, createDefaultCommand } from '@/utils/scriptParser';
import { GameData } from '@/types';
import { CommandTypeSelector, getCategoryColor, getCommandCategory } from './CommandTypeSelector';
import { ParameterControls } from './ParameterControls';
import { ChevronUp, ChevronDown, Plus, Trash2, GripVertical, AlertTriangle, Check, Timer } from 'lucide-react';

interface CommandRowProps {
  command: ScriptCommand;
  index: number;
  game: GameData;
  onChange: (updated: ScriptCommand) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertBefore: () => void;
  onInsertWaitAfter?: () => void;
  onDoubleClick?: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  depth?: number;
  isSelected?: boolean;
  onSelect?: (index: number, shiftKey: boolean) => void;
  showConnector?: 'start' | 'middle' | 'end' | 'single' | null;
  error?: string;
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
  onInsertWaitAfter,
  onDoubleClick,
  isFirst,
  isLast,
  canMoveUp: canMoveUpProp = true,
  canMoveDown: canMoveDownProp = true,
  depth = 0,
  isSelected = false,
  onSelect,
  showConnector = null,
  error,
}) => {
  const moveUpDisabled = isFirst || !canMoveUpProp;
  const moveDownDisabled = isLast || !canMoveDownProp;
  const category = getCommandCategory(command.type);
  const categoryColor = category ? getCategoryColor(category) : 'bg-diesel-steel/20';

  const handleTypeChange = (newType: ScriptCommandType) => {
    if (newType === command.type) return;
    const newCmd = createDefaultCommand(newType, game);
    onChange(newCmd);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(index, e.shiftKey);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(index);
  };

  const isBlockStart = command.type === 'LOOP' || command.type === 'IF';
  const isBlockEnd = (command as any).type === 'ENDLOOP' || (command as any).type === 'ENDIF';

  return (
    <div className="relative flex">
      {/* Connecting line for block pairs */}
      {showConnector && depth > 0 && (
        <div 
          className="absolute left-0 flex flex-col items-center"
          style={{ 
            left: (depth - 1) * 16 + 6,
            top: showConnector === 'start' ? '50%' : 0,
            bottom: showConnector === 'end' ? '50%' : 0,
            width: 4,
          }}
        >
          <div 
            className={`w-0.5 h-full ${
              isBlockStart || isBlockEnd 
                ? 'bg-diesel-gold/60' 
                : 'bg-diesel-gold/30'
            }`}
          />
        </div>
      )}
      
      {/* Block bracket indicators */}
      {(isBlockStart || isBlockEnd) && depth >= 0 && (
        <div 
          className="absolute flex items-center justify-center"
          style={{ 
            left: depth * 16 - 4,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className={`w-2 h-2 rounded-full ${
            isBlockStart ? 'bg-diesel-gold' : 'bg-diesel-brass'
          }`} />
        </div>
      )}
      
      <div 
        className={`group flex-1 flex flex-col gap-1 p-2 bg-diesel-dark border transition-colors cursor-pointer ${
          isSelected 
            ? 'border-diesel-gold bg-diesel-gold/10' 
            : error 
              ? 'border-diesel-rust' 
              : 'border-diesel-border hover:border-diesel-rust/50'
        }`}
        style={{ marginLeft: depth * 16 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title="Double-click to preview up to this command"
      >
        {/* Main command row */}
        <div className="flex items-start gap-1">
          {/* Selection checkbox */}
          {onSelect && (
            <div 
              className={`flex items-center justify-center w-5 h-5 border rounded-sm transition-colors ${
                isSelected 
                  ? 'bg-diesel-gold border-diesel-gold' 
                  : 'border-diesel-steel/50 hover:border-diesel-gold/50'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index, e.shiftKey);
              }}
            >
              {isSelected && <Check size={12} className="text-diesel-dark" />}
            </div>
          )}
          
          {/* Grip handle */}
          <div className="flex flex-col items-center pt-1 opacity-30 group-hover:opacity-60">
            <GripVertical size={14} className="text-diesel-steel" />
            <span className="text-[9px] text-diesel-steel">{index + 1}</span>
          </div>

          {/* Command type selector */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <CommandTypeSelector value={command.type} onChange={handleTypeChange} />
          </div>

          {/* Parameter controls */}
          <div className="flex-1 min-w-0 flex items-start" onClick={(e) => e.stopPropagation()}>
            <ParameterControls command={command} onChange={onChange} game={game} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onMoveUp}
              disabled={moveUpDisabled}
              className="p-1 text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/20 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={moveUpDisabled && !isFirst ? "Can't move above LOOP" : "Move up"}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={moveDownDisabled}
              className="p-1 text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/20 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={moveDownDisabled && !isLast ? "Can't move below ENDLOOP" : "Move down"}
            >
              <ChevronDown size={14} />
            </button>
            
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onInsertBefore}
                className="p-1 text-diesel-brass hover:bg-diesel-brass/20 rounded-sm"
                title="Insert command before"
              >
                <Plus size={14} />
              </button>
              {onInsertWaitAfter && (
                <button
                  onClick={onInsertWaitAfter}
                  className="p-1 text-diesel-gold hover:bg-diesel-gold/20 rounded-sm"
                  title="Insert WAIT after"
                >
                  <Timer size={14} />
                </button>
              )}
              <button
                onClick={onDelete}
                className="p-1 text-diesel-rust hover:bg-diesel-rust/20 rounded-sm"
                title="Delete command"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1 px-1 py-0.5 bg-diesel-rust/10 border border-diesel-rust/30 text-diesel-rust text-[10px]">
            <AlertTriangle size={12} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};