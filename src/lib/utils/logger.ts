/**
 * Centralized logging utility with environment-based log levels
 * 
 * Log Levels:
 * - error: Always shown (critical errors)
 * - warn: Always shown (warnings)
 * - info: Shown in development only (important events)
 * - debug: Shown only when explicitly enabled (detailed debugging)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment: boolean;
  private isDebugEnabled: boolean;
  private shouldLog: boolean;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check if debug logging is explicitly enabled
    this.isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true';
    
    // Check if logging should be enabled at all
    this.shouldLog = process.env.NEXT_PUBLIC_ENABLE_LOGS !== 'false';
  }

  private canLog(level: LogLevel): boolean {
    if (!this.shouldLog) return false;
    
    switch (level) {
      case 'error':
      case 'warn':
        return true; // Always log errors and warnings
      case 'info':
        return this.isDevelopment; // Only in development
      case 'debug':
        return this.isDevelopment && this.isDebugEnabled; // Only when explicitly enabled
      default:
        return false;
    }
  }

  error(...args: any[]): void {
    if (this.canLog('error')) {
      console.error(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.canLog('warn')) {
      console.warn(...args);
    }
  }

  info(...args: any[]): void {
    if (this.canLog('info')) {
      console.log(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.canLog('debug')) {
      console.log(...args);
    }
  }

  // Special method for API/prompt logging - masks sensitive data
  api(message: string, data?: any): void {
    if (!this.canLog('info')) return;

    if (data?.prompt || data?.promptPreview) {
      // Mask prompt content
      const maskedData = {
        ...data,
        prompt: data.prompt ? `${data.prompt.substring(0, 50)}...` : undefined,
        promptPreview: data.promptPreview ? `${data.promptPreview.substring(0, 50)}...` : undefined,
      };
      console.log(message, maskedData);
    } else {
      console.log(message, data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();