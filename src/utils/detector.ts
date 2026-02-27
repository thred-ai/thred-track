/**
 * Detects if the visitor came from ChatGPT
 */
export function isFromChatGPT(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.toLowerCase() || '';
  const referrer = document.referrer.toLowerCase();

  const isChatGPTRef =
    referrer.includes('chat.openai.com') || referrer.includes('chatgpt.com');
  const isChatGPTUtm =
    utmSource === 'chatgpt' ||
    utmSource.includes('chatgpt') ||
    utmSource === 'chat.openai' ||
    utmSource === 'openai';

  return isChatGPTUtm || isChatGPTRef;
}

/**
 * Detects if the visitor came from Google Gemini
 */
export function isFromGemini(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.toLowerCase() || '';
  const referrer = document.referrer.toLowerCase();

  const isGeminiRef = referrer.includes('gemini.google.com');
  const isGeminiUtm =
    utmSource === 'gemini' ||
    utmSource.includes('gemini') ||
    utmSource === 'google_gemini';

  return isGeminiRef || isGeminiUtm;
}

/**
 * Detects if the visitor came from Perplexity AI
 */
export function isFromPerplexity(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.toLowerCase() || '';
  const referrer = document.referrer.toLowerCase();

  const isPerplexityRef = referrer.includes('perplexity.ai');
  const isPerplexityUtm =
    utmSource === 'perplexity' ||
    utmSource.includes('perplexity');

  return isPerplexityRef || isPerplexityUtm;
}

/**
 * Detects if the visitor came from any supported AI source
 */
export function isFromAI(): boolean {
  return isFromChatGPT() || isFromGemini() || isFromPerplexity();
}

export type AISource = 'chatgpt' | 'gemini' | 'pplx';

/**
 * Returns the detected AI source, or null if the visitor didn't come from a known AI
 */
export function getAISource(): AISource | null {
  if (isFromChatGPT()) return 'chatgpt';
  if (isFromGemini()) return 'gemini';
  if (isFromPerplexity()) return 'pplx';
  return null;
}

/**
 * Gets the browser key from script tag if present
 */
export function getBrowserKeyFromScript(): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const scripts = document.getElementsByTagName('script');

  for (const script of Array.from(scripts)) {
    if (script.src.includes('thred')) {
      try {
        const url = new URL(script.src);
        return url.searchParams.get('browserKey');
      } catch {
        // Invalid URL
      }
    }
  }

  return null;
}
