
-- Allow gosat/admin users to view all ambassador applications
CREATE POLICY "Admins can view all ambassador applications"
  ON public.ambassador_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'gosat')
    )
  );

-- Allow gosat/admin users to update ambassador applications (approve/reject)
CREATE POLICY "Admins can update ambassador applications"
  ON public.ambassador_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'gosat')
    )
  );
