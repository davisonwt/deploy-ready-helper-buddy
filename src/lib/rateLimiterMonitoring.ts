/**
 * Rate Limiter Monitoring and Alerting
 * 
 * This module provides monitoring and alerting capabilities for rate limiter failures.
 * It can be integrated with monitoring services like Sentry, Datadog, or custom logging.
 */

export interface RateLimiterFailureEvent {
  type: 'rate_limiter_failure';
  identifier: string;
  limitType: string;
  failMode: 'closed' | 'open';
  error: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonitoringConfig {
  enabled: boolean;
  alertThreshold?: number; // Failures per minute to trigger alert
  alertWindowMinutes?: number; // Time window for threshold
  sendToMonitoring?: (event: RateLimiterFailureEvent) => Promise<void>;
}

class RateLimiterMonitor {
  private failures: RateLimiterFailureEvent[] = [];
  private config: MonitoringConfig;
  private alertSent = false;

  constructor(config: MonitoringConfig = { enabled: true }) {
    this.config = {
      enabled: config.enabled ?? true,
      alertThreshold: config.alertThreshold ?? 10,
      alertWindowMinutes: config.alertWindowMinutes ?? 1,
      sendToMonitoring: config.sendToMonitoring,
    };

    // Clean up old failures periodically
    if (this.config.enabled) {
      setInterval(() => this.cleanupOldFailures(), 60000); // Every minute
    }
  }

  /**
   * Record a rate limiter failure event
   */
  recordFailure(event: Omit<RateLimiterFailureEvent, 'severity' | 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullEvent: RateLimiterFailureEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(event),
    };

    this.failures.push(fullEvent);

    // Send to monitoring service if configured
    if (this.config.sendToMonitoring) {
      this.config.sendToMonitoring(fullEvent).catch((error) => {
        console.error('Failed to send rate limiter failure to monitoring:', error);
      });
    }

    // Check if we should alert
    this.checkAlertThreshold();
  }

  /**
   * Determine severity based on failure type and mode
   */
  private determineSeverity(event: Omit<RateLimiterFailureEvent, 'severity' | 'timestamp'>): RateLimiterFailureEvent['severity'] {
    // Critical operations failing closed is high severity
    if (event.failMode === 'closed' && ['payment', 'credential_verification'].includes(event.limitType)) {
      return 'critical';
    }

    // Failures on critical operations are high severity
    if (['payment', 'credential_verification'].includes(event.limitType)) {
      return 'high';
    }

    // AI generation failures are medium severity
    if (event.limitType === 'ai_generation') {
      return 'medium';
    }

    // General failures are low severity
    return 'low';
  }

  /**
   * Check if failure rate exceeds threshold and send alert
   */
  private checkAlertThreshold(): void {
    if (!this.config.alertThreshold || this.alertSent) return;

    const windowStart = new Date(Date.now() - (this.config.alertWindowMinutes! * 60 * 1000));
    const recentFailures = this.failures.filter(
      (f) => new Date(f.timestamp) > windowStart
    );

    if (recentFailures.length >= this.config.alertThreshold!) {
      this.sendAlert(recentFailures);
      this.alertSent = true;

      // Reset alert flag after 5 minutes
      setTimeout(() => {
        this.alertSent = false;
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Send alert about high failure rate
   */
  private sendAlert(recentFailures: RateLimiterFailureEvent[]): void {
    const criticalFailures = recentFailures.filter((f) => f.severity === 'critical');
    const highFailures = recentFailures.filter((f) => f.severity === 'high');

    const alertMessage = {
      type: 'rate_limiter_alert',
      message: `Rate limiter failure rate exceeded threshold: ${recentFailures.length} failures in last ${this.config.alertWindowMinutes} minute(s)`,
      criticalCount: criticalFailures.length,
      highCount: highFailures.length,
      totalCount: recentFailures.length,
      recentFailures: recentFailures.slice(-10), // Last 10 failures
      timestamp: new Date().toISOString(),
    };

    console.error('🚨 RATE LIMITER ALERT:', JSON.stringify(alertMessage, null, 2));

    // In production, you might want to send this to your monitoring service
    // Example: sendToSentry(alertMessage);
    // Example: sendToDatadog(alertMessage);
  }

  /**
   * Clean up old failure records (keep last hour)
   */
  private cleanupOldFailures(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.failures = this.failures.filter(
      (f) => new Date(f.timestamp) > oneHourAgo
    );
  }

  /**
   * Get failure statistics
   */
  getStats(): {
    totalFailures: number;
    failuresByType: Record<string, number>;
    failuresBySeverity: Record<string, number>;
    recentFailures: RateLimiterFailureEvent[];
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = this.failures.filter((f) => new Date(f.timestamp) > oneHourAgo);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    recent.forEach((f) => {
      byType[f.limitType] = (byType[f.limitType] || 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    });

    return {
      totalFailures: recent.length,
      failuresByType: byType,
      failuresBySeverity: bySeverity,
      recentFailures: recent.slice(-20), // Last 20 failures
    };
  }
}

// Singleton instance
let monitorInstance: RateLimiterMonitor | null = null;

/**
 * Initialize rate limiter monitoring
 */
export function initializeRateLimiterMonitoring(config?: MonitoringConfig): void {
  if (!monitorInstance) {
    monitorInstance = new RateLimiterMonitor(config);
  }
}

/**
 * Get the monitoring instance
 */
export function getRateLimiterMonitor(): RateLimiterMonitor {
  if (!monitorInstance) {
    monitorInstance = new RateLimiterMonitor();
  }
  return monitorInstance;
}

/**
 * Record a rate limiter failure (convenience function)
 */
export function recordRateLimiterFailure(
  identifier: string,
  limitType: string,
  error: any,
  failClosed: boolean
): void {
  const monitor = getRateLimiterMonitor();
  monitor.recordFailure({
    type: 'rate_limiter_failure',
    identifier,
    limitType,
    failMode: failClosed ? 'closed' : 'open',
    error: error instanceof Error ? error.message : String(error),
  });
}

