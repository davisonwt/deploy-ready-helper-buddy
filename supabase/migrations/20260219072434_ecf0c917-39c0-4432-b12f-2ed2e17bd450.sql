-- =============================================
-- Phase 3: DJ Dashboard & Gamification
-- =============================================

-- 1. DJ Badges table
CREATE TABLE public.radio_dj_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_id UUID NOT NULL REFERENCES public.radio_djs(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '🏅',
  badge_description TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dj_id, badge_type)
);

ALTER TABLE public.radio_dj_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view DJ badges"
ON public.radio_dj_badges FOR SELECT
USING (true);

CREATE POLICY "System can insert badges"
ON public.radio_dj_badges FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_dj_badges_dj ON public.radio_dj_badges (dj_id);

-- 2. Add broadcast history columns to radio_live_sessions
ALTER TABLE public.radio_live_sessions
ADD COLUMN IF NOT EXISTS total_bestow_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS most_clapped_segment INT;

-- 3. Function to check and award DJ badges
CREATE OR REPLACE FUNCTION public.check_dj_badges(p_dj_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_show_count INT;
  v_total_listeners INT;
  v_total_bestow NUMERIC;
BEGIN
  -- Count completed shows
  SELECT COUNT(*) INTO v_show_count
  FROM radio_live_sessions
  WHERE schedule_id IN (
    SELECT id FROM radio_schedule WHERE dj_id = p_dj_id
  ) AND status = 'ended';

  -- First Broadcast badge
  IF v_show_count >= 1 THEN
    INSERT INTO radio_dj_badges (dj_id, badge_type, badge_name, badge_icon, badge_description)
    VALUES (p_dj_id, 'first_broadcast', 'First Broadcast', '🎙️', 'Completed your first broadcast!')
    ON CONFLICT (dj_id, badge_type) DO NOTHING;
  END IF;

  -- Master Mixer (5 shows)
  IF v_show_count >= 5 THEN
    INSERT INTO radio_dj_badges (dj_id, badge_type, badge_name, badge_icon, badge_description)
    VALUES (p_dj_id, 'master_mixer', 'Master Mixer', '🎛️', 'Completed 5 broadcasts')
    ON CONFLICT (dj_id, badge_type) DO NOTHING;
  END IF;

  -- Veteran (25 shows)
  IF v_show_count >= 25 THEN
    INSERT INTO radio_dj_badges (dj_id, badge_type, badge_name, badge_icon, badge_description)
    VALUES (p_dj_id, 'veteran_broadcaster', 'Veteran Broadcaster', '👑', 'Completed 25 broadcasts')
    ON CONFLICT (dj_id, badge_type) DO NOTHING;
  END IF;

  -- 100 Listeners badge
  SELECT COALESCE(SUM(peak_listeners), 0) INTO v_total_listeners
  FROM radio_live_sessions
  WHERE schedule_id IN (
    SELECT id FROM radio_schedule WHERE dj_id = p_dj_id
  );

  IF v_total_listeners >= 100 THEN
    INSERT INTO radio_dj_badges (dj_id, badge_type, badge_name, badge_icon, badge_description)
    VALUES (p_dj_id, 'crowd_puller', 'Crowd Puller', '🎪', 'Reached 100+ total listeners')
    ON CONFLICT (dj_id, badge_type) DO NOTHING;
  END IF;

  -- Top Bestowed badge
  SELECT COALESCE(SUM(total_bestow_amount), 0) INTO v_total_bestow
  FROM radio_live_sessions
  WHERE schedule_id IN (
    SELECT id FROM radio_schedule WHERE dj_id = p_dj_id
  );

  IF v_total_bestow >= 100 THEN
    INSERT INTO radio_dj_badges (dj_id, badge_type, badge_name, badge_icon, badge_description)
    VALUES (p_dj_id, 'top_bestowed', 'Seed Magnet', '🌱', 'Received 100+ seeds in bestowals')
    ON CONFLICT (dj_id, badge_type) DO NOTHING;
  END IF;
END;
$$;