-- Update RLS policy to allow gosats/admins to update any orchard
DROP POLICY IF EXISTS "Users can update their own orchards" ON public.orchards;

CREATE POLICY "Users can update their own orchards or gosats/admins can update any orchard"
ON public.orchards
FOR UPDATE
USING (
  auth.uid() = user_id OR 
  is_admin_or_gosat(auth.uid())
);