-- CRITICAL SECURITY FIX: Secure payment_config table access
-- This table contains sensitive banking information and needs to be locked down

-- First, revoke all existing access to payment_config
REVOKE ALL ON public.payment_config FROM PUBLIC;
REVOKE ALL ON public.payment_config FROM authenticated;
REVOKE ALL ON public.payment_config FROM anon;

-- Update RLS policy to be more restrictive (only service role via functions)
DROP POLICY IF EXISTS "payment_config_absolute_security_deny" ON public.payment_config;

CREATE POLICY "payment_config_service_only" ON public.payment_config
FOR ALL 
USING (false)
WITH CHECK (false);

-- Log this critical security fix
INSERT INTO public.billing_access_logs (
  user_id,
  accessed_by, 
  access_type,
  success
) VALUES (
  NULL,
  NULL,
  'security_hardening:payment_config_locked_down',
  true
);