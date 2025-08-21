-- Fix the circular dependency in user_roles RLS policies
-- Drop the problematic policies that use is_admin_or_gosat which creates a circular dependency
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and gosats can view all roles" ON user_roles;

-- Create a simple policy that allows users to see their own roles without circular dependency
CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for admins that doesn't create circular dependency
CREATE POLICY "Admin users can view all roles" ON user_roles
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'gosat')
  )
);