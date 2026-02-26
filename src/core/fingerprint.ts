import type { FingerprintResult } from '../types';
import { Logger } from '../utils/logger';

const FP_PROXY_URL =
  'https://thredproxy.com/35ZCuyzokuT1YGd8/Hm7KPMHUZ4duyPRj?apiKey=iyqKVLQt2560EQUyjfxa';
const FP_PROXY_ENDPOINT =
  'https://thredproxy.com/35ZCuyzokuT1YGd8/qbWl4nqUSCIDTor4';

const STORAGE_KEY = 'thred_fingerprint';

export class FingerprintManager {
  private fingerprint: string | null = null;
  private logger: Logger;
  private promise: Promise<string | null> | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Get or generate fingerprint
   */
  async getFingerprint(): Promise<string | null> {
    if (this.fingerprint) {
      this.logger.log('Using cached fingerprint:', this.fingerprint);
      return this.fingerprint;
    }

    if (this.promise) {
      return this.promise;
    }

    // Check localStorage (persists across tabs)
    const stored = this.readStorage();
    if (stored) {
      this.fingerprint = stored;
      this.logger.log('Using stored fingerprint:', this.fingerprint);
      return this.fingerprint;
    }

    this.promise = this.generateFingerprint();
    return this.promise;
  }

  private async generateFingerprint(): Promise<string | null> {
    if (typeof window === 'undefined') {
      this.logger.warn('FingerprintJS requires a browser — skipping');
      return null;
    }

    try {
      this.logger.log('Loading FingerprintJS...');

      const FingerprintJS = await import(FP_PROXY_URL);
      const fp = await FingerprintJS.load({
        endpoint: [FP_PROXY_ENDPOINT, FingerprintJS.defaultEndpoint],
      });

      const result: FingerprintResult = await fp.get();
      this.fingerprint = result.visitorId;

      this.writeStorage(this.fingerprint);

      this.logger.log('Fingerprint generated:', this.fingerprint);
      return this.fingerprint;
    } catch (error) {
      this.logger.warn('Fingerprint generation failed:', error);
      return null;
    }
  }

  getCachedFingerprint(): string | null {
    return this.fingerprint;
  }

  clear() {
    this.fingerprint = null;
    this.promise = null;
    this.removeStorage();
  }

  private readStorage(): string | null {
    try {
      return typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    } catch {
      return null;
    }
  }

  private writeStorage(value: string) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
    } catch {
      this.logger.warn('Failed to persist fingerprint to localStorage');
    }
  }

  private removeStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors on cleanup
    }
  }
}
