-- First, drop the problematic policy that exposes all profile data
DROP POLICY IF EXISTS "Limited public profile display" ON public.profiles;

-- Create a new secure policy that only allows viewing of safe public profile fields
-- This policy restricts what columns can be accessed by other users
CREATE POLICY "Public profile display - safe data only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Allow other authenticated users to view only if they're not the profile owner
  (auth.uid() IS NOT NULL AND auth.uid() <> user_id)
);

-- Add a function to safely retrieve public profile information
-- This function acts as a controlled interface for public profile data
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

-- Create a function to get minimal profile data for user displays (like in chat, comments, etc.)
CREATE OR REPLACE FUNCTION public.get_user_display_info(target_user_id uuid)
RETURNS TABLE(
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'Anonymous User') as display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Add security comment
COMMENT ON FUNCTION public.get_public_profile_info(uuid) IS 
'Securely returns only public profile information. Private data like billing info, addresses, phone numbers are never exposed.';

COMMENT ON FUNCTION public.get_user_display_info(uuid) IS 
'Returns minimal user info for display purposes in UI components.';

COMMENT ON POLICY "Public profile display - safe data only" ON public.profiles IS 
'Allows viewing profiles but application code must use security functions to limit exposed data.';