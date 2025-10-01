-- ============================================================================
-- ABSOLUTE FINAL SECURITY HARDENING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.browse_public_rooms()
RETURNS TABLE(id uuid, name text, category text, participant_count bigint, is_premium boolean, premium_category premium_room_category)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cr.id, cr.name, cr.category,
    (SELECT COUNT(*) FROM chat_participants cp WHERE cp.room_id = cr.id AND cp.is_active = true) as participant_count,
    cr.is_premium, cr.premium_category
  FROM public.chat_rooms cr
  WHERE cr.is_active = true AND cr.room_type = 'group'::chat_room_type AND cr.is_premium = false
  ORDER BY participant_count DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.end_stream(stream_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams SET status = 'ended', ended_at = now(), updated_at = now()
  WHERE id = stream_id_param AND user_id = auth.uid() AND status = 'live';
  UPDATE public.stream_viewers SET is_active = false, last_seen = now() WHERE stream_id = stream_id_param;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    room_id UUID;
    room_name TEXT;
BEGIN
    SELECT cr.id INTO room_id FROM public.chat_rooms cr
    WHERE cr.room_type = 'direct'
    AND EXISTS (SELECT 1 FROM public.chat_participants cp1 WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND cp1.is_active = true)
    AND EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND cp2.is_active = true)
    AND (SELECT COUNT(*) FROM public.chat_participants cp WHERE cp.room_id = cr.id AND cp.is_active = true) = 2;

    IF room_id IS NULL THEN
        SELECT CONCAT(COALESCE(p1.display_name, p1.first_name, 'User'), ' & ', COALESCE(p2.display_name, p2.first_name, 'User'))
        INTO room_name FROM public.profiles p1, public.profiles p2
        WHERE p1.user_id = user1_id AND p2.user_id = user2_id;

        INSERT INTO public.chat_rooms (room_type, name, created_by, max_participants)
        VALUES ('direct', room_name, user1_id, NULL) RETURNING id INTO room_id;

        INSERT INTO public.chat_participants (room_id, user_id, is_moderator)
        VALUES (room_id, user1_id, false), (room_id, user2_id, false);
    END IF;
    RETURN room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trending_streams(limit_count integer DEFAULT 10)
RETURNS TABLE(id uuid, title text, description text, tags text[], viewer_count integer, total_views integer, started_at timestamp with time zone, user_id uuid, thumbnail_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT ls.id, ls.title, ls.description, ls.tags, ls.viewer_count, ls.total_views, ls.started_at, ls.user_id, ls.thumbnail_url
  FROM public.live_streams ls WHERE ls.status = 'live'
  ORDER BY (ls.viewer_count * 2 + ls.total_views) DESC LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(identifier text, limit_type text DEFAULT 'general'::text, max_attempts integer DEFAULT 10, time_window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
  time_threshold timestamp with time zone;
BEGIN
  time_threshold := now() - (time_window_minutes || ' minutes')::interval;
  SELECT COUNT(*) INTO attempt_count FROM public.billing_access_logs
  WHERE access_type LIKE 'rate_limit:' || limit_type || ':' || identifier AND created_at > time_threshold;
  
  IF attempt_count < max_attempts THEN
    INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success, ip_address)
    VALUES (auth.uid(), auth.uid(), 'rate_limit:' || limit_type || ':' || identifier, true, inet_client_addr());
    RETURN true;
  END IF;
  
  PERFORM log_security_event_enhanced('rate_limit_exceeded', auth.uid(),
    jsonb_build_object('identifier', identifier, 'limit_type', limit_type, 'attempts', attempt_count, 'max_attempts', max_attempts, 'time_window_minutes', time_window_minutes),
    inet_client_addr(), 'warning');
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_music_purchase_total(base_amount numeric DEFAULT 1.25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  platform_fee NUMERIC;
  sow2grow_fee NUMERIC;
  total_amount NUMERIC;
BEGIN
  platform_fee := base_amount * 0.10;
  sow2grow_fee := base_amount * 0.005;
  total_amount := base_amount + platform_fee + sow2grow_fee;
  RETURN jsonb_build_object('base_amount', base_amount, 'platform_fee', platform_fee, 'sow2grow_fee', sow2grow_fee, 'total_amount', total_amount);
END;
$$;

-- Complete security log
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'all_functions_search_path_secured_final', true);