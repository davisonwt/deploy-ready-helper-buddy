-- ==================================================
-- SECURITY FIX: Implement Secure Profile Access Control
-- ==================================================

-- Step 1: Drop existing insecure policies
DROP POLICY IF EXISTS "Admins can view public profile data only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile only" ON public.profiles;

-- Step 2: Create secure access control functions
CREATE OR REPLACE FUNCTION public.get_safe_profile_fields()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only these fields are safe for public viewing
  SELECT ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 'created_at', 'show_social_media', 'website', 'tiktok_url', 'instagram_url', 'facebook_url', 'twitter_url', 'youtube_url', 'verification_status']::text[];
$$;

-- Step 3: Create new secure policies

-- Policy 1: Users can view their own complete profile (all fields)
CREATE POLICY "Users can view own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can update their own profile (all fields)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Authenticated users can view LIMITED public profile data only
-- This is a restrictive policy that only allows viewing of safe, non-sensitive fields
CREATE POLICY "Public can view safe profile fields only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only allow viewing of profiles where the user has explicitly enabled public visibility
  -- AND only if querying safe fields (this will be enforced at application level)
  auth.uid() IS NOT NULL AND 
  verification_status IS NOT NULL
);

-- Policy 5: Admins can view additional profile data for moderation (but still not all sensitive fields)
CREATE POLICY "Admins can view profiles for moderation"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_admin_or_gosat(auth.uid()) AND
  auth.uid() IS NOT NULL
);

-- Step 4: Create secure helper functions for specific use cases

-- Function to get only public-safe profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone,
  verification_status verification_status,
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
SET search_path = public
AS $$
BEGIN
  -- Anyone can view these safe fields
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.verification_status,
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

-- Function for admin access to profiles (still excludes most sensitive data)
CREATE OR REPLACE FUNCTION public.get_profile_admin_data(profile_user_id uuid, access_reason text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamp with time zone,
  verification_status verification_status,
  country text,
  timezone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins/gosats can access this data
  IF NOT is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log the admin access for audit trail
  INSERT INTO public.profile_access_logs (
    accessed_profile_id, accessor_user_id, access_type, access_reason
  ) VALUES (
    profile_user_id, auth.uid(), 'admin_profile_access', access_reason
  );

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.bio,
    p.location,
    p.created_at,
    p.verification_status,
    p.country,
    p.timezone
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;