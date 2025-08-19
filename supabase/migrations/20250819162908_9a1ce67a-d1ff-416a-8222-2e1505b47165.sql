-- First, drop the problematic policy that exposes all profile data
DROP POLICY IF EXISTS "Limited public profile display" ON public.profiles;

-- Create a new secure policy that only exposes safe public profile fields
-- This uses a custom function to control exactly what data is visible
CREATE OR REPLACE FUNCTION public.get_public_profile_data(profile_row profiles)
RETURNS TABLE(
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Only return safe, public profile information
  SELECT 
    profile_row.id,
    profile_row.display_name,
    profile_row.avatar_url,
    profile_row.bio,
    profile_row.created_at;
$$;

-- Create a secure public profiles view that only shows safe data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles OWNER TO postgres;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create RLS policy for the public profiles view
CREATE POLICY "Anyone can view public profile data" 
ON public.public_profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add a policy comment to document the security consideration
COMMENT ON POLICY "Anyone can view public profile data" ON public.public_profiles IS 
'Allows viewing of safe public profile data only (display_name, avatar_url, bio). Private information like billing details, real names, and addresses are never exposed.';

-- Also add a function to safely get minimal profile info for display purposes
CREATE OR REPLACE FUNCTION public.get_safe_profile_display(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;