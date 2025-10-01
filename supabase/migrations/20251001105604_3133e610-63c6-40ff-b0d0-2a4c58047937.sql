-- ============================================================================
-- COMPLETE FINAL SECURITY FIX - Last 5 Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_dj_info(dj_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, dj_name text, avatar_url text, bio text, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rd.id, rd.dj_name, rd.avatar_url, rd.bio, rd.is_active
  FROM public.radio_djs rd
  WHERE rd.is_active = true AND (dj_id_param IS NULL OR rd.id = dj_id_param);
$$;

CREATE OR REPLACE FUNCTION public.get_radio_schedule_for_date(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(hour_slot integer, schedule_id uuid, show_name text, dj_name text, dj_avatar text, category show_category, status text, is_live boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gs.hour_slot, rs.id as schedule_id,
    COALESCE(sh.show_name, 'AI Radio Host') as show_name,
    COALESCE(dj.dj_name, 'Grove AI') as dj_name,
    COALESCE(dj.avatar_url, '/ai-dj-avatar.png') as dj_avatar,
    COALESCE(sh.category, 'ai_generated'::show_category) as category,
    COALESCE(rs.status, 'ai_backup') as status,
    COALESCE((rs.status = 'live'), false) as is_live
  FROM generate_series(0, 23) as gs(hour_slot)
  LEFT JOIN public.radio_schedule rs ON rs.time_slot_date = target_date AND rs.hour_slot = gs.hour_slot
  LEFT JOIN public.radio_shows sh ON rs.show_id = sh.id
  LEFT JOIN public.radio_djs dj ON rs.dj_id = dj.id
  ORDER BY gs.hour_slot;
$$;

CREATE OR REPLACE FUNCTION public.get_current_radio_show()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'schedule_id', rs.id, 'show_name', sh.show_name, 'dj_name', dj.dj_name,
    'dj_avatar', dj.avatar_url, 'category', sh.category, 'description', sh.description,
    'start_time', rs.start_time, 'end_time', rs.end_time, 'status', rs.status,
    'listener_count', rs.listener_count, 'is_live', (rs.status = 'live')
  )
  FROM public.radio_schedule rs
  JOIN public.radio_shows sh ON rs.show_id = sh.id
  JOIN public.radio_djs dj ON rs.dj_id = dj.id
  WHERE rs.start_time <= now() AND rs.end_time > now() AND rs.status IN ('scheduled', 'live')
  ORDER BY rs.start_time DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_gifts(room_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE(id uuid, giver_name text, giver_avatar text, receiver_name text, receiver_avatar text, amount numeric, currency text, message text, created_at timestamp with time zone, payment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cg.id, COALESCE(giver_p.display_name, giver_p.first_name, 'Anonymous') as giver_name,
    giver_p.avatar_url as giver_avatar,
    COALESCE(receiver_p.display_name, receiver_p.first_name, 'Anonymous') as receiver_name,
    receiver_p.avatar_url as receiver_avatar,
    cg.amount, cg.currency, cg.message, cg.created_at, cg.payment_status
  FROM public.clubhouse_gifts cg
  JOIN public.profiles giver_p ON cg.giver_id = giver_p.user_id
  JOIN public.profiles receiver_p ON cg.receiver_id = receiver_p.user_id
  WHERE cg.room_id = room_id_param AND cg.payment_status = 'completed'
  ORDER BY cg.created_at DESC LIMIT limit_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_today(user_id_param uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := COALESCE(user_id_param, auth.uid());
  IF target_user_id IS NULL THEN RETURN 0; END IF;
  RETURN (SELECT COUNT(*) FROM public.ai_creations WHERE user_id = target_user_id AND DATE(created_at) = CURRENT_DATE);
END;
$$;

-- Final complete security log
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'complete_security_hardening_finished', true);