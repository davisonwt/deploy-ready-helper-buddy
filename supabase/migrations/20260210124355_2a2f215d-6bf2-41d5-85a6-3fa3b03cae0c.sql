
-- ============================================================
-- FIX: Rewrite add_xp functions to use the EXISTING user_points table
-- The old functions referenced non-existent user_progress table
-- ============================================================

-- Drop old broken functions
DROP FUNCTION IF EXISTS public.add_xp(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.add_xp_to_current_user(INTEGER);

-- Recreate add_xp using user_points table
CREATE OR REPLACE FUNCTION public.add_xp(
  user_id_param UUID,
  amount INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
  new_points INTEGER;
  current_level INTEGER;
  new_level INTEGER;
  new_points_to_next INTEGER;
  level_up BOOLEAN := false;
BEGIN
  -- Get or create user_points record
  SELECT total_points, level INTO current_points, current_level
  FROM public.user_points
  WHERE user_id = user_id_param;

  IF current_points IS NULL THEN
    -- Create initial record
    INSERT INTO public.user_points (user_id, total_points, level, points_to_next_level)
    VALUES (user_id_param, amount, 1, 100)
    ON CONFLICT (user_id) DO UPDATE SET
      total_points = public.user_points.total_points + amount,
      updated_at = now();
    
    current_points := 0;
    current_level := 1;
  ELSE
    -- Update existing record
    UPDATE public.user_points
    SET total_points = total_points + amount,
        updated_at = now()
    WHERE user_id = user_id_param;
  END IF;

  new_points := current_points + amount;

  -- Level formula: level = floor(sqrt(total_points / 50)) + 1
  -- Level 1: 0-49, Level 2: 50-199, Level 3: 200-449, Level 4: 450-799, etc.
  new_level := GREATEST(1, FLOOR(SQRT(new_points::NUMERIC / 50)) + 1)::INTEGER;

  -- Calculate points needed for next level
  -- Next level threshold = 50 * (new_level)^2
  new_points_to_next := GREATEST(0, (50 * (new_level * new_level)) - new_points);

  -- Check if level increased
  IF new_level > COALESCE(current_level, 1) THEN
    level_up := true;
  END IF;

  -- Update level and points_to_next_level
  UPDATE public.user_points
  SET level = new_level,
      points_to_next_level = new_points_to_next,
      updated_at = now()
  WHERE user_id = user_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'old_xp', COALESCE(current_points, 0),
    'new_xp', new_points,
    'old_level', COALESCE(current_level, 1),
    'new_level', new_level,
    'level_up', level_up,
    'xp_gained', amount,
    'points_to_next_level', new_points_to_next
  );
END;
$$;

-- Recreate wrapper that uses auth.uid()
CREATE OR REPLACE FUNCTION public.add_xp_to_current_user(
  amount INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.add_xp(auth.uid(), amount);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_xp_to_current_user(INTEGER) TO authenticated;

-- ============================================================
-- AUTO-AWARD XP TRIGGERS for key user actions
-- ============================================================

-- 1. Award 50 XP when user creates a bestowal
CREATE OR REPLACE FUNCTION public.award_xp_on_bestowal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.bestower_id, 50);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_bestowal ON public.bestowals;
CREATE TRIGGER trg_award_xp_on_bestowal
  AFTER INSERT ON public.bestowals
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_bestowal();

-- 2. Award 10 XP when user follows someone
CREATE OR REPLACE FUNCTION public.award_xp_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.follower_id, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_follow ON public.followers;
CREATE TRIGGER trg_award_xp_on_follow
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_follow();

-- 3. Award 5 XP when user comments on memry
CREATE OR REPLACE FUNCTION public.award_xp_on_memry_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.user_id, 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_memry_comment ON public.memry_comments;
CREATE TRIGGER trg_award_xp_on_memry_comment
  AFTER INSERT ON public.memry_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_memry_comment();

-- 4. Award 3 XP when user likes/loves a memry post
CREATE OR REPLACE FUNCTION public.award_xp_on_memry_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.user_id, 3);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_memry_like ON public.memry_likes;
CREATE TRIGGER trg_award_xp_on_memry_like
  AFTER INSERT ON public.memry_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_memry_like();

-- 5. Award 20 XP when user creates an orchard
CREATE OR REPLACE FUNCTION public.award_xp_on_orchard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.user_id, 20);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_orchard ON public.orchards;
CREATE TRIGGER trg_award_xp_on_orchard
  AFTER INSERT ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_orchard();

-- 6. Award 15 XP when user uploads a product
CREATE OR REPLACE FUNCTION public.award_xp_on_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.sower_id, 15);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_product ON public.products;
CREATE TRIGGER trg_award_xp_on_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_product();

-- 7. Award 10 XP when user sends a chat message
CREATE OR REPLACE FUNCTION public.award_xp_on_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only award for user messages, not system messages
  IF NEW.message_type = 'text' AND NEW.sender_id IS NOT NULL THEN
    PERFORM public.add_xp(NEW.sender_id, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_chat ON public.chat_messages;
CREATE TRIGGER trg_award_xp_on_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_chat();

-- 8. Award 10 XP when user uploads a memry post
CREATE OR REPLACE FUNCTION public.award_xp_on_memry_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.user_id, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_memry_post ON public.memry_posts;
CREATE TRIGGER trg_award_xp_on_memry_post
  AFTER INSERT ON public.memry_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_memry_post();

-- 9. Award 5 XP when user votes for a song
CREATE OR REPLACE FUNCTION public.award_xp_on_song_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_xp(NEW.user_id, 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_song_vote ON public.song_votes;
CREATE TRIGGER trg_award_xp_on_song_vote
  AFTER INSERT ON public.song_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_song_vote();

-- ============================================================
-- Ensure existing users who have activity get retroactive XP
-- This seeds the user_points table with initial data for active users
-- ============================================================

-- Create user_points records for users who don't have one yet but have a profile
INSERT INTO public.user_points (user_id, total_points, level, points_to_next_level)
SELECT p.user_id, 0, 1, 50
FROM public.profiles p
LEFT JOIN public.user_points up ON up.user_id = p.user_id
WHERE up.id IS NULL AND p.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Award retroactive XP for bestowals (50 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.bestowal_xp, 0)
FROM (
  SELECT bestower_id, COUNT(*) * 50 AS bestowal_xp
  FROM public.bestowals
  GROUP BY bestower_id
) sub
WHERE up.user_id = sub.bestower_id AND sub.bestowal_xp > 0;

-- Award retroactive XP for follows (10 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.follow_xp, 0)
FROM (
  SELECT follower_id, COUNT(*) * 10 AS follow_xp
  FROM public.followers
  GROUP BY follower_id
) sub
WHERE up.user_id = sub.follower_id AND sub.follow_xp > 0;

-- Award retroactive XP for orchards (20 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.orchard_xp, 0)
FROM (
  SELECT user_id, COUNT(*) * 20 AS orchard_xp
  FROM public.orchards
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id AND sub.orchard_xp > 0;

-- Award retroactive XP for memry posts (10 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.post_xp, 0)
FROM (
  SELECT user_id, COUNT(*) * 10 AS post_xp
  FROM public.memry_posts
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id AND sub.post_xp > 0;

-- Award retroactive XP for memry comments (5 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.comment_xp, 0)
FROM (
  SELECT user_id, COUNT(*) * 5 AS comment_xp
  FROM public.memry_comments
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id AND sub.comment_xp > 0;

-- Award retroactive XP for memry likes (3 each)
UPDATE public.user_points up
SET total_points = total_points + COALESCE(sub.like_xp, 0)
FROM (
  SELECT user_id, COUNT(*) * 3 AS like_xp
  FROM public.memry_likes
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id AND sub.like_xp > 0;

-- Now recalculate levels for all users based on new XP totals
UPDATE public.user_points
SET 
  level = GREATEST(1, FLOOR(SQRT(total_points::NUMERIC / 50)) + 1)::INTEGER,
  points_to_next_level = GREATEST(0, (50 * POWER(GREATEST(1, FLOOR(SQRT(total_points::NUMERIC / 50)) + 1), 2)::INTEGER) - total_points),
  updated_at = now();
