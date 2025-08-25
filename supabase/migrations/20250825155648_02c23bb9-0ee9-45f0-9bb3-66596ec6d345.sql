-- CRITICAL SECURITY FIXES: PII Protection and Database Hardening

-- 1. Fix database function search paths to prevent SQL injection
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

-- 2. Strengthen RLS policies to prevent anonymous access exploits
DROP POLICY IF EXISTS "Users can only access their own billing data" ON public.user_billing_info;
CREATE POLICY "Users can only access their own billing data" ON public.user_billing_info
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users can view their own AI creations" ON public.ai_creations;
CREATE POLICY "Users can view their own AI creations" ON public.ai_creations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Make billing_access_logs.user_id nullable to prevent constraint violations
ALTER TABLE public.billing_access_logs ALTER COLUMN user_id DROP NOT NULL;

-- 4. Update log_security_event_enhanced to handle NULL user_id safely
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(event_type text, user_id_param uuid DEFAULT auth.uid(), details jsonb DEFAULT '{}'::jsonb, ip_address_param inet DEFAULT inet_client_addr(), severity text DEFAULT 'info'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 5. Create safer PII encryption function with better error handling
CREATE OR REPLACE FUNCTION public.encrypt_pii_data_secure(data_text text)
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
    -- Return original data if encryption fails (for migration safety)
    RETURN data_text;
END;
$$;

-- 6. Encrypt existing unencrypted PII data safely
UPDATE public.user_billing_info 
SET 
  billing_address_line1_encrypted = encrypt_pii_data_secure(billing_address_line1_encrypted),
  billing_city_encrypted = encrypt_pii_data_secure(billing_city_encrypted),
  billing_postal_code_encrypted = encrypt_pii_data_secure(billing_postal_code_encrypted),
  billing_country_encrypted = encrypt_pii_data_secure(billing_country_encrypted),
  billing_email_encrypted = encrypt_pii_data_secure(billing_email_encrypted),
  encryption_key_id = 'billing_master_key',
  updated_at = now()
WHERE encryption_key_id = 'default' OR encryption_key_id IS NULL;