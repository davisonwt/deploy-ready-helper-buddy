-- Create a function to award XP points for radio song plays
-- Awards XP to the song owner (DJ/sower) when their song is played on radio
-- Includes deduplication: only awards once per track per listener per day
CREATE OR REPLACE FUNCTION public.award_radio_play_xp(
  p_track_owner_id UUID,
  p_listener_id UUID,
  p_track_id UUID,
  p_points INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_already_awarded BOOLEAN;
BEGIN
  -- Check if XP was already awarded for this track+listener today
  SELECT EXISTS(
    SELECT 1 FROM radio_play_xp_log
    WHERE track_id = p_track_id
      AND listener_id = p_listener_id
      AND awarded_date = v_today
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RETURN FALSE; -- Already awarded today
  END IF;

  -- Log the award
  INSERT INTO radio_play_xp_log (track_id, listener_id, track_owner_id, awarded_date, points_awarded)
  VALUES (p_track_id, p_listener_id, p_track_owner_id, v_today, p_points);

  -- Award XP to track owner
  INSERT INTO user_points (user_id, total_points, level, points_to_next_level)
  VALUES (p_track_owner_id, p_points, 1, 50 - p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_points.total_points + p_points,
      level = FLOOR(SQRT((user_points.total_points + p_points)::NUMERIC / 50)) + 1,
      points_to_next_level = (
        (FLOOR(SQRT((user_points.total_points + p_points)::NUMERIC / 50)) + 2) ^ 2 * 50
      ) - (user_points.total_points + p_points),
      updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Create the deduplication log table
CREATE TABLE IF NOT EXISTS public.radio_play_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  listener_id UUID NOT NULL,
  track_owner_id UUID NOT NULL,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(track_id, listener_id, awarded_date)
);

-- Enable RLS
ALTER TABLE public.radio_play_xp_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP logs
CREATE POLICY "Users can view own xp logs"
  ON public.radio_play_xp_log FOR SELECT
  USING (listener_id = auth.uid() OR track_owner_id = auth.uid());

-- No direct inserts - only via the RPC function (SECURITY DEFINER)
