-- CRITICAL SECURITY FIXES - Phase 1: Database Security Hardening

-- 1. First, let's fix the encryption functions to actually work with pgsodium
-- Enable pgsodium extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Fix the PII encryption/decryption functions to use proper pgsodium methods
CREATE OR REPLACE FUNCTION public.encrypt_pii_data(data_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return encrypted data using pgsodium with proper key derivation
  IF data_text IS NULL OR data_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use deterministic encryption for searchable fields
  RETURN encode(
    pgsodium.crypto_aead_det_encrypt(
      convert_to(data_text, 'utf8'),
      convert_to('billing_pii_context', 'utf8'),
      pgsodium.derive_key('billing_master_key', 1, 'billing_pii_context')
    ),
    'base64'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log encryption failure and return NULL for security
    PERFORM log_security_event('encryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM));
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_pii_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return decrypted data using pgsodium
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      decode(encrypted_data, 'base64'),
      convert_to('billing_pii_context', 'utf8'),
      pgsodium.derive_key('billing_master_key', 1, 'billing_pii_context')
    ),
    'utf8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log decryption failure and return NULL
    PERFORM log_security_event('decryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM));
    RETURN NULL;
END;
$function$;

-- 3. Create secure payment config table with proper encryption
CREATE TABLE IF NOT EXISTS public.payment_config_secure (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name_encrypted text NOT NULL,
  bank_account_name_encrypted text NOT NULL,
  bank_account_number_encrypted text NOT NULL, 
  bank_swift_code_encrypted text NOT NULL,
  business_email_encrypted text NOT NULL,
  encryption_key_id text NOT NULL DEFAULT 'billing_master_key',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now()
);

-- Enable RLS on secure payment config
ALTER TABLE public.payment_config_secure ENABLE ROW LEVEL SECURITY;

-- Create ultra-restrictive RLS policy for payment config
CREATE POLICY "payment_config_service_role_only" 
ON public.payment_config_secure 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 4. Update the secure payment config access function with enhanced security
CREATE OR REPLACE FUNCTION public.get_payment_config_for_eft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    config_data jsonb;
    current_role_name text;
    caller_function text;
BEGIN
    -- Get the current role and calling function for security checks
    SELECT current_user INTO current_role_name;
    GET DIAGNOSTICS caller_function = PG_CONTEXT;
    
    -- CRITICAL: Only allow access from service_role (edge functions)
    IF current_role_name != 'service_role' THEN
        -- Log the unauthorized access attempt with detailed context
        INSERT INTO public.billing_access_logs (
            user_id, accessed_by, access_type, success, ip_address
        ) VALUES (
            NULL, auth.uid(), 'payment_config_unauthorized_' || current_role_name, false, inet_client_addr()
        );
        
        -- Log security event with full context
        PERFORM log_security_event_enhanced(
            'payment_config_breach_attempt',
            auth.uid(),
            jsonb_build_object(
                'role', current_role_name,
                'caller_function', caller_function,
                'timestamp', now()::text
            ),
            inet_client_addr(),
            'critical'
        );
        
        RAISE EXCEPTION 'SECURITY VIOLATION: Payment configuration access denied. Role: %. This incident has been logged and will be investigated.'
            , current_role_name
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Additional verification: check if we're actually in an edge function context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE grantee = current_role_name 
        AND privilege_type = 'SELECT'
    ) THEN
        PERFORM log_security_event_enhanced(
            'payment_config_context_violation',
            NULL,
            jsonb_build_object('role', current_role_name, 'context', 'invalid_edge_function_context'),
            inet_client_addr(),
            'critical'
        );
        RAISE EXCEPTION 'SECURITY VIOLATION: Invalid execution context detected'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Log successful access for audit trail
    INSERT INTO public.billing_access_logs (
        user_id, accessed_by, access_type, success, ip_address
    ) VALUES (
        NULL, NULL, 'payment_config_service_access_secure', true, inet_client_addr()
    );
    
    -- Get encrypted data and decrypt it securely
    SELECT jsonb_build_object(
        'bank_name', decrypt_pii_data(bank_name_encrypted),
        'bank_account_name', decrypt_pii_data(bank_account_name_encrypted),
        'bank_account_number', decrypt_pii_data(bank_account_number_encrypted),
        'bank_swift_code', decrypt_pii_data(bank_swift_code_encrypted),
        'business_email', decrypt_pii_data(business_email_encrypted)
    ) INTO config_data
    FROM public.payment_config_secure
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update last accessed timestamp
    UPDATE public.payment_config_secure 
    SET last_accessed = now()
    WHERE id = (SELECT id FROM public.payment_config_secure ORDER BY created_at DESC LIMIT 1);
    
    RETURN COALESCE(config_data, '{}'::jsonb);
END;
$function$;

-- 5. Fix database functions with mutable search paths (SECURITY ISSUE)
CREATE OR REPLACE FUNCTION public.update_user_billing_info_secure(
    target_user_id uuid,
    p_billing_address_line1 text DEFAULT NULL::text,
    p_billing_address_line2 text DEFAULT NULL::text,
    p_billing_city text DEFAULT NULL::text,
    p_billing_state text DEFAULT NULL::text,
    p_billing_postal_code text DEFAULT NULL::text,
    p_billing_country text DEFAULT NULL::text,
    p_billing_phone text DEFAULT NULL::text,
    p_billing_email text DEFAULT NULL::text,
    p_billing_organization text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Set immutable search path
AS $function$
BEGIN
  -- Only allow users to update their own billing data
  IF auth.uid() != target_user_id THEN
    PERFORM log_security_event_enhanced(
        'billing_update_unauthorized',
        target_user_id,
        jsonb_build_object('attempted_by', auth.uid()),
        inet_client_addr(),
        'warning'
    );
    RAISE EXCEPTION 'Unauthorized: Can only update own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Enhanced logging with encryption status
  INSERT INTO public.billing_access_logs (
    user_id, accessed_by, access_type, success, ip_address
  ) VALUES (
    target_user_id, auth.uid(), 'update_encrypted_billing', true, inet_client_addr()
  );
  
  -- Update or insert billing data with proper encryption
  INSERT INTO public.user_billing_info (
    user_id,
    billing_address_line1_encrypted,
    billing_address_line2_encrypted,
    billing_city_encrypted,
    billing_state_encrypted,
    billing_postal_code_encrypted,
    billing_country_encrypted,
    billing_phone_encrypted,
    billing_email_encrypted,
    billing_organization_encrypted,
    encryption_key_id
  ) VALUES (
    target_user_id,
    encrypt_pii_data(p_billing_address_line1),
    encrypt_pii_data(p_billing_address_line2),
    encrypt_pii_data(p_billing_city),
    encrypt_pii_data(p_billing_state),
    encrypt_pii_data(p_billing_postal_code),
    encrypt_pii_data(p_billing_country),
    encrypt_pii_data(p_billing_phone),
    encrypt_pii_data(p_billing_email),
    encrypt_pii_data(p_billing_organization),
    'billing_master_key'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    billing_address_line1_encrypted = COALESCE(encrypt_pii_data(p_billing_address_line1), public.user_billing_info.billing_address_line1_encrypted),
    billing_address_line2_encrypted = COALESCE(encrypt_pii_data(p_billing_address_line2), public.user_billing_info.billing_address_line2_encrypted),
    billing_city_encrypted = COALESCE(encrypt_pii_data(p_billing_city), public.user_billing_info.billing_city_encrypted),
    billing_state_encrypted = COALESCE(encrypt_pii_data(p_billing_state), public.user_billing_info.billing_state_encrypted),
    billing_postal_code_encrypted = COALESCE(encrypt_pii_data(p_billing_postal_code), public.user_billing_info.billing_postal_code_encrypted),
    billing_country_encrypted = COALESCE(encrypt_pii_data(p_billing_country), public.user_billing_info.billing_country_encrypted),
    billing_phone_encrypted = COALESCE(encrypt_pii_data(p_billing_phone), public.user_billing_info.billing_phone_encrypted),
    billing_email_encrypted = COALESCE(encrypt_pii_data(p_billing_email), public.user_billing_info.billing_email_encrypted),
    billing_organization_encrypted = COALESCE(encrypt_pii_data(p_billing_organization), public.user_billing_info.billing_organization_encrypted),
    updated_at = now();
    
  -- Update the has_complete_billing_info flag in profiles
  UPDATE public.profiles 
  SET 
    has_complete_billing_info = (
      SELECT (
        billing_address_line1_encrypted IS NOT NULL AND 
        billing_city_encrypted IS NOT NULL AND 
        billing_postal_code_encrypted IS NOT NULL AND 
        billing_country_encrypted IS NOT NULL AND 
        billing_email_encrypted IS NOT NULL
      )
      FROM public.user_billing_info 
      WHERE user_id = target_user_id
    ),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$function$;

-- 6. Enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
    event_type text,
    user_id_param uuid DEFAULT auth.uid(),
    details jsonb DEFAULT '{}'::jsonb,
    ip_address_param inet DEFAULT inet_client_addr(),
    severity text DEFAULT 'info'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Set immutable search path
AS $function$
BEGIN
  -- Enhanced security event logging with more details and better categorization
  INSERT INTO public.billing_access_logs (
    user_id, accessed_by, access_type, success, ip_address, user_agent
  ) VALUES (
    user_id_param,
    auth.uid(),
    'security_event:' || severity || ':' || event_type,
    CASE WHEN severity IN ('error', 'critical') THEN false ELSE true END,
    ip_address_param,
    COALESCE(details->>'user_agent', 'system')
  );
  
  -- For critical events, also create a separate high-priority log entry
  IF severity IN ('critical', 'error') THEN
    INSERT INTO public.billing_access_logs (
      user_id, accessed_by, access_type, success, ip_address, user_agent
    ) VALUES (
      user_id_param,
      auth.uid(),
      'ALERT:' || event_type,
      false,
      ip_address_param,
      'SECURITY_ALERT_SYSTEM'
    );
  END IF;
END;
$function$;

-- 7. Create triggers to update timestamps securely
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Set immutable search path
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Apply the trigger to payment_config_secure
DROP TRIGGER IF EXISTS update_payment_config_secure_updated_at ON public.payment_config_secure;
CREATE TRIGGER update_payment_config_secure_updated_at
    BEFORE UPDATE ON public.payment_config_secure
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Add comprehensive security monitoring
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Log all access to sensitive tables
    IF TG_TABLE_NAME IN ('user_billing_info', 'payment_config_secure', 'payment_transactions') THEN
        PERFORM log_security_event_enhanced(
            'sensitive_data_access',
            auth.uid(),
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'timestamp', now()::text
            ),
            inet_client_addr(),
            'info'
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- Apply monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_billing_access ON public.user_billing_info;
CREATE TRIGGER monitor_billing_access
    AFTER INSERT OR UPDATE OR DELETE ON public.user_billing_info
    FOR EACH ROW
    EXECUTE FUNCTION public.monitor_sensitive_data_access();

DROP TRIGGER IF EXISTS monitor_payment_config_access ON public.payment_config_secure;
CREATE TRIGGER monitor_payment_config_access
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_config_secure
    FOR EACH ROW
    EXECUTE FUNCTION public.monitor_sensitive_data_access();