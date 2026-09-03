/**
 * Asset Store - Separate IndexedDB storage for binary assets (Base64 images)
 * 
 * This decouples large image data from the main GameData JSON,
 * preventing performance issues as the game grows.
 */

import { createStore, set, get, del, keys, clear } from 'idb-keyval';

// Create a dedicated store for assets, separate from the default keyval store
const assetStore = createStore('dramaton-assets', 'assets');

// Asset ID prefixes for different types
const PREFIXES = {
  ACTOR_IMAGE: 'actor_img_',
  ACTOR_GRAPHIC: 'actor_gfx_',
  ACTOR_REF_CLOSEUP: 'actor_ref_cu_',
  ACTOR_REF_FULLBODY: 'actor_ref_fb_',
  DROP_IMAGE: 'drop_img_',
  DROP_REF: 'drop_ref_',
  ITEM_VISUAL: 'item_vis_',
  SFX_AUDIO: 'sfx_audio_',
  SCENE_AUDIO: 'scene_audio_',
} as const;

export type AssetType = keyof typeof PREFIXES;

/**
 * Generate a unique asset key for storage
 */
export const generateAssetKey = (type: AssetType, parentId: string, subId?: string): string => {
  const prefix = PREFIXES[type];
  return subId ? `${prefix}${parentId}_${subId}` : `${prefix}${parentId}`;
};

/**
 * Check if a string is a stored asset reference (starts with our prefix pattern)
 */
export const isAssetReference = (value: string | undefined): boolean => {
  if (!value) return false;
  return Object.values(PREFIXES).some(prefix => value.startsWith(prefix));
};

/**
 * Check if a string is Base64 data (not a reference)
 */
export const isBase64Data = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.startsWith('data:') || value.length > 500; // Base64 images are typically very long
};

/**
 * Save an asset to the store
 */
export const saveAsset = async (key: string, data: string): Promise<boolean> => {
  try {
    await set(key, data, assetStore);
    return true;
  } catch (error) {
    console.error(`Failed to save asset ${key}:`, error);
    return false;
  }
};

/**
 * Load an asset from the store
 */
export const loadAsset = async (key: string): Promise<string | null> => {
  try {
    const data = await get<string>(key, assetStore);
    return data || null;
  } catch (error) {
    console.error(`Failed to load asset ${key}:`, error);
    return null;
  }
};

/**
 * Delete an asset from the store
 */
export const deleteAsset = async (key: string): Promise<boolean> => {
  try {
    await del(key, assetStore);
    return true;
  } catch (error) {
    console.error(`Failed to delete asset ${key}:`, error);
    return false;
  }
};

/**
 * Delete all assets matching a prefix (e.g., all assets for an actor)
 */
export const deleteAssetsByPrefix = async (prefix: string): Promise<number> => {
  try {
    const allKeys = await keys<string>(assetStore);
    const matchingKeys = allKeys.filter(key => key.startsWith(prefix));
    await Promise.all(matchingKeys.map(key => del(key, assetStore)));
    return matchingKeys.length;
  } catch (error) {
    console.error(`Failed to delete assets with prefix ${prefix}:`, error);
    return 0;
  }
};

/**
 * Get all asset keys in the store
 */
export const getAllAssetKeys = async (): Promise<string[]> => {
  try {
    return await keys<string>(assetStore);
  } catch (error) {
    console.error('Failed to get asset keys:', error);
    return [];
  }
};

/**
 * Clear all assets from the store
 */
export const clearAssetStore = async (): Promise<boolean> => {
  try {
    await clear(assetStore);
    return true;
  } catch (error) {
    console.error('Failed to clear asset store:', error);
    return false;
  }
};

/**
 * Load multiple assets in parallel
 */
export const loadAssets = async (keys: string[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  const loadPromises = keys.map(async (key) => {
    const data = await loadAsset(key);
    if (data) {
      results.set(key, data);
    }
  });
  await Promise.all(loadPromises);
  return results;
};

/**
 * Save multiple assets in parallel
 */
export const saveAssets = async (assets: Map<string, string>): Promise<number> => {
  let savedCount = 0;
  const savePromises = Array.from(assets.entries()).map(async ([key, data]) => {
    const success = await saveAsset(key, data);
    if (success) savedCount++;
  });
  await Promise.all(savePromises);
  return savedCount;
};

/**
 * Get storage statistics
 */
export const getAssetStoreStats = async (): Promise<{ count: number; types: Record<string, number> }> => {
  const allKeys = await getAllAssetKeys();
  const types: Record<string, number> = {};
  
  for (const key of allKeys) {
    const prefix = Object.entries(PREFIXES).find(([_, p]) => key.startsWith(p));
    const typeName = prefix ? prefix[0] : 'unknown';
    types[typeName] = (types[typeName] || 0) + 1;
  }
  
  return { count: allKeys.length, types };
};