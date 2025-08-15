-- Add gosat role to the current user
-- First, let's see what users exist and find the right one to grant gosat role to
-- You'll need to replace the user_id below with your actual user ID

-- For now, let's grant gosat role to a user (you'll need to specify which user)
-- INSERT INTO public.user_roles (user_id, role, granted_by) 
-- VALUES ('your-user-id-here', 'gosat', 'your-user-id-here');

-- Let's first check if the enum values exist
SELECT unnest(enum_range(NULL::app_role)) as available_roles;