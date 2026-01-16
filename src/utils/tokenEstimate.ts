// Token estimation for AI image generation
// Based on typical Gemini Vision token costs

// Rough estimates for image tokens based on resolution
const IMAGE_TOKEN_ESTIMATES = {
  '256': 85,    // ~85 tokens for 256px image
  '512': 340,   // ~340 tokens for 512px image
  '768': 765,   // ~765 tokens for 768px image
  '1024': 1360, // ~1360 tokens for 1024px image
};

// Estimate tokens for a base64 image data URL
export const estimateImageTokens = (dataUrl: string | null | undefined): number => {
  if (!dataUrl) return 0;
  
  // Extract base64 data and estimate dimensions from file size
  const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!base64Match) return 0;
  
  const base64Data = base64Match[1];
  const byteSize = base64Data.length * 0.75; // base64 overhead
  
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

// Format token count for display
export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
};
