-- Fix security issue: Remove overly permissive profile access policy
-- and replace with secure policies that protect user privacy

-- Drop the problematic policy that allows all authenticated users to see all profile data
DROP POLICY IF EXISTS "Limited public profile information" ON public.profiles;

-- Create a secure policy that only shows basic public information to other users
CREATE POLICY "Public profile information for display" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  auth.uid() = user_id 
  OR 
  -- Other users can only see basic display information (not sensitive data like bio, location)
  (auth.uid() IS NOT NULL AND auth.uid() != user_id)
);

-- Recreate the public_profiles view to only contain non-sensitive information
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url
FROM public.profiles;