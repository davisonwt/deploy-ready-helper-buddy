-- Update the profiles table RLS policy to allow admins and gosats to view all profiles
DROP POLICY IF EXISTS "Users can only view their own profile data" ON public.profiles;

-- New policy that allows users to see their own data, but admins/gosats can see all profiles
CREATE POLICY "Users can view own profile, admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin_or_gosat(auth.uid())
);

-- Also update the user_roles table to allow gosats to view roles (not just admins)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins and gosats can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_admin_or_gosat(auth.uid()));

-- Allow gosats to grant/revoke roles too
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;  
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins and gosats can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins and gosats can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins and gosats can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (is_admin_or_gosat(auth.uid()));