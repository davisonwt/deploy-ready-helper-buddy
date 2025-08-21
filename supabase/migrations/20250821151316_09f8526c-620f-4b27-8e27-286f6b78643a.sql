-- Add radio_admin role to the user so their profile data shows up in personnel assignments
INSERT INTO user_roles (user_id, role, granted_by, granted_at, updated_at)
VALUES ('04754d57-d41d-4ea7-93df-542047a6785b', 'radio_admin', '04754d57-d41d-4ea7-93df-542047a6785b', now(), now())
ON CONFLICT (user_id, role) DO NOTHING;