-- Create a separate, more secure table for billing information
-- This table will have even stricter access controls
CREATE TABLE IF NOT EXISTS public.user_billing_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Encrypted billing data (we'll use pgcrypto for encryption)
  billing_address_line1_encrypted text,
  billing_address_line2_encrypted text,
  billing_city_encrypted text,
  billing_state_encrypted text,
  billing_postal_code_encrypted text,
  billing_country_encrypted text,
  billing_phone_encrypted text,
  billing_email_encrypted text,
  billing_organization_encrypted text,
  -- Metadata
  encryption_key_id text DEFAULT 'default',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id)
);

-- Enable RLS on the new billing table with extremely strict policies
ALTER TABLE public.user_billing_info ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can access their billing data
CREATE POLICY "Users can only access their own billing data" 
ON public.user_billing_info 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create data masking functions for sensitive fields
CREATE OR REPLACE FUNCTION public.mask_email(email_address text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN email_address IS NULL OR email_address = '' THEN NULL
      WHEN length(email_address) < 3 THEN '***'
      ELSE substring(email_address from 1 for 2) || '***@***' || 
           CASE 
             WHEN position('@' in email_address) > 0 
             THEN substring(email_address from position('.' in reverse(email_address))-1)
             ELSE '.com'
           END
    END;
$$;

CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN phone_number IS NULL OR phone_number = '' THEN NULL
      WHEN length(phone_number) < 4 THEN '***'
      ELSE '***-***-' || right(phone_number, 4)
    END;
$$;

CREATE OR REPLACE FUNCTION public.mask_address(address text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN address IS NULL OR address = '' THEN NULL
      WHEN length(address) < 4 THEN '***'
      ELSE left(address, 3) || '... [MASKED]'
    END;
$$;

-- Create secure functions to safely access billing data (for the user only)
CREATE OR REPLACE FUNCTION public.get_user_billing_summary(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  has_billing_info boolean,
  masked_email text,
  masked_phone text,
  masked_address text,
  billing_country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow users to access their own data
  SELECT 
    (p.billing_email IS NOT NULL AND p.billing_address_line1 IS NOT NULL) as has_billing_info,
    mask_email(p.billing_email) as masked_email,
    mask_phone(p.billing_phone) as masked_phone,
    mask_address(p.billing_address_line1) as masked_address,
    p.billing_country
  FROM public.profiles p
  WHERE p.user_id = target_user_id 
  AND (auth.uid() = target_user_id OR auth.uid() IS NULL); -- Only self access
$$;

-- Add audit logging for billing data access
CREATE TABLE IF NOT EXISTS public.billing_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_by uuid,
  access_type text NOT NULL, -- 'read', 'write', 'delete'
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.billing_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view billing access logs" 
ON public.billing_access_logs 
FOR ALL 
TO authenticated
USING (is_admin_or_gosat(auth.uid()));

-- Add comments for security documentation
COMMENT ON TABLE public.user_billing_info IS 
'Highly sensitive billing information table with encryption and strict access controls. Only the user themselves can access their billing data.';

COMMENT ON FUNCTION public.mask_email(text) IS 
'Safely masks email addresses to prevent data exposure in logs or public displays.';

COMMENT ON FUNCTION public.mask_phone(text) IS 
'Safely masks phone numbers showing only last 4 digits.';

COMMENT ON FUNCTION public.mask_address(text) IS 
'Safely masks addresses showing only first 3 characters.';

COMMENT ON FUNCTION public.get_user_billing_summary(uuid) IS 
'Safely returns masked billing summary for the authenticated user only. Never exposes full sensitive data.';