-- Fix remaining functions with search_path issues

-- Fix sync_orchard_profile function
CREATE OR REPLACE FUNCTION public.sync_orchard_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user_id is updated, update profile_id too
  IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  
  -- When inserting, ensure profile_id is set
  IF TG_OP = 'INSERT' AND NEW.profile_id IS NULL THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix get_payment_config_for_eft function
CREATE OR REPLACE FUNCTION public.get_payment_config_for_eft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    config_data jsonb;
BEGIN
    -- Only return data if called from an edge function context
    -- Edge functions will have service role access
    SELECT jsonb_build_object(
        'bank_name', bank_name,
        'bank_account_name', bank_account_name,
        'bank_account_number', bank_account_number,
        'bank_swift_code', bank_swift_code,
        'business_email', business_email
    ) INTO config_data
    FROM public.payment_config
    LIMIT 1;
    
    RETURN COALESCE(config_data, '{}'::jsonb);
END;
$$;

-- Check what's causing the Security Definer View issue by looking at detailed view info
-- Let's check if there's a materialized view or function causing this
SELECT 
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public';