-- SECURITY FIX: Add SET search_path to remaining SECURITY DEFINER functions
-- This prevents schema injection attacks by ensuring functions only access the public schema
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix get_message_streak function
CREATE OR REPLACE FUNCTION public.get_message_streak(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  streak INTEGER;
BEGIN
  SELECT streak_days INTO streak
  FROM message_streaks
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(streak, 0);
END;
$$;

-- Fix update_message_streak function
CREATE OR REPLACE FUNCTION public.update_message_streak(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_streak INTEGER;
  last_date DATE;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get current streak
  SELECT streak_days, last_message_date INTO current_streak, last_date
  FROM message_streaks
  WHERE user_id = user_id_param;

  -- If no record exists, create one
  IF current_streak IS NULL THEN
    INSERT INTO message_streaks (user_id, streak_days, last_message_date)
    VALUES (user_id_param, 1, today_date)
    ON CONFLICT (user_id) DO UPDATE
    SET streak_days = 1, last_message_date = today_date, updated_at = NOW();
    RETURN 1;
  END IF;

  -- If last message was yesterday, increment streak
  IF last_date = today_date - INTERVAL '1 day' THEN
    UPDATE message_streaks
    SET streak_days = current_streak + 1,
        last_message_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_id_param;
    RETURN current_streak + 1;
  -- If last message was today, keep streak
  ELSIF last_date = today_date THEN
    RETURN current_streak;
  -- Otherwise, reset streak
  ELSE
    UPDATE message_streaks
    SET streak_days = 1,
        last_message_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_id_param;
    RETURN 1;
  END IF;
END;
$$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Fixed remaining SECURITY DEFINER functions to include SET search_path = ''public''';
END $$;

