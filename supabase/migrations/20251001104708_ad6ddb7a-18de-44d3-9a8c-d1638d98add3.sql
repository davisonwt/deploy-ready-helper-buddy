-- ============================================================================
-- SECURITY FIX: Remaining Database Functions Missing Search Path
-- ============================================================================

-- These are additional functions that need search_path hardening

CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.location IS DISTINCT FROM NEW.location
  ) THEN
    PERFORM log_security_event_enhanced(
      'sensitive_profile_data_updated',
      auth.uid(),
      jsonb_build_object('target_user', NEW.user_id),
      inet_client_addr(),
      'info'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_orchard_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  IF TG_OP = 'INSERT' AND NEW.profile_id IS NULL THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_affiliate_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.affiliates (user_id, referral_code)
  VALUES (NEW.id, UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_premium_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_category premium_room_category;
  max_participants_count integer;
BEGIN
  IF NEW.filled_pockets >= NEW.total_pockets AND 
     (OLD.filled_pockets IS NULL OR OLD.filled_pockets < OLD.total_pockets) THEN
    
    room_category := CASE 
      WHEN NEW.category ILIKE '%cooking%' OR NEW.category ILIKE '%nutrition%' THEN 'cooking_nutrition'
      WHEN NEW.category ILIKE '%diy%' OR NEW.category ILIKE '%home%' THEN 'diy_home'
      WHEN NEW.category ILIKE '%health%' OR NEW.category ILIKE '%natural%' THEN 'natural_health'
      WHEN NEW.category ILIKE '%business%' OR NEW.category ILIKE '%training%' THEN 'business_training'
      WHEN NEW.category ILIKE '%podcast%' OR NEW.category ILIKE '%interview%' THEN 'podcasts_interviews'
      WHEN NEW.category ILIKE '%marketing%' THEN 'marketing'
      ELSE 'general_courses'
    END;
    
    max_participants_count := NEW.total_pockets;
    
    INSERT INTO public.chat_rooms (name, description, room_type, is_premium, premium_category, orchard_id, required_bestowal_amount, access_description, max_participants, created_by)
    VALUES (NEW.title || ' - Live Session', 'Premium live session for ' || NEW.title || '. ' || COALESCE(NEW.description, ''),
            'group', true, room_category, NEW.id, NEW.pocket_price, 
            'Access granted to all contributors who bestowed at least $' || NEW.pocket_price || ' to this orchard.',
            max_participants_count, NEW.user_id);
    
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url)
    VALUES (NEW.user_id, 'premium_room_created', 'Premium Room Auto-Generated',
            'Your completed orchard "' || NEW.title || '" now has a premium live session room with ' || max_participants_count || ' spots available!',
            '/chatapp');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'orchards' AND TG_OP = 'INSERT' THEN
    IF (SELECT COUNT(*) FROM public.orchards WHERE user_id = NEW.user_id) = 1 THEN
      PERFORM public.award_achievement(NEW.user_id, 'first_orchard', 'Green Thumb', 'Created your first orchard!', 50, 'sprout');
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'bestowals' AND TG_OP = 'INSERT' THEN
    IF (SELECT COUNT(*) FROM public.bestowals WHERE bestower_id = NEW.bestower_id) = 1 THEN
      PERFORM public.award_achievement(NEW.bestower_id, 'first_bestowal', 'Generous Soul', 'Made your first contribution!', 25, 'heart');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_max_hosts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.radio_live_hosts 
      WHERE session_id = NEW.session_id AND is_active = true AND role IN ('main_host', 'co_host')) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 hosts per session exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_orchard_pockets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.orchard_type = 'full_value' THEN
    NEW.total_pockets = COALESCE(NEW.intended_pockets, 1);
  ELSE
    IF NEW.pocket_price > 0 THEN
      NEW.total_pockets = GREATEST(1, FLOOR((NEW.seed_value * 1.105) / NEW.pocket_price));
    ELSE
      NEW.total_pockets = 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    invoice_number text;
    year_month text;
    sequence_num integer;
BEGIN
    year_month := TO_CHAR(now(), 'YYYYMM');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number LIKE year_month || '-%' 
            THEN CAST(SUBSTRING(invoice_number FROM LENGTH(year_month) + 2) AS integer)
            ELSE 0 
        END
    ), 0) + 1
    INTO sequence_num
    FROM public.payment_invoices;
    
    invoice_number := year_month || '-' || LPAD(sequence_num::text, 4, '0');
    RETURN invoice_number;
END;
$$;

-- Log completion
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'all_security_functions_hardened', true);