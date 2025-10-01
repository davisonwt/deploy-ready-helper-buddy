-- ============================================================================
-- FINAL SECURITY HARDENING: Last Remaining Functions
-- ============================================================================

-- Fix all remaining RPC functions that need search_path protection

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record record;
BEGIN
  SELECT * INTO request_record FROM public.chat_join_requests WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Join request not found or already processed'; END IF;
  
  IF NOT (
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = request_record.room_id AND created_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = request_record.room_id AND user_id = auth.uid() AND is_moderator = true AND is_active = true) OR
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve join request';
  END IF;
  
  UPDATE public.chat_join_requests SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = request_id;
  INSERT INTO public.chat_participants (room_id, user_id, is_moderator, is_active)
  VALUES (request_record.room_id, request_record.user_id, false, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true, kicked_at = NULL, kicked_by = NULL, kick_reason = NULL;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_radio_schedule_slot(schedule_id_param uuid, approver_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(approver_id_param, 'radio_admin'::app_role) OR has_role(approver_id_param, 'admin'::app_role) OR has_role(approver_id_param, 'gosat'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve radio schedule slots';
  END IF;
  
  UPDATE public.radio_schedule SET approval_status = 'approved', approved_by = approver_id_param, approved_at = now()
  WHERE id = schedule_id_param;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_radio_slot(schedule_id_param uuid, approval_notes_param text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_record RECORD;
  dj_record RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role) OR has_role(auth.uid(), 'radio_admin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve radio slots';
  END IF;
  
  SELECT * INTO schedule_record FROM public.radio_schedule WHERE id = schedule_id_param;
  SELECT * INTO dj_record FROM public.radio_djs WHERE id = schedule_record.dj_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Radio slot not found'; END IF;
  
  UPDATE public.radio_schedule SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now(), 
         approval_notes = approval_notes_param, requires_review = false WHERE id = schedule_id_param;
  
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url)
  VALUES (dj_record.user_id, 'radio_slot_approved', 'Radio Slot Approved! 🎉',
          format('Your radio slot for %s at %s:00 has been approved! You can now go live during your scheduled time.',
                 schedule_record.time_slot_date::text, LPAD(schedule_record.hour_slot::text, 2, '0')), '/grove-station');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_achievement(user_id_param uuid, achievement_type_param text, title_param text, description_param text, points_param integer DEFAULT 0, icon_param text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = user_id_param AND achievement_type = achievement_type_param) THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, points_awarded, icon)
    VALUES (user_id_param, achievement_type_param, title_param, description_param, points_param, icon_param);
    
    INSERT INTO public.user_points (user_id, total_points) VALUES (user_id_param, points_param)
    ON CONFLICT (user_id) DO UPDATE SET total_points = public.user_points.total_points + points_param,
      level = CASE 
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 5
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 4
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 3
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 2 ELSE 1 END,
      points_to_next_level = CASE
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 0
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 1000 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 500 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 250 - (public.user_points.total_points + points_param)
        ELSE 100 - (public.user_points.total_points + points_param) END,
      updated_at = now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_join_session_early(schedule_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  SELECT rs.start_time INTO start_time FROM public.radio_schedule rs WHERE rs.id = schedule_id_param;
  RETURN (current_time >= (start_time - INTERVAL '10 minutes') AND current_time <= start_time + INTERVAL '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_live_session(schedule_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
  session_token TEXT;
BEGIN
  SELECT id INTO session_id FROM public.radio_live_sessions
  WHERE schedule_id = schedule_id_param AND status IN ('waiting', 'live');
  
  IF session_id IS NULL THEN
    session_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.radio_live_sessions (schedule_id, session_token)
    VALUES (schedule_id_param, session_token) RETURNING id INTO session_id;
  END IF;
  RETURN session_id;
END;
$$;

-- Final security log
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'all_database_functions_secured_complete', true);