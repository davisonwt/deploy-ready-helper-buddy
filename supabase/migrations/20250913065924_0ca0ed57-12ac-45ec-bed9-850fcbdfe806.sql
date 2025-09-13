-- Phase 1: Critical Database Security Fixes
-- Fix search path vulnerabilities in database functions

-- 1. Fix auto_generate_premium_room function
CREATE OR REPLACE FUNCTION public.auto_generate_premium_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  room_category premium_room_category;
  max_participants_count integer;
BEGIN
  -- Only proceed if orchard just became completed (filled_pockets >= total_pockets)
  IF NEW.filled_pockets >= NEW.total_pockets AND 
     (OLD.filled_pockets IS NULL OR OLD.filled_pockets < OLD.total_pockets) THEN
    
    -- Map orchard category to premium room category
    room_category := CASE 
      WHEN NEW.category ILIKE '%cooking%' OR NEW.category ILIKE '%nutrition%' THEN 'cooking_nutrition'
      WHEN NEW.category ILIKE '%diy%' OR NEW.category ILIKE '%home%' THEN 'diy_home'
      WHEN NEW.category ILIKE '%health%' OR NEW.category ILIKE '%natural%' THEN 'natural_health'
      WHEN NEW.category ILIKE '%business%' OR NEW.category ILIKE '%training%' THEN 'business_training'
      WHEN NEW.category ILIKE '%podcast%' OR NEW.category ILIKE '%interview%' THEN 'podcasts_interviews'
      WHEN NEW.category ILIKE '%marketing%' THEN 'marketing'
      ELSE 'general_courses'
    END;
    
    -- Calculate max participants (total pockets represents max attendees)
    max_participants_count := NEW.total_pockets;
    
    -- Create premium room automatically
    INSERT INTO public.chat_rooms (
      name,
      description,
      room_type,
      is_premium,
      premium_category,
      orchard_id,
      required_bestowal_amount,
      access_description,
      max_participants,
      created_by
    ) VALUES (
      NEW.title || ' - Live Session',
      'Premium live session for ' || NEW.title || '. ' || COALESCE(NEW.description, ''),
      'group',
      true,
      room_category,
      NEW.id,
      NEW.pocket_price, -- Minimum bestowal to join
      'Access granted to all contributors who bestowed at least $' || NEW.pocket_price || ' to this orchard.',
      max_participants_count,
      NEW.user_id
    );
    
    -- Log the auto-generation
    INSERT INTO public.user_notifications (
      user_id,
      type,
      title,
      message,
      action_url
    ) VALUES (
      NEW.user_id,
      'premium_room_created',
      'Premium Room Auto-Generated',
      'Your completed orchard "' || NEW.title || '" now has a premium live session room with ' || max_participants_count || ' spots available!',
      '/chatapp'
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    display_name,
    location,
    preferred_currency,
    timezone,
    country,
    verification_status
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(
        NEW.raw_user_meta_data ->> 'first_name',
        ' ',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    ),
    NEW.raw_user_meta_data ->> 'location',
    NEW.raw_user_meta_data ->> 'preferred_currency',
    NEW.raw_user_meta_data ->> 'timezone',
    NEW.raw_user_meta_data ->> 'country',
    'unverified'
  );
  RETURN NEW;
END;
$function$;

-- 3. Fix check_achievements function
CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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

-- 4. Fix sync_orchard_profile function
CREATE OR REPLACE FUNCTION public.sync_orchard_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- 5. Fix log_detailed_profile_access function
CREATE OR REPLACE FUNCTION public.log_detailed_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Log any access to sensitive profile fields during updates
    IF TG_OP = 'UPDATE' AND (
        OLD.first_name IS DISTINCT FROM NEW.first_name OR
        OLD.last_name IS DISTINCT FROM NEW.last_name OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.location IS DISTINCT FROM NEW.location
    ) THEN
        INSERT INTO public.profile_access_logs (
            accessed_profile_id, accessor_user_id, access_type, 
            access_reason, accessed_fields, session_info
        ) VALUES (
            NEW.user_id, auth.uid(), 'profile_update',
            'User updated their own profile', 
            ARRAY[
                CASE WHEN OLD.first_name IS DISTINCT FROM NEW.first_name THEN 'first_name' END,
                CASE WHEN OLD.last_name IS DISTINCT FROM NEW.last_name THEN 'last_name' END,
                CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'phone' END,
                CASE WHEN OLD.location IS DISTINCT FROM NEW.location THEN 'location' END
            ]::TEXT[],
            jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 6. Fix update_video_counts function  
CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 7. Fix validate_orchard_updates function
CREATE OR REPLACE FUNCTION public.validate_orchard_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 8. Fix update_radio_stats function
CREATE OR REPLACE FUNCTION public.update_radio_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 9. Fix monitor_sensitive_data_access function
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Log all access to sensitive tables
    IF TG_TABLE_NAME IN ('user_billing_info', 'payment_config_secure', 'payment_transactions') THEN
        PERFORM log_security_event_enhanced(
            'sensitive_data_access',
            auth.uid(),
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'timestamp', now()::text
            ),
            inet_client_addr(),
            'info'
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- 10. Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    invoice_number text;
    year_month text;
    sequence_num integer;
BEGIN
    -- Get current year and month
    year_month := TO_CHAR(now(), 'YYYYMM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number LIKE year_month || '-%' 
            THEN CAST(SUBSTRING(invoice_number FROM LENGTH(year_month) + 2) AS integer)
            ELSE 0 
        END
    ), 0) + 1
    INTO sequence_num
    FROM public.payment_invoices;
    
    -- Format as YYYYMM-XXXX
    invoice_number := year_month || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN invoice_number;
END;
$function$;

-- 11. Fix set_invoice_number function
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$function$;