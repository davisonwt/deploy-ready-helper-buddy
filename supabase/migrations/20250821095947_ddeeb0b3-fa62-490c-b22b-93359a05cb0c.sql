-- CRITICAL SECURITY FIX: Function Search Path Vulnerabilities
-- Fix remaining functions that lack search_path security setting

-- Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix validate_user_input function
DROP FUNCTION IF EXISTS public.validate_user_input();
CREATE OR REPLACE FUNCTION public.validate_user_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate and sanitize text fields
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.display_name IS NOT NULL THEN
      NEW.display_name := substr(trim(NEW.display_name), 1, 100);
      IF length(NEW.display_name) < 1 THEN
        RAISE EXCEPTION 'Display name cannot be empty';
      END IF;
    END IF;
    
    IF NEW.bio IS NOT NULL THEN
      NEW.bio := substr(trim(NEW.bio), 1, 500);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_billing_info_status function  
DROP FUNCTION IF EXISTS public.update_billing_info_status();
CREATE OR REPLACE FUNCTION public.update_billing_info_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if all required billing fields are present
  NEW.has_complete_billing_info = (
    NEW.billing_address_line1 IS NOT NULL AND 
    NEW.billing_city IS NOT NULL AND 
    NEW.billing_postal_code IS NOT NULL AND 
    NEW.billing_country IS NOT NULL AND 
    NEW.billing_email IS NOT NULL
  );
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Log security hardening completion
PERFORM log_security_event('function_search_path_hardened', auth.uid());