import { supabase } from '@/integrations/supabase/client';
import { GameData, Actor, Drop, Item, ActorGraphic } from '@/types';

const BUCKET_NAME = 'game-assets';

/**
 * Check if a string is a base64 data URL
 */
function isBase64DataUrl(str: string | undefined): str is string {
  return !!str && str.startsWith('data:');
}

/**
 * Convert base64 data URL to Blob
 */
function base64ToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Get file extension from mime type
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'png';
}

/**
 * Upload a single base64 image to storage and return the public URL
 */
async function uploadImage(
  base64DataUrl: string, 
  slug: string, 
  category: string, 
  id: string, 
  suffix: string = ''
): Promise<string> {
  const blob = base64ToBlob(base64DataUrl);
  const ext = getExtension(blob.type);
  const path = `${slug}/${category}/${id}${suffix ? `-${suffix}` : ''}.${ext}`;
  
  // Upload to storage (upsert to replace existing)
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, blob, { upsert: true });
  
  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload ${path}: ${error.message}`);
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return publicUrl;
}

export interface PublishProgress {
  stage: 'preparing' | 'uploading' | 'saving' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface PublishResult {
  success: boolean;
  slug: string;
  url: string;
  version: number;
  error?: string;
}

/**
 * Extract all base64 images from GameData, upload them to storage,
 * and return a new GameData with URLs instead of base64 strings
 */
async function migrateGameDataImages(
  game: GameData, 
  slug: string,
  onProgress: (progress: PublishProgress) => void
): Promise<GameData> {
  // Count total images to upload
  let totalImages = 0;
  let uploadedImages = 0;
  
  // Count images
  for (const actor of game.actors) {
    if (isBase64DataUrl(actor.image)) totalImages++;
    if (isBase64DataUrl(actor.referenceImageCloseUp)) totalImages++;
    if (isBase64DataUrl(actor.referenceImageFullBody)) totalImages++;
    for (const graphic of actor.graphics) {
      if (isBase64DataUrl(graphic.image)) totalImages++;
    }
  }
  for (const drop of game.drops) {
    if (isBase64DataUrl(drop.image)) totalImages++;
    if (isBase64DataUrl(drop.referenceImage)) totalImages++;
  }
  for (const item of game.items) {
    if (isBase64DataUrl(item.visualAsset)) totalImages++;
  }
  if (isBase64DataUrl(game.info.styleGuide)) totalImages++;
  
  onProgress({
    stage: 'uploading',
    current: 0,
    total: totalImages,
    message: `Uploading ${totalImages} images...`
  });
  
  // Deep clone the game data
  const migratedGame: GameData = JSON.parse(JSON.stringify(game));
  
  // Helper to upload and update progress
  const uploadAndTrack = async (
    dataUrl: string, 
    category: string, 
    id: string, 
    suffix?: string
  ): Promise<string> => {
    const url = await uploadImage(dataUrl, slug, category, id, suffix);
    uploadedImages++;
    onProgress({
      stage: 'uploading',
      current: uploadedImages,
      total: totalImages,
      message: `Uploaded ${uploadedImages} of ${totalImages} images`
    });
    return url;
  };
  
  // Migrate style guide
  if (isBase64DataUrl(migratedGame.info.styleGuide)) {
    migratedGame.info.styleGuide = await uploadAndTrack(
      migratedGame.info.styleGuide, 'info', 'style-guide'
    );
  }
  
  // Migrate actors
  for (const actor of migratedGame.actors) {
    if (isBase64DataUrl(actor.image)) {
      actor.image = await uploadAndTrack(actor.image, 'actors', actor.id, 'main');
    }
    if (isBase64DataUrl(actor.referenceImageCloseUp)) {
      actor.referenceImageCloseUp = await uploadAndTrack(
        actor.referenceImageCloseUp, 'actors', actor.id, 'closeup'
      );
    }
    if (isBase64DataUrl(actor.referenceImageFullBody)) {
      actor.referenceImageFullBody = await uploadAndTrack(
        actor.referenceImageFullBody, 'actors', actor.id, 'fullbody'
      );
    }
    for (let i = 0; i < actor.graphics.length; i++) {
      const graphic = actor.graphics[i];
      if (isBase64DataUrl(graphic.image)) {
        graphic.image = await uploadAndTrack(
          graphic.image, 'actors', actor.id, `graphic-${i}`
        );
      }
    }
  }
  
  // Migrate drops
  for (const drop of migratedGame.drops) {
    if (isBase64DataUrl(drop.image)) {
      drop.image = await uploadAndTrack(drop.image, 'drops', drop.id, 'main');
    }
    if (isBase64DataUrl(drop.referenceImage)) {
      drop.referenceImage = await uploadAndTrack(
        drop.referenceImage, 'drops', drop.id, 'reference'
      );
    }
  }
  
  // Migrate items
  for (const item of migratedGame.items) {
    if (isBase64DataUrl(item.visualAsset)) {
      item.visualAsset = await uploadAndTrack(
        item.visualAsset, 'items', item.id, 'visual'
      );
    }
  }
  
  return migratedGame;
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug is required' };
  }
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }
  if (slug.length > 50) {
    return { valid: false, error: 'Slug must be 50 characters or less' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }
  return { valid: true };
}

/**
 * Generate a slug from a game title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Check if a slug is already taken
 */
export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data } = await supabase
    .from('games')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  
  return !data;
}

/**
 * Get existing game by slug
 */
export async function getGameBySlug(slug: string): Promise<{ id: string; title: string } | null> {
  const { data } = await supabase
    .from('games')
    .select('id, title')
    .eq('slug', slug)
    .maybeSingle();
  
  return data;
}

/**
 * Publish a game to the cloud
 */
export async function publishGame(
  game: GameData,
  slug: string,
  notes?: string,
  onProgress?: (progress: PublishProgress) => void
): Promise<PublishResult> {
  const progress = onProgress || (() => {});
  
  try {
    // Validate slug
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return { success: false, slug, url: '', version: 0, error: validation.error };
    }
    
    progress({ stage: 'preparing', current: 0, total: 1, message: 'Preparing publish...' });
    
    // Migrate images to storage
    const migratedGame = await migrateGameDataImages(game, slug, progress);
    
    progress({ stage: 'saving', current: 0, total: 1, message: 'Saving to database...' });
    
    // Check if game exists
    let gameId: string;
    const existingGame = await getGameBySlug(slug);
    
    if (existingGame) {
      // Update existing game
      gameId = existingGame.id;
      await supabase
        .from('games')
        .update({ 
          title: game.info.title, 
          author: game.info.author,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);
    } else {
      // Create new game - get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to publish games');
      }
      
      const { data: newGame, error: gameError } = await supabase
        .from('games')
        .insert({
          slug,
          title: game.info.title,
          author: game.info.author,
          user_id: user.id
        })
        .select('id')
        .single();
      
      if (gameError || !newGame) {
        throw new Error(`Failed to create game: ${gameError?.message}`);
      }
      gameId = newGame.id;
    }
    
    // Get current max version
    const { data: versionData } = await supabase
      .from('game_versions')
      .select('version')
      .eq('game_id', gameId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const newVersion = (versionData?.version ?? 0) + 1;
    
    // Create new version (trigger will set previous versions to is_live = false)
    const { error: versionError } = await supabase
      .from('game_versions')
      .insert([{
        game_id: gameId,
        version: newVersion,
        game_data: JSON.parse(JSON.stringify(migratedGame)),
        is_live: true,
        notes: notes || null
      }]);
    
    if (versionError) {
      throw new Error(`Failed to create version: ${versionError.message}`);
    }
    
    const url = `${window.location.origin}/theater?slug=${slug}`;
    
    progress({ stage: 'done', current: 1, total: 1, message: 'Published!' });
    
    return {
      success: true,
      slug,
      url,
      version: newVersion
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, slug, url: '', version: 0, error: message };
  }
}

/**
 * Load a published game by slug
 */
export async function loadPublishedGame(slug: string): Promise<GameData | null> {
  // Get game by slug
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  
  if (!game) {
    return null;
  }
  
  // Get live version
  const { data: version } = await supabase
    .from('game_versions')
    .select('game_data')
    .eq('game_id', game.id)
    .eq('is_live', true)
    .maybeSingle();
  
  if (!version) {
    return null;
  }
  
  return version.game_data as unknown as GameData;
}
