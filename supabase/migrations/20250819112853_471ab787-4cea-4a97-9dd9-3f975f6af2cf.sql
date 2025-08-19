-- Remove the problematic view and ensure payment_config is completely secured
DROP VIEW IF EXISTS public.payment_config_public CASCADE;

-- Verify that the payment_config table is properly secured
-- The table should already have the restrictive policy, but let's make sure

-- Check if the current policy exists, if not create it
DO $$
BEGIN
    -- Drop any existing policies and recreate the most restrictive one
    DROP POLICY IF EXISTS "payment_config_no_client_access" ON public.payment_config;
    
    -- Create the most restrictive policy possible
    CREATE POLICY "payment_config_absolute_deny" 
    ON public.payment_config 
    FOR ALL 
    TO public, authenticated, anon
    USING (false) 
    WITH CHECK (false);
    
    -- Ensure no permissions are granted to client roles
    REVOKE ALL ON public.payment_config FROM public;
    REVOKE ALL ON public.payment_config FROM authenticated;
    REVOKE ALL ON public.payment_config FROM anon;
    
    -- Only service_role should have access for edge functions
    GRANT SELECT ON public.payment_config TO service_role;
END
$$;