/**
 * ログユーティリティ
 * 本番環境では適切なログサービス（Winston等）に置き換えることを推奨
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp,
      ...(data && { data }),
    };

    return JSON.stringify(logEntry);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatMessage(level, message, data);
    
    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted);
        }
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = {
      ...data,
    };

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorData.error = error;
    }

    this.log('error', message, errorData);
  }
}

export const logger = new Logger();
