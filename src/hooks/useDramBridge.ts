import { useEffect } from 'react';
import { GameData, migrateGameData } from '@/types';
import { toast } from 'sonner';

// Client half of the DRAM bridge (see vite-plugin-dram-bridge.ts): mirrors
// the live GameData to the dev server over Vite's HMR websocket and applies
// documents written by an external collaborator (PUT /bridge/game). Dev-only
// by construction — import.meta.hot is undefined in production builds.
export function useDramBridge(
  game: GameData,
  setGame: (game: GameData) => void,
  enabled: boolean,
) {
  // Apply externally written documents.
  useEffect(() => {
    if (!import.meta.hot || !enabled) return;
    const onApply = (doc: unknown) => {
      try {
        setGame(migrateGameData(doc));
        toast.info('Game updated over the bridge');
      } catch (err) {
        console.error('Bridge apply failed:', err);
        toast.error('Bridge sent an unreadable document — ignored');
      }
    };
    import.meta.hot.on('dram:apply', onApply);
    return () => import.meta.hot?.off('dram:apply', onApply);
  }, [setGame, enabled]);

  // Push the live document (debounced; echo pushes after an apply are
  // harmless — they just restate the same doc).
  useEffect(() => {
    if (!import.meta.hot || !enabled) return;
    const timer = setTimeout(() => {
      import.meta.hot?.send('dram:push', game as unknown as Record<string, unknown>);
    }, 300);
    return () => clearTimeout(timer);
  }, [game, enabled]);
}
