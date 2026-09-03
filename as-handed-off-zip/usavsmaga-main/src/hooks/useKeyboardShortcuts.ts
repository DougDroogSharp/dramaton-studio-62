import { useEffect, useCallback, useRef } from 'react';
import { SelectionState } from '@/types';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'file' | 'playback';
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onNavigate?: (type: SelectionState['type'], id: string | null) => void;
  onSave?: () => void;
  onNewGame?: () => void;
  onLoad?: () => void;
  onUndo?: () => void;
  onPlay?: () => void;
  onGenerate?: () => void;
  onSaveToLibrary?: () => void;
  onDelete?: () => void;
  onToggleStyle?: () => void;
  onEdit?: () => void;
  onCommit?: () => void;
  onNewAsset?: () => void;
  onBack?: () => void;
  selection?: SelectionState;
}

// Modifier key detection that works cross-platform
const getModifiers = (e: KeyboardEvent) => ({
  ctrl: e.ctrlKey || e.metaKey, // Support Cmd on Mac
  shift: e.shiftKey,
  alt: e.altKey,
});

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    enabled = true,
    onNavigate,
    onSave,
    onNewGame,
    onLoad,
    onUndo,
    onPlay,
    onGenerate,
    onSaveToLibrary,
    onDelete,
    onToggleStyle,
    onEdit,
    onCommit,
    onNewAsset,
    onBack,
  } = options;

  // Track if help overlay is showing
  const helpVisibleRef = useRef(false);

  const shortcuts = useCallback((): KeyboardShortcut[] => {
    const list: KeyboardShortcut[] = [];

    // Navigation shortcuts (Ctrl + number) - matches tab order left to right
    if (onNavigate) {
      list.push(
        { key: '1', ctrl: true, description: 'Actors', action: () => onNavigate('actor', null), category: 'navigation' },
        { key: '2', ctrl: true, description: 'Items', action: () => onNavigate('item', null), category: 'navigation' },
        { key: '3', ctrl: true, description: 'Scenes', action: () => onNavigate('scene', null), category: 'navigation' },
        { key: '4', ctrl: true, description: 'Drops', action: () => onNavigate('drop', null), category: 'navigation' },
        { key: '5', ctrl: true, description: 'Game Settings', action: () => onNavigate('settings', null), category: 'navigation' },
        { key: '6', ctrl: true, description: 'Pages', action: () => onNavigate('page', null), category: 'navigation' },
        { key: '7', ctrl: true, description: 'SFX', action: () => onNavigate('sfx', null), category: 'navigation' },
        { key: '8', ctrl: true, description: 'Episodes', action: () => onNavigate('episode', null), category: 'navigation' },
        { key: '9', ctrl: true, description: 'Buttons', action: () => onNavigate('button', null), category: 'navigation' },
      );
    }

    // File shortcuts
    if (onSave) {
      list.push({ key: 's', ctrl: true, description: 'Save to file', action: onSave, category: 'file' });
    }
    if (onNewGame) {
      list.push({ key: 'n', ctrl: true, description: 'New game', action: onNewGame, category: 'file' });
    }
    if (onLoad) {
      list.push({ key: 'o', ctrl: true, description: 'Open file', action: onLoad, category: 'file' });
    }
    if (onUndo) {
      list.push({ key: 'z', ctrl: true, description: 'Undo', action: onUndo, category: 'file' });
    }

    // Action shortcuts
    if (onGenerate) {
      list.push({ key: 'g', ctrl: true, description: 'Generate', action: onGenerate, category: 'actions' });
    }
    if (onSaveToLibrary) {
      list.push({ key: 'l', ctrl: true, description: 'Save to Library', action: onSaveToLibrary, category: 'actions' });
    }
    if (onDelete) {
      list.push({ key: 'Delete', ctrl: false, description: 'Delete', action: onDelete, category: 'actions' });
      list.push({ key: 'Backspace', ctrl: true, description: 'Delete', action: onDelete, category: 'actions' });
    }
    if (onToggleStyle) {
      list.push({ key: 'y', ctrl: true, description: 'Toggle style lock', action: onToggleStyle, category: 'actions' });
    }
    if (onEdit) {
      list.push({ key: 'e', ctrl: true, description: 'Edit mode', action: onEdit, category: 'actions' });
    }
    if (onCommit) {
      list.push({ key: 'Enter', ctrl: true, description: 'Commit', action: onCommit, category: 'actions' });
    }
    if (onNewAsset) {
      list.push({ key: '+', ctrl: true, description: 'New asset', action: onNewAsset, category: 'actions' });
      list.push({ key: '=', ctrl: true, description: 'New asset', action: onNewAsset, category: 'actions' });
    }
    if (onBack) {
      list.push({ key: 'Escape', ctrl: false, description: 'Back / Close', action: onBack, category: 'navigation' });
    }

    // Playback
    if (onPlay) {
      list.push({ key: 'p', ctrl: true, description: 'Play in Theater', action: onPlay, category: 'playback' });
    }

    return list;
  }, [onNavigate, onSave, onNewGame, onLoad, onUndo, onPlay, onGenerate, onSaveToLibrary, onDelete, onToggleStyle, onEdit, onCommit, onNewAsset, onBack]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Allow some shortcuts even when typing
      const { ctrl, shift, alt } = getModifiers(e);
      
      // Special case: Escape always works
      if (e.key === 'Escape') {
        const escShortcut = shortcuts().find(s => s.key === 'Escape');
        if (escShortcut) {
          e.preventDefault();
          escShortcut.action();
          return;
        }
      }
      
      // If typing, only allow Ctrl+key shortcuts
      if (isTyping && !ctrl) return;

      // Find matching shortcut
      const shortcut = shortcuts().find(s => {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase() || e.key === s.key;
        const ctrlMatch = (s.ctrl ?? false) === ctrl;
        const shiftMatch = (s.shift ?? false) === shift;
        const altMatch = (s.alt ?? false) === alt;
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcuts]);

  return {
    shortcuts: shortcuts(),
    helpVisibleRef,
  };
};

// Format shortcut for display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  // Format key nicely
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'Escape') key = 'Esc';
  if (key === 'Delete') key = 'Del';
  if (key === 'Backspace') key = '⌫';
  if (key === 'Enter') key = '↵';
  if (key === '`') key = '~';
  if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  return parts.join('+');
};

// Group shortcuts by category
export const groupShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const groups: Record<string, KeyboardShortcut[]> = {
    navigation: [],
    actions: [],
    file: [],
    playback: [],
  };
  
  shortcuts.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  });
  
  return groups;
};
