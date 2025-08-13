-- Fix privacy issue with a more targeted approach
-- Remove the conflicting policies first
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public display information viewable by authenticated users" ON public.profiles;

-- Create a single, more restrictive policy that allows users to see their own profiles
-- For community features, we'll need to create a separate public view or handle in app
CREATE POLICY "Users can view their own profiles only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create a database view for public profile information that only exposes safe fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Enable RLS on the view (inherits from base table)
-- Grant access to the public view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create policy for the public view
CREATE POLICY "Authenticated users can view public profile info"
ON public.public_profiles
FOR SELECT
TO authenticated
USING (true);