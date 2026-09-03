import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number;
}

/**
 * Custom hook for local undo/redo functionality.
 * Tracks changes independently from global state management.
 */
export function useUndoRedo<T>(
  initialValue: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50, debounceMs = 500 } = options;
  
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<T>(initialValue);
  
  /**
   * Update the current value, adding to history
   */
  const set = useCallback((newValue: T, immediate = false) => {
    // Clear any pending debounced update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    
    const update = () => {
      setState((prev) => {
        // Don't add to history if value hasn't changed
        if (prev.present === newValue) return prev;
        
        // Create new past, limiting size
        const newPast = [...prev.past, prev.present];
        if (newPast.length > maxHistorySize) {
          newPast.shift();
        }
        
        return {
          past: newPast,
          present: newValue,
          future: [], // Clear future on new change
        };
      });
      lastValueRef.current = newValue;
    };
    
    if (immediate) {
      update();
    } else {
      // Debounce to avoid creating too many history entries while typing
      debounceRef.current = setTimeout(update, debounceMs);
    }
  }, [maxHistorySize, debounceMs]);
  
  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);
  
  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setState((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);
  
  /**
   * Reset to a new value, clearing history
   */
  const reset = useCallback((newValue: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setState({
      past: [],
      present: newValue,
      future: [],
    });
    lastValueRef.current = newValue;
  }, []);
  
  /**
   * Sync with external value (when value changes from outside)
   */
  const syncExternal = useCallback((externalValue: T) => {
    if (externalValue !== lastValueRef.current) {
      reset(externalValue);
    }
  }, [reset]);
  
  return {
    value: state.present,
    set,
    undo,
    redo,
    clearHistory,
    reset,
    syncExternal,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyLength: state.past.length,
    futureLength: state.future.length,
  };
}