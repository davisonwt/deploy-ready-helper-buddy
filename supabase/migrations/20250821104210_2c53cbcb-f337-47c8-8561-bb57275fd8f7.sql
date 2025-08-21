-- Security Enhancement Phase 1: Database Function Hardening
-- Add missing search_path settings to database functions for consistency

-- Update functions that don't have explicit search_path settings
CREATE OR REPLACE FUNCTION public.check_max_hosts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if adding this host would exceed the limit
  IF (SELECT COUNT(*) FROM public.radio_live_hosts 
      WHERE session_id = NEW.session_id 
      AND is_active = true 
      AND role IN ('main_host', 'co_host')) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 hosts per session exceeded';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_radio_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update stats when schedule status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.radio_stats (date, hour_slot, show_id, dj_id, total_listeners)
    VALUES (NEW.time_slot_date, NEW.hour_slot, NEW.show_id, NEW.dj_id, NEW.listener_count)
    ON CONFLICT (date, hour_slot) 
    DO UPDATE SET 
      total_listeners = GREATEST(public.radio_stats.total_listeners, NEW.listener_count),
      peak_listeners = GREATEST(public.radio_stats.peak_listeners, NEW.listener_count),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'video_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos 
      SET like_count = (
        SELECT COUNT(*) FROM public.video_likes 
        WHERE video_id = NEW.video_id
      )
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos 
      SET like_count = (
        SELECT COUNT(*) FROM public.video_likes 
        WHERE video_id = OLD.video_id
      )
      WHERE id = OLD.video_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'video_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos 
      SET comment_count = (
        SELECT COUNT(*) FROM public.video_comments 
        WHERE video_id = NEW.video_id
      )
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos 
      SET comment_count = (
        SELECT COUNT(*) FROM public.video_comments 
        WHERE video_id = OLD.video_id
      )
      WHERE id = OLD.video_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_orchard_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow all updates if no bestowals have been made yet
  IF OLD.filled_pockets = 0 THEN
    RETURN NEW;
  END IF;
  
  -- If bestowals exist, prevent reducing total_pockets below filled_pockets
  IF NEW.total_pockets < OLD.filled_pockets THEN
    RAISE EXCEPTION 'Cannot reduce total_pockets below the number of filled_pockets (%)' , OLD.filled_pockets;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text,
  user_id_param uuid DEFAULT auth.uid(),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address_param inet DEFAULT inet_client_addr(),
  severity text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enhanced security event logging with more details
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address
  ) VALUES (
    user_id_param,
    auth.uid(),
    severity || ':security_event:' || event_type,
    CASE WHEN severity IN ('error', 'critical') THEN false ELSE true END,
    ip_address_param
  );
  
  -- Log additional details if provided
  IF details != '{}'::jsonb THEN
    INSERT INTO public.billing_access_logs (
      user_id,
      accessed_by,
      access_type,
      success,
      ip_address
    ) VALUES (
      user_id_param,
      auth.uid(),
      'security_details:' || (details->>'event_details'),
      true,
      ip_address_param
    );
  END IF;
END;
$function$;

-- Function to monitor suspicious login attempts
CREATE OR REPLACE FUNCTION public.log_authentication_attempt(
  user_email text,
  success boolean,
  ip_address_param inet DEFAULT inet_client_addr(),
  user_agent_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log authentication attempts for security monitoring
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address,
    user_agent
  ) VALUES (
    NULL, -- Will be filled after successful auth
    NULL, -- Anonymous attempt
    'auth_attempt:' || user_email,
    success,
    ip_address_param,
    user_agent_param
  );
  
  -- If failed attempt, check for brute force patterns
  IF NOT success THEN
    PERFORM log_security_event_enhanced(
      'failed_login_attempt',
      NULL,
      jsonb_build_object(
        'email', user_email,
        'ip_address', ip_address_param::text,
        'timestamp', now()::text
      ),
      ip_address_param,
      'warning'
    );
  END IF;
END;
$function$;

-- Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  identifier text,
  limit_type text DEFAULT 'general',
  max_attempts integer DEFAULT 10,
  time_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count integer;
  time_threshold timestamp with time zone;
BEGIN
  time_threshold := now() - (time_window_minutes || ' minutes')::interval;
  
  -- Count recent attempts for this identifier and limit type
  SELECT COUNT(*) INTO attempt_count
  FROM public.billing_access_logs
  WHERE access_type LIKE 'rate_limit:' || limit_type || ':' || identifier
  AND created_at > time_threshold;
  
  -- If under limit, log this attempt and allow
  IF attempt_count < max_attempts THEN
    INSERT INTO public.billing_access_logs (
      user_id,
      accessed_by,
      access_type,
      success,
      ip_address
    ) VALUES (
      auth.uid(),
      auth.uid(),
      'rate_limit:' || limit_type || ':' || identifier,
      true,
      inet_client_addr()
    );
    RETURN true;
  END IF;
  
  -- Over limit - log violation and deny
  PERFORM log_security_event_enhanced(
    'rate_limit_exceeded',
    auth.uid(),
    jsonb_build_object(
      'identifier', identifier,
      'limit_type', limit_type,
      'attempts', attempt_count,
      'max_attempts', max_attempts,
      'time_window_minutes', time_window_minutes
    ),
    inet_client_addr(),
    'warning'
  );
  
  RETURN false;
END;
$function$;

-- Add triggers for enhanced security logging
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log profile changes for security monitoring
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_security_event_enhanced(
      'profile_update',
      NEW.user_id,
      jsonb_build_object(
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE key != 'updated_at' 
          AND to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
        ),
        'timestamp', now()::text
      ),
      inet_client_addr(),
      'info'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for profile security logging
DROP TRIGGER IF EXISTS profile_security_log_trigger ON public.profiles;
CREATE TRIGGER profile_security_log_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_changes();