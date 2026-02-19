
-- Function to award XP for radio play (deduplicated daily)
CREATE OR REPLACE FUNCTION public.award_radio_play_xp(p_track_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.radio_play_xp_log (listener_id, track_id, play_date)
  VALUES (v_user_id, p_track_id, CURRENT_DATE)
  ON CONFLICT (listener_id, track_id, play_date) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.user_points (user_id, total_points, level, points_to_next_level)
    VALUES (v_user_id, 10, 1, 90)
    ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_points.total_points + 10,
        level = GREATEST(1, floor(sqrt((user_points.total_points + 10)::numeric / 50)) + 1)::int,
        points_to_next_level = (50 * power(GREATEST(1, floor(sqrt((user_points.total_points + 10)::numeric / 50)) + 1)::int, 2)) - (user_points.total_points + 10),
        updated_at = now();
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
