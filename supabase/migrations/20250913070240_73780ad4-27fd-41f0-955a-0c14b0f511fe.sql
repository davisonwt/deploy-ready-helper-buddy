-- Complete remaining function security fixes

-- Fix all remaining functions that need search_path setting
CREATE OR REPLACE FUNCTION public.get_ai_usage_today()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.ai_creations
    WHERE user_id = auth.uid()
    AND DATE(created_at) = CURRENT_DATE
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- This function is called by edge functions after successful AI generation
  -- The actual increment is handled by inserting into ai_creations table
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_safe_profile_fields()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Only these fields are safe for public viewing
  SELECT ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 'created_at', 'show_social_media', 'website', 'tiktok_url', 'instagram_url', 'facebook_url', 'twitter_url', 'youtube_url', 'verification_status']::text[];
$function$;

CREATE OR REPLACE FUNCTION public.reorder_hand_raise_queue(call_session_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  WITH ranked_participants AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY hand_raised_at ASC) as new_position
    FROM public.live_call_participants
    WHERE call_session_id = call_session_id_param
    AND hand_raised_at IS NOT NULL
    AND is_active = true
  )
  UPDATE public.live_call_participants
  SET queue_position = ranked_participants.new_position
  FROM ranked_participants
  WHERE public.live_call_participants.id = ranked_participants.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gosat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gosat')
  )
$function$;

CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_admin_secure(target_user_id uuid, access_reason text, requested_fields text[] DEFAULT NULL::text[])
RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, bio text, location text, created_at timestamp with time zone, first_name text, last_name text, phone text, country text, timezone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    profile_record RECORD;
    accessed_fields TEXT[];
BEGIN
    -- CRITICAL: Only allow admin/gosat access
    IF NOT is_admin_or_gosat(auth.uid()) THEN
        -- Log unauthorized access attempt
        INSERT INTO public.profile_access_logs (
            accessed_profile_id, accessor_user_id, access_type, 
            access_reason, accessed_fields
        ) VALUES (
            target_user_id, auth.uid(), 'unauthorized_attempt', 
            'BLOCKED: Non-admin attempted admin profile access', 
            ARRAY[]::TEXT[]
        );
        
        RAISE EXCEPTION 'SECURITY VIOLATION: Admin access required for detailed profile data'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Require access reason for audit trail
    IF access_reason IS NULL OR LENGTH(trim(access_reason)) < 10 THEN
        RAISE EXCEPTION 'Access reason required (minimum 10 characters) for admin profile access'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Rate limiting: max 20 profile views per hour per admin
    IF (SELECT COUNT(*) FROM public.profile_access_logs 
        WHERE accessor_user_id = auth.uid() 
        AND access_type = 'admin_view'
        AND created_at > now() - INTERVAL '1 hour') >= 20 THEN
        
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 20 admin profile views per hour'
            USING ERRCODE = 'too_many_requests';
    END IF;

    -- Get profile data
    SELECT * INTO profile_record
    FROM public.profiles p
    WHERE p.user_id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user: %', target_user_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Determine accessed fields based on request
    IF requested_fields IS NULL THEN
        accessed_fields := ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 
                                'location', 'created_at', 'first_name', 'last_name', 
                                'phone', 'country', 'timezone'];
    ELSE
        accessed_fields := requested_fields;
    END IF;

    -- MANDATORY AUDIT LOGGING
    INSERT INTO public.profile_access_logs (
        accessed_profile_id, accessor_user_id, access_type, 
        access_reason, accessed_fields, session_info
    ) VALUES (
        target_user_id, auth.uid(), 'admin_view', 
        access_reason, accessed_fields,
        jsonb_build_object(
            'function_called', 'get_profile_admin_secure',
            'timestamp', now()::text,
            'profile_exists', true
        )
    );

    -- Return profile data
    RETURN QUERY
    SELECT 
        profile_record.id,
        profile_record.user_id,
        profile_record.display_name,
        profile_record.avatar_url,
        profile_record.bio,
        profile_record.location,
        profile_record.created_at,
        profile_record.first_name,
        profile_record.last_name,
        profile_record.phone,
        profile_record.country,
        profile_record.timezone;
END;
$function$;