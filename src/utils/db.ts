import { set, get, del } from 'idb-keyval';
import { GameData } from '@/types';

const DB_KEY = 'dramaton_save_v2';

export const saveGameToDB = async (game: GameData) => {
  try {
    await set(DB_KEY, game);
    return true;
  } catch (error) {
    console.error("Failed to save to IndexedDB", error);
    return false;
  }
};

export const loadGameFromDB = async (): Promise<GameData | null> => {
  try {
    const data = await get(DB_KEY);
    return data as GameData || null;
  } catch (error) {
    console.error("Failed to load from IndexedDB", error);
    return null;
  }
};

export const clearGameFromDB = async () => {
  try {
    await del(DB_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear IndexedDB", error);
    return false;
  }
};

// ============ RECENT GAMES ============
// The last few .dram files worked on, with their FileSystemFileHandles
// (structured-cloneable, so IndexedDB can store them) for one-click
// reopening from the splash screen.

const RECENTS_KEY = 'dramaton_recent_games_v1';
const MAX_RECENTS = 5;

export interface RecentGame {
  title: string;
  fileName: string;
  lastOpened: number;
  handle?: FileSystemFileHandle;
}

export const getRecentGames = async (): Promise<RecentGame[]> => {
  try {
    return ((await get(RECENTS_KEY)) as RecentGame[]) || [];
  } catch (error) {
    console.error('Failed to load recent games', error);
    return [];
  }
};

export const addRecentGame = async (entry: Omit<RecentGame, 'lastOpened'>): Promise<RecentGame[]> => {
  try {
    const recents = await getRecentGames();
    const next: RecentGame[] = [
      { ...entry, lastOpened: Date.now() },
      ...recents.filter(r => r.fileName !== entry.fileName),
    ].slice(0, MAX_RECENTS);
    await set(RECENTS_KEY, next);
    return next;
  } catch (error) {
    console.error('Failed to save recent games', error);
    return [];
  }
};
