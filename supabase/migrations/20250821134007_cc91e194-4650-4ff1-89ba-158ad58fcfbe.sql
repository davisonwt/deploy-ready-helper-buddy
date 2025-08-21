-- Drop ALL existing problematic policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admin users can view all roles" ON user_roles; 
DROP POLICY IF EXISTS "Service role full access" ON user_roles;
DROP POLICY IF EXISTS "Admins and gosats can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins and gosats can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- Create ONE simple policy that definitely works
CREATE POLICY "authenticated_users_can_read_own_roles" ON user_roles
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create admin management policies
CREATE POLICY "service_role_full_access" ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);