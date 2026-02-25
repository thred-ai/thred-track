import type { FingerprintResult } from '../types';
import { Logger } from '../utils/logger';

const FP_PROXY_URL =
  'https://thredproxy.com/35ZCuyzokuT1YGd8/Hm7KPMHUZ4duyPRj?apiKey=iyqKVLQt2560EQUyjfxa';
const FP_PROXY_ENDPOINT =
  'https://thredproxy.com/35ZCuyzokuT1YGd8/qbWl4nqUSCIDTor4';

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
    // Return cached fingerprint
    if (this.fingerprint) {
      this.logger.log('Using cached fingerprint:', this.fingerprint);
      return this.fingerprint;
    }

    // Return existing promise if already loading
    if (this.promise) {
      return this.promise;
    }

    // Check global window cache
    if (
      typeof window !== 'undefined' &&
      (window as any).thredFingerprint
    ) {
      this.fingerprint = (window as any).thredFingerprint;
      this.logger.log('Using global fingerprint:', this.fingerprint);
      return this.fingerprint;
    }

    // Generate new fingerprint
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

      // Cache globally
      if (typeof window !== 'undefined') {
        (window as any).thredFingerprint = this.fingerprint;
      }

      this.logger.log('Fingerprint generated:', this.fingerprint);
      return this.fingerprint;
    } catch (error) {
      this.logger.warn('Fingerprint generation failed:', error);
      return null;
    }
  }

  /**
   * Get cached fingerprint (synchronous)
   */
  getCachedFingerprint(): string | null {
    return this.fingerprint;
  }

  /**
   * Clear fingerprint cache
   */
  clear() {
    this.fingerprint = null;
    this.promise = null;
    if (typeof window !== 'undefined') {
      delete (window as any).thredFingerprint;
    }
  }
}
