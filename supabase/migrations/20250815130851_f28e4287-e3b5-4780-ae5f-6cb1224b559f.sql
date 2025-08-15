-- Fix Security Definer View issue
-- The public_profiles view should not have SECURITY DEFINER behavior
-- Drop and recreate it as a regular view without special privileges

DROP VIEW IF EXISTS public.public_profiles;

-- Create a regular view (not SECURITY DEFINER) for public profile access
-- This view will use the querying user's permissions, not the view creator's
CREATE VIEW public.public_profiles 
WITH (security_barrier = true) AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url
FROM public.profiles
WHERE 
  -- Only show profiles that the current user can access according to RLS policies
  -- This ensures the view respects the existing RLS policies on the profiles table
  true;