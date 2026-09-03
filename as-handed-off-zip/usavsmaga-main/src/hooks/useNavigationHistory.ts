import { useState, useCallback } from 'react';
import { SelectionState } from '@/types';

interface NavigationHistoryState {
  past: SelectionState[];
  future: SelectionState[];
}

export function useNavigationHistory(maxHistory: number = 50) {
  const [history, setHistory] = useState<NavigationHistoryState>({ past: [], future: [] });

  const pushState = useCallback((state: SelectionState) => {
    setHistory(prev => ({
      past: [...prev.past, state].slice(-maxHistory),
      future: [], // Clear future when new navigation happens
    }));
  }, [maxHistory]);

  // Use functional updates to avoid stale closure issues
  const goBack = useCallback((currentState: SelectionState): SelectionState | null => {
    let result: SelectionState | null = null;
    
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      result = previous;
      
      return {
        past: prev.past.slice(0, -1),
        future: [currentState, ...prev.future].slice(0, maxHistory),
      };
    });
    
    return result;
  }, [maxHistory]);

  const goForward = useCallback((currentState: SelectionState): SelectionState | null => {
    let result: SelectionState | null = null;
    
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const next = prev.future[0];
      result = next;
      
      return {
        past: [...prev.past, currentState].slice(-maxHistory),
        future: prev.future.slice(1),
      };
    });
    
    return result;
  }, [maxHistory]);

  return {
    pushState,
    goBack,
    goForward,
    canGoBack: history.past.length > 0,
    canGoForward: history.future.length > 0,
  };
}
