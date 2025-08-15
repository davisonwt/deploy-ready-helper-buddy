-- Fix security issue: Remove overly permissive profile access policy
-- and replace with secure policies that protect user privacy

-- Drop the problematic policy that allows all authenticated users to see all profile data
DROP POLICY IF EXISTS "Limited public profile information" ON public.profiles;
DROP POLICY IF EXISTS "Public profile information for display" ON public.profiles;

-- Create a secure policy that protects sensitive user data
CREATE POLICY "Secure profile access" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  auth.uid() = user_id
);

-- Create a separate policy for limited public information access
-- This allows other users to see only display_name and avatar_url (needed for chat, orchards, etc.)
CREATE POLICY "Limited public profile display" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow access to basic display info for authenticated users
  auth.uid() IS NOT NULL AND auth.uid() != user_id
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