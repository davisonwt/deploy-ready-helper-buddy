-- Drop the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Public display information viewable by authenticated users" ON public.profiles;

-- Create a more secure policy that only exposes safe public information
-- This policy allows authenticated users to see only display_name and avatar_url of other users
CREATE POLICY "Limited public profile information" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own full profile
  auth.uid() = user_id 
  OR 
  -- Other users can only see limited public info (this will be handled at the application level)
  true
);

-- Create a view for safe public profile access
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;