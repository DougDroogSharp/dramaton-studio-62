// Token estimation for AI image generation
// Based on typical Gemini Vision token costs

import { GameData } from '@/types';

// Rough estimates for image tokens based on resolution
const IMAGE_TOKEN_ESTIMATES = {
  '256': 85,    // ~85 tokens for 256px image
  '512': 340,   // ~340 tokens for 512px image
  '768': 765,   // ~765 tokens for 768px image
  '1024': 1360, // ~1360 tokens for 1024px image
};

// Estimate tokens for a base64 image data URL
export const estimateImageTokens = (dataUrl: string | null | undefined): number => {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return 0;

  // Estimate dimensions from base64 payload size (without capturing the
  // payload — these strings can be megabytes)
  const marker = ';base64,';
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) return 0;

  const base64Length = dataUrl.length - markerIndex - marker.length;
  if (base64Length <= 0) return 0;
  const byteSize = base64Length * 0.75; // base64 overhead
  
  // Rough dimension estimate based on file size (assuming JPEG at ~85% quality)
  // Small: <50KB = ~256px, Medium: 50-150KB = ~512px, Large: >150KB = ~768px+
  if (byteSize < 50000) return IMAGE_TOKEN_ESTIMATES['256'];
  if (byteSize < 150000) return IMAGE_TOKEN_ESTIMATES['512'];
  if (byteSize < 400000) return IMAGE_TOKEN_ESTIMATES['768'];
  return IMAGE_TOKEN_ESTIMATES['1024'];
};

// Estimate tokens for text prompt (roughly 4 chars per token)
export const estimateTextTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

interface TokenEstimateParams {
  prompt: string;
  styleGuide?: string | null;
  referenceImageCloseUp?: string | null;
  referenceImageFullBody?: string | null;
  referenceImage?: string | null; // For drops
  styleLock?: boolean;
}

export interface TokenEstimate {
  total: number;
  breakdown: {
    prompt: number;
    styleGuide: number;
    references: number;
  };
  level: 'low' | 'medium' | 'high';
}

export const estimateGenerationTokens = (params: TokenEstimateParams): TokenEstimate => {
  const promptTokens = estimateTextTokens(params.prompt);
  const styleGuideTokens = params.styleGuide ? estimateImageTokens(params.styleGuide) : 0;
  
  // Reference images
  let referenceTokens = 0;
  if (params.referenceImageCloseUp) {
    referenceTokens += estimateImageTokens(params.referenceImageCloseUp);
  }
  if (params.referenceImageFullBody) {
    referenceTokens += estimateImageTokens(params.referenceImageFullBody);
  }
  if (params.referenceImage) {
    referenceTokens += estimateImageTokens(params.referenceImage);
  }
  
  // Add style lock text overhead
  const styleLockOverhead = params.styleLock ? 80 : 0; // ~80 tokens for style instructions
  
  const total = promptTokens + styleGuideTokens + referenceTokens + styleLockOverhead;
  
  // Determine level
  let level: 'low' | 'medium' | 'high' = 'low';
  if (total > 1000) level = 'medium';
  if (total > 2000) level = 'high';
  
  return {
    total,
    breakdown: {
      prompt: promptTokens + styleLockOverhead,
      styleGuide: styleGuideTokens,
      references: referenceTokens,
    },
    level,
  };
};

// Estimate the total AI tokens represented by a whole project: every image
// and prompt on the game's generation surface. Powers the header cost meter.
// Observation only — no limits, no warnings.
export const estimateProjectTokens = (game: GameData): number => {
  let total = 0;
  total += estimateImageTokens(game.info.styleGuide);
  for (const actor of game.actors) {
    total += estimateImageTokens(actor.referenceImageCloseUp);
    total += estimateImageTokens(actor.referenceImageFullBody);
    for (const graphic of actor.graphics) {
      total += estimateImageTokens(graphic.image);
      if (graphic.generatedPrompt) total += estimateTextTokens(graphic.generatedPrompt);
    }
  }
  for (const drop of game.drops) {
    total += estimateImageTokens(drop.image);
    total += estimateImageTokens(drop.referenceImage);
    if (drop.prompt) total += estimateTextTokens(drop.prompt);
    if (drop.generatedPrompt) total += estimateTextTokens(drop.generatedPrompt);
  }
  for (const item of game.items) {
    total += estimateImageTokens(item.visualAsset);
  }
  return total;
};

// Format token count for display
export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
};
