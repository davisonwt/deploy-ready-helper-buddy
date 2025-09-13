-- Continue fixing remaining database functions with search path vulnerabilities

-- 12. Fix encrypt_pii_data function
CREATE OR REPLACE FUNCTION public.encrypt_pii_data(data_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Return encrypted data using pgsodium with proper key derivation
  IF data_text IS NULL OR data_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use deterministic encryption for searchable fields
  RETURN encode(
    pgsodium.crypto_aead_det_encrypt(
      convert_to(data_text, 'utf8'),
      convert_to('billing_pii_context', 'utf8'),
      pgsodium.derive_key('billing_master_key', 1, 'billing_pii_context')
    ),
    'base64'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log encryption failure and return NULL for security
    PERFORM log_security_event('encryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM));
    RETURN NULL;
END;
$function$;

-- 13. Fix decrypt_pii_data function
CREATE OR REPLACE FUNCTION public.decrypt_pii_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Return decrypted data using pgsodium
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      decode(encrypted_data, 'base64'),
      convert_to('billing_pii_context', 'utf8'),
      pgsodium.derive_key('billing_master_key', 1, 'billing_pii_context')
    ),
    'utf8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log decryption failure and return NULL
    PERFORM log_security_event('decryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM));
    RETURN NULL;
END;
$function$;

-- 14. Fix award_achievement function
CREATE OR REPLACE FUNCTION public.award_achievement(user_id_param uuid, achievement_type_param text, title_param text, description_param text, points_param integer DEFAULT 0, icon_param text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if user already has this achievement
  IF NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = user_id_param AND achievement_type = achievement_type_param
  ) THEN
    -- Insert new achievement
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, points_awarded, icon)
    VALUES (user_id_param, achievement_type_param, title_param, description_param, points_param, icon_param);
    
    -- Update user points
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (user_id_param, points_param)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = public.user_points.total_points + points_param,
      level = CASE 
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 5
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 4
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 3
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 2
        ELSE 1
      END,
      points_to_next_level = CASE
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 0
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 1000 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 500 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 250 - (public.user_points.total_points + points_param)
        ELSE 100 - (public.user_points.total_points + points_param)
      END,
      updated_at = now();
  END IF;
END;
$function$;

-- 15. Fix log_admin_action function
CREATE OR REPLACE FUNCTION public.log_admin_action(action_type text, target_user_id uuid DEFAULT NULL::uuid, action_details jsonb DEFAULT '{}'::jsonb)
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
    target_user_id,
    auth.uid(),
    'admin_action:' || action_type,
    true,
    inet_client_addr()
  );
END;
$function$;

-- 16. Fix increment_video_views function
CREATE OR REPLACE FUNCTION public.increment_video_views(video_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.community_videos
  SET view_count = view_count + 1
  WHERE id = video_uuid;
END;
$function$;

-- 17. Create missing log_security_event function if it doesn't exist
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid, details jsonb DEFAULT '{}'::jsonb)
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

-- 18. Create missing log_security_event_enhanced function if it doesn't exist
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(event_type text, user_id_param uuid, details jsonb DEFAULT '{}'::jsonb, ip_address_param inet DEFAULT inet_client_addr(), severity text DEFAULT 'info')
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