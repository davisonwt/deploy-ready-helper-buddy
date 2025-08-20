-- Fix critical security vulnerability in payment_transactions table
-- Remove the overly permissive policy that allows unrestricted access
DROP POLICY IF EXISTS "Service can manage payment transactions" ON public.payment_transactions;

-- Create a secure policy that only allows service_role to manage payment transactions
-- This follows the same security pattern used in other sensitive functions
CREATE POLICY "Service role can manage payment transactions" ON public.payment_transactions
  FOR ALL
  USING (
    -- Only allow service_role (edge functions) to manage payment transactions
    current_setting('role') = 'service_role'
  )
  WITH CHECK (
    -- Double-check on inserts/updates
    current_setting('role') = 'service_role'
  );

-- Ensure the existing user policy remains intact for users to view their own transactions
-- (This policy already exists and is secure)

-- Add a comment to document the security requirement
COMMENT ON POLICY "Service role can manage payment transactions" ON public.payment_transactions IS 
'SECURITY: Only service_role (edge functions) can insert, update, or delete payment transactions. This prevents client-side manipulation of payment data.';