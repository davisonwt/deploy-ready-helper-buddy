-- Fix security issue: Restrict profile visibility to authenticated users only
-- Drop the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that only allows authenticated users to view profiles
-- This maintains app functionality while protecting user privacy
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Keep existing policies for update and insert unchanged
-- Users can still update their own profile
-- Users can still insert their own profile