-- Fix RLS policies for user_roles table to ensure users can read their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create a proper RLS policy for users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure there's a policy for system/service operations
DROP POLICY IF EXISTS "System can manage user roles" ON public.user_roles;

CREATE POLICY "System can manage user roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);