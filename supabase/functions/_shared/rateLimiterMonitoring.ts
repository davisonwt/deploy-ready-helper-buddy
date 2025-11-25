/**
 * Rate Limiter Monitoring for Edge Functions
 * 
 * This module provides monitoring and alerting capabilities for rate limiter failures
 * in Supabase Edge Functions. It logs failures and can integrate with monitoring services.
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

/**
 * Determine severity level for rate limiter failure
 */
export function determineFailureSeverity(limitType: string, failClosed: boolean): RateLimiterFailureEvent['severity'] {
  // Critical operations failing closed is critical severity
  if (failClosed && ['payment', 'credential_verification'].includes(limitType)) {
    return 'critical';
  }
  
  // Payment and credential verification failures are high severity
  if (['payment', 'credential_verification'].includes(limitType)) {
    return 'high';
  }
  
  // AI generation failures are medium severity
  if (limitType === 'ai_generation') {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Record a rate limiter failure event
 * This function logs structured failure data for monitoring and alerting
 */
export function recordRateLimiterFailure(
  identifier: string,
  limitType: string,
  error: any,
  failClosed: boolean
): void {
  const severity = determineFailureSeverity(limitType, failClosed);
  
  const logData: RateLimiterFailureEvent = {
    type: 'rate_limiter_failure',
    identifier,
    limitType,
    failMode: failClosed ? 'closed' : 'open',
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    severity,
  };
  
  // Log to console for monitoring (structured JSON for easy parsing)
  console.error('🚨 Rate Limiter Failure:', JSON.stringify(logData));
  
  // For critical/high severity failures, log additional details
  if (severity === 'critical' || severity === 'high') {
    console.error(`CRITICAL: Rate limiter failure for ${limitType}`, {
      identifier,
      error: error instanceof Error ? error.stack : String(error),
      timestamp: logData.timestamp,
      failMode: logData.failMode,
    });
  }
  
  // In production, integrate with monitoring service:
  // - Sentry: Sentry.captureException(new Error('Rate limiter failure'), { extra: logData, level: 'warning' })
  // - Datadog: datadogLogs.logger.error('Rate limiter failure', logData)
  // - Custom: await fetch('/api/monitoring/rate-limiter-failure', { method: 'POST', body: JSON.stringify(logData) })
  
  // Example Sentry integration (uncomment and configure):
  /*
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(new Error(`Rate limiter failure: ${limitType}`), {
      extra: logData,
      level: severity === 'critical' ? 'error' : 'warning',
      tags: {
        limitType,
        failMode: logData.failMode,
        severity,
      },
    });
  }
  */
}

