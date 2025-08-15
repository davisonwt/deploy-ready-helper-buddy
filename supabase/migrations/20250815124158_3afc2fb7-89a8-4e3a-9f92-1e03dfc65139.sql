-- Grant gosat role to current user
-- Replace with your actual user ID if needed
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT auth.uid(), 'gosat'::app_role, auth.uid()
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'gosat'::app_role
);