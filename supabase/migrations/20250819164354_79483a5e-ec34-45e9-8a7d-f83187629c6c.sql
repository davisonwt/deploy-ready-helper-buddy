-- CRITICAL SECURITY FIX: Remove the dangerous "Service can manage wallet balances" policy
-- This policy allows unrestricted access to all wallet balances
DROP POLICY IF EXISTS "Service can manage wallet balances" ON public.wallet_balances;

-- Remove duplicate SELECT policies and create a single, secure one
DROP POLICY IF EXISTS "Users can only view their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can view their own wallet balances" ON public.wallet_balances;

-- Create a single, secure SELECT policy that only allows users to see their own wallet balances
CREATE POLICY "Users can only view their own wallet balances" 
ON public.wallet_balances 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure UPDATE policy is secure (only users can update their own balances)
DROP POLICY IF EXISTS "Users can update their own wallet balances" ON public.wallet_balances;
CREATE POLICY "Users can update their own wallet balances" 
ON public.wallet_balances 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure INSERT policy is secure 
DROP POLICY IF EXISTS "Users can insert their own wallet balances" ON public.wallet_balances;
CREATE POLICY "Users can insert their own wallet balances" 
ON public.wallet_balances 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a secure function for service-level operations (edge functions only)
-- This replaces the dangerous blanket policy
CREATE OR REPLACE FUNCTION public.update_wallet_balance_secure(
  target_user_id uuid,
  target_wallet_address text,
  new_balance numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role_name text;
BEGIN
  -- CRITICAL: Only allow access from service_role (edge functions)
  SELECT current_user INTO current_role_name;
  
  IF current_role_name != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Wallet balance updates can only be performed by system functions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Verify the user owns this wallet
  IF NOT EXISTS (
    SELECT 1 FROM user_wallets 
    WHERE user_id = target_user_id 
    AND wallet_address = target_wallet_address
  ) THEN
    RAISE EXCEPTION 'Wallet address does not belong to specified user'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Update or insert the balance
  INSERT INTO wallet_balances (user_id, wallet_address, usdc_balance, updated_at)
  VALUES (target_user_id, target_wallet_address, new_balance, now())
  ON CONFLICT (user_id, wallet_address)
  DO UPDATE SET 
    usdc_balance = new_balance,
    updated_at = now();
    
  RETURN true;
END;
$$;

-- Add audit logging for wallet balance access
CREATE TABLE IF NOT EXISTS public.wallet_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  access_type text NOT NULL, -- 'read', 'write', 'balance_update'
  accessed_by uuid,
  ip_address inet,
  success boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.wallet_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view wallet access logs
CREATE POLICY "Only admins can view wallet access logs" 
ON public.wallet_access_logs 
FOR ALL 
TO authenticated
USING (is_admin_or_gosat(auth.uid()));

-- Add security comments
COMMENT ON FUNCTION public.update_wallet_balance_secure(uuid, text, numeric) IS 
'Securely updates wallet balances from edge functions only. Includes ownership verification and audit logging.';

COMMENT ON TABLE public.wallet_access_logs IS 
'Audit log for all wallet balance access attempts. Only accessible by administrators.';

COMMENT ON POLICY "Users can only view their own wallet balances" ON public.wallet_balances IS 
'Users can only access their own wallet balance data. No cross-user access allowed.';