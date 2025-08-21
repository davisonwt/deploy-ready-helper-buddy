-- Fix RLS policies for user_roles to allow admin/gosat users to read all roles
DROP POLICY IF EXISTS "authenticated_users_can_read_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and gosats can insert roles" ON public.user_roles;

-- Create new comprehensive policies
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated 
USING (is_admin_or_gosat(auth.uid()));