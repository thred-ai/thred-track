import type {
  ThredConfig,
  PageViewPayload,
  EnrichPayload,
} from '../types';
import { Logger } from '../utils/logger';

export class ThredAPI {
  private baseUrl: string;
  private browserKey: string;
  private logger: Logger;

  constructor(baseUrl: string, browserKey: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.browserKey = browserKey;
    this.logger = logger;
  }

  /**
   * Fetch configuration from API
   */
  async fetchConfig(fingerprint: string): Promise<ThredConfig | null> {
    try {
      const url = `${this.baseUrl}/config?fingerprint=${encodeURIComponent(fingerprint)}&browserKey=${encodeURIComponent(this.browserKey)}`;
      this.logger.log('Fetching config from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Config request failed: ${response.status}`);
      }

      const config = await response.json();
      this.logger.log('Config received:', config);

      return config;
    } catch (error) {
      this.logger.warn('Failed to fetch config:', error);
      return null;
    }
  }

  /**
   * Send page view event
   */
  async trackPageView(payload: PageViewPayload): Promise<void> {
    try {
      const url = `${this.baseUrl}/events/page-view?browserKey=${encodeURIComponent(this.browserKey)}`;
      this.logger.log('Tracking page view:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Page view request failed: ${response.status}`);
      }

      this.logger.log('Page view tracked successfully');
    } catch (error) {
      this.logger.warn('Failed to track page view:', error);
    }
  }

  /**
   * Send lead enrichment data
   */
  async enrichLead(payload: EnrichPayload): Promise<void> {
    try {
      const url = `${this.baseUrl}/customers/enrich?browserKey=${encodeURIComponent(this.browserKey)}`;
      this.logger.log('Enriching lead:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Enrich request failed: ${response.status}`);
      }

      this.logger.log('Lead enriched successfully');
    } catch (error) {
      this.logger.warn('Failed to enrich lead:', error);
    }
  }
}
