-- Allow admins/gosats to insert radio schedule entries on behalf of any DJ
CREATE POLICY "Admins can insert schedule slots for any DJ"
ON public.radio_schedule
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_gosat(auth.uid())
);