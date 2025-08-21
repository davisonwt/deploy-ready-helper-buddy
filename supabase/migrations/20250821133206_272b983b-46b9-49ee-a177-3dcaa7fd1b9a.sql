-- Drop the problematic policies and create simpler ones
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admin users can view all roles" ON user_roles;

-- Create a simple policy that allows authenticated users to see their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role full access for admin functions
CREATE POLICY "Service role full access" ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);