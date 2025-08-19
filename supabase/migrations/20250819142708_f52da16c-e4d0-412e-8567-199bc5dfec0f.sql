-- Allow authenticated users to view organization wallets for payment purposes
-- Wallet addresses are public by design and needed for payments
DROP POLICY IF EXISTS "Authenticated users can view organization wallets for payments" ON public.organization_wallets;

CREATE POLICY "Authenticated users can view organization wallets for payments" 
ON public.organization_wallets 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);