-- Fix organization_wallets: Remove platform wallet access from user policy
-- This prevents non-admin users from viewing s2gholding and s2gbestow wallet credentials

-- Drop and recreate the policy without platform wallet access
DROP POLICY IF EXISTS "Users can view their wallets or platform wallets" ON organization_wallets;

-- Users can ONLY view their own personal wallets, NOT platform wallets
CREATE POLICY "Users can view their own wallets only"
ON organization_wallets
FOR SELECT
USING (
  auth.uid() = user_id
);