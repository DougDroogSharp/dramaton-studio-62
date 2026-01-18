import { Actor, Drop, Scene, Item, Sfx, AssetStatus } from '@/types';

// Status order for comparison
const STATUS_ORDER: Record<AssetStatus, number> = {
  'new': 0,
  'work': 1,
  'done': 2,
};

/**
 * Only promote status forward (new → work → done), never demote
 */
export const promoteStatus = (current: AssetStatus, computed: AssetStatus): AssetStatus => {
  return STATUS_ORDER[computed] > STATUS_ORDER[current] ? computed : current;
};

/**
 * Compute what status an Actor should have based on its content
 * - 'new': No content added yet
 * - 'work': Has some content (reference images, voice, or graphics started)
 * - 'done': Has at least one graphic with an image
 */
export const computeActorStatus = (actor: Actor): AssetStatus => {
  // Done: Has at least one graphic with an image
  const hasGraphicWithImage = actor.graphics.some(g => g.image);
  if (hasGraphicWithImage) return 'done';
  
  // Work: Has reference images, voice, or any graphics
  const hasReferenceImages = actor.referenceImageCloseUp || actor.referenceImageFullBody;
  const hasVoice = !!actor.voiceId;
  const hasGraphics = actor.graphics.length > 0;
  
  if (hasReferenceImages || hasVoice || hasGraphics) return 'work';
  
  return 'new';
};

/**
 * Compute what status a Drop should have based on its content
 * - 'new': No content added yet
 * - 'work': Has reference image or prompt but no main image
 * - 'done': Has main image
 */
export const computeDropStatus = (drop: Drop): AssetStatus => {
  // Done: Has main image
  if (drop.image) return 'done';
  
  // Work: Has reference image or meaningful prompt
  if (drop.referenceImage || (drop.prompt && drop.prompt.trim().length > 0)) return 'work';
  
  return 'new';
};

/**
 * Compute what status a Scene should have based on its content
 * - 'new': No content added yet
 * - 'work': Has drop, script started, or stage elements
 * - 'done': Has drop AND non-empty script
 */
export const computeSceneStatus = (scene: Scene): AssetStatus => {
  const hasDrop = !!scene.dropId;
  const hasScript = scene.script && scene.script.trim().length > 0;
  const hasStageElements = scene.stage && scene.stage.length > 0;
  const hasAudio = scene.audioTracks && scene.audioTracks.length > 0;
  
  // Done: Has both drop and script
  if (hasDrop && hasScript) return 'done';
  
  // Work: Has any content
  if (hasDrop || hasScript || hasStageElements || hasAudio) return 'work';
  
  return 'new';
};

/**
 * Compute what status an Item should have based on its content
 * - 'new': No content added yet
 * - 'work': Has visual asset OR description
 * - 'done': Has visual asset AND description
 */
export const computeItemStatus = (item: Item): AssetStatus => {
  const hasVisual = !!item.visualAsset;
  const hasDescription = item.description && item.description.trim().length > 0;
  
  // Done: Has both visual and description
  if (hasVisual && hasDescription) return 'done';
  
  // Work: Has either
  if (hasVisual || hasDescription) return 'work';
  
  return 'new';
};

/**
 * Compute what status an SFX should have based on its content
 * - 'new': No audio added yet
 * - 'work': Has audio prompt but no audio
 * - 'done': Has audio URL
 */
export const computeSfxStatus = (sfx: Sfx): AssetStatus => {
  // Done: Has audio
  if (sfx.params.audioUrl) return 'done';
  
  // Work: Has audio prompt
  if (sfx.params.audioPrompt && sfx.params.audioPrompt.trim().length > 0) return 'work';
  
  return 'new';
};

/**
 * Compute aggregate status for a category of assets
 * - 'new': Empty or all children are 'new'
 * - 'done': All children are 'done' (and at least 1 exists)
 * - 'work': Mixed or has 'work' items
 */
export const getCategoryStatus = (items: { status?: AssetStatus }[]): AssetStatus => {
  if (items.length === 0) return 'new';
  
  const statuses = items.map(i => i.status || 'new');
  const allDone = statuses.every(s => s === 'done');
  const allNew = statuses.every(s => s === 'new');
  
  if (allDone) return 'done';
  if (allNew) return 'new';
  return 'work';
};

/**
 * Get color class for category based on status
 */
export const getCategoryColor = (status: AssetStatus): string => {
  switch (status) {
    case 'done': return 'text-diesel-green';
    case 'work': return 'text-diesel-rust';
    default: return 'text-diesel-paper';
  }
};
