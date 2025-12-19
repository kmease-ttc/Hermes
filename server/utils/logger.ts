export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private formatMessage(level: LogLevel, module: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${module}] ${message}${metaStr}`;
  }

  debug(module: string, message: string, meta?: any) {
    console.log(this.formatMessage(LogLevel.DEBUG, module, message, meta));
  }

  info(module: string, message: string, meta?: any) {
    console.log(this.formatMessage(LogLevel.INFO, module, message, meta));
  }

  warn(module: string, message: string, meta?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, module, message, meta));
  }

  error(module: string, message: string, meta?: any) {
    console.error(this.formatMessage(LogLevel.ERROR, module, message, meta));
  }
}

export const logger = new Logger();
