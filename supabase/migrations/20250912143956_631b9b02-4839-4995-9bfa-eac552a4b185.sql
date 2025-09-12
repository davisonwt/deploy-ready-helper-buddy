-- Fix Profile Security: Restrict direct access and add secure functions

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

-- Create function to get profile data for admin moderation with audit logging
CREATE OR REPLACE FUNCTION public.get_profile_admin_data(profile_user_id uuid, access_reason text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  verification_status text,
  created_at timestamp with time zone,
  first_name text,
  last_name text,
  location text,
  phone text,
  country text,
  timezone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admin/gosat access
  IF NOT is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Require access reason for audit trail
  IF access_reason IS NULL OR LENGTH(trim(access_reason)) < 10 THEN
    RAISE EXCEPTION 'Access reason required (minimum 10 characters) for admin profile access'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Log admin access for audit trail
  INSERT INTO public.profile_access_logs (
    accessed_profile_id, accessor_user_id, access_type, 
    access_reason, accessed_fields
  ) VALUES (
    profile_user_id, auth.uid(), 'admin_profile_access', 
    access_reason, 
    ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 'verification_status', 
          'created_at', 'first_name', 'last_name', 'location', 'phone', 'country', 'timezone']
  );

  -- Return profile data with sensitive fields
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.verification_status::text,
    p.created_at,
    p.first_name,
    p.last_name,
    p.location,
    p.phone,
    p.country,
    p.timezone
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

-- More restrictive profile policies - NO direct SELECT access for other users' data
CREATE POLICY "Profiles are private by default" ON public.profiles
  FOR SELECT USING (false);

-- Users can only view their own complete profile
CREATE POLICY "Users can view own complete profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view profiles but with logging (use the secure function instead)
CREATE POLICY "Admins can view profiles for moderation" ON public.profiles
  FOR SELECT USING (is_admin_or_gosat(auth.uid()) AND auth.uid() IS NOT NULL);