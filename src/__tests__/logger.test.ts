import { Logger } from '../utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log when debug is true', () => {
    const logger = new Logger(true);
    logger.log('test message');

    expect(consoleLogSpy).toHaveBeenCalledWith('[Thred]', 'test message');
  });

  it('should not log when debug is false', () => {
    const logger = new Logger(false);
    logger.log('test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should always log errors', () => {
    const logger = new Logger(false);
    logger.error('error message');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[Thred]', 'error message');
  });
});
