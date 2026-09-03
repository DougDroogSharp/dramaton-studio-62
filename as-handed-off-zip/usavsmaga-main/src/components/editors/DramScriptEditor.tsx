import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Code, List, Plus, ChevronDown, ChevronUp, Clock, Trash2, X, Timer } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Commands that require an actor/item to be ENTERed first
const REQUIRES_ENTER: ScriptCommandType[] = ['EXIT', 'MOVE', 'ZORDER', 'POSE', 'EFFECT', 'CLEAR_EFFECT'];

// Get the itemId from a command that requires ENTER
const getCommandItemId = (cmd: ScriptCommand): string | null => {
  switch (cmd.type) {
    case 'EXIT':
    case 'MOVE':
    case 'ZORDER':
      return (cmd as any).itemId || null;
    case 'POSE':
      return (cmd as any).actorId || null;
    case 'EFFECT':
    case 'CLEAR_EFFECT':
      return (cmd as any).targetId || null;
    default:
      return null;
  }
};

// Validate commands and return error map
const validateCommands = (commands: ScriptCommand[]): Map<number, string> => {
  const errors = new Map<number, string>();
  const enteredItems = new Set<string>();
  let loopDepth = 0;
  
  commands.forEach((cmd, index) => {
    // Track ENTER commands
    if (cmd.type === 'ENTER') {
      enteredItems.add((cmd as any).itemId);
    }
    
    // Check if command requires ENTER first
    if (REQUIRES_ENTER.includes(cmd.type)) {
      const itemId = getCommandItemId(cmd);
      if (itemId && !enteredItems.has(itemId)) {
        errors.set(index, `"${itemId}" must be ENTERed before using ${cmd.type}`);
      }
    }
    
    // Track EXIT commands (item is no longer on stage)
    if (cmd.type === 'EXIT') {
      enteredItems.delete((cmd as any).itemId);
    }
    
    // Track LOOP depth for ENDLOOP and BREAKLOOP validation
    if (cmd.type === 'LOOP') {
      loopDepth++;
    }
    if ((cmd as any).type === 'ENDLOOP') {
      if (loopDepth <= 0) {
        errors.set(index, 'ENDLOOP without matching LOOP');
      } else {
        loopDepth--;
      }
    }
    if (cmd.type === 'BREAKLOOP') {
      if (loopDepth <= 0) {
        errors.set(index, 'BREAKLOOP must be inside a LOOP block');
      }
    }
  });
  
  return errors;
};

// Check if ENDLOOP can be added (has at least one unclosed LOOP)
const hasUnclosedLoop = (commands: ScriptCommand[]): boolean => {
  let loopDepth = 0;
  for (const cmd of commands) {
    if (cmd.type === 'LOOP') loopDepth++;
    if ((cmd as any).type === 'ENDLOOP') loopDepth--;
  }
  return loopDepth > 0;
};

// Check if a command can be moved up without breaking LOOP/ENDLOOP pairing
const canMoveUp = (commands: ScriptCommand[], index: number): boolean => {
  if (index <= 0) return false;
  const cmd = commands[index];
  const cmdAbove = commands[index - 1];
  
  // Don't allow ENDLOOP to move above its LOOP
  if ((cmd as any).type === 'ENDLOOP' && cmdAbove.type === 'LOOP') {
    return false;
  }
  
  return true;
};

// Check if a command can be moved down without breaking LOOP/ENDLOOP pairing  
const canMoveDown = (commands: ScriptCommand[], index: number): boolean => {
  if (index >= commands.length - 1) return false;
  const cmd = commands[index];
  const cmdBelow = commands[index + 1];
  
  // Don't allow LOOP to move below its ENDLOOP
  if (cmd.type === 'LOOP' && (cmdBelow as any).type === 'ENDLOOP') {
    return false;
  }
  
  return true;
};

// Command types that contain text that should trigger tag relevance checks
const TEXT_BEARING_COMMANDS: ScriptCommandType[] = ['DIALOGUE', 'COMMENT', 'BUTTON'];

interface DramScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
  game: GameData;
  onFocus?: () => void;
  placeholder?: string;
  onNavigateToAsset?: (type: 'actor' | 'scene' | 'button' | 'sfx' | 'drop', id: string) => void;
  onPlayToCommand?: (commandIndex: number) => void;
  onTextCommandChange?: (text: string, commandType: ScriptCommandType) => void;
}

type EditorMode = 'visual' | 'raw';

// Commands excluded from the add menu entirely
const EXCLUDED_COMMANDS: ScriptCommandType[] = ['UNKNOWN', 'ENDIF'];

// Category order for the add command menu
const CATEGORY_ORDER = ['dialogue', 'actor', 'audio', 'effect', 'button', 'choice', 'scene', 'flow'] as const;

// Recent commands storage key
const RECENT_COMMANDS_KEY = 'dramscript_recent_commands';
const MAX_RECENT = 3;

export const DramScriptEditor: React.FC<DramScriptEditorProps> = ({
  script,
  onChange,
  game,
  onFocus,
  placeholder,
  onNavigateToAsset,
  onPlayToCommand,
  onTextCommandChange,
}) => {
  const { confirm } = useConfirmDialog();
  const [mode, setMode] = useState<EditorMode>('visual');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showWaitPicker, setShowWaitPicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevCommandCountRef = useRef<number>(0);
  
  // Track recently used commands
  const [recentCommands, setRecentCommands] = useState<ScriptCommandType[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Parse script into commands
  const commands = useMemo(() => {
    try {
      return parseScript(script);
    } catch {
      return [];
    }
  }, [script]);

  // Validate commands for ENTER and LOOP requirements
  const commandErrors = useMemo(() => validateCommands(commands), [commands]);
  
  // Check if we can add ENDLOOP (has unclosed LOOP)
  const canAddEndloop = useMemo(() => hasUnclosedLoop(commands), [commands]);
  
  // Calculate nesting depth for each command (for visual indentation)
  const commandDepths = useMemo(() => {
    const depths: number[] = [];
    let currentDepth = 0;
    
    for (const cmd of commands) {
      // ENDLOOP and ENDIF decrease depth before rendering
      if ((cmd as any).type === 'ENDLOOP' || (cmd as any).type === 'ENDIF') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
      
      depths.push(currentDepth);
      
      // LOOP and IF increase depth after rendering
      if (cmd.type === 'LOOP' || cmd.type === 'IF') {
        currentDepth++;
      }
    }
    
    return depths;
  }, [commands]);
  
  // Calculate connector positions for block pairs
  const commandConnectors = useMemo(() => {
    const connectors: (('start' | 'middle' | 'end' | null)[]) = new Array(commands.length).fill(null);
    const blockStack: number[] = []; // Stack of block start indices
    
    commands.forEach((cmd, index) => {
      if (cmd.type === 'LOOP' || cmd.type === 'IF') {
        blockStack.push(index);
        connectors[index] = 'start';
      } else if ((cmd as any).type === 'ENDLOOP' || (cmd as any).type === 'ENDIF') {
        const startIndex = blockStack.pop();
        if (startIndex !== undefined) {
          connectors[index] = 'end';
          // Mark all commands in between as 'middle'
          for (let i = startIndex + 1; i < index; i++) {
            if (connectors[i] === null) {
              connectors[i] = 'middle';
            }
          }
        }
      }
    });
    
    return connectors;
  }, [commands]);

  // Update script from commands (defined early so other callbacks can use it)
  const updateFromCommands = useCallback((newCommands: ScriptCommand[]) => {
    const newScript = commandsToScript(newCommands);
    onChange(newScript);
  }, [onChange]);

  // Selection handlers
  const handleSelect = useCallback((index: number, shiftKey: boolean) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      
      if (shiftKey && lastSelectedIndex !== null) {
        // Range select
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
      } else {
        // Toggle single
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
      }
      
      return newSet;
    });
    setLastSelectedIndex(index);
  }, [lastSelectedIndex]);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
  }, []);

  // Batch delete selected commands
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIndices.size === 0) return;
    
    const confirmed = await confirm({
      title: 'Delete Selected Commands',
      description: `Delete ${selectedIndices.size} selected command${selectedIndices.size > 1 ? 's' : ''}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    
    if (confirmed) {
      const indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a);
      let newCommands = [...commands];
      for (const idx of indicesToDelete) {
        newCommands = deleteCommandAtIndex(newCommands, idx);
      }
      updateFromCommands(newCommands);
      clearSelection();
    }
  }, [selectedIndices, commands, confirm, updateFromCommands, clearSelection]);

  // Batch move selected commands up
  const handleMoveSelectedUp = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    if (indices[0] === 0) return; // Can't move up if first is selected
    
    let newCommands = [...commands];
    const newSelected = new Set<number>();
    
    for (const idx of indices) {
      if (idx > 0 && !selectedIndices.has(idx - 1)) {
        newCommands = swapCommands(newCommands, idx, idx - 1);
        newSelected.add(idx - 1);
      } else {
        newSelected.add(idx);
      }
    }
    
    updateFromCommands(newCommands);
    setSelectedIndices(newSelected);
  }, [selectedIndices, commands, updateFromCommands]);

  // Batch move selected commands down
  const handleMoveSelectedDown = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const indices = Array.from(selectedIndices).sort((a, b) => b - a);
    if (indices[0] === commands.length - 1) return; // Can't move down if last is selected
    
    let newCommands = [...commands];
    const newSelected = new Set<number>();
    
    for (const idx of indices) {
      if (idx < commands.length - 1 && !selectedIndices.has(idx + 1)) {
        newCommands = swapCommands(newCommands, idx, idx + 1);
        newSelected.add(idx + 1);
      } else {
        newSelected.add(idx);
      }
    }
    
    updateFromCommands(newCommands);
    setSelectedIndices(newSelected);
  }, [selectedIndices, commands, updateFromCommands]);

  // Command handlers
  const handleCommandChange = useCallback((index: number, updated: ScriptCommand) => {
    const original = commands[index];
    const newCommands = [...commands];
    newCommands[index] = updated;
    updateFromCommands(newCommands);
    
    // Check if this is a text-bearing command and text changed
    if (onTextCommandChange && TEXT_BEARING_COMMANDS.includes(updated.type)) {
      const originalText = (original as any).text || '';
      const updatedText = (updated as any).text || '';
      if (updatedText !== originalText && updatedText.length >= 10) {
        onTextCommandChange(updatedText, updated.type);
      }
    }
  }, [commands, updateFromCommands, onTextCommandChange]);

  const handleDelete = useCallback((index: number) => {
    const newCommands = deleteCommandAtIndex(commands, index);
    updateFromCommands(newCommands);
    // Remove from selection if selected
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  }, [commands, updateFromCommands]);

  const handleMoveUp = useCallback((index: number) => {
    if (!canMoveUp(commands, index)) return;
    const newCommands = swapCommands(commands, index, index - 1);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleMoveDown = useCallback((index: number) => {
    if (!canMoveDown(commands, index)) return;
    const newCommands = swapCommands(commands, index, index + 1);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  const handleInsertBefore = useCallback((index: number) => {
    const newCmd = createDefaultCommand('COMMENT', game);
    const newCommands = insertCommandAtIndex(commands, newCmd, index);
    updateFromCommands(newCommands);
  }, [commands, game, updateFromCommands]);

  const handleAddCommand = useCallback((type: ScriptCommandType) => {
    // Track recently used command
    setRecentCommands(prev => {
      const filtered = prev.filter(t => t !== type);
      const updated = [type, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
      return updated;
    });
    
    const newCmd = createDefaultCommand(type, game);
    const newCommands = [...commands, newCmd];
    updateFromCommands(newCommands);
  }, [commands, game, updateFromCommands]);

  // Quick add WAIT with specific duration
  const handleAddWait = useCallback((duration: number = 5) => {
    const waitCmd: ScriptCommand = { type: 'WAIT', duration };
    const newCommands = [...commands, waitCmd];
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  // Insert WAIT after a specific index
  const handleInsertWaitAfter = useCallback((index: number, duration: number = 5) => {
    const waitCmd: ScriptCommand = { type: 'WAIT', duration };
    const newCommands = insertCommandAtIndex(commands, waitCmd, index + 1);
    updateFromCommands(newCommands);
  }, [commands, updateFromCommands]);

  // Keyboard shortcut for adding WAIT
  useEffect(() => {
    if (mode !== 'visual') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;
      
      if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) {
          setShowWaitPicker(true);
        } else {
          handleAddWait(5);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleAddWait]);

  // Scroll to bottom when new commands are added
  useEffect(() => {
    if (commands.length > prevCommandCountRef.current && scrollContainerRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
    prevCommandCountRef.current = commands.length;
  }, [commands.length]);
  const handleClearScript = useCallback(async () => {
    if (commands.length === 0) return;
    
    const confirmed = await confirm({
      title: 'Clear Script',
      description: `Are you sure you want to delete all ${commands.length} commands? This cannot be undone.`,
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    
    if (confirmed) {
      onChange('');
    }
  }, [commands.length, confirm, onChange]);

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

          {/* Quick WAIT button - only show in visual mode */}
          {mode === 'visual' && (
            <button
              onClick={() => handleAddWait(5)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold bg-diesel-gold/20 text-diesel-gold border border-diesel-gold/50 hover:bg-diesel-gold/30"
              title="Add WAIT 5s (W) | Shift+W for duration picker"
            >
              <Timer size={12} />
              +Wait
            </button>
          )}

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
                {/* Recent Commands Section */}
                {recentCommands.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase text-diesel-gold flex items-center gap-1">
                      <Clock size={10} />
                      Recent
                    </DropdownMenuLabel>
                    {recentCommands.map(type => {
                      const doc = COMMAND_DOCS.find(d => d.type === type);
                      if (!doc) return null;
                      const needsLoop = type === 'ENDLOOP' || type === 'BREAKLOOP';
                      const isDisabled = needsLoop && !canAddEndloop;
                      const isUnimplemented = !doc.implemented;
                      
                      return (
                        <DropdownMenuItem
                          key={`recent-${type}`}
                          onClick={() => !isDisabled && !isUnimplemented && handleAddCommand(type)}
                          disabled={isDisabled || isUnimplemented}
                          className={`text-xs cursor-pointer ${
                            isDisabled ? 'opacity-40 cursor-not-allowed' : 
                            isUnimplemented ? 'opacity-50 cursor-not-allowed' : 
                            'hover:bg-diesel-rust/20'
                          }`}
                        >
                          <span className={`font-mono font-bold ${isUnimplemented ? 'line-through' : ''}`}>
                            {type}
                          </span>
                          <span className={`ml-2 text-diesel-steel text-[10px] truncate ${isUnimplemented ? 'line-through' : ''}`}>
                            {doc.description.split('.')[0]}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator className="bg-diesel-gold/30" />
                  </>
                )}
                
                {CATEGORY_ORDER.map(cat => {
                  const docs = groupedDocs[cat];
                  if (!docs?.length) return null;
                  
                  return (
                    <React.Fragment key={cat}>
                      <DropdownMenuLabel className="text-[10px] uppercase text-diesel-steel">
                        {CATEGORY_INFO[cat].title}
                      </DropdownMenuLabel>
                      {docs.map(doc => {
                        const needsLoop = doc.type === 'ENDLOOP' || doc.type === 'BREAKLOOP';
                        const isDisabled = needsLoop && !canAddEndloop;
                        const isUnimplemented = !doc.implemented;
                        
                        return (
                          <DropdownMenuItem
                            key={doc.type}
                            onClick={() => !isDisabled && !isUnimplemented && handleAddCommand(doc.type)}
                            disabled={isDisabled || isUnimplemented}
                            className={`text-xs cursor-pointer ${
                              isDisabled ? 'opacity-40 cursor-not-allowed' : 
                              isUnimplemented ? 'opacity-50 cursor-not-allowed' : 
                              'hover:bg-diesel-rust/20'
                            }`}
                          >
                            <span className={`font-mono font-bold ${isUnimplemented ? 'line-through' : ''}`}>
                              {doc.type}
                            </span>
                            <span className={`ml-2 text-diesel-steel text-[10px] truncate ${isUnimplemented ? 'line-through' : ''}`}>
                              {isDisabled ? '(needs LOOP first)' : doc.description.split('.')[0]}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator className="bg-diesel-border" />
                    </React.Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Selection actions - show when items selected */}
          {mode === 'visual' && selectedIndices.size > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-diesel-gold/10 border border-diesel-gold/30 rounded-sm">
              <span className="text-[10px] text-diesel-gold font-bold">
                {selectedIndices.size} selected
              </span>
              <button
                onClick={handleMoveSelectedUp}
                className="p-0.5 text-diesel-gold hover:bg-diesel-gold/20 rounded-sm"
                title="Move selected up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={handleMoveSelectedDown}
                className="p-0.5 text-diesel-gold hover:bg-diesel-gold/20 rounded-sm"
                title="Move selected down"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-0.5 text-diesel-rust hover:bg-diesel-rust/20 rounded-sm"
                title="Delete selected"
              >
                <Trash2 size={12} />
              </button>
              <button
                onClick={clearSelection}
                className="p-0.5 text-diesel-steel hover:bg-diesel-steel/20 rounded-sm"
                title="Clear selection"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {/* Clear script button - only show in visual mode when commands exist */}
          {mode === 'visual' && commands.length > 0 && selectedIndices.size === 0 && (
            <button
              onClick={handleClearScript}
              className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold text-diesel-rust border border-diesel-rust/50 hover:bg-diesel-rust/20"
              title="Clear all commands"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>

        {/* Command count with error indicator */}
        <div className="flex items-center gap-2">
          {commandErrors.size > 0 && (
            <span className="text-[10px] text-diesel-rust font-bold">
              {commandErrors.size} error{commandErrors.size !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] text-diesel-steel">
            {commands.length} command{commands.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'visual' ? (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto custom-scrollbar p-2 space-y-1">
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
                  onInsertWaitAfter={() => handleInsertWaitAfter(index)}
                  onDoubleClick={onPlayToCommand}
                  isFirst={index === 0}
                  isLast={index === commands.length - 1}
                  canMoveUp={canMoveUp(commands, index)}
                  canMoveDown={canMoveDown(commands, index)}
                  depth={commandDepths[index] || 0}
                  isSelected={selectedIndices.has(index)}
                  onSelect={handleSelect}
                  showConnector={commandConnectors[index]}
                  error={commandErrors.get(index)}
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
            onNavigateToAsset={onNavigateToAsset}
          />
        )}
      </div>
      
      {/* Quick WAIT Duration Picker Dialog */}
      <Dialog open={showWaitPicker} onOpenChange={setShowWaitPicker}>
        <DialogContent className="bg-diesel-panel border-diesel-border max-w-[240px]">
          <DialogHeader>
            <DialogTitle className="text-diesel-paper text-sm">Add WAIT</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {[0.5, 1, 2, 3, 5, 10].map(d => (
              <button
                key={d}
                onClick={() => {
                  handleAddWait(d);
                  setShowWaitPicker(false);
                }}
                className="px-4 py-2 text-sm bg-diesel-dark border border-diesel-gold/50 hover:bg-diesel-gold/20 text-diesel-gold transition-colors"
              >
                {d}s
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
