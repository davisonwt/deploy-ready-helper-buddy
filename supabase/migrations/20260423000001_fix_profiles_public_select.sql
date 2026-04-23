-- Allow any authenticated user to read any profile row.
-- Profile data (display name, bio, avatar, etc.) is intentionally public-facing
-- within the platform. The previous restrictive policies only allowed users to
-- see their own profile or profiles they had bestowal/chat relationships with,
-- which caused "permission denied for table profiles" everywhere profiles are
-- displayed for other users (sower pages, search, chat, etc.).
--
-- INSERT / UPDATE / DELETE policies are unchanged — users can only write their
-- own profile.

-- Drop the narrow per-relationship SELECT policies that caused the error
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles they've interacted with via bestowals" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their chat rooms" ON public.profiles;

-- Replace with a single broad SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
