// AI Usage Tracker - Session-based tracking for generative graphics

// Gemini 2.5 Flash pricing estimates (per 1K tokens)
const PRICING = {
  inputTokens: 0.000075, // $0.075 per 1M input tokens
  outputTokens: 0.0003,  // $0.30 per 1M output tokens (estimated for images)
  estimatedOutputTokens: 1000, // Rough estimate per image generation
};

export interface SessionUsage {
  totalGenerations: number;
  totalEstimatedCost: number;
  lastGenerationCost: number;
}

// In-memory session storage (resets on page refresh)
let sessionUsage: SessionUsage = {
  totalGenerations: 0,
  totalEstimatedCost: 0,
  lastGenerationCost: 0,
};

// Subscribers for reactive updates
type Subscriber = (usage: SessionUsage) => void;
const subscribers: Set<Subscriber> = new Set();

const notify = () => {
  subscribers.forEach(fn => fn({ ...sessionUsage }));
};

export const subscribeToUsage = (fn: Subscriber): (() => void) => {
  subscribers.add(fn);
  fn({ ...sessionUsage }); // Immediately send current state
  return () => subscribers.delete(fn);
};

export const getSessionUsage = (): SessionUsage => ({ ...sessionUsage });

export const trackGeneration = (params: {
  estimatedInputTokens: number;
}): number => {
  const { estimatedInputTokens } = params;
  
  // Calculate cost: input tokens + estimated output (image) tokens
  const inputCost = (estimatedInputTokens / 1000) * PRICING.inputTokens;
  const outputCost = (PRICING.estimatedOutputTokens / 1000) * PRICING.outputTokens;
  const totalCost = inputCost + outputCost;
  
  sessionUsage = {
    totalGenerations: sessionUsage.totalGenerations + 1,
    totalEstimatedCost: sessionUsage.totalEstimatedCost + totalCost,
    lastGenerationCost: totalCost,
  };
  
  notify();
  return totalCost;
};

export const resetSessionUsage = (): void => {
  sessionUsage = {
    totalGenerations: 0,
    totalEstimatedCost: 0,
    lastGenerationCost: 0,
  };
  notify();
};

// Format helpers
export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
};
