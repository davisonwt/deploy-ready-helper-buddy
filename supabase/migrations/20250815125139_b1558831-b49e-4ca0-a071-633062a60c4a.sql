-- Grant gosat role to the existing user account
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'davison.taljaard@icloud.com'),
  'gosat'::app_role,
  (SELECT id FROM auth.users WHERE email = 'davison.taljaard@icloud.com')
)
ON CONFLICT (user_id, role) DO NOTHING;