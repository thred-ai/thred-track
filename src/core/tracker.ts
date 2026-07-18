import type { ThredConfig, LeadData } from '../types';
import { Logger } from '../utils/logger';
import { isFromAI, getAISource } from '../utils/detector';
import { ThredAPI } from './api';
import { FingerprintManager } from './fingerprint';

const REFERRER_SESSION_KEY = 'thred_ai_referrer';

export class Tracker {
  private api: ThredAPI;
  private fingerprint: FingerprintManager;
  private logger: Logger;
  private config: ThredConfig | null = null;

  constructor(
    api: ThredAPI,
    fingerprint: FingerprintManager,
    logger: Logger
  ) {
    this.api = api;
    this.fingerprint = fingerprint;
    this.logger = logger;
  }

  /**
   * Initialize tracker. Only AI-sourced visitors are fingerprinted and tracked.
   */
  async init(): Promise<void> {
    const aiDetected = isFromAI() && !this.isDuplicateReferrer();

    if (!aiDetected) {
      this.logger.log('Visitor not from AI - skipping tracking');
      return;
    }

    const fingerprint = await this.fingerprint.getFingerprint();
    if (!fingerprint) {
      this.logger.warn('Cannot initialize tracker without fingerprint');
      return;
    }

    this.config = await this.api.fetchConfig(fingerprint);

    if (!this.config?.enabled) {
      this.logger.log('Tracking disabled by config');
      return;
    }

    console.log('[Thred] Initialized!');

    this.loadRadar(fingerprint);
    this.loadVector(fingerprint);

    this.saveReferrer();
    await this.trackPageView();
  }

  /**
   * Load Snitcher Radar script for IP-to-company enrichment.
   */
  private loadRadar(fingerprint: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!this.config?.radarProfileId || !this.config.radarCdn || !this.config.radarApiEndpoint) {
      this.logger.log('Radar config not present, skipping');
      return;
    }

    try {
      const radarConfig = {
        cdn: this.config.radarCdn,
        apiEndpoint: this.config.radarApiEndpoint,
        profileId: this.config.radarProfileId,
        namespace: 'ThredRadar',
      };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const ns = radarConfig.namespace;
      const w = window as any;
      let radar = w[ns];
      if ((radar && !Array.isArray(radar)) || (radar && radar.initialized)) {
        this.logger.log('Radar already initialized');
        return;
      }

      radar = w[ns] = [];
      radar._loaded = true;

      const methods = [
        'track', 'page', 'identify', 'group', 'alias', 'ready', 'debug',
        'on', 'off', 'once', 'trackClick', 'trackSubmit', 'trackLink',
        'trackForm', 'pageview', 'screen', 'reset', 'register',
        'setAnonymousId', 'addSourceMiddleware', 'addIntegrationMiddleware',
        'addDestinationMiddleware',
      ];

      for (const method of methods) {
        radar[method] = (...args: any[]) => {
          const r = w[ns];
          if (r.initialized) return r[method](...args);
          r.push([method, ...args]);
          return r;
        };
      }

      radar.bootstrap = () => {
        const script = document.createElement('script');
        script.async = true;
        script.type = 'text/javascript';
        script.id = '__radar__';
        script.dataset.settings = JSON.stringify(radarConfig);
        script.src = `https://${radarConfig.cdn}/releases/latest/radar.min.js`;
        const first = document.scripts[0];
        if (first?.parentNode) {
          first.parentNode.insertBefore(script, first);
        }
      };

      radar.bootstrap();

      radar.track('thred_identify', { fingerprint });
      /* eslint-enable @typescript-eslint/no-explicit-any */
      this.logger.log('Radar loaded and identified with fingerprint');
    } catch (err) {
      this.logger.warn('Failed to load Radar:', err);
    }
  }

  /**
   * Load Vector.co pixel (https://cdn.vector.co/pixel.js).
   * Runs when config includes vectorBrowserToken; partnerId is set to the fingerprint.
   */
  private loadVector(fingerprint: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!this.config?.vector) {
      this.logger.log('Vector config not present, skipping');
      return;
    }

    const token = this.config.vector;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = '__vector__';
    script.textContent = [
      '!function(e,r){try{var t={};t.q=t.q||[];for(var o=["load","identify","on"],n=function(e){return function(){var r=Array.prototype.slice.call(arguments);t.q.push([e,r])}},c=0;c<o.length;c++){var a=o[c];t[a]=n(a)}if(e.vector=t,!t.loaded){var i=r.createElement("script");i.type="text/javascript",i.async=!0,i.src="https://cdn.vector.co/pixel.js";var l=r.getElementsByTagName("script")[0];l.parentNode.insertBefore(i,l),t.loaded=!0}}catch(e){console.error("Error loading Vector:",e)}}(window,document);',
      `window.vector.partnerId = JSON.stringify({ userId: "${fingerprint}" });`,
      `vector.load("${token}");`,
    ].join('\n');
    document.head.appendChild(script);
    this.logger.log(`Vector token: ${token}`);
    this.logger.log(`Vector script injected with partnerId (${JSON.stringify({userId: fingerprint})})`);
  }

  private isDuplicateReferrer(): boolean {
    try {
      const prev = sessionStorage.getItem(REFERRER_SESSION_KEY);
      return prev !== null && prev === document.referrer.toLowerCase();
    } catch {
      return false;
    }
  }

  private saveReferrer(): void {
    try {
      sessionStorage.setItem(REFERRER_SESSION_KEY, document.referrer.toLowerCase());
    } catch {
      // sessionStorage unavailable
    }
  }

  /**
   * Track a single page view for the AI click-through landing.
   */
  async trackPageView(): Promise<void> {
    if (typeof window === 'undefined') return;

    const fp = await this.fingerprint.getFingerprint();

    if (!fp) {
      this.logger.warn('Cannot track page view without fingerprint');
      return;
    }

    if (!this.config?.sessionCode) {
      this.logger.warn('Cannot track page view without session code');
      return;
    }

    const source = getAISource();

    await this.api.trackPageView({
      event: 'page_view',
      data: {
        url: window.location.href,
        contentString: document.body.innerText,
      },
      fingerprint: fp,
      ...(source && { source }),
      sessionCode: this.config.sessionCode,
    });
  }

  /**
   * Identify user and enrich lead data
   */
  async identify(leadData: LeadData): Promise<void> {
    const fp = await this.fingerprint.getFingerprint();

    if (!fp) {
      this.logger.warn('Cannot identify without fingerprint');
      return;
    }

    await this.api.enrichLead({
      fingerprint: fp,
      leadData,
    });
  }

  /**
   * Cleanup tracker
   */
  destroy(): void {
    // no-op
  }
}
