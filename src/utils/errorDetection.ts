// Comprehensive Error Detection and Monitoring System
import { supabase } from '@/integrations/supabase/client';

interface WindowWithErrorDetector extends Window {
  errorDetector?: ErrorDetector;
}

interface SessionCheckInfo {
  hasSession: boolean;
  userId?: string;
  timestamp: string;
  checkNumber: number;
  [key: string]: unknown;
}

interface ErrorReport {
  type: string;
  details: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent: string;
}

class ErrorDetector {
  private errors: ErrorReport[] = [];
  private sessionChecks: number = 0;
  private lastSessionCheck: SessionCheckInfo | null = null;

  constructor() {
    this.init();
  }

  init() {
    // Monitor authentication state changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.log('🔐 AUTH_STATE_CHANGE', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });

      // Detect authentication issues
      if (!session && event !== 'SIGNED_OUT') {
        this.reportError('AUTH_SESSION_LOST', {
          event,
          timestamp: new Date().toISOString(),
          previousSession: this.lastSessionCheck
        });
      }
    });

    // Monitor network errors
    window.addEventListener('online', () => {
      this.log('🌐 NETWORK_ONLINE', { timestamp: new Date().toISOString() });
    });

    window.addEventListener('offline', () => {
      this.reportError('NETWORK_OFFLINE', { timestamp: new Date().toISOString() });
    });

    // Start periodic health checks
    this.startHealthChecks();

    // Make accessible for debugging
    if (typeof window !== 'undefined') {
      (window as WindowWithErrorDetector).errorDetector = this;
    }
  }

  async startHealthChecks() {
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  async performHealthCheck() {
    try {
      this.sessionChecks++;
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        this.reportError('SESSION_CHECK_FAILED', {
          error: sessionError.message,
          timestamp: new Date().toISOString(),
          checkNumber: this.sessionChecks
        });
        return;
      }

      this.lastSessionCheck = {
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString(),
        checkNumber: this.sessionChecks
      };

      if (session) {
        try {
          const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
          if (dbError) {
            this.reportError('DATABASE_CONNECTION_FAILED', {
              error: dbError.message,
              userId: session.user.id,
              timestamp: new Date().toISOString()
            });
            await supabase.auth.refreshSession();
          } else {
            this.log('✅ HEALTH_CHECK_PASSED', this.lastSessionCheck);
          }
        } catch (dbTestError) {
          this.reportError('DATABASE_TEST_EXCEPTION', {
            error: dbTestError instanceof Error ? dbTestError.message : String(dbTestError),
            userId: session.user.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      this.reportError('HEALTH_CHECK_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  reportError(type: string, details: Record<string, unknown>): ErrorReport {
    const errorReport: ErrorReport = {
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errors.push(errorReport);
    console.error(`🚨 ERROR_DETECTED: ${type}`, errorReport);

    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    window.dispatchEvent(new CustomEvent('errorDetected', {
      detail: errorReport
    }));

    return errorReport;
  }

  log(type: string, details: Record<string, unknown>) {
    console.log(`📋 LOG: ${type}`, details);
  }

  getHealthStatus() {
    return {
      sessionChecks: this.sessionChecks,
      lastSessionCheck: this.lastSessionCheck,
      errorCount: this.errors.length,
      latestErrors: this.errors.slice(-5)
    };
  }
}

// Create and export global instance
const errorDetector = new ErrorDetector();
export default errorDetector;