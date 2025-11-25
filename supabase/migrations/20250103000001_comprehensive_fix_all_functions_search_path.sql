-- COMPREHENSIVE SECURITY FIX: Ensure ALL SECURITY DEFINER functions have search_path set
-- This migration fixes all known functions that might be missing search_path
-- Run this migration to ensure complete security coverage

-- Fix get_message_streak (if not already fixed)
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

-- Fix update_message_streak (if not already fixed)
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

-- Fix update_follower_count (if not already fixed)
CREATE OR REPLACE FUNCTION public.update_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'followers' THEN
    IF TG_OP = 'INSERT' THEN
      -- Insert notification
      INSERT INTO follower_notifications (user_id, follower_id, source_type, source_id)
      VALUES (NEW.following_id, NEW.follower_id, NEW.source_type, NEW.source_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'product_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE products SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'orchard_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE orchards SET like_count = like_count + 1 WHERE id = NEW.orchard_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE orchards SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.orchard_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix get_ai_usage_today
CREATE OR REPLACE FUNCTION public.get_ai_usage_today()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.ai_creations
    WHERE user_id = auth.uid()
    AND DATE(created_at) = CURRENT_DATE
  );
END;
$$;

-- Fix increment_ai_usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- This function is called by edge functions after successful AI generation
  -- The actual increment is handled by inserting into ai_creations table
  RETURN;
END;
$$;

-- Fix calculate_music_purchase_total
CREATE OR REPLACE FUNCTION public.calculate_music_purchase_total(base_amount NUMERIC DEFAULT 1.25)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  platform_fee NUMERIC;
  sow2grow_fee NUMERIC;
  total_amount NUMERIC;
BEGIN
  platform_fee := base_amount * 0.10; -- 10%
  sow2grow_fee := base_amount * 0.005; -- 0.5%
  total_amount := base_amount + platform_fee + sow2grow_fee;
  
  RETURN jsonb_build_object(
    'base_amount', base_amount,
    'platform_fee', platform_fee,
    'sow2grow_fee', sow2grow_fee,
    'total_amount', total_amount
  );
END;
$$;

-- Fix reorder_hand_raise_queue
CREATE OR REPLACE FUNCTION public.reorder_hand_raise_queue(call_session_id_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  WITH ranked_participants AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY hand_raised_at ASC) as new_position
    FROM public.live_call_participants
    WHERE call_session_id = call_session_id_param
    AND hand_raised_at IS NOT NULL
    AND is_active = true
  )
  UPDATE public.live_call_participants
  SET queue_position = ranked_participants.new_position
  FROM ranked_participants
  WHERE public.live_call_participants.id = ranked_participants.id;
END;
$$;

-- Fix increment_orchard_views
CREATE OR REPLACE FUNCTION public.increment_orchard_views(orchard_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.orchards
  SET views = views + 1
  WHERE id = orchard_uuid;
END;
$$;

-- Fix update_user_points (if it exists without search_path)
-- Note: This function may have been updated in later migrations, but we'll ensure it's secure
CREATE OR REPLACE FUNCTION public.update_user_points(user_id_param UUID, points_param INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_points RECORD;
BEGIN
  -- Get or create user points record
  SELECT * INTO user_points
  FROM public.user_points
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, total_points, level, points_to_next_level)
    VALUES (user_id_param, points_param, 1, 100 - points_param);
  ELSE
    UPDATE public.user_points
    SET 
      total_points = total_points + points_param,
      level = CASE
        WHEN (user_points.total_points + points_param) >= 1000 THEN 4
        WHEN (user_points.total_points + points_param) >= 500 THEN 3
        WHEN (user_points.total_points + points_param) >= 250 THEN 2
        WHEN (user_points.total_points + points_param) >= 100 THEN 1
        ELSE 0
      END,
      points_to_next_level = CASE
        WHEN (user_points.total_points + points_param) >= 1000 THEN 0
        WHEN (user_points.total_points + points_param) >= 500 THEN 1000 - (user_points.total_points + points_param)
        WHEN (user_points.total_points + points_param) >= 250 THEN 500 - (user_points.total_points + points_param)
        WHEN (user_points.total_points + points_param) >= 100 THEN 250 - (user_points.total_points + points_param)
        ELSE 100 - (user_points.total_points + points_param)
      END,
      updated_at = now();
  END IF;
END;
$$;

-- Fix create_affiliate_on_signup
CREATE OR REPLACE FUNCTION public.create_affiliate_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.affiliates (user_id, referral_code)
  VALUES (NEW.id, UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8)));
  RETURN NEW;
END;
$$;

-- Fix increment_product_play_count
CREATE OR REPLACE FUNCTION public.increment_product_play_count(product_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE products 
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$;

-- Fix increment_product_download_count
CREATE OR REPLACE FUNCTION public.increment_product_download_count(product_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE products 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$;

-- Verify all functions now have search_path
DO $$
DECLARE
    func_count INTEGER;
    missing_count INTEGER;
BEGIN
    -- Count total SECURITY DEFINER functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true;
    
    -- Count functions missing search_path
    SELECT COUNT(*) INTO missing_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%search_path =%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%search_path TO%';
    
    IF missing_count > 0 THEN
        RAISE WARNING 'Found % SECURITY DEFINER functions without search_path (out of % total). Run the verification query to identify them.', missing_count, func_count;
    ELSE
        RAISE NOTICE '✅ All % SECURITY DEFINER functions have search_path set correctly!', func_count;
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive search_path security fix completed. All known functions have been updated.';
END $$;

