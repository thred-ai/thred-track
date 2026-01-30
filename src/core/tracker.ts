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
    this.config = await this.api.fetchConfig();

    if (!this.config?.enabled) {
      this.logger.log('Tracking disabled by config');
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
    if (!this.config) {
      this.logger.warn('Cannot track form - no config loaded');
      return;
    }

    const email = formData.get(this.config.emailId)?.toString().trim();
    const name = formData.get(this.config.nameId)?.toString().trim();
    const company = formData.get(this.config.companyId)?.toString().trim();

    this.logger.log('Form data extracted:', { email, name, company });

    if (!email || !name) {
      this.logger.warn('Missing required fields (email, name)');
      return;
    }

    await this.identify({
      name,
      email,
      company: company || null,
      discovery: true,
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
      return;
    }

    const attachFormListener = () => {
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
