-- Remove the policy that still allows full profile access to other users
DROP POLICY IF EXISTS "Public profile display - safe data only" ON public.profiles;

-- The solution is to NOT have any policy that allows other users to directly access the profiles table
-- Instead, we'll rely entirely on the security definer functions for controlled access
-- This ensures no sensitive data can be leaked through direct table queries

-- Update the existing functions to have proper search_path security
DROP FUNCTION IF EXISTS public.get_public_profile_info(uuid);
DROP FUNCTION IF EXISTS public.get_user_display_info(uuid);

-- Recreate with proper security
CREATE OR REPLACE FUNCTION public.get_public_profile_info(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return safe, public profile information - no sensitive data
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Create a function to get minimal profile data for user displays
CREATE OR REPLACE FUNCTION public.get_user_display_info(target_user_id uuid)
RETURNS TABLE(
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'Anonymous User') as display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Add security comments
COMMENT ON FUNCTION public.get_public_profile_info(uuid) IS 
'Securely returns only public profile information. Private data like billing info, addresses, phone numbers are never exposed. This is the ONLY way other users should access profile data.';

COMMENT ON FUNCTION public.get_user_display_info(uuid) IS 
'Returns minimal user info for display purposes in UI components like chat, comments, etc. This prevents exposure of sensitive profile data.';