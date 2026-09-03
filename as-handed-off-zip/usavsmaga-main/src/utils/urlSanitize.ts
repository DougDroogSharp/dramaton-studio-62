// URL sanitization utilities to prevent XSS and unsafe protocol attacks

const ALLOWED_EXTERNAL_PROTOCOLS = ['https:', 'http:', 'mailto:'];
const ALLOWED_GAME_URL_PROTOCOLS = ['https:', 'http:'];

/**
 * Validates that a URL uses an allowed protocol for external links (buttons, etc.)
 * Blocks dangerous protocols like javascript:, data:, etc.
 */
export function isValidExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // Not a valid URL
    return false;
  }
}

/**
 * Validates and returns a safe game URL, or null if invalid.
 * Only allows https: and http: protocols for fetching game data.
 */
export function sanitizeGameUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    if (!ALLOWED_GAME_URL_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetches a URL with timeout protection
 */
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      ...options, 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
