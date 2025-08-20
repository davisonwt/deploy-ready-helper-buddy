-- SECURITY FIX: Complete remaining function search path issues
-- Fix all remaining functions that don't have proper search_path settings

CREATE OR REPLACE FUNCTION public.check_achievements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    room_id UUID;
    room_name TEXT;
BEGIN
    -- Check if a direct room already exists between these users
    SELECT cr.id INTO room_id
    FROM public.chat_rooms cr
    WHERE cr.room_type = 'direct'
    AND EXISTS (
        SELECT 1 FROM public.chat_participants cp1 
        WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND cp1.is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM public.chat_participants cp2 
        WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND cp2.is_active = true
    )
    AND (
        SELECT COUNT(*) FROM public.chat_participants cp 
        WHERE cp.room_id = cr.id AND cp.is_active = true
    ) = 2;

    -- If no room exists, create one
    IF room_id IS NULL THEN
        -- Create room name from user profiles
        SELECT CONCAT(
            COALESCE(p1.display_name, p1.first_name, 'User'), 
            ' & ', 
            COALESCE(p2.display_name, p2.first_name, 'User')
        ) INTO room_name
        FROM public.profiles p1, public.profiles p2
        WHERE p1.user_id = user1_id AND p2.user_id = user2_id;

        -- Create the room
        INSERT INTO public.chat_rooms (room_type, name, created_by, max_participants)
        VALUES ('direct', room_name, user1_id, NULL)
        RETURNING id INTO room_id;

        -- Add both users as participants
        INSERT INTO public.chat_participants (room_id, user_id, is_moderator)
        VALUES 
            (room_id, user1_id, false),
            (room_id, user2_id, false);
    END IF;

    RETURN room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_billing_info(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(billing_address_line1 text, billing_address_line2 text, billing_city text, billing_state text, billing_postal_code text, billing_country text, billing_phone text, billing_email text, billing_organization text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to access their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only access own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'read',
    inet_client_addr()
  );
  
  -- Return decrypted billing data (for now, since encryption isn't fully implemented)
  RETURN QUERY
  SELECT 
    ubi.billing_address_line1_encrypted as billing_address_line1,
    ubi.billing_address_line2_encrypted as billing_address_line2,
    ubi.billing_city_encrypted as billing_city,
    ubi.billing_state_encrypted as billing_state,
    ubi.billing_postal_code_encrypted as billing_postal_code,
    ubi.billing_country_encrypted as billing_country,
    ubi.billing_phone_encrypted as billing_phone,
    ubi.billing_email_encrypted as billing_email,
    ubi.billing_organization_encrypted as billing_organization
  FROM public.user_billing_info ubi
  WHERE ubi.user_id = target_user_id;
  
  -- Update last accessed timestamp
  UPDATE public.user_billing_info 
  SET last_accessed = now()
  WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_billing_info(target_user_id uuid, p_billing_address_line1 text DEFAULT NULL::text, p_billing_address_line2 text DEFAULT NULL::text, p_billing_city text DEFAULT NULL::text, p_billing_state text DEFAULT NULL::text, p_billing_postal_code text DEFAULT NULL::text, p_billing_country text DEFAULT NULL::text, p_billing_phone text DEFAULT NULL::text, p_billing_email text DEFAULT NULL::text, p_billing_organization text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to update their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'update',
    inet_client_addr()
  );
  
  -- Update or insert billing data
  INSERT INTO public.user_billing_info (
    user_id,
    billing_address_line1_encrypted,
    billing_address_line2_encrypted,
    billing_city_encrypted,
    billing_state_encrypted,
    billing_postal_code_encrypted,
    billing_country_encrypted,
    billing_phone_encrypted,
    billing_email_encrypted,
    billing_organization_encrypted,
    encryption_key_id
  ) VALUES (
    target_user_id,
    p_billing_address_line1,
    p_billing_address_line2,
    p_billing_city,
    p_billing_state,
    p_billing_postal_code,
    p_billing_country,
    p_billing_phone,
    p_billing_email,
    p_billing_organization,
    'default'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    billing_address_line1_encrypted = COALESCE(p_billing_address_line1, public.user_billing_info.billing_address_line1_encrypted),
    billing_address_line2_encrypted = COALESCE(p_billing_address_line2, public.user_billing_info.billing_address_line2_encrypted),
    billing_city_encrypted = COALESCE(p_billing_city, public.user_billing_info.billing_city_encrypted),
    billing_state_encrypted = COALESCE(p_billing_state, public.user_billing_info.billing_state_encrypted),
    billing_postal_code_encrypted = COALESCE(p_billing_postal_code, public.user_billing_info.billing_postal_code_encrypted),
    billing_country_encrypted = COALESCE(p_billing_country, public.user_billing_info.billing_country_encrypted),
    billing_phone_encrypted = COALESCE(p_billing_phone, public.user_billing_info.billing_phone_encrypted),
    billing_email_encrypted = COALESCE(p_billing_email, public.user_billing_info.billing_email_encrypted),
    billing_organization_encrypted = COALESCE(p_billing_organization, public.user_billing_info.billing_organization_encrypted),
    updated_at = now();
    
  -- Update the has_complete_billing_info flag in profiles
  UPDATE public.profiles 
  SET 
    has_complete_billing_info = (
      SELECT (
        billing_address_line1_encrypted IS NOT NULL AND 
        billing_city_encrypted IS NOT NULL AND 
        billing_postal_code_encrypted IS NOT NULL AND 
        billing_country_encrypted IS NOT NULL AND 
        billing_email_encrypted IS NOT NULL
      )
      FROM public.user_billing_info 
      WHERE user_id = target_user_id
    ),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_billing_info_status_from_secure_table()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;