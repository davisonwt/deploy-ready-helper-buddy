-- Create admin function to grant roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.grant_user_role_admin(target_user_id uuid, target_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_role_name text;
  granted_by_id uuid;
  result_data jsonb;
BEGIN
  -- Get current user
  granted_by_id := auth.uid();
  
  -- Log the attempt
  PERFORM log_security_event('admin_role_grant_attempt', granted_by_id);
  
  -- Check if the calling user has admin or gosat role
  IF NOT is_admin_or_gosat(granted_by_id) THEN
    RAISE EXCEPTION 'Insufficient privileges to grant roles'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Insert the role (this bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (target_user_id, target_role::app_role, granted_by_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Return success
  result_data := jsonb_build_object(
    'user_id', target_user_id,
    'role', target_role,
    'granted_by', granted_by_id,
    'granted_at', now()
  );
  
  -- Log successful grant
  PERFORM log_security_event('admin_role_granted', granted_by_id);
  
  RETURN result_data;
END;
$$;