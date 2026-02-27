/**
 * Thred SDK Types
 */

export interface ThredConfig {
  enabled: boolean;
  hasChatSession: boolean;
  type: "hosted" | "custom",
  hostedUrlBase?: string;
  formId?: string;
  emailId?: string;
  nameId?: string;
  companyId?: string;
}

export interface ThredOptions {
  browserKey: string;
  baseUrl?: string;
  debug?: boolean;
  autoInit?: boolean;
}

export interface LeadData {
  name: string;
  email: string;
  company?: string | null;
  discovery?: boolean;
}

export interface PageViewPayload {
  event: 'page_view';
  data: {
    url: string;
  };
  fingerprint: string;
  source?: string;
}

export interface EnrichPayload {
  fingerprint: string;
  leadData: LeadData;
}

export interface FingerprintResult {
  visitorId: string;
}

export interface ThredSDK {
  init(): Promise<void>;
  trackPageView(): Promise<void>;
  trackFormSubmit(formData: FormData): Promise<void>;
  identify(leadData: LeadData): Promise<void>;
  getFingerprint(): string | null;
  isFromChatGPT(): boolean;
  isFromGemini(): boolean;
  isFromPerplexity(): boolean;
  isFromClaude(): boolean;
  isFromAI(): boolean;
  destroy(): void;
}
