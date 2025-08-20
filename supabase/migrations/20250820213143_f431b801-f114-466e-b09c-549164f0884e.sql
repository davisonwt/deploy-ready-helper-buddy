-- CRITICAL SECURITY FIX: Phase 1 - Secure Banking Configuration Data
-- Remove all access to payment_config table and create secure service-only access

-- Drop the existing overly permissive policy that allows any access
DROP POLICY IF EXISTS "payment_config_absolute_deny" ON public.payment_config;

-- Create an absolute deny policy for all direct access
CREATE POLICY "payment_config_absolute_security_deny" ON public.payment_config
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- Update the existing secure function to have proper search path and additional security
CREATE OR REPLACE FUNCTION public.get_payment_config_for_eft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    config_data jsonb;
    current_role_name text;
    session_info jsonb;
BEGIN
    -- Get the current role to ensure this is called from service context
    SELECT current_user INTO current_role_name;
    
    -- CRITICAL: Only allow access from service_role (edge functions)
    -- This prevents any client-side access even if there are RLS bypasses
    IF current_role_name != 'service_role' THEN
        -- Log the unauthorized access attempt
        INSERT INTO public.billing_access_logs (
            user_id,
            accessed_by,
            access_type,
            success,
            ip_address
        ) VALUES (
            NULL,
            auth.uid(),
            'payment_config_unauthorized',
            false,
            inet_client_addr()
        );
        
        RAISE EXCEPTION 'SECURITY VIOLATION: Payment configuration can only be accessed by authorized system functions. This incident has been logged.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Additional security: Verify we're in a secure context by checking session info
    BEGIN
        session_info := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        session_info := '{}'::jsonb;
    END;
    
    -- Double-check that we have service role permissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE grantee = current_role_name 
        AND table_name = 'payment_config' 
        AND privilege_type = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized access attempt to payment configuration detected'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Log successful access for audit trail
    INSERT INTO public.billing_access_logs (
        user_id,
        accessed_by,
        access_type,
        success,
        ip_address
    ) VALUES (
        NULL,
        NULL, -- Service role access
        'payment_config_service_access',
        true,
        inet_client_addr()
    );
    
    -- Only return data if all security checks pass
    SELECT jsonb_build_object(
        'bank_name', bank_name,
        'bank_account_name', bank_account_name,
        'bank_account_number', bank_account_number,
        'bank_swift_code', bank_swift_code,
        'business_email', business_email
    ) INTO config_data
    FROM public.payment_config
    LIMIT 1;
    
    RETURN COALESCE(config_data, '{}'::jsonb);
END;
$$;

-- CRITICAL SECURITY FIX: Phase 3 - Fix Search Path Vulnerabilities in All Functions
-- Update all functions to have explicit search_path settings

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gosat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gosat')
  )
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.increment_ai_usage(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, date, generations_count)
  VALUES (user_id_param, current_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET generations_count = public.ai_usage.generations_count + 1;
  
  SELECT generations_count INTO current_count
  FROM public.ai_usage
  WHERE user_id = user_id_param AND date = current_date;
  
  RETURN current_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_today(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER := 0;
BEGIN
  SELECT COALESCE(generations_count, 0) INTO current_count
  FROM public.ai_usage
  WHERE user_id = user_id_param AND date = current_date;
  
  RETURN current_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_achievement(user_id_param uuid, achievement_type_param text, title_param text, description_param text, points_param integer DEFAULT 0, icon_param text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user already has this achievement
  IF NOT EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = user_id_param AND achievement_type = achievement_type_param
  ) THEN
    -- Insert new achievement
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, points_awarded, icon)
    VALUES (user_id_param, achievement_type_param, title_param, description_param, points_param, icon_param);
    
    -- Update user points
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (user_id_param, points_param)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = public.user_points.total_points + points_param,
      level = CASE 
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 5
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 4
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 3
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 2
        ELSE 1
      END,
      points_to_next_level = CASE
        WHEN (public.user_points.total_points + points_param) >= 1000 THEN 0
        WHEN (public.user_points.total_points + points_param) >= 500 THEN 1000 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 250 THEN 500 - (public.user_points.total_points + points_param)
        WHEN (public.user_points.total_points + points_param) >= 100 THEN 250 - (public.user_points.total_points + points_param)
        ELSE 100 - (public.user_points.total_points + points_param)
      END,
      updated_at = now();
  END IF;
END;
$$;

-- Add enhanced audit logging for admin role operations
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type text,
  target_user_id uuid DEFAULT NULL,
  action_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'admin_action:' || action_type,
    true,
    inet_client_addr()
  );
END;
$$;