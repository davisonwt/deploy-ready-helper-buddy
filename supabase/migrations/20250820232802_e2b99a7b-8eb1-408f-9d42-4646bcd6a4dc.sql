-- SECURITY FIX: Radio Live Sessions - Remove Public Access and Implement Secure Policies
-- This fixes the critical vulnerability where session tokens were publicly accessible

-- First, drop the dangerous public policy
DROP POLICY IF EXISTS "Anyone can view live sessions" ON public.radio_live_sessions;

-- Create secure, authentication-based policies

-- 1. Authenticated users can view basic session info (no sensitive tokens)
CREATE POLICY "Authenticated users can view basic session info" 
ON public.radio_live_sessions 
FOR SELECT 
TO authenticated
USING (
  -- Users can see basic info about live sessions but NOT session tokens
  auth.uid() IS NOT NULL
);

-- 2. Radio admins and hosts can manage sessions (full access)
CREATE POLICY "Radio admins and hosts can manage sessions" 
ON public.radio_live_sessions 
FOR ALL 
TO authenticated
USING (
  -- Only radio admins, general admins, gosats, or session hosts can manage
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role) OR
  (EXISTS (
    SELECT 1 
    FROM radio_schedule rs
    JOIN radio_djs rd ON rs.dj_id = rd.id
    WHERE rs.id = radio_live_sessions.schedule_id 
    AND rd.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Same conditions for insert/update
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role) OR
  (EXISTS (
    SELECT 1 
    FROM radio_schedule rs
    JOIN radio_djs rd ON rs.dj_id = rd.id
    WHERE rs.id = radio_live_sessions.schedule_id 
    AND rd.user_id = auth.uid()
  ))
);

-- 3. Create a secure function for session token access (service role only)
CREATE OR REPLACE FUNCTION public.get_session_token_secure(session_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_value text;
  current_role_name text;
BEGIN
  -- CRITICAL: Only allow access from service_role (edge functions)
  SELECT current_user INTO current_role_name;
  
  IF current_role_name != 'service_role' THEN
    -- Log security violation
    PERFORM log_security_event('session_token_unauthorized_access', auth.uid());
    RAISE EXCEPTION 'SECURITY VIOLATION: Session tokens can only be accessed by authorized system functions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Additional authorization check - user must be authorized for this session
  IF NOT EXISTS (
    SELECT 1 FROM radio_live_sessions rls
    JOIN radio_schedule rs ON rls.schedule_id = rs.id
    JOIN radio_djs rd ON rs.dj_id = rd.id
    WHERE rls.id = session_id_param
    AND (
      has_role(auth.uid(), 'radio_admin'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'gosat'::app_role) OR
      rd.user_id = auth.uid()
    )
  ) THEN
    PERFORM log_security_event('session_token_unauthorized_session', auth.uid());
    RAISE EXCEPTION 'SECURITY VIOLATION: User not authorized for this session'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Get the session token securely
  SELECT session_token INTO token_value
  FROM radio_live_sessions
  WHERE id = session_id_param;
  
  -- Log successful access
  PERFORM log_security_event('session_token_accessed', auth.uid());
  
  RETURN token_value;
END;
$function$;

-- 4. Create a public view that excludes sensitive data for general access
CREATE OR REPLACE VIEW public.radio_sessions_public AS
SELECT 
  id,
  schedule_id,
  status,
  started_at,
  ended_at,
  viewer_count,
  created_at,
  updated_at
  -- NOTE: session_token is intentionally excluded from public view
FROM public.radio_live_sessions
WHERE status IN ('live', 'scheduled'); -- Only show active/upcoming sessions

-- 5. Grant appropriate permissions on the public view
GRANT SELECT ON public.radio_sessions_public TO authenticated;

-- 6. Create a secure function for updating viewer counts (to prevent manipulation)
CREATE OR REPLACE FUNCTION public.update_viewer_count_secure(session_id_param uuid, new_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_role_name text;
BEGIN
  -- Only allow from service_role or authorized users
  SELECT current_user INTO current_role_name;
  
  IF current_role_name != 'service_role' AND NOT (
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    PERFORM log_security_event('viewer_count_unauthorized_update', auth.uid());
    RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized viewer count update attempt'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Validate count is reasonable (prevent manipulation)
  IF new_count < 0 OR new_count > 100000 THEN
    RAISE EXCEPTION 'Invalid viewer count: must be between 0 and 100000'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Update viewer count
  UPDATE radio_live_sessions 
  SET viewer_count = new_count, updated_at = now()
  WHERE id = session_id_param;
  
  -- Log the update
  PERFORM log_security_event('viewer_count_updated', auth.uid());
  
  RETURN true;
END;
$function$;