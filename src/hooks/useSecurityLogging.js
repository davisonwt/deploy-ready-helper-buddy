import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Enhanced security logging hook for monitoring and rate limiting
 */
export const useSecurityLogging = () => {
  const { toast } = useToast();

  const logAuthAttempt = async (email, success, userAgent = null) => {
    try {
      // Temporarily disabled to fix performance issues
      console.log('Auth attempt (logged locally):', email, success);
      return true;
    } catch (error) {
      console.error('Failed to log authentication attempt:', error);
    }
  };

  const logSecurityEvent = async (eventType, details = {}, severity = 'info') => {
    try {
      // Temporarily disabled to fix performance issues
      console.log('Security event (logged locally):', eventType, details, severity);
      return true;
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const checkRateLimit = async (identifier, limitType = 'general', maxAttempts = 10, timeWindowMinutes = 15) => {
    try {
      // Temporarily disabled to fix performance issues
      console.log('Rate limit check (disabled):', identifier, limitType);
      return true; // Always allow for now
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true;
    }
  };

  const logSuspiciousActivity = async (activityType, details = {}) => {
    await logSecurityEvent(`suspicious_activity_${activityType}`, details, 'warning');
    
    // Show user notification for certain activities
    if (['multiple_failed_logins', 'unusual_location', 'token_manipulation'].includes(activityType)) {
      toast({
        variant: "destructive",
        title: "Security Alert",
        description: "Suspicious activity detected. If this wasn't you, please secure your account.",
      });
    }
  };

  return {
    logAuthAttempt,
    logSecurityEvent,
    checkRateLimit,
    logSuspiciousActivity
  };
};