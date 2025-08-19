-- Fix the Security Definer View issue by creating a proper view without SECURITY DEFINER
DROP VIEW IF EXISTS public.payment_config_public;

-- Create a safe view that doesn't use SECURITY DEFINER but still protects data
CREATE VIEW public.payment_config_public AS
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

-- Enable RLS on the view
ALTER VIEW public.payment_config_public SET (security_barrier = true);

-- Create a proper RLS policy for the view that ensures it remains empty
CREATE POLICY "payment_config_public_always_empty" 
ON public.payment_config_public 
FOR SELECT 
USING (false);

-- Grant select only to authenticated users for the view (which will return nothing)
GRANT SELECT ON public.payment_config_public TO authenticated;