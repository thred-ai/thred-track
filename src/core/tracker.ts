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
  private formObserver: MutationObserver | null = null;

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
   * Initialize tracker with config
   */
  async init(): Promise<void> {
    // Get fingerprint
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

    const aiDetected = isFromAI() && !this.isDuplicateReferrer();

    if (aiDetected) {
      // load vector only if ai detected
      this.loadVector(fingerprint);
    }

    if (!this.config.hasChatSession && !aiDetected) {
      this.logger.log('No chat session for this fingerprint - exiting');
      return;
    }

    if (aiDetected) {
      this.saveReferrer();
      await this.trackPageView();
    }

    this.setupFormTracking();
  }

  /**
   * Load Snitcher Radar script for IP-to-company enrichment.
   * Runs unconditionally (not gated by AI detection) to capture all visits.
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
    if (!this.config?.vectorBrowserToken) {
      this.logger.log('Vector config not present, skipping');
      return;
    }

    const token = this.config.vectorBrowserToken;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = '__vector__';
    script.textContent = [
      '!function(e,r){try{if(e.vector)return void console.log("Vector snippet included more than once.");var t={};t.q=t.q||[];for(var o=["load","identify","on"],n=function(e){return function(){var r=Array.prototype.slice.call(arguments);t.q.push([e,r])}},c=0;c<o.length;c++){var a=o[c];t[a]=n(a)}if(e.vector=t,!t.loaded){var i=r.createElement("script");i.type="text/javascript",i.async=!0,i.src="https://cdn.vector.co/pixel.js";var l=r.getElementsByTagName("script")[0];l.parentNode.insertBefore(i,l),t.loaded=!0}}catch(e){console.error("Error loading Vector:",e)}}(window,document);',
      `window.vector.partnerId = "${fingerprint}";`,
      `vector.load("${token}");`,
    ].join('\n');
    const first = document.getElementsByTagName('script')[0];
    if (first?.parentNode) {
      first.parentNode.insertBefore(script, first);
    }
    this.logger.log(`Vector token: ${token}`);
    this.logger.log(`Vector script injected with partnerId (${fingerprint})`);
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
   * Track form submission and enrich lead
   */
  async trackFormSubmit(formData: FormData): Promise<void> {
    if (!this.config || !this.config.emailId || !this.config.nameId) {
      this.logger.warn('Cannot track form - no config loaded');
      return;
    }

    const email = formData.get(this.config.emailId)?.toString().trim();
    const name = formData.get(this.config.nameId)?.toString().trim();

    let company: string | undefined = undefined;
    if (this.config.companyId) {
      company = formData.get(this.config.companyId)?.toString().trim();
    }

    this.logger.log('Form data extracted:', { email, name, company });

    if (!email || !name) {
      this.logger.warn('Missing required fields (email, name)');
      return;
    }

    await this.identify({
      name,
      email,
      company: company,
      discovery: false,
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
   * Setup automatic form tracking
   */
  private setupFormTracking(): void {
    if (!this.config || typeof document === 'undefined') {
      this.logger.warn('Cannot track form - no config or document');
      return;
    }

    if (this.config.type === 'hosted') {
      const hostedUrlBase = this.config.hostedUrlBase;
      if (!hostedUrlBase) {
        this.logger.warn('Cannot track form - no hosted URL base');
        return;
      }

      // Inject utm_fp into all existing matching links
      this.injectFingerprintIntoLinks(document.body, hostedUrlBase);

      // Watch for dynamically added links and inject utm_fp as they appear
      this.formObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (!(node instanceof HTMLElement)) continue;

            // Check if the added node itself is a matching link
            if (node.tagName === 'A') {
              this.injectFingerprintIntoLink(node as HTMLAnchorElement, hostedUrlBase);
            }

            // Check any child links within the added node
            this.injectFingerprintIntoLinks(node, hostedUrlBase);
          }
        }
      });

      this.formObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Fallback: intercept clicks for links that may have had their href changed dynamically
      document.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href || !href.includes(hostedUrlBase)) return;

        // Already tagged — skip
        if (href.includes('utm_fp=')) return;

        this.injectFingerprintIntoLink(target as HTMLAnchorElement, hostedUrlBase);
      }, { capture: true });

      return;
    }
    else if (this.config.type === 'custom') {
      const attachFormListener = () => {
        if (!this.config || !this.config.formId) {
          this.logger.warn('Cannot track form - no form ID');
          return;
        }
        const form = document.getElementById(this.config!.formId);
        if (!form) {
          this.logger.log('Form not found:', this.config!.formId);
          return;
        }

        const formElement = form as HTMLFormElement;

        // Check if already tracked
        if (formElement.dataset.thredTracked) {
          return;
        }

        this.logger.log('Attaching listener to form:', this.config!.formId);

        formElement.addEventListener(
          'submit',
          () => {
            const formData = new FormData(formElement);
            this.trackFormSubmit(formData);
          },
          { capture: true }
        );

        formElement.dataset.thredTracked = 'true';
      };

      // Attach immediately if form exists
      attachFormListener();

      // Watch for dynamic forms
      this.formObserver = new MutationObserver(() => {
        attachFormListener();
      });

      this.formObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Inject utm_fp into all matching links within a root element
   */
  private injectFingerprintIntoLinks(root: HTMLElement, hostedUrlBase: string): void {
    const links = root.querySelectorAll<HTMLAnchorElement>('a[href]');
    for (const link of Array.from(links)) {
      this.injectFingerprintIntoLink(link, hostedUrlBase);
    }
  }

  /**
   * Inject utm_fp into a single link if it matches hostedUrlBase
   */
  private injectFingerprintIntoLink(link: HTMLAnchorElement, hostedUrlBase: string): void {
    const href = link.getAttribute('href');
    if (!href || !href.includes(hostedUrlBase)) return;

    // Already tagged — skip
    if (href.includes('utm_fp=')) return;

    const fp = this.fingerprint.getCachedFingerprint();
    if (!fp) {
      this.logger.warn('Cannot inject utm_fp - no cached fingerprint');
      return;
    }

    try {
      const url = new URL(href, window.location.origin);
      url.searchParams.set('utm_fp', fp);
      link.setAttribute('href', url.toString());
      this.logger.log('Injected utm_fp into link:', url.toString());
    } catch (err) {
      this.logger.warn('Failed to parse URL:', href, err);
    }
  }

  /**
   * Cleanup tracker
   */
  destroy(): void {
    if (this.formObserver) {
      this.formObserver.disconnect();
      this.formObserver = null;
    }
  }
}
