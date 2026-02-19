
CREATE OR REPLACE FUNCTION public.get_current_radio_show()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    'broadcast_mode', rs.broadcast_mode,
    'status', rs.status,
    'listener_count', rs.listener_count,
    'is_live', (rs.status = 'live' OR rs.broadcast_mode = 'pre_recorded')
  )
  FROM public.radio_schedule rs
  JOIN public.radio_shows sh ON rs.show_id = sh.id
  JOIN public.radio_djs dj ON rs.dj_id = dj.id
  WHERE rs.start_time <= now() AND rs.end_time > now() AND rs.status IN ('scheduled', 'live')
  ORDER BY rs.start_time DESC LIMIT 1;
$$;
