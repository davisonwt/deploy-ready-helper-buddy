-- =============================================
-- Phase 2: Listener Reactions & Bestow System
-- =============================================

-- 1. Radio Reactions table
CREATE TABLE public.radio_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'clap', 'fire', 'pray', 'mind_blown')),
  segment_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.radio_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reactions"
ON public.radio_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view reactions"
ON public.radio_reactions FOR SELECT
USING (true);

-- Index for fast aggregation
CREATE INDEX idx_radio_reactions_session ON public.radio_reactions (session_id, reaction_type);
CREATE INDEX idx_radio_reactions_user ON public.radio_reactions (user_id, created_at);

-- 2. Listener Streaks table
CREATE TABLE public.radio_listener_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INT NOT NULL DEFAULT 1,
  longest_streak INT NOT NULL DEFAULT 1,
  last_listened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  total_listen_days INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.radio_listener_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all streaks"
ON public.radio_listener_streaks FOR SELECT
USING (true);

CREATE POLICY "Users can upsert their own streak"
ON public.radio_listener_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.radio_listener_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Add bestow/reaction counters to radio_schedule
ALTER TABLE public.radio_schedule
ADD COLUMN IF NOT EXISTS bestow_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS reaction_count INT DEFAULT 0;

-- 4. Add peak_listeners and total_reactions to radio_live_sessions
ALTER TABLE public.radio_live_sessions
ADD COLUMN IF NOT EXISTS peak_listeners INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reactions INT DEFAULT 0;

-- 5. Function to update listener streak
CREATE OR REPLACE FUNCTION public.update_listener_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last DATE;
  v_streak INT;
  v_longest INT;
  v_total INT;
BEGIN
  SELECT last_listened_at, current_streak, longest_streak, total_listen_days
  INTO v_last, v_streak, v_longest, v_total
  FROM radio_listener_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO radio_listener_streaks (user_id, current_streak, longest_streak, last_listened_at, total_listen_days)
    VALUES (p_user_id, 1, 1, CURRENT_DATE, 1);
    RETURN;
  END IF;

  -- Already listened today
  IF v_last = CURRENT_DATE THEN
    RETURN;
  END IF;

  -- Consecutive day
  IF v_last = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1;
    IF v_streak > v_longest THEN
      v_longest := v_streak;
    END IF;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE radio_listener_streaks
  SET current_streak = v_streak,
      longest_streak = v_longest,
      last_listened_at = CURRENT_DATE,
      total_listen_days = v_total + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;