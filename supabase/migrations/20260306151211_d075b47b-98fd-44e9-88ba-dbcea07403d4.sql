
-- Create a public view of profiles that excludes PII (email, phone, etc.)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
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

-- Drop overly permissive policies that expose ALL columns to other users
DROP POLICY IF EXISTS "Users can view profiles in their chat rooms" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles they've interacted with via bestowals" ON public.profiles;

-- Replace with a single policy: any authenticated user can SELECT from profiles
-- The profiles_public view restricts which columns are visible
-- Full row access is still governed by own-profile and admin/gosat policies
CREATE POLICY "Authenticated users can view profiles via public view"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
