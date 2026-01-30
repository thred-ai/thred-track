import { isFromChatGPT } from '../utils/detector';

describe('isFromChatGPT', () => {
  const originalLocation = window.location;
  const originalReferrer = Object.getOwnPropertyDescriptor(
    document,
    'referrer'
  );

  beforeEach(() => {
    // Reset window.location
    delete (window as any).location;
    window.location = { ...originalLocation, search: '' } as any;
  });

  afterAll(() => {
    // Restore original values
    window.location = originalLocation;
    if (originalReferrer) {
      Object.defineProperty(document, 'referrer', originalReferrer);
    }
  });

  it('should return true when referrer is chat.openai.com', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://chat.openai.com/',
      configurable: true,
    });

    expect(isFromChatGPT()).toBe(true);
  });

  it('should return true when referrer is chatgpt.com', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://chatgpt.com/',
      configurable: true,
    });

    expect(isFromChatGPT()).toBe(true);
  });

  it('should return true when utm_source=chatgpt', () => {
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    });
    window.location.search = '?utm_source=chatgpt';

    expect(isFromChatGPT()).toBe(true);
  });

  it('should return false when no ChatGPT indicators', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com/',
      configurable: true,
    });
    window.location.search = '';

    expect(isFromChatGPT()).toBe(false);
  });
});
