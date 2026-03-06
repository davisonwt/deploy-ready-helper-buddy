-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view lectures in their circles" ON public.skilldrop_sessions;

-- Create a permissive SELECT policy: users can see sessions that are:
-- 1. Public (no circle_id), OR
-- 2. In a circle they belong to, OR
-- 3. They are the presenter of
CREATE POLICY "Users can view skilldrop sessions"
  ON public.skilldrop_sessions
  FOR SELECT
  TO authenticated
  USING (
    circle_id IS NULL
    OR circle_id IN (
      SELECT circle_members.circle_id
      FROM circle_members
      WHERE circle_members.user_id = auth.uid()
    )
    OR presenter_id = auth.uid()
  );