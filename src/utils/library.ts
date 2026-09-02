import { set, get } from 'idb-keyval';
import {
  AssetLibrary,
  createDefaultLibrary,
  Actor, Scene, Drop, Item, Sfx, Episode, Drawing,
  LibraryActor, LibraryScene, LibraryDrop, LibraryItem, LibrarySfx, LibraryEpisode, LibraryDrawing,
  GameData
} from '@/types';
import { newDrawingId } from '@/utils/drawings';
import { saveFileWithPicker, openFileWithPicker, LIBRARY_FILE_OPTIONS } from '@/utils/filePicker';

const LIBRARY_KEY = 'dramaton_library_v1';

// ═══════════════════════════════════════════════════════════════
// LIBRARY PERSISTENCE
// ═══════════════════════════════════════════════════════════════

export const saveLibraryToDB = async (library: AssetLibrary): Promise<boolean> => {
  try {
    await set(LIBRARY_KEY, library);
    return true;
  } catch (error) {
    console.error("Failed to save library to IndexedDB", error);
    return false;
  }
};

export const loadLibraryFromDB = async (): Promise<AssetLibrary> => {
  try {
    const data = await get(LIBRARY_KEY);
    return (data as AssetLibrary) || createDefaultLibrary();
  } catch (error) {
    console.error("Failed to load library from IndexedDB", error);
    return createDefaultLibrary();
  }
};

export const exportLibrary = async (library: AssetLibrary): Promise<boolean> => {
  const content = JSON.stringify(library, null, 2);
  const suggestedName = `dramaton_library_${new Date().toISOString().slice(0, 10)}.dramlib`;
  
  return saveFileWithPicker(content, {
    ...LIBRARY_FILE_OPTIONS,
    suggestedName,
  });
};

export const importLibraryFromPicker = async (): Promise<AssetLibrary | null> => {
  const result = await openFileWithPicker(LIBRARY_FILE_OPTIONS);
  
  if (!result) return null; // User cancelled
  
  try {
    const data = JSON.parse(result.content) as AssetLibrary;
    if (!data.version || !Array.isArray(data.actors)) {
      throw new Error('Invalid library format');
    }
    return data;
  } catch (err) {
    throw new Error('Failed to parse library file');
  }
};

// Legacy import function for backward compatibility
export const importLibrary = (file: File): Promise<AssetLibrary> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AssetLibrary;
        if (!data.version || !Array.isArray(data.actors)) {
          throw new Error('Invalid library format');
        }
        resolve(data);
      } catch (err) {
        reject(new Error('Failed to parse library file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// ═══════════════════════════════════════════════════════════════
// ADD TO LIBRARY
// ═══════════════════════════════════════════════════════════════

export const addActorToLibrary = (
  library: AssetLibrary, 
  actor: Actor, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryActor: LibraryActor = {
    ...actor,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, actors: [...library.actors, libraryActor] };
};

export const addSceneToLibrary = (
  library: AssetLibrary, 
  scene: Scene, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryScene: LibraryScene = {
    ...scene,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, scenes: [...library.scenes, libraryScene] };
};

export const addDropToLibrary = (
  library: AssetLibrary, 
  drop: Drop, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryDrop: LibraryDrop = {
    ...drop,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, drops: [...library.drops, libraryDrop] };
};

export const addItemToLibrary = (
  library: AssetLibrary, 
  item: Item, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryItem: LibraryItem = {
    ...item,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, items: [...library.items, libraryItem] };
};

export const addSfxToLibrary = (
  library: AssetLibrary, 
  sfx: Sfx, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const librarySfx: LibrarySfx = {
    ...sfx,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, sfx: [...library.sfx, librarySfx] };
};

export const addEpisodeToLibrary = (
  library: AssetLibrary, 
  episode: Episode, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryEpisode: LibraryEpisode = {
    ...episode,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, episodes: [...(library.episodes ?? []), libraryEpisode] };
};

// Drawings are the cross-document store: the same file serves the book
// document and the game document. Same file from the same folder replaces
// its earlier library copy rather than piling up.
export const addDrawingToLibrary = (
  library: AssetLibrary,
  drawing: Drawing,
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryDrawing: LibraryDrawing = {
    ...drawing,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags: tags ?? drawing.tags,
  };
  const existing = (library.drawings ?? []).filter(
    d => !(drawing.fileName && d.fileName === drawing.fileName && d.sourcePath === drawing.sourcePath)
  );
  return { ...library, drawings: [...existing, libraryDrawing] };
};

// ═══════════════════════════════════════════════════════════════
// REMOVE FROM LIBRARY
// ═══════════════════════════════════════════════════════════════

export const removeDrawingFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, drawings: (library.drawings ?? []).filter(d => d.libraryId !== libraryId) };
};

export const removeActorFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, actors: library.actors.filter(a => a.libraryId !== libraryId) };
};

export const removeSceneFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, scenes: library.scenes.filter(s => s.libraryId !== libraryId) };
};

export const removeDropFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, drops: library.drops.filter(d => d.libraryId !== libraryId) };
};

export const removeItemFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, items: library.items.filter(i => i.libraryId !== libraryId) };
};

export const removeSfxFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, sfx: library.sfx.filter(s => s.libraryId !== libraryId) };
};

export const removeEpisodeFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, episodes: (library.episodes ?? []).filter(e => e.libraryId !== libraryId) };
};

// ═══════════════════════════════════════════════════════════════
// ADD TO GAME FROM LIBRARY
// ═══════════════════════════════════════════════════════════════

const generateNewId = (prefix: string): string => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const addLibraryActorToGame = (game: GameData, libraryActor: LibraryActor): GameData => {
  // Generate new IDs for actor and all graphics
  const newActor: Actor = {
    ...libraryActor,
    id: generateNewId('actor'),
    graphics: libraryActor.graphics.map(g => ({
      ...g,
      id: generateNewId('graphic'),
    })),
  };
  // Remove library-specific fields
  delete (newActor as any).libraryId;
  delete (newActor as any).addedAt;
  delete (newActor as any).source;
  delete (newActor as any).tags;
  
  return { ...game, actors: [...game.actors, newActor] };
};

export const addLibrarySceneToGame = (game: GameData, libraryScene: LibraryScene): GameData => {
  const newScene: Scene = {
    ...libraryScene,
    id: generateNewId('scene'),
    stage: libraryScene.stage?.map(el => ({
      ...el,
      id: generateNewId('stage'),
    })),
    audioTracks: libraryScene.audioTracks?.map(t => ({
      ...t,
      id: generateNewId('audio'),
    })),
  };
  delete (newScene as any).libraryId;
  delete (newScene as any).addedAt;
  delete (newScene as any).source;
  delete (newScene as any).tags;
  
  return { ...game, scenes: [...game.scenes, newScene] };
};

export const addLibraryDropToGame = (game: GameData, libraryDrop: LibraryDrop): GameData => {
  const newDrop: Drop = {
    ...libraryDrop,
    id: generateNewId('drop'),
  };
  delete (newDrop as any).libraryId;
  delete (newDrop as any).addedAt;
  delete (newDrop as any).source;
  delete (newDrop as any).tags;
  
  return { ...game, drops: [...game.drops, newDrop] };
};

export const addLibraryItemToGame = (game: GameData, libraryItem: LibraryItem): GameData => {
  const newItem: Item = {
    ...libraryItem,
    id: generateNewId('item'),
  };
  delete (newItem as any).libraryId;
  delete (newItem as any).addedAt;
  delete (newItem as any).source;
  delete (newItem as any).tags;
  
  return { ...game, items: [...game.items, newItem] };
};

export const addLibrarySfxToGame = (game: GameData, librarySfx: LibrarySfx): GameData => {
  const newSfx: Sfx = {
    ...librarySfx,
    id: generateNewId('sfx'),
  };
  delete (newSfx as any).libraryId;
  delete (newSfx as any).addedAt;
  delete (newSfx as any).source;
  delete (newSfx as any).tags;
  
  return { ...game, sfx: [...game.sfx, newSfx] };
};

export const addLibraryEpisodeToGame = (game: GameData, libraryEpisode: LibraryEpisode): GameData => {
  const newEpisode: Episode = {
    ...libraryEpisode,
    id: generateNewId('episode'),
    // Note: sceneIds will reference original scene IDs - user may need to remap
    sceneIds: [],  // Start empty since scene IDs won't match
  };
  delete (newEpisode as any).libraryId;
  delete (newEpisode as any).addedAt;
  delete (newEpisode as any).source;
  delete (newEpisode as any).tags;
  
  return { ...game, episodes: [...(game.episodes ?? []), newEpisode] };
};

// A drawing pulled into a document keeps its provenance (file, folder,
// artist) and gets a fresh id. If the document already holds the same file
// from the same folder, that copy is returned instead of a duplicate.
export const addLibraryDrawingToGame = (game: GameData, libraryDrawing: LibraryDrawing): GameData => {
  const drawings = game.drawings ?? [];
  const dup = libraryDrawing.fileName
    ? drawings.find(d => d.fileName === libraryDrawing.fileName && d.sourcePath === libraryDrawing.sourcePath)
    : undefined;
  if (dup) return game;
  const newDrawing: Drawing = {
    ...libraryDrawing,
    id: newDrawingId(),
    importedAt: Date.now(),
  };
  delete (newDrawing as any).libraryId;
  delete (newDrawing as any).addedAt;
  delete (newDrawing as any).source;

  return { ...game, drawings: [...drawings, newDrawing] };
};

// ═══════════════════════════════════════════════════════════════
// LIBRARY STATS
// ═══════════════════════════════════════════════════════════════

export const getLibraryCount = (library: AssetLibrary): number => {
  return library.actors.length +
         library.scenes.length +
         library.drops.length +
         library.items.length +
         library.sfx.length +
         (library.episodes?.length ?? 0) +
         (library.drawings?.length ?? 0);
};
