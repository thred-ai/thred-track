import type { ThredConfig, LeadData } from '../types';
import { Logger } from '../utils/logger';
import { isFromAI, getAISource } from '../utils/detector';
import { ThredAPI } from './api';
import { FingerprintManager } from './fingerprint';

export class Tracker {
  private api: ThredAPI;
  private fingerprint: FingerprintManager;
  private logger: Logger;
  private config: ThredConfig | null = null;
  private formObserver: MutationObserver | null = null;
  private lastTrackedUrl: string | null = null;
  private popstateHandler: (() => void) | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

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

    if (!this.config.hasChatSession && !isFromAI()) {
      this.logger.log('No chat session for this fingerprint - exiting');
      return;
    }

    // Track initial page view
    if (isFromAI()) {
      await this.trackPageView();
    } else {
      this.logger.log('UTM not from AI source - skipping page view');
    }

    // Track SPA route changes
    this.setupRouteTracking();

    // Setup form tracking
    this.setupFormTracking();
  }

  /**
   * Track page view event
   */
  async trackPageView(): Promise<void> {
    if (typeof window === 'undefined') return;

    const fp = await this.fingerprint.getFingerprint();

    if (!fp) {
      this.logger.warn('Cannot track page view without fingerprint');
      return;
    }

    const source = getAISource();

    await this.api.trackPageView({
      event: 'page_view',
      data: {
        url: window.location.href,
      },
      fingerprint: fp,
      ...(source && { source }),
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
   * Track page views on SPA route changes by patching pushState/replaceState
   * and listening for popstate.
   */
  private setupRouteTracking(): void {
    if (typeof window === 'undefined') return;

    this.lastTrackedUrl = window.location.href;

    const onRouteChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl === this.lastTrackedUrl) return;
      this.lastTrackedUrl = currentUrl;
      this.logger.log('Route change detected:', currentUrl);
      this.trackPageView();
    };

    this.popstateHandler = onRouteChange;
    window.addEventListener('popstate', this.popstateHandler);

    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      this.originalPushState!(...args);
      onRouteChange();
    };

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      this.originalReplaceState!(...args);
      onRouteChange();
    };
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

    if (typeof window === 'undefined') return;

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }

    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }
  }
}
