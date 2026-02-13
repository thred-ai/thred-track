import type { ThredConfig, LeadData } from '../types';
import { Logger } from '../utils/logger';
import { ThredAPI } from './api';
import { FingerprintManager } from './fingerprint';

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

    if (!this.config.fromChat) {
      this.logger.log('Not from ChatGPT - exiting');
      return;
    }

    // Track page view
    await this.trackPageView();

    // Setup form tracking
    this.setupFormTracking();
  }

  /**
   * Track page view event
   */
  async trackPageView(): Promise<void> {
    const fp = await this.fingerprint.getFingerprint();

    if (!fp) {
      this.logger.warn('Cannot track page view without fingerprint');
      return;
    }

    await this.api.trackPageView({
      event: 'page_view',
      data: {
        url: window.location.href,
      },
      fingerprint: fp,
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

      // Attach UTM parameter to links containing hostedUrlBase
      document.addEventListener('click', async (e) => {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href || !href.includes(hostedUrlBase!)) return;

        // Get fingerprint
        const fp = await this.fingerprint.getFingerprint();
        if (!fp) {
          this.logger.warn('Cannot add UTM parameter - no fingerprint');
          return;
        }

        // Parse URL and add utm_fp parameter
        try {
          const url = new URL(href, window.location.origin);
          url.searchParams.set('utm_fp', fp);
          
          // Update the href with the new URL
          target.setAttribute('href', url.toString());
          
          this.logger.log('Added utm_fp to link:', url.toString());
        } catch (err) {
          this.logger.warn('Failed to parse URL:', href, err);
        }
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
   * Cleanup tracker
   */
  destroy(): void {
    if (this.formObserver) {
      this.formObserver.disconnect();
      this.formObserver = null;
    }
  }
}
