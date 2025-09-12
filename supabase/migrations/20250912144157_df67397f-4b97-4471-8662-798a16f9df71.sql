-- Fix Profile Security: Fix overly permissive policies

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

-- Drop the overly permissive public policy that exposes sensitive data
DROP POLICY IF EXISTS "Public can view safe profile fields only" ON public.profiles;

-- Create secure function to get public profile data (safe fields only)
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  verification_status text,
  created_at timestamp with time zone,
  show_social_media boolean,
  website text,
  tiktok_url text,
  instagram_url text,
  facebook_url text,
  twitter_url text,
  youtube_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only return safe, non-sensitive fields
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.verification_status::text,
    p.created_at,
    p.show_social_media,
    CASE WHEN p.show_social_media = true THEN p.website ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.tiktok_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.instagram_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.facebook_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.twitter_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.youtube_url ELSE NULL END
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;