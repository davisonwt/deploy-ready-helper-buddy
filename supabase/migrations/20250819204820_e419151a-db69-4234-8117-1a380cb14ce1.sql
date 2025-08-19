-- First, let's check the current policies on the profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Drop any potentially problematic policies and recreate secure ones
DROP POLICY IF EXISTS "Secure profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;

-- Create a single, secure SELECT policy that only allows users to see their own data
-- and restricts access to authenticated users only
CREATE POLICY "Users can only view their own profile data" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure the INSERT policy is properly restricted to authenticated users
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure the UPDATE policy is properly restricted to authenticated users  
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify the user_id column is not nullable to prevent security bypasses
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profile data with Row Level Security. Users can only access their own profile data when authenticated.';