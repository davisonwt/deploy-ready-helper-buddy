-- Allow admins and gosats to delete any seed
CREATE POLICY "Admins and gosats can delete any seed" 
ON public.seeds 
FOR DELETE 
USING (is_admin_or_gosat(auth.uid()));