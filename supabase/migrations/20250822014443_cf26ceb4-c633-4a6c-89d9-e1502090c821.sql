-- Check if we need to add a policy for admins/gosats to view all user roles
-- This will allow admins and gosats to see all user roles for management purposes

-- First, let's see the current policies and add one for admin access
DO $$
BEGIN
  -- Check if the admin policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Admins and gosats can view all user roles'
  ) THEN
    -- Create policy for admins/gosats to view all user roles
    CREATE POLICY "Admins and gosats can view all user roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'gosat'::app_role)
    );
    
    RAISE NOTICE 'Created admin policy for user_roles viewing';
  ELSE
    RAISE NOTICE 'Admin policy already exists for user_roles';
  END IF;
END
$$;