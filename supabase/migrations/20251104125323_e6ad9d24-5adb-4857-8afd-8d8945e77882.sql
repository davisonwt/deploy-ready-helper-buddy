-- Security Fix: Add SET search_path to SECURITY DEFINER functions
-- This prevents schema injection attacks by ensuring functions only access the public schema

-- Fix 1: grant_bootstrap_admin function
CREATE OR REPLACE FUNCTION public.grant_bootstrap_admin(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Grant admin role
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (target_user_id, 'admin', target_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Fix 2: update_playlist_stats function
CREATE OR REPLACE FUNCTION public.update_playlist_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update playlist track count and total duration
  UPDATE public.dj_playlists 
  SET 
    track_count = (
      SELECT COUNT(*) 
      FROM public.dj_playlist_tracks plt
      JOIN public.dj_music_tracks dmt ON plt.track_id = dmt.id  
      WHERE plt.playlist_id = 
        CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.playlist_id
          ELSE NEW.playlist_id 
        END
    ),
    total_duration_seconds = (
      SELECT COALESCE(SUM(dmt.duration_seconds), 0)
      FROM public.dj_playlist_tracks plt
      JOIN public.dj_music_tracks dmt ON plt.track_id = dmt.id
      WHERE plt.playlist_id = 
        CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.playlist_id  
          ELSE NEW.playlist_id
        END
    ),
    updated_at = now()
  WHERE id = 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.playlist_id
      ELSE NEW.playlist_id
    END;
    
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;