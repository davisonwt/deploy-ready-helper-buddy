-- Enable pgsodium extension for proper encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create encryption functions for billing data
CREATE OR REPLACE FUNCTION public.encrypt_pii_data(data_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return encrypted data using pgsodium
  IF data_text IS NULL OR data_text = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN pgsodium.crypto_aead_det_encrypt(
    data_text::bytea,
    current_setting('app.encryption_key')::bytea,
    'billing_pii'::bytea
  )::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return decrypted data using pgsodium
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN pgsodium.crypto_aead_det_decrypt(
    encrypted_data::bytea,
    current_setting('app.encryption_key')::bytea,
    'billing_pii'::bytea
  )::text;
EXCEPTION
  WHEN OTHERS THEN
    -- Log decryption failure and return NULL
    PERFORM log_security_event('decryption_failed', auth.uid());
    RETURN NULL;
END;
$$;

-- Update user_billing_info functions to use real encryption
CREATE OR REPLACE FUNCTION public.get_user_billing_info_secure(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  billing_address_line1 text, 
  billing_address_line2 text, 
  billing_city text, 
  billing_state text, 
  billing_postal_code text, 
  billing_country text, 
  billing_phone text, 
  billing_email text, 
  billing_organization text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to access their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only access own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'read_encrypted',
    inet_client_addr()
  );
  
  -- Return properly decrypted billing data
  RETURN QUERY
  SELECT 
    decrypt_pii_data(ubi.billing_address_line1_encrypted),
    decrypt_pii_data(ubi.billing_address_line2_encrypted),
    decrypt_pii_data(ubi.billing_city_encrypted),
    decrypt_pii_data(ubi.billing_state_encrypted),
    decrypt_pii_data(ubi.billing_postal_code_encrypted),
    decrypt_pii_data(ubi.billing_country_encrypted),
    decrypt_pii_data(ubi.billing_phone_encrypted),
    decrypt_pii_data(ubi.billing_email_encrypted),
    decrypt_pii_data(ubi.billing_organization_encrypted)
  FROM public.user_billing_info ubi
  WHERE ubi.user_id = target_user_id;
  
  -- Update last accessed timestamp
  UPDATE public.user_billing_info 
  SET last_accessed = now()
  WHERE user_id = target_user_id;
END;
$$;

-- Update the billing info update function to use real encryption
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
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to update their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'update_encrypted',
    inet_client_addr()
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
    'pgsodium_v1'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    billing_address_line1_encrypted = CASE 
      WHEN p_billing_address_line1 IS NOT NULL THEN encrypt_pii_data(p_billing_address_line1)
      ELSE public.user_billing_info.billing_address_line1_encrypted
    END,
    billing_address_line2_encrypted = CASE 
      WHEN p_billing_address_line2 IS NOT NULL THEN encrypt_pii_data(p_billing_address_line2)
      ELSE public.user_billing_info.billing_address_line2_encrypted
    END,
    billing_city_encrypted = CASE 
      WHEN p_billing_city IS NOT NULL THEN encrypt_pii_data(p_billing_city)
      ELSE public.user_billing_info.billing_city_encrypted
    END,
    billing_state_encrypted = CASE 
      WHEN p_billing_state IS NOT NULL THEN encrypt_pii_data(p_billing_state)
      ELSE public.user_billing_info.billing_state_encrypted
    END,
    billing_postal_code_encrypted = CASE 
      WHEN p_billing_postal_code IS NOT NULL THEN encrypt_pii_data(p_billing_postal_code)
      ELSE public.user_billing_info.billing_postal_code_encrypted
    END,
    billing_country_encrypted = CASE 
      WHEN p_billing_country IS NOT NULL THEN encrypt_pii_data(p_billing_country)
      ELSE public.user_billing_info.billing_country_encrypted
    END,
    billing_phone_encrypted = CASE 
      WHEN p_billing_phone IS NOT NULL THEN encrypt_pii_data(p_billing_phone)
      ELSE public.user_billing_info.billing_phone_encrypted
    END,
    billing_email_encrypted = CASE 
      WHEN p_billing_email IS NOT NULL THEN encrypt_pii_data(p_billing_email)
      ELSE public.user_billing_info.billing_email_encrypted
    END,
    billing_organization_encrypted = CASE 
      WHEN p_billing_organization IS NOT NULL THEN encrypt_pii_data(p_billing_organization)
      ELSE public.user_billing_info.billing_organization_encrypted
    END,
    encryption_key_id = 'pgsodium_v1',
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
$$;

-- Secure the payment_config table with encryption
ALTER TABLE public.payment_config 
ADD COLUMN IF NOT EXISTS bank_name_encrypted text,
ADD COLUMN IF NOT EXISTS bank_account_name_encrypted text,
ADD COLUMN IF NOT EXISTS bank_account_number_encrypted text,
ADD COLUMN IF NOT EXISTS bank_swift_code_encrypted text,
ADD COLUMN IF NOT EXISTS business_email_encrypted text;

-- Create secure payment config function
CREATE OR REPLACE FUNCTION public.get_payment_config_secure()
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
        PERFORM log_security_event('payment_config_unauthorized', auth.uid());
        RAISE EXCEPTION 'SECURITY VIOLATION: Payment configuration access denied'
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
        'payment_config_decrypt_access',
        true,
        inet_client_addr()
    );
    
    -- Return decrypted banking data
    SELECT jsonb_build_object(
        'bank_name', decrypt_pii_data(bank_name_encrypted),
        'bank_account_name', decrypt_pii_data(bank_account_name_encrypted),
        'bank_account_number', decrypt_pii_data(bank_account_number_encrypted),
        'bank_swift_code', decrypt_pii_data(bank_swift_code_encrypted),
        'business_email', decrypt_pii_data(business_email_encrypted)
    ) INTO config_data
    FROM public.payment_config
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(config_data, '{}'::jsonb);
END;
$$;

-- Update payment config insert/update function
CREATE OR REPLACE FUNCTION public.update_payment_config_secure(
  p_bank_name text,
  p_bank_account_name text,
  p_bank_account_number text,
  p_bank_swift_code text DEFAULT NULL,
  p_business_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins to update payment config
  IF NOT is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update payment configuration'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the update
  PERFORM log_security_event('payment_config_update', auth.uid());
  
  -- Insert or update with encryption
  INSERT INTO public.payment_config (
    bank_name_encrypted,
    bank_account_name_encrypted,
    bank_account_number_encrypted,
    bank_swift_code_encrypted,
    business_email_encrypted
  ) VALUES (
    encrypt_pii_data(p_bank_name),
    encrypt_pii_data(p_bank_account_name),
    encrypt_pii_data(p_bank_account_number),
    encrypt_pii_data(p_bank_swift_code),
    encrypt_pii_data(p_business_email)
  );
  
  RETURN true;
END;
$$;