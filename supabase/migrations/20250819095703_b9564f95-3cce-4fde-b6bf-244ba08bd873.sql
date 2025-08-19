-- Fix security vulnerability: Restrict wallet balance access to wallet owners only
-- Drop the overly permissive policy that allows any authenticated user to view all wallet balances
DROP POLICY IF EXISTS "Anyone can view wallet balances" ON public.wallet_balances;

-- Create a secure policy that only allows users to view balances for their own wallets
CREATE POLICY "Users can only view their own wallet balances" 
ON public.wallet_balances 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_wallets 
    WHERE user_wallets.wallet_address = wallet_balances.wallet_address 
    AND user_wallets.user_id = auth.uid()
  )
);

-- Keep the service policy for backend operations
-- The "Service can manage wallet balances" policy remains unchanged as it's needed for system operations