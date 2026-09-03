import { set, get } from 'idb-keyval';
import { 
  AssetLibrary, 
  createDefaultLibrary,
  Actor, Scene, Drop, Item, Sfx, Episode, Page,
  LibraryActor, LibraryScene, LibraryDrop, LibraryItem, LibrarySfx, LibraryEpisode, LibraryPage, LibraryGame,
  GameData
} from '@/types';
import { saveFileWithPicker, openFileWithPicker, LIBRARY_FILE_OPTIONS, DRAM_FILE_OPTIONS } from '@/utils/filePicker';

const LIBRARY_KEY_PREFIX = 'dramaton_library_';

// Get the library key for a specific user
const getLibraryKey = (username?: string): string => {
  if (username) {
    return `${LIBRARY_KEY_PREFIX}${username.toLowerCase()}`;
  }
  return `${LIBRARY_KEY_PREFIX}anonymous`;
};

// ═══════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════

export type DuplicateCheckResult<T> = 
  | { isDuplicate: false }
  | { isDuplicate: true; existingItem: T };

/**
 * Check if an actor is a duplicate (same name + same graphics content)
 */
export const findDuplicateActor = (
  library: AssetLibrary, 
  actor: Actor
): DuplicateCheckResult<LibraryActor> => {
  const duplicate = library.actors.find(existing => {
    // Same name check
    if (existing.name !== actor.name) return false;
    
    // If both have graphics, compare them
    if (existing.graphics.length !== actor.graphics.length) return false;
    
    // Compare graphics by pose/expression/angle (content match)
    const existingGraphicKeys = new Set(
      existing.graphics.map(g => `${g.pose}|${g.expression}|${g.angle}`)
    );
    const allMatch = actor.graphics.every(g => 
      existingGraphicKeys.has(`${g.pose}|${g.expression}|${g.angle}`)
    );
    
    return allMatch;
  });
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

/**
 * Check if a scene is a duplicate (same name + same script content)
 */
export const findDuplicateScene = (
  library: AssetLibrary, 
  scene: Scene
): DuplicateCheckResult<LibraryScene> => {
  const duplicate = library.scenes.find(existing => 
    existing.name === scene.name && 
    existing.script === scene.script &&
    existing.sceneType === scene.sceneType
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

/**
 * Check if a drop is a duplicate (same name + same image)
 */
export const findDuplicateDrop = (
  library: AssetLibrary, 
  drop: Drop
): DuplicateCheckResult<LibraryDrop> => {
  const duplicate = library.drops.find(existing => 
    existing.name === drop.name && 
    existing.image === drop.image
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

/**
 * Check if an item is a duplicate (same name + same visual)
 */
export const findDuplicateItem = (
  library: AssetLibrary, 
  item: Item
): DuplicateCheckResult<LibraryItem> => {
  const duplicate = library.items.find(existing => 
    existing.name === item.name && 
    existing.visualAsset === item.visualAsset &&
    existing.category === item.category
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

/**
 * Check if an SFX is a duplicate (same name + same audio)
 */
export const findDuplicateSfx = (
  library: AssetLibrary, 
  sfx: Sfx
): DuplicateCheckResult<LibrarySfx> => {
  const duplicate = library.sfx.find(existing => 
    existing.name === sfx.name && 
    existing.type === sfx.type &&
    existing.params?.audioUrl === sfx.params?.audioUrl
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

/**
 * Check if an episode is a duplicate (same name + same scene count)
 */
export const findDuplicateEpisode = (
  library: AssetLibrary, 
  episode: Episode
): DuplicateCheckResult<LibraryEpisode> => {
  const duplicate = (library.episodes ?? []).find(existing => 
    existing.name === episode.name && 
    existing.sceneIds?.length === episode.sceneIds?.length
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

// ═══════════════════════════════════════════════════════════════
// LIBRARY PERSISTENCE
// ═══════════════════════════════════════════════════════════════

export const saveLibraryToDB = async (library: AssetLibrary, username?: string): Promise<boolean> => {
  try {
    await set(getLibraryKey(username), library);
    return true;
  } catch (error) {
    console.error("Failed to save library to IndexedDB", error);
    return false;
  }
};

export const loadLibraryFromDB = async (username?: string): Promise<AssetLibrary> => {
  try {
    const data = await get(getLibraryKey(username));
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

// ═══════════════════════════════════════════════════════════════
// UPDATE IN LIBRARY (for renaming duplicates)
// ═══════════════════════════════════════════════════════════════

export const updateActorInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Actor>
): AssetLibrary => {
  return {
    ...library,
    actors: library.actors.map(a => 
      a.libraryId === libraryId ? { ...a, ...updates } : a
    ),
  };
};

export const updateSceneInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Scene>
): AssetLibrary => {
  return {
    ...library,
    scenes: library.scenes.map(s => 
      s.libraryId === libraryId ? { ...s, ...updates } : s
    ),
  };
};

export const updateDropInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Drop>
): AssetLibrary => {
  return {
    ...library,
    drops: library.drops.map(d => 
      d.libraryId === libraryId ? { ...d, ...updates } : d
    ),
  };
};

export const updateItemInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Item>
): AssetLibrary => {
  return {
    ...library,
    items: library.items.map(i => 
      i.libraryId === libraryId ? { ...i, ...updates } : i
    ),
  };
};

export const updateSfxInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Sfx>
): AssetLibrary => {
  return {
    ...library,
    sfx: library.sfx.map(s => 
      s.libraryId === libraryId ? { ...s, ...updates } : s
    ),
  };
};

// ═══════════════════════════════════════════════════════════════
// REMOVE FROM LIBRARY
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// PAGE LIBRARY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a page is a duplicate (same name + same htmlContent)
 */
export const findDuplicatePage = (
  library: AssetLibrary, 
  page: Page
): DuplicateCheckResult<LibraryPage> => {
  const duplicate = (library.pages ?? []).find(existing => 
    existing.name === page.name && 
    existing.htmlContent === page.htmlContent
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

export const addPageToLibrary = (
  library: AssetLibrary, 
  page: Page, 
  source: string,
  tags?: string[]
): AssetLibrary => {
  const libraryPage: LibraryPage = {
    ...page,
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source,
    tags,
  };
  return { ...library, pages: [...(library.pages ?? []), libraryPage] };
};

export const updatePageInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  updates: Partial<Page>
): AssetLibrary => {
  return {
    ...library,
    pages: (library.pages ?? []).map(p => 
      p.libraryId === libraryId ? { ...p, ...updates } : p
    ),
  };
};

export const removePageFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, pages: (library.pages ?? []).filter(p => p.libraryId !== libraryId) };
};

export const addLibraryPageToGame = (game: GameData, libraryPage: LibraryPage): GameData => {
  const newPage: Page = {
    ...libraryPage,
    id: generateNewId('page'),
  };
  delete (newPage as any).libraryId;
  delete (newPage as any).addedAt;
  delete (newPage as any).source;
  delete (newPage as any).tags;
  
  return { ...game, pages: [...(game.pages ?? []), newPage] };
};

// ═══════════════════════════════════════════════════════════════
// GAME LIBRARY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a game is a duplicate (same title)
 */
export const findDuplicateGame = (
  library: AssetLibrary, 
  game: GameData
): DuplicateCheckResult<LibraryGame> => {
  const duplicate = (library.games ?? []).find(existing => 
    existing.title === game.info.title
  );
  
  return duplicate 
    ? { isDuplicate: true, existingItem: duplicate }
    : { isDuplicate: false };
};

export const addGameToLibrary = (
  library: AssetLibrary, 
  game: GameData, 
  thumbnail?: string
): AssetLibrary => {
  const libraryGame: LibraryGame = {
    id: game.info.title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
    libraryId: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    source: game.info.author || 'Unknown',
    title: game.info.title,
    author: game.info.author,
    gameData: game,
    thumbnail,
  };
  return { ...library, games: [...(library.games ?? []), libraryGame] };
};

export const updateGameInLibrary = (
  library: AssetLibrary,
  libraryId: string,
  game: GameData,
  thumbnail?: string
): AssetLibrary => {
  return {
    ...library,
    games: (library.games ?? []).map(g => 
      g.libraryId === libraryId 
        ? { ...g, title: game.info.title, author: game.info.author, gameData: game, thumbnail: thumbnail ?? g.thumbnail }
        : g
    ),
  };
};

export const removeGameFromLibrary = (library: AssetLibrary, libraryId: string): AssetLibrary => {
  return { ...library, games: (library.games ?? []).filter(g => g.libraryId !== libraryId) };
};

/**
 * Export a single game from the library as a .dram file
 */
export const exportGameFromLibrary = async (libraryGame: LibraryGame): Promise<boolean> => {
  const content = JSON.stringify(libraryGame.gameData, null, 2);
  const suggestedName = `${libraryGame.title.replace(/\s+/g, '_')}.dram`;
  
  return saveFileWithPicker(content, {
    ...DRAM_FILE_OPTIONS,
    suggestedName,
  });
};

/**
 * Set the username for this library
 */
export const setLibraryUsername = (library: AssetLibrary, username: string): AssetLibrary => {
  return { ...library, username };
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
         (library.pages?.length ?? 0) +
         (library.games?.length ?? 0);
};
