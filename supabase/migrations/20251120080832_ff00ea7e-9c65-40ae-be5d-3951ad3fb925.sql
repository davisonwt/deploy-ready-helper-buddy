-- Fix profiles: Remove insecure "OR true" and "OR auth.uid() IS NOT NULL" conditions
-- These conditions bypass all access control

-- Drop the two insecure policies
DROP POLICY IF EXISTS "Users can view profiles with secure access" ON profiles;
DROP POLICY IF EXISTS "secure_profile_view" ON profiles;

-- The remaining policies are secure:
-- - "Users can view their own profile" (already exists)
-- - "Admins can view all profiles" (already exists)
-- - "Users can view profiles in their chat rooms" (already exists)
-- - "Users can view profiles they've interacted with via bestowals" (already exists)