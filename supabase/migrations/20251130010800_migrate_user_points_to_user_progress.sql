-- Migrate existing user_points data to user_progress table
-- This script is idempotent - safe to run multiple times

-- First, ensure user_progress table exists (in case migrations run out of order)
-- This is a no-op if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress') THEN
    CREATE TABLE public.user_progress (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      fruits INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_active DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Migrate data from user_points to user_progress
-- Uses INSERT ... ON CONFLICT to handle existing records gracefully
INSERT INTO public.user_progress (user_id, xp, level, fruits, streak, last_active, created_at, updated_at)
SELECT 
  up.user_id,
  up.total_points AS xp,
  up.level,
  0 AS fruits, -- Default to 0, can be updated later
  0 AS streak, -- Default to 0, can be updated later
  CURRENT_DATE AS last_active, -- Default to today
  up.created_at,
  up.updated_at
FROM public.user_points up
WHERE NOT EXISTS (
  -- Only insert if user_progress doesn't already have this user_id
  SELECT 1 FROM public.user_progress up2 WHERE up2.user_id = up.user_id
)
ON CONFLICT (user_id) DO UPDATE SET
  -- Update existing records with latest data from user_points
  xp = EXCLUDED.xp,
  level = EXCLUDED.level,
  updated_at = EXCLUDED.updated_at;

-- Create a function to sync user_points changes to user_progress in real-time
CREATE OR REPLACE FUNCTION public.sync_user_points_to_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user_progress when user_points changes
  INSERT INTO public.user_progress (user_id, xp, level, updated_at)
  VALUES (NEW.user_id, NEW.total_points, NEW.level, NEW.updated_at)
  ON CONFLICT (user_id) DO UPDATE SET
    xp = EXCLUDED.xp,
    level = EXCLUDED.level,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Create trigger to keep user_progress in sync with user_points
DROP TRIGGER IF EXISTS sync_points_to_progress ON public.user_points;
CREATE TRIGGER sync_points_to_progress
  AFTER INSERT OR UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_points_to_progress();

-- Create a function to sync user_progress changes back to user_points (optional)
-- This ensures bidirectional sync if you update progress directly
CREATE OR REPLACE FUNCTION public.sync_progress_to_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user_points when user_progress changes (only XP and level)
  INSERT INTO public.user_points (user_id, total_points, level, updated_at)
  VALUES (NEW.user_id, NEW.xp, NEW.level, NEW.updated_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    level = EXCLUDED.level,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync user_progress back to user_points
DROP TRIGGER IF EXISTS sync_progress_to_points ON public.user_progress;
CREATE TRIGGER sync_progress_to_points
  AFTER INSERT OR UPDATE OF xp, level ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_progress_to_user_points();

-- Log migration completion
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM public.user_progress;
  RAISE NOTICE 'Migration complete: % user progress records created/updated', migrated_count;
END $$;

