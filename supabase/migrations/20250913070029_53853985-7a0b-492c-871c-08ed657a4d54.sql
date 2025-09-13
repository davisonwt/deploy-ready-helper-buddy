-- Drop existing functions with parameter issues and recreate them properly

-- Drop the problematic functions first
DROP FUNCTION IF EXISTS public.log_security_event(text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event_enhanced(text, uuid, jsonb, inet, text);

-- Recreate log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address
  ) VALUES (
    user_id_param,
    auth.uid(),
    'security_event:' || event_type,
    true,
    inet_client_addr()
  );
END;
$function$;

-- Recreate log_security_event_enhanced function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT '{}'::jsonb, ip_address_param inet DEFAULT inet_client_addr(), severity text DEFAULT 'info')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address
  ) VALUES (
    user_id_param,
    auth.uid(),
    'security_event_' || severity || ':' || event_type,
    CASE WHEN severity = 'error' THEN false ELSE true END,
    ip_address_param
  );
END;
$function$;