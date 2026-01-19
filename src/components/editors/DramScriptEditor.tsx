import React, { useState, useMemo, useCallback } from 'react';
import { GameData } from '@/types';
import { 
  parseScript, 
  ScriptCommand, 
  ScriptCommandType,
  commandsToScript, 
  createDefaultCommand,
  insertCommandAtIndex,
  deleteCommandAtIndex,
  swapCommands 
} from '@/utils/scriptParser';
import { COMMAND_DOCS, CATEGORY_INFO } from '@/utils/scriptDocs';
import { CommandRow } from './CommandRow';
import { AutoCompleteTextarea } from './AutoCompleteTextarea';
import { Code, List, Plus, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DramScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
  game: GameData;
  onFocus?: () => void;
  placeholder?: string;
}

type EditorMode = 'visual' | 'raw';

// Commands excluded from the add menu
const EXCLUDED_COMMANDS: ScriptCommandType[] = ['UNKNOWN', 'ENDIF'];

// Category order for the add command menu
const CATEGORY_ORDER = ['dialogue', 'actor', 'audio', 'effect', 'button', 'choice', 'scene', 'flow'] as const;

export const DramScriptEditor: React.FC<DramScriptEditorProps> = ({
  script,
  onChange,
  game,
  onFocus,
  placeholder,
}) => {
  const [mode, setMode] = useState<EditorMode>('visual');

  // Parse script into commands
  const commands = useMemo(() => {
    try {
      return parseScript(script);
    } catch {
      return [];
    }
  }, [script]);

  // Update script from commands
  const updateFromCommands = useCallback((newCommands: ScriptCommand[]) => {
    const newScript = commandsToScript(newCommands);
    onChange(newScript);
  }, [onChange]);

  // Command handlers
  const handleCommandChange = useCallback((index: number, updated: ScriptCommand) => {
    const newCommands = [...commands];
    newCommands[index] = updated;
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleDelete = useCallback((index: number) => {
    const newCommands = deleteCommandAtIndex(commands, index);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const newCommands = swapCommands(commands, index, index - 1);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= commands.length - 1) return;
    const newCommands = swapCommands(commands, index, index + 1);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleInsertBefore = useCallback((index: number) => {
    const newCmd = createDefaultCommand('COMMENT', game);
    const newCommands = insertCommandAtIndex(commands, newCmd, index);
    updateFromCommands(newCommands);
  }, [commands, game, updateFromCommands]);

  const handleAddCommand = useCallback((type: ScriptCommandType) => {
    const newCmd = createDefaultCommand(type, game);
    const newCommands = [...commands, newCmd];
    updateFromCommands(newCommands);
  }, [commands, game, updateFromCommands]);

  // Group commands by category for the add menu
  const groupedDocs = useMemo(() => {
    return COMMAND_DOCS
      .filter(doc => !EXCLUDED_COMMANDS.includes(doc.type))
      .reduce((acc, doc) => {
        if (!acc[doc.category]) acc[doc.category] = [];
        acc[doc.category].push(doc);
        return acc;
      }, {} as Record<string, typeof COMMAND_DOCS>);
  }, []);

  return (
    <div className="flex flex-col h-full bg-diesel-panel border border-diesel-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-diesel-border bg-diesel-dark">
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex border border-diesel-border rounded-sm overflow-hidden">
            <button
              onClick={() => setMode('visual')}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold transition-colors ${
                mode === 'visual' 
                  ? 'bg-diesel-rust text-diesel-paper' 
                  : 'bg-diesel-dark text-diesel-steel hover:text-diesel-paper'
              }`}
              title="Visual Editor"
            >
              <List size={12} />
              Visual
            </button>
            <button
              onClick={() => setMode('raw')}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold transition-colors ${
                mode === 'raw' 
                  ? 'bg-diesel-rust text-diesel-paper' 
                  : 'bg-diesel-dark text-diesel-steel hover:text-diesel-paper'
              }`}
              title="Raw Text Editor"
            >
              <Code size={12} />
              Raw
            </button>
          </div>

          {/* Add command dropdown - only show in visual mode */}
          {mode === 'visual' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold bg-diesel-brass/20 text-diesel-brass border border-diesel-brass/50 hover:bg-diesel-brass/30">
                  <Plus size={12} />
                  Add Command
                  <ChevronDown size={10} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="bg-diesel-panel border-diesel-border z-50 max-h-[400px] overflow-y-auto w-[220px]"
                align="start"
              >
                {CATEGORY_ORDER.map(cat => {
                  const docs = groupedDocs[cat];
                  if (!docs?.length) return null;
                  
                  return (
                    <React.Fragment key={cat}>
                      <DropdownMenuLabel className="text-[10px] uppercase text-diesel-steel">
                        {CATEGORY_INFO[cat].title}
                      </DropdownMenuLabel>
                      {docs.map(doc => (
                        <DropdownMenuItem
                          key={doc.type}
                          onClick={() => handleAddCommand(doc.type)}
                          className="text-xs cursor-pointer hover:bg-diesel-rust/20"
                        >
                          <span className="font-mono font-bold">{doc.type}</span>
                          <span className="ml-2 text-diesel-steel text-[10px] truncate">
                            {doc.description.split('.')[0]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-diesel-border" />
                    </React.Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Command count */}
        <span className="text-[10px] text-diesel-steel">
          {commands.length} command{commands.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Editor content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'visual' ? (
          <div className="h-full overflow-y-auto custom-scrollbar p-2 space-y-1">
            {commands.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-diesel-steel text-sm">
                <p>No commands yet</p>
                <p className="text-xs mt-1">Click "Add Command" to get started</p>
              </div>
            ) : (
              commands.map((cmd, index) => (
                <CommandRow
                  key={`${cmd.type}-${index}`}
                  command={cmd}
                  index={index}
                  game={game}
                  onChange={(updated) => handleCommandChange(index, updated)}
                  onDelete={() => handleDelete(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onInsertBefore={() => handleInsertBefore(index)}
                  isFirst={index === 0}
                  isLast={index === commands.length - 1}
                />
              ))
            )}
          </div>
        ) : (
          <AutoCompleteTextarea
            value={script}
            onChange={onChange}
            game={game}
            onFocus={onFocus}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};
