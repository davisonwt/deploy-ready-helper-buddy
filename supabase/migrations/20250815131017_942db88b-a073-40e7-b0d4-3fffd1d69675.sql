-- Fix remaining security definer functions with mutable search paths

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

-- Fix the remaining functions without security definer but with search path
CREATE OR REPLACE FUNCTION public.update_orchard_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Update filled_pockets and supporters count
  UPDATE public.orchards
  SET 
    filled_pockets = (
      SELECT COALESCE(SUM(pockets_count), 0)
      FROM public.bestowals
      WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
    ),
    supporters = (
      SELECT COUNT(DISTINCT bestower_id)
      FROM public.bestowals
      WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
    )
  WHERE id = NEW.orchard_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;