-- Security Fix 1: Add search_path to remaining functions that lack it

-- Fix auto_generate_premium_room function
CREATE OR REPLACE FUNCTION public.auto_generate_premium_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix sync_orchard_profile function
CREATE OR REPLACE FUNCTION public.sync_orchard_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix update_billing_info_status_from_secure_table function
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

-- Fix update_billing_info_status function
CREATE OR REPLACE FUNCTION public.update_billing_info_status()
RETURNS trigger
LANGUAGE plpgsql
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