/**
 * Production-ready logging system
 * Handles different log levels and environment-specific behavior
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogContext = Record<string, any>;

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  private storeLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private async sendToSupabase(entry: LogEntry) {
    if (this.isDev) return;

    try {
      // Store critical errors in Supabase for monitoring
      if (entry.level === 'error') {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('error_logs').insert({
          error_message: entry.message,
          error_stack: entry.context?.stack || null,
          url: entry.url,
          user_agent: entry.userAgent,
          timestamp: entry.timestamp,
          component_stack: entry.context?.componentStack || null,
        });
      }
    } catch (error) {
      console.error('Failed to log to Supabase:', error);
    }
  }

  info(message: string, context?: LogContext) {
    const entry = this.createLogEntry('info', message, context);
    this.storeLog(entry);
    
    if (this.isDev) {
      console.info(`[INFO] ${message}`, context);
    }
  }

  warn(message: string, context?: LogContext) {
    const entry = this.createLogEntry('warn', message, context);
    this.storeLog(entry);
    
    console.warn(`[WARN] ${message}`, context);
  }

  error(error: Error | string, context?: LogContext) {
    const message = error instanceof Error ? error.message : error;
    const entry = this.createLogEntry('error', message, {
      ...context,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    this.storeLog(entry);
    this.sendToSupabase(entry);
    
    console.error(`[ERROR] ${message}`, context);
  }

  debug(message: string, context?: LogContext) {
    if (!this.isDev) return;
    
    const entry = this.createLogEntry('debug', message, context);
    this.storeLog(entry);
    console.debug(`[DEBUG] ${message}`, context);
  }

  // Get recent logs for debugging
  getRecentLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Clear stored logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for support
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience exports
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (error: Error | string, context?: LogContext) => logger.error(error, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);

// Performance monitoring
export const measurePerformance = (name: string, fn: () => Promise<any>) => {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      logDebug(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logError(`Performance error in ${name}`, { duration: `${duration.toFixed(2)}ms`, error });
      throw error;
    }
  };
};

// Monitor unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logError('Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled promise rejection', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
  });
}