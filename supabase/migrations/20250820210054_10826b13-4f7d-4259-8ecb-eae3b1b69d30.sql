-- Remove the overly permissive policy that allows all authenticated users to view organization wallets
DROP POLICY IF EXISTS "Authenticated users can view organization wallets for payments" ON public.organization_wallets;

-- Create a secure function that returns only the wallet address needed for payments
-- This function will be accessible to authenticated users but only returns minimal payment info
CREATE OR REPLACE FUNCTION public.get_payment_wallet_address()
RETURNS TABLE(wallet_address text, supported_tokens text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only return the wallet address and supported tokens for active wallets
  -- No other sensitive organizational data is exposed
  RETURN QUERY
  SELECT 
    ow.wallet_address,
    ow.supported_tokens
  FROM public.organization_wallets ow
  WHERE ow.is_active = true
  ORDER BY ow.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users for the payment function
GRANT EXECUTE ON FUNCTION public.get_payment_wallet_address() TO authenticated;