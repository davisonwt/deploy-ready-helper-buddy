import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Enhanced security logging hook for monitoring and rate limiting
 */
export const useSecurityLogging = () => {
  const { toast } = useToast();

  const logAuthAttempt = async (email, success, userAgent = null) => {
    try {
      await supabase.rpc('log_authentication_attempt', {
        user_email: email,
        success: success,
        user_agent_param: userAgent || navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log authentication attempt:', error);
    }
  };

  const logSecurityEvent = async (eventType, details = {}, severity = 'info') => {
    try {
      await supabase.rpc('log_security_event_enhanced', {
        event_type: eventType,
        details: details,
        severity: severity
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const checkRateLimit = async (identifier, limitType = 'general', maxAttempts = 10, timeWindowMinutes = 15) => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit_enhanced', {
        identifier: identifier,
        limit_type: limitType,
        max_attempts: maxAttempts,
        time_window_minutes: timeWindowMinutes
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false;
      }

      if (!data) {
        toast({
          variant: "destructive",
          title: "Rate Limit Exceeded",
          description: `Too many attempts. Please wait ${timeWindowMinutes} minutes before trying again.`,
        });
        return false;
      }

      return data;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
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