/**
 * Simple logger utility
 */
export class Logger {
  private debug: boolean;
  private prefix: string;

  constructor(debug = false, prefix = '[Thred]') {
    this.debug = debug;
    this.prefix = prefix;
  }

  log(...args: unknown[]) {
    if (this.debug) {
      console.log(this.prefix, ...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.debug) {
      console.warn(this.prefix, ...args);
    }
  }

  error(...args: unknown[]) {
    console.error(this.prefix, ...args);
  }
}
