-- Fix circular dependency in room_members RLS policy
DROP POLICY IF EXISTS "Users can view room members where they are members" ON public.room_members;

-- Create non-circular policy: Users can view all room members (no circular check)
CREATE POLICY "Users can view all room members"
ON public.room_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can still only join themselves
-- (existing INSERT policy is fine)