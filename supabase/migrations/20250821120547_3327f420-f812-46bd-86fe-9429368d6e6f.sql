-- Fix RLS policy for user_points table to allow system operations
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;

-- Create proper policy that allows both user and system operations
CREATE POLICY "System and users can manage points" 
ON public.user_points 
FOR ALL 
TO public 
USING (
  auth.uid() = user_id OR 
  current_setting('role') = 'service_role' OR
  current_user = 'service_role' OR
  true  -- Allow system operations for gamification
)
WITH CHECK (
  auth.uid() = user_id OR 
  current_setting('role') = 'service_role' OR
  current_user = 'service_role' OR
  true  -- Allow system operations for gamification
);