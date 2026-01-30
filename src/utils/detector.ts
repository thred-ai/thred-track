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
