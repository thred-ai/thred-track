/**
 * Thred SDK - Browser tracking and lead enrichment
 */

import type { ThredOptions, ThredSDK as IThredSDK, LeadData } from './types';
import { Logger } from './utils/logger';
import { isFromChatGPT, isFromGemini, isFromAI, getBrowserKeyFromScript } from './utils/detector';
import { FingerprintManager } from './core/fingerprint';
import { ThredAPI } from './core/api';
import { Tracker } from './core/tracker';

export * from './types';

const DEFAULT_BASE_URL = 'https://api.thred.dev/v1';

export class ThredSDK implements IThredSDK {
  private options: ThredOptions;
  private logger: Logger;
  private fingerprint: FingerprintManager;
  private api: ThredAPI;
  private tracker: Tracker;
  private initialized = false;

  constructor(options: ThredOptions) {
    this.options = {
      baseUrl: DEFAULT_BASE_URL,
      debug: false, // Set to true for development
      autoInit: true,
      ...options,
    };

    this.logger = new Logger(this.options.debug);
    this.fingerprint = new FingerprintManager(this.logger);
    this.api = new ThredAPI(
      this.options.baseUrl!,
      this.options.browserKey,
      this.logger
    );
    this.tracker = new Tracker(this.api, this.fingerprint, this.logger);

    if (this.options.autoInit) {
      this.init();
    }
  }

  /**
   * Initialize the SDK
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      this.logger.warn('SDK requires a browser environment — skipping init');
      return;
    }

    if (this.initialized) {
      this.logger.warn('SDK already initialized');
      return;
    }

    this.logger.log('Initializing Thred SDK...');

    // Generate fingerprint
    await this.fingerprint.getFingerprint();

    // Initialize tracker
    await this.tracker.init();

    this.initialized = true;
    this.logger.log('SDK initialized successfully');
  }

  /**
   * Check if visitor is from ChatGPT
   */
  isFromChatGPT(): boolean {
    return isFromChatGPT();
  }

  /**
   * Check if visitor is from Google Gemini
   */
  isFromGemini(): boolean {
    return isFromGemini();
  }

  /**
   * Check if visitor is from any supported AI source
   */
  isFromAI(): boolean {
    return isFromAI();
  }

  /**
   * Track page view
   */
  async trackPageView(): Promise<void> {
    await this.tracker.trackPageView();
  }

  /**
   * Track form submission
   */
  async trackFormSubmit(formData: FormData): Promise<void> {
    await this.tracker.trackFormSubmit(formData);
  }

  /**
   * Identify user with lead data
   */
  async identify(leadData: LeadData): Promise<void> {
    await this.tracker.identify(leadData);
  }

  /**
   * Get current fingerprint
   */
  getFingerprint(): string | null {
    return this.fingerprint.getCachedFingerprint();
  }

  /**
   * Destroy SDK instance and cleanup
   */
  destroy(): void {
    this.tracker.destroy();
    this.fingerprint.clear();
    this.initialized = false;
    this.logger.log('SDK destroyed');
  }
}

/**
 * Auto-initialize if loaded as script tag with browserKey
 */
if (typeof window !== 'undefined') {
  const browserKey = getBrowserKeyFromScript();
  if (browserKey) {
    const sdk = new ThredSDK({ browserKey });
    (window as any).Thred = sdk;
  }
}

export default ThredSDK;
