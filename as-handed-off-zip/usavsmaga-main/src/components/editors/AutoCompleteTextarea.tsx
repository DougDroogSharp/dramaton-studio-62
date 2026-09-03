import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameData } from '@/types';
import { getAutoCompleteSuggestions, AutoCompleteSuggestion } from '@/utils/scriptParser';
import { POSES, EXPRESSIONS } from '@/constants';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ExternalLink } from 'lucide-react';

interface AutoCompleteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  game: GameData;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  onNavigateToAsset?: (type: 'actor' | 'scene' | 'button' | 'sfx' | 'drop', id: string) => void;
}

interface ContextTarget {
  type: 'actor' | 'scene' | 'button' | 'sfx' | 'drop';
  id: string;
  name: string;
}

export const AutoCompleteTextarea: React.FC<AutoCompleteTextareaProps> = ({
  value,
  onChange,
  game,
  onFocus,
  placeholder,
  className = '',
  onNavigateToAsset,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showPopup, setShowPopup] = useState(false);

  const updateSuggestions = useCallback(() => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const newSuggestions = getAutoCompleteSuggestions(value, cursorPos, game, POSES, EXPRESSIONS);
    
    setSuggestions(newSuggestions);
    setSelectedIndex(0);
    setShowPopup(newSuggestions.length > 0);

    if (newSuggestions.length > 0) {
      // Calculate popup position based on cursor
      const textarea = textareaRef.current;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineLength = lines[currentLineIndex].length;
      
      // Approximate position
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width for monospace
      
      const top = Math.min((currentLineIndex + 1) * lineHeight + 8, textarea.clientHeight - 150);
      const left = Math.min(currentLineLength * charWidth + 8, textarea.clientWidth - 200);
      
      setPopupPosition({ top, left });
    }
  }, [value, game]);

  // Update suggestions on value change
  useEffect(() => {
    updateSuggestions();
  }, [value, updateSuggestions]);

  const insertSuggestion = useCallback((suggestion: AutoCompleteSuggestion) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const textAfter = value.substring(cursorPos);
    
    // Find where to insert (remove the partial text typed so far)
    let insertStart = cursorPos;
    
    // Find the start of the word/token being typed
    const match = textBefore.match(/[\w:]+$/);
    if (match) {
      insertStart = cursorPos - match[0].length;
    }
    
    const newValue = value.substring(0, insertStart) + suggestion.insertText + textAfter;
    onChange(newValue);
    
    // Set cursor position after insertion
    const newCursorPos = insertStart + suggestion.insertText.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
    
    setShowPopup(false);
    setSuggestions([]);
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPopup || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Tab':
      case 'Enter':
        if (showPopup && suggestions[selectedIndex]) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPopup(false);
        break;
    }
  };

  const getCategoryStyle = (category: AutoCompleteSuggestion['category']): string => {
    switch (category) {
      case 'command': return 'bg-diesel-rust/20 text-diesel-rust';
      case 'actor': return 'bg-diesel-brass/20 text-diesel-brass';
      case 'scene': return 'bg-blue-500/20 text-blue-400';
      case 'button': return 'bg-orange-500/20 text-orange-400';
      case 'sfx': return 'bg-purple-500/20 text-purple-400';
      case 'pose': return 'bg-diesel-green/20 text-diesel-green';
      case 'expression': return 'bg-pink-500/20 text-pink-400';
      case 'variable': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-diesel-steel/20 text-diesel-steel';
    }
  };

  // Find context target from text selection or word under cursor
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);

  const findContextTarget = useCallback((): ContextTarget | null => {
    if (!textareaRef.current) return null;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Get the word around the cursor
    let wordStart = start;
    let wordEnd = end;
    
    // If no selection, find the word boundaries
    if (start === end) {
      while (wordStart > 0 && /[\w]/.test(value[wordStart - 1])) wordStart--;
      while (wordEnd < value.length && /[\w]/.test(value[wordEnd])) wordEnd++;
    }
    
    const word = value.substring(wordStart, wordEnd).trim();
    if (!word) return null;
    
    // Check if it matches an actor name
    const actor = game.actors.find(a => 
      a.name.toLowerCase() === word.toLowerCase() ||
      a.id === word
    );
    if (actor) return { type: 'actor', id: actor.id, name: actor.name };
    
    // Check if it matches a scene name/id
    const scene = game.scenes.find(s => 
      s.name.toLowerCase() === word.toLowerCase() ||
      s.id === word
    );
    if (scene) return { type: 'scene', id: scene.id, name: scene.name };
    
    // Check if it matches a button
    const button = game.buttons.find(b => 
      b.name.toLowerCase() === word.toLowerCase() ||
      b.id === word
    );
    if (button) return { type: 'button', id: button.id, name: button.name };
    
    // Check if it matches an SFX
    const sfx = game.sfx.find(s => 
      s.name.toLowerCase() === word.toLowerCase() ||
      s.id === word
    );
    if (sfx) return { type: 'sfx', id: sfx.id, name: sfx.name };
    
    // Check if it matches a drop
    const drop = game.drops.find(d => 
      d.name.toLowerCase() === word.toLowerCase() ||
      d.id === word
    );
    if (drop) return { type: 'drop', id: drop.id, name: drop.name };
    
    return null;
  }, [value, game]);

  const handleContextMenu = useCallback(() => {
    const target = findContextTarget();
    setContextTarget(target);
  }, [findContextTarget]);

  const handleJumpToDefinition = useCallback(() => {
    if (contextTarget && onNavigateToAsset) {
      onNavigateToAsset(contextTarget.type, contextTarget.id);
    }
  }, [contextTarget, onNavigateToAsset]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative w-full h-full" onContextMenu={handleContextMenu}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-full bg-diesel-dark border border-diesel-border text-diesel-paper text-sm p-3 font-mono resize-none focus:outline-none focus:border-diesel-rust custom-scrollbar ${className}`}
          />
          
          {/* Autocomplete popup */}
          {showPopup && suggestions.length > 0 && (
            <div
              ref={popupRef}
              className="absolute z-50 bg-diesel-panel border border-diesel-border shadow-lg max-h-[200px] overflow-y-auto min-w-[180px] max-w-[300px]"
              style={{ top: popupPosition.top, left: popupPosition.left }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.label}-${index}`}
                  onClick={() => insertSuggestion(suggestion)}
                  className={`px-3 py-1.5 cursor-pointer flex items-center gap-2 text-xs ${
                    index === selectedIndex 
                      ? 'bg-diesel-rust/30 text-diesel-paper' 
                      : 'hover:bg-diesel-rust/20 text-diesel-paper'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${getCategoryStyle(suggestion.category)}`}>
                    {suggestion.category.slice(0, 3)}
                  </span>
                  <span className="font-mono">{suggestion.label}</span>
                  {suggestion.description && (
                    <span className="text-diesel-steel text-[10px] ml-auto truncate max-w-[80px]">
                      {suggestion.description}
                    </span>
                  )}
                </div>
              ))}
              <div className="px-2 py-1 text-[9px] text-diesel-steel border-t border-diesel-border bg-diesel-dark">
                ↑↓ navigate • Tab/Enter accept • Esc dismiss
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-diesel-panel border-diesel-border">
        {contextTarget && onNavigateToAsset ? (
          <ContextMenuItem 
            onClick={handleJumpToDefinition}
            className="flex items-center gap-2 text-xs cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>Jump to {contextTarget.type}: </span>
            <span className="font-bold text-diesel-gold">{contextTarget.name}</span>
          </ContextMenuItem>
        ) : (
          <ContextMenuItem disabled className="text-xs text-diesel-steel">
            No asset found at cursor
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-diesel-border" />
        <ContextMenuItem 
          onClick={() => document.execCommand('cut')}
          className="text-xs cursor-pointer"
        >
          Cut
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => document.execCommand('copy')}
          className="text-xs cursor-pointer"
        >
          Copy
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => document.execCommand('paste')}
          className="text-xs cursor-pointer"
        >
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
