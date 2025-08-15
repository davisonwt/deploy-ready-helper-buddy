-- Grant gosat role to the current authenticated user
INSERT INTO public.user_roles (user_id, role, granted_by) 
VALUES (auth.uid(), 'gosat', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was added
SELECT user_id, role, granted_at 
FROM public.user_roles 
WHERE user_id = auth.uid();