-- CRITICAL SECURITY FIXES

-- 1. Fix search path vulnerabilities in functions
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

-- 2. Strengthen user_roles RLS policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- 3. Add role change validation trigger
CREATE OR REPLACE FUNCTION public.validate_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent users from granting themselves admin/gosat roles
  IF TG_OP = 'INSERT' AND NEW.role IN ('admin', 'gosat') THEN
    IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role)) THEN
      RAISE EXCEPTION 'Insufficient privileges to grant administrative roles';
    END IF;
  END IF;
  
  -- Log role changes for audit
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    success,
    ip_address
  ) VALUES (
    NEW.user_id,
    auth.uid(),
    'role_change:' || NEW.role,
    true,
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_role_changes_trigger ON public.user_roles;
CREATE TRIGGER validate_role_changes_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.validate_role_changes();

-- 4. Secure payment configuration access further
CREATE OR REPLACE FUNCTION public.get_payment_config_for_eft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    config_data jsonb;
    current_role_name text;
BEGIN
    -- Get the current role to ensure this is called from service context
    SELECT current_user INTO current_role_name;
    
    -- CRITICAL: Only allow access from service_role (edge functions)
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
    
    -- Verify we're in a service context with additional checks
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
    
    -- Only return minimal required data
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

-- 5. Fix anonymous access in community videos
DROP POLICY IF EXISTS "Anyone can view approved videos" ON public.community_videos;
CREATE POLICY "Authenticated users can view approved videos" ON public.community_videos
FOR SELECT USING (
  auth.uid() IS NOT NULL AND status = 'approved'::text
);

-- 6. Strengthen chat room policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
CREATE POLICY "Authenticated users can view accessible rooms" ON public.chat_rooms
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    (NOT is_premium AND (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE room_id = chat_rooms.id 
        AND user_id = auth.uid() 
        AND is_active = true
      ) OR created_by = auth.uid()
    )) OR 
    (is_premium AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM bestowals
        WHERE orchard_id = chat_rooms.orchard_id 
        AND bestower_id = auth.uid() 
        AND payment_status = 'completed'
        AND amount >= chat_rooms.required_bestowal_amount
      )
    ))
  )
);

-- 7. Add security logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id_param uuid DEFAULT auth.uid(),
  details jsonb DEFAULT '{}'::jsonb
) RETURNS void
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
    user_id_param,
    auth.uid(),
    'security_event:' || event_type,
    true,
    inet_client_addr()
  );
END;
$$;

-- 8. Update wallet balance function with stronger security
CREATE OR REPLACE FUNCTION public.update_wallet_balance_secure(
  target_user_id uuid,
  target_wallet_address text,
  new_balance numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_role_name text;
BEGIN
  -- CRITICAL: Only allow access from service_role (edge functions)
  SELECT current_user INTO current_role_name;
  
  IF current_role_name != 'service_role' THEN
    -- Log security violation
    PERFORM log_security_event('wallet_balance_unauthorized_access', target_user_id);
    RAISE EXCEPTION 'Access denied: Wallet balance updates can only be performed by system functions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Verify the user owns this wallet
  IF NOT EXISTS (
    SELECT 1 FROM user_wallets 
    WHERE user_id = target_user_id 
    AND wallet_address = target_wallet_address
  ) THEN
    PERFORM log_security_event('wallet_ownership_violation', target_user_id);
    RAISE EXCEPTION 'Wallet address does not belong to specified user'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Update or insert the balance
  INSERT INTO wallet_balances (user_id, wallet_address, usdc_balance, updated_at)
  VALUES (target_user_id, target_wallet_address, new_balance, now())
  ON CONFLICT (user_id, wallet_address)
  DO UPDATE SET 
    usdc_balance = new_balance,
    updated_at = now();
  
  -- Log successful operation
  PERFORM log_security_event('wallet_balance_updated', target_user_id);
    
  RETURN true;
END;
$$;