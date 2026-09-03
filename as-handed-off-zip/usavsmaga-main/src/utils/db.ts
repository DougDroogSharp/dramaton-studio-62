import { set, get, del } from 'idb-keyval';
import { GameData, Actor, Drop, Item, Sfx, Scene, ActorGraphic } from '@/types';
import {
  saveAsset,
  loadAsset,
  generateAssetKey,
  isBase64Data,
  isAssetReference,
  deleteAssetsByPrefix,
  clearAssetStore,
} from './assetStore';

const DB_KEY = 'dramaton_save_v2';

/**
 * Extract Base64 image data from GameData and store separately.
 * Returns a lightweight version of GameData with asset references instead of data.
 */
const extractAndStoreAssets = async (game: GameData): Promise<GameData> => {
  const assetPromises: Promise<void>[] = [];
  
  // Deep clone to avoid mutating the original
  const lightGame: GameData = JSON.parse(JSON.stringify(game));
  
  // Extract Actor images
  for (const actor of lightGame.actors) {
    // Main actor image
    if (actor.image && isBase64Data(actor.image)) {
      const key = generateAssetKey('ACTOR_IMAGE', actor.id);
      assetPromises.push(saveAsset(key, actor.image).then(() => {}));
      actor.image = key;
    }
    
    // Reference images
    if (actor.referenceImageCloseUp && isBase64Data(actor.referenceImageCloseUp)) {
      const key = generateAssetKey('ACTOR_REF_CLOSEUP', actor.id);
      assetPromises.push(saveAsset(key, actor.referenceImageCloseUp).then(() => {}));
      actor.referenceImageCloseUp = key;
    }
    
    if (actor.referenceImageFullBody && isBase64Data(actor.referenceImageFullBody)) {
      const key = generateAssetKey('ACTOR_REF_FULLBODY', actor.id);
      assetPromises.push(saveAsset(key, actor.referenceImageFullBody).then(() => {}));
      actor.referenceImageFullBody = key;
    }
    
    // Actor graphics (poses/expressions)
    for (const graphic of actor.graphics) {
      if (graphic.image && isBase64Data(graphic.image)) {
        const key = generateAssetKey('ACTOR_GRAPHIC', actor.id, graphic.id);
        assetPromises.push(saveAsset(key, graphic.image).then(() => {}));
        graphic.image = key;
      }
    }
  }
  
  // Extract Drop images
  for (const drop of lightGame.drops) {
    if (drop.image && isBase64Data(drop.image)) {
      const key = generateAssetKey('DROP_IMAGE', drop.id);
      assetPromises.push(saveAsset(key, drop.image).then(() => {}));
      drop.image = key;
    }
    
    if (drop.referenceImage && isBase64Data(drop.referenceImage)) {
      const key = generateAssetKey('DROP_REF', drop.id);
      assetPromises.push(saveAsset(key, drop.referenceImage).then(() => {}));
      drop.referenceImage = key;
    }
  }
  
  // Extract Item visual assets
  for (const item of lightGame.items) {
    if (item.visualAsset && isBase64Data(item.visualAsset)) {
      const key = generateAssetKey('ITEM_VISUAL', item.id);
      assetPromises.push(saveAsset(key, item.visualAsset).then(() => {}));
      item.visualAsset = key;
    }
  }
  
  // Extract SFX audio
  for (const sfx of lightGame.sfx) {
    if (sfx.params.audioUrl && isBase64Data(sfx.params.audioUrl)) {
      const key = generateAssetKey('SFX_AUDIO', sfx.id);
      assetPromises.push(saveAsset(key, sfx.params.audioUrl).then(() => {}));
      sfx.params.audioUrl = key;
    }
  }
  
  // Extract Scene audio data
  for (const scene of lightGame.scenes) {
    if (scene.audioData) {
      for (const [audioKey, audioData] of Object.entries(scene.audioData)) {
        if (isBase64Data(audioData)) {
          const storeKey = generateAssetKey('SCENE_AUDIO', scene.id, audioKey);
          assetPromises.push(saveAsset(storeKey, audioData).then(() => {}));
          scene.audioData[audioKey] = storeKey;
        }
      }
    }
  }
  
  // Wait for all assets to be saved
  await Promise.all(assetPromises);
  
  return lightGame;
};

/**
 * Resolve asset references back to Base64 data.
 * Takes a lightweight GameData and hydrates it with actual image data.
 */
const resolveAssets = async (game: GameData): Promise<GameData> => {
  const hydratedGame: GameData = JSON.parse(JSON.stringify(game));
  const resolvePromises: Promise<void>[] = [];
  
  // Resolve Actor images
  for (const actor of hydratedGame.actors) {
    if (actor.image && isAssetReference(actor.image)) {
      resolvePromises.push(
        loadAsset(actor.image).then(data => {
          if (data) actor.image = data;
        })
      );
    }
    
    if (actor.referenceImageCloseUp && isAssetReference(actor.referenceImageCloseUp)) {
      resolvePromises.push(
        loadAsset(actor.referenceImageCloseUp).then(data => {
          if (data) actor.referenceImageCloseUp = data;
        })
      );
    }
    
    if (actor.referenceImageFullBody && isAssetReference(actor.referenceImageFullBody)) {
      resolvePromises.push(
        loadAsset(actor.referenceImageFullBody).then(data => {
          if (data) actor.referenceImageFullBody = data;
        })
      );
    }
    
    for (const graphic of actor.graphics) {
      if (graphic.image && isAssetReference(graphic.image)) {
        resolvePromises.push(
          loadAsset(graphic.image).then(data => {
            if (data) graphic.image = data;
          })
        );
      }
    }
  }
  
  // Resolve Drop images
  for (const drop of hydratedGame.drops) {
    if (drop.image && isAssetReference(drop.image)) {
      resolvePromises.push(
        loadAsset(drop.image).then(data => {
          if (data) drop.image = data;
        })
      );
    }
    
    if (drop.referenceImage && isAssetReference(drop.referenceImage)) {
      resolvePromises.push(
        loadAsset(drop.referenceImage).then(data => {
          if (data) drop.referenceImage = data;
        })
      );
    }
  }
  
  // Resolve Item visual assets
  for (const item of hydratedGame.items) {
    if (item.visualAsset && isAssetReference(item.visualAsset)) {
      resolvePromises.push(
        loadAsset(item.visualAsset).then(data => {
          if (data) item.visualAsset = data;
        })
      );
    }
  }
  
  // Resolve SFX audio
  for (const sfx of hydratedGame.sfx) {
    if (sfx.params.audioUrl && isAssetReference(sfx.params.audioUrl)) {
      resolvePromises.push(
        loadAsset(sfx.params.audioUrl).then(data => {
          if (data) sfx.params.audioUrl = data;
        })
      );
    }
  }
  
  // Resolve Scene audio data
  for (const scene of hydratedGame.scenes) {
    if (scene.audioData) {
      for (const [audioKey, audioRef] of Object.entries(scene.audioData)) {
        if (isAssetReference(audioRef)) {
          resolvePromises.push(
            loadAsset(audioRef).then(data => {
              if (data && scene.audioData) scene.audioData[audioKey] = data;
            })
          );
        }
      }
    }
  }
  
  await Promise.all(resolvePromises);
  
  return hydratedGame;
};

// Default names that indicate unnamed/placeholder assets
const DEFAULT_NAMES = [
  'New Actor',
  'New Scene', 
  'New Background',
  'New Item',
  'New SFX',
  'New Button',
  'New Episode',
  'New Page',
];

const isDefaultName = (name: string): boolean => {
  const trimmed = name.trim();
  // Check exact matches and pattern matches like "New Visual Effect", "New Particle Effect", etc.
  return DEFAULT_NAMES.includes(trimmed) || /^New \w+ Effect$/.test(trimmed);
};

/**
 * Filter out assets with default/placeholder names before saving
 */
const filterUnnamedAssets = (game: GameData): GameData => {
  return {
    ...game,
    actors: game.actors.filter(a => !isDefaultName(a.name)),
    scenes: game.scenes.filter(s => !isDefaultName(s.name)),
    drops: game.drops.filter(d => !isDefaultName(d.name)),
    items: game.items.filter(i => !isDefaultName(i.name)),
    sfx: game.sfx.filter(s => !isDefaultName(s.name)),
    buttons: game.buttons.filter(b => !isDefaultName(b.name)),
    episodes: game.episodes.filter(e => !isDefaultName(e.name)),
    pages: game.pages.filter(p => !isDefaultName(p.name)),
  };
};

/**
 * Save game to IndexedDB, extracting large assets to separate store.
 * Assets with default placeholder names are filtered out.
 */
export const saveGameToDB = async (game: GameData): Promise<boolean> => {
  try {
    // Filter out unnamed assets before saving
    const filteredGame = filterUnnamedAssets(game);
    // Extract assets and save lightweight JSON
    const lightGame = await extractAndStoreAssets(filteredGame);
    await set(DB_KEY, lightGame);
    return true;
  } catch (error) {
    console.error("Failed to save to IndexedDB", error);
    return false;
  }
};

/**
 * Load game from IndexedDB, resolving asset references
 */
export const loadGameFromDB = async (): Promise<GameData | null> => {
  try {
    const data = await get(DB_KEY);
    if (!data) return null;
    
    // Resolve asset references back to actual data
    const hydratedGame = await resolveAssets(data as GameData);
    return hydratedGame;
  } catch (error) {
    console.error("Failed to load from IndexedDB", error);
    return null;
  }
};

/**
 * Clear game and all associated assets from IndexedDB
 */
export const clearGameFromDB = async (): Promise<boolean> => {
  try {
    await del(DB_KEY);
    await clearAssetStore();
    return true;
  } catch (error) {
    console.error("Failed to clear IndexedDB", error);
    return false;
  }
};

/**
 * Delete assets associated with a specific entity (when deleting actors, drops, etc.)
 */
export const deleteEntityAssets = async (entityType: 'actor' | 'drop' | 'item' | 'sfx' | 'scene', entityId: string): Promise<number> => {
  const prefixMap: Record<string, string[]> = {
    actor: ['actor_img_', 'actor_gfx_', 'actor_ref_cu_', 'actor_ref_fb_'],
    drop: ['drop_img_', 'drop_ref_'],
    item: ['item_vis_'],
    sfx: ['sfx_audio_'],
    scene: ['scene_audio_'],
  };
  
  const prefixes = prefixMap[entityType] || [];
  let totalDeleted = 0;
  
  for (const prefix of prefixes) {
    const deleted = await deleteAssetsByPrefix(`${prefix}${entityId}`);
    totalDeleted += deleted;
  }
  
  return totalDeleted;
};