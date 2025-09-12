-- Fix Profile Security: Drop existing function and recreate with proper security

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
DROP FUNCTION IF EXISTS public.get_profile_admin_data(uuid, text);

-- Drop the overly permissive public policy
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

-- Create audit logging table for profile access
CREATE TABLE IF NOT EXISTS public.profile_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_profile_id uuid NOT NULL,
  accessor_user_id uuid,
  access_type text NOT NULL,
  access_reason text,
  accessed_fields text[],
  session_info jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view profile access logs" ON public.profile_access_logs
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Profiles are private by default" ON public.profiles;

-- Create more restrictive profile policies - NO direct SELECT access for other users' data
CREATE POLICY "Profiles are private by default" ON public.profiles
  FOR SELECT USING (false);

-- Users can only view their own complete profile (this policy should already exist)
-- We keep the existing "Users can view own complete profile" policy

-- Admins can view profiles but should use the secure function instead
-- We keep the existing "Admins can view profiles for moderation" policy