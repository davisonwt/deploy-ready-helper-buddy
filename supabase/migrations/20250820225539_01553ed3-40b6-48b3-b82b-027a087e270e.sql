-- Fix remaining function search path vulnerabilities

-- Update all remaining functions to have proper search paths
CREATE OR REPLACE FUNCTION public.get_current_radio_show()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'schedule_id', rs.id,
    'show_name', sh.show_name,
    'dj_name', dj.dj_name,
    'dj_avatar', dj.avatar_url,
    'category', sh.category,
    'description', sh.description,
    'start_time', rs.start_time,
    'end_time', rs.end_time,
    'status', rs.status,
    'listener_count', rs.listener_count,
    'is_live', (rs.status = 'live')
  )
  FROM public.radio_schedule rs
  JOIN public.radio_shows sh ON rs.show_id = sh.id
  JOIN public.radio_djs dj ON rs.dj_id = dj.id
  WHERE rs.start_time <= now() 
    AND rs.end_time > now() 
    AND rs.status IN ('scheduled', 'live')
  ORDER BY rs.start_time DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_radio_schedule_for_date(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(hour_slot integer, schedule_id uuid, show_name text, dj_name text, dj_avatar text, category show_category, status text, is_live boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    rs.hour_slot,
    rs.id as schedule_id,
    COALESCE(sh.show_name, 'AI Radio Host') as show_name,
    COALESCE(dj.dj_name, 'Grove AI') as dj_name,
    COALESCE(dj.avatar_url, '/ai-dj-avatar.png') as dj_avatar,
    COALESCE(sh.category, 'ai_generated'::show_category) as category,
    COALESCE(rs.status, 'ai_backup') as status,
    COALESCE((rs.status = 'live'), false) as is_live
  FROM generate_series(0, 23) as hour_slot
  LEFT JOIN public.radio_schedule rs ON rs.time_slot_date = target_date AND rs.hour_slot = hour_slot.hour_slot
  LEFT JOIN public.radio_shows sh ON rs.show_id = sh.id
  LEFT JOIN public.radio_djs dj ON rs.dj_id = dj.id
  ORDER BY hour_slot;
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_premium_room_access(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM chat_rooms cr
    JOIN bestowals b ON b.orchard_id = cr.orchard_id
    WHERE cr.id = room_id_param
    AND b.bestower_id = user_id_param
    AND b.payment_status = 'completed'
    AND b.amount >= cr.required_bestowal_amount
  ) OR EXISTS (
    SELECT 1 
    FROM chat_rooms cr
    WHERE cr.id = room_id_param
    AND cr.created_by = user_id_param
  );
$$;

-- Fix key RLS policies that should require authentication
DROP POLICY IF EXISTS "Everyone can view schedule" ON public.radio_schedule;
CREATE POLICY "Authenticated users can view schedule" ON public.radio_schedule
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view active shows" ON public.radio_shows;
CREATE POLICY "Authenticated users can view active shows" ON public.radio_shows
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view station config" ON public.radio_station_config;
CREATE POLICY "Authenticated users can view station config" ON public.radio_station_config
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view stats" ON public.radio_stats;
CREATE POLICY "Authenticated users can view stats" ON public.radio_stats
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view live hosts" ON public.radio_live_hosts;
CREATE POLICY "Authenticated users can view live hosts" ON public.radio_live_hosts
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view all DJs" ON public.radio_djs;
CREATE POLICY "Authenticated users can view active DJs" ON public.radio_djs
FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Secure video comments to require authentication
DROP POLICY IF EXISTS "Users can view all comments" ON public.video_comments;
CREATE POLICY "Authenticated users can view all comments" ON public.video_comments
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view all likes" ON public.video_likes;
CREATE POLICY "Authenticated users can view all likes" ON public.video_likes
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add stronger input validation trigger for critical user data
CREATE OR REPLACE FUNCTION public.validate_user_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate and sanitize text fields
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.display_name IS NOT NULL THEN
      NEW.display_name := substr(trim(NEW.display_name), 1, 100);
      IF length(NEW.display_name) < 1 THEN
        RAISE EXCEPTION 'Display name cannot be empty';
      END IF;
    END IF;
    
    IF NEW.bio IS NOT NULL THEN
      NEW.bio := substr(trim(NEW.bio), 1, 500);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_input_trigger ON public.profiles;
CREATE TRIGGER validate_user_input_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_input();