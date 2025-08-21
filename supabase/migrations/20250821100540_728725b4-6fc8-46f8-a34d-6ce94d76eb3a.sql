-- FIX REMAINING FUNCTION SEARCH PATH VULNERABILITIES

-- Find and fix remaining functions without SET search_path TO 'public'
CREATE OR REPLACE FUNCTION public.check_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- First orchard creation
  IF TG_TABLE_NAME = 'orchards' AND TG_OP = 'INSERT' THEN
    -- Check if this is user's first orchard
    IF (SELECT COUNT(*) FROM public.orchards WHERE user_id = NEW.user_id) = 1 THEN
      PERFORM public.award_achievement(
        NEW.user_id, 
        'first_orchard', 
        'Green Thumb', 
        'Created your first orchard!', 
        50,
        'sprout'
      );
    END IF;
  END IF;

  -- First bestowal
  IF TG_TABLE_NAME = 'bestowals' AND TG_OP = 'INSERT' THEN
    -- Check if this is user's first bestowal
    IF (SELECT COUNT(*) FROM public.bestowals WHERE bestower_id = NEW.bestower_id) = 1 THEN
      PERFORM public.award_achievement(
        NEW.bestower_id, 
        'first_bestowal', 
        'Generous Soul', 
        'Made your first contribution!', 
        25,
        'heart'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_billing_info_status_from_secure_table()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the profiles table's has_complete_billing_info flag based on secure table data
  UPDATE public.profiles 
  SET 
    has_complete_billing_info = (
      NEW.billing_address_line1_encrypted IS NOT NULL AND 
      NEW.billing_city_encrypted IS NOT NULL AND 
      NEW.billing_postal_code_encrypted IS NOT NULL AND 
      NEW.billing_country_encrypted IS NOT NULL AND 
      NEW.billing_email_encrypted IS NOT NULL
    ),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;