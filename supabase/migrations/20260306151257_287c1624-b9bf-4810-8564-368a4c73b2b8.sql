
-- CRITICAL FIX: Remove the overly permissive policy we just created
DROP POLICY IF EXISTS "Authenticated users can view profiles via public view" ON public.profiles;

-- Recreate the view WITHOUT security_invoker so it bypasses RLS (runs as definer)
-- This way the view can read profiles but only exposes safe columns
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  display_name,
  username,
  avatar_url,
  bio,
  location,
  country,
  created_at,
  updated_at,
  verification_status,
  is_chatapp_verified,
  website,
  tiktok_url,
  instagram_url,
  facebook_url,
  twitter_url,
  youtube_url,
  show_social_media
FROM public.profiles;

-- Grant access to the view for authenticated and anon roles
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
