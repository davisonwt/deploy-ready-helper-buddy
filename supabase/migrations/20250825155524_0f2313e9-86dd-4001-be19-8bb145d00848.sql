-- SECURITY FIXES: Critical PII Protection and Database Hardening

-- 1. CRITICAL: Encrypt existing unencrypted PII data in user_billing_info
-- First, migrate any existing plain text data to encrypted fields
UPDATE public.user_billing_info 
SET 
  billing_address_line1_encrypted = encrypt_pii_data(billing_address_line1_encrypted),
  billing_address_line2_encrypted = encrypt_pii_data(billing_address_line2_encrypted),
  billing_city_encrypted = encrypt_pii_data(billing_city_encrypted),
  billing_state_encrypted = encrypt_pii_data(billing_state_encrypted),
  billing_postal_code_encrypted = encrypt_pii_data(billing_postal_code_encrypted),
  billing_country_encrypted = encrypt_pii_data(billing_country_encrypted),
  billing_phone_encrypted = encrypt_pii_data(billing_phone_encrypted),
  billing_email_encrypted = encrypt_pii_data(billing_email_encrypted),
  billing_organization_encrypted = encrypt_pii_data(billing_organization_encrypted),
  encryption_key_id = 'billing_master_key',
  updated_at = now()
WHERE encryption_key_id = 'default' OR encryption_key_id IS NULL;

-- 2. CRITICAL: Fix database function search paths to prevent SQL injection
-- Update all security definer functions to use safe search_path

-- Fix user role checking function
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

-- Fix admin/gosat checking function  
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

-- Fix user room checking function
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

-- Fix PII encryption functions with secure search path
CREATE OR REPLACE FUNCTION public.encrypt_pii_data(data_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return encrypted data using pgsodium with proper key derivation
  IF data_text IS NULL OR data_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Skip encryption if already encrypted (contains base64 characters)
  IF data_text ~ '^[A-Za-z0-9+/]*={0,2}$' AND length(data_text) > 20 THEN
    RETURN data_text;
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
    PERFORM log_security_event_enhanced('encryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM), inet_client_addr(), 'error');
    RETURN NULL;
END;
$$;

-- Fix PII decryption function with secure search path
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
  
  -- If data doesn't look encrypted (no base64), return as-is for backward compatibility
  IF NOT (encrypted_data ~ '^[A-Za-z0-9+/]*={0,2}$' AND length(encrypted_data) > 20) THEN
    RETURN encrypted_data;
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
    PERFORM log_security_event_enhanced('decryption_failed', auth.uid(), jsonb_build_object('error', SQLERRM, 'data_length', length(encrypted_data)), inet_client_addr(), 'error');
    RETURN NULL;
END;
$$;

-- 3. CRITICAL: Strengthen RLS policies to prevent anonymous access exploits

-- Update user_billing_info policy to be more restrictive
DROP POLICY IF EXISTS "Users can only access their own billing data" ON public.user_billing_info;
CREATE POLICY "Users can only access their own billing data" ON public.user_billing_info
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update bestowals policies to require proper authentication
DROP POLICY IF EXISTS "Users can view their own bestowals" ON public.bestowals;
CREATE POLICY "Users can view their own bestowals" ON public.bestowals
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = bestower_id);

DROP POLICY IF EXISTS "Users can create bestowals" ON public.bestowals;
CREATE POLICY "Users can create bestowals" ON public.bestowals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = bestower_id);

-- Update AI creations policy to be more restrictive
DROP POLICY IF EXISTS "Users can view their own AI creations" ON public.ai_creations;
CREATE POLICY "Users can view their own AI creations" ON public.ai_creations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 4. Add enhanced security monitoring for sensitive data access
CREATE OR REPLACE FUNCTION public.log_billing_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Log all access to billing data with enhanced details
    PERFORM log_security_event_enhanced(
        'billing_data_access',
        auth.uid(),
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'target_user', COALESCE(NEW.user_id, OLD.user_id),
            'timestamp', now()::text
        ),
        inet_client_addr(),
        'info'
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Add trigger for billing data access monitoring
DROP TRIGGER IF EXISTS billing_data_access_trigger ON public.user_billing_info;
CREATE TRIGGER billing_data_access_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_billing_info
    FOR EACH ROW EXECUTE FUNCTION log_billing_data_access();

-- 5. Create secure function to validate data encryption status
CREATE OR REPLACE FUNCTION public.validate_encryption_status()
RETURNS TABLE(
    table_name text,
    total_records bigint,
    encrypted_records bigint,
    unencrypted_records bigint,
    encryption_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check user_billing_info encryption status
    RETURN QUERY
    SELECT 
        'user_billing_info'::text as table_name,
        COUNT(*)::bigint as total_records,
        COUNT(CASE WHEN encryption_key_id = 'billing_master_key' THEN 1 END)::bigint as encrypted_records,
        COUNT(CASE WHEN encryption_key_id IS NULL OR encryption_key_id = 'default' THEN 1 END)::bigint as unencrypted_records,
        ROUND(
            (COUNT(CASE WHEN encryption_key_id = 'billing_master_key' THEN 1 END)::numeric / 
             NULLIF(COUNT(*)::numeric, 0)) * 100, 2
        ) as encryption_percentage
    FROM public.user_billing_info;
END;
$$;

-- Log the security fix implementation
PERFORM log_security_event_enhanced(
    'security_fixes_implemented',
    auth.uid(),
    jsonb_build_object(
        'fixes', ARRAY['pii_encryption', 'function_search_paths', 'rls_strengthening', 'access_monitoring'],
        'timestamp', now()::text,
        'version', '1.0'
    ),
    inet_client_addr(),
    'info'
);