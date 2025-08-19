-- CRITICAL SECURITY FIX: Secure payment_config table completely
-- Remove any potential access to payment_config table and secure the function

-- 1. Drop all existing policies on payment_config
DROP POLICY IF EXISTS "Block all client access to payment config" ON public.payment_config;
DROP POLICY IF EXISTS "Only admins can modify payment config" ON public.payment_config;
DROP POLICY IF EXISTS "Only admins can update payment config" ON public.payment_config;

-- 2. Create a much more restrictive policy that blocks ALL access from client applications
-- This ensures that even if there are bugs in the RLS system, access is denied
CREATE POLICY "payment_config_no_client_access" 
ON public.payment_config 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 3. Revoke all permissions from public role and authenticated role
REVOKE ALL ON public.payment_config FROM public;
REVOKE ALL ON public.payment_config FROM authenticated;
REVOKE ALL ON public.payment_config FROM anon;

-- 4. Only grant access to service_role (for edge functions)
GRANT SELECT ON public.payment_config TO service_role;

-- 5. Strengthen the get_payment_config_for_eft function to ensure it ONLY works in edge function context
CREATE OR REPLACE FUNCTION public.get_payment_config_for_eft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    config_data jsonb;
    current_role_name text;
BEGIN
    -- Get the current role to ensure this is called from service context
    SELECT current_user INTO current_role_name;
    
    -- CRITICAL: Only allow access from service_role (edge functions)
    -- This prevents any client-side access even if there are RLS bypasses
    IF current_role_name != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Payment configuration can only be accessed by system functions'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Double-check that we're in a secure context by verifying we have service role permissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE grantee = current_role_name 
        AND table_name = 'payment_config' 
        AND privilege_type = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Unauthorized access attempt to payment configuration'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
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
$function$;

-- 6. Revoke execute permissions from public roles on the function
REVOKE EXECUTE ON FUNCTION public.get_payment_config_for_eft() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_payment_config_for_eft() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_payment_config_for_eft() FROM anon;

-- 7. Only grant execute to service_role
GRANT EXECUTE ON FUNCTION public.get_payment_config_for_eft() TO service_role;

-- 8. Add additional security: Create a view that always returns empty for regular users
CREATE OR REPLACE VIEW public.payment_config_public AS
SELECT 
    id,
    'REDACTED' as bank_name,
    'REDACTED' as bank_account_name,
    'REDACTED' as bank_account_number,
    'REDACTED' as bank_swift_code,
    'REDACTED' as business_email,
    created_at,
    updated_at
FROM public.payment_config
WHERE false; -- This view will always return no rows

-- 9. Grant select on the safe view to authenticated users if needed for UI purposes
GRANT SELECT ON public.payment_config_public TO authenticated;