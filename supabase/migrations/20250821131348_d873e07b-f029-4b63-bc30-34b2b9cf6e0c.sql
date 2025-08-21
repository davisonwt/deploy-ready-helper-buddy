-- Create a function to grant yourself admin role (temporary bootstrap function)
CREATE OR REPLACE FUNCTION grant_bootstrap_admin(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Grant admin role
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (target_user_id, 'admin', target_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;