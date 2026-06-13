
-- 1) organization_wallets: revoke broad SELECT, grant only non-secret columns
REVOKE SELECT ON public.organization_wallets FROM anon, authenticated;

GRANT SELECT (
  id, wallet_name, wallet_address, wallet_type, blockchain,
  supported_tokens, is_active, merchant_id, user_id, created_at, updated_at
) ON public.organization_wallets TO authenticated;

-- 2) user_wallets: revoke broad SELECT, grant only non-secret columns
REVOKE SELECT ON public.user_wallets FROM anon, authenticated;

GRANT SELECT (
  id, user_id, wallet_address, wallet_type, is_active, is_primary, created_at, updated_at
) ON public.user_wallets TO authenticated;

-- service_role retains full access (was granted ALL previously); reassert for safety
GRANT ALL ON public.organization_wallets TO service_role;
GRANT ALL ON public.user_wallets TO service_role;

-- 3) provider_escrow_transactions: drop any existing INSERT policies, add strict one
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_escrow_transactions'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.provider_escrow_transactions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Only order parties can insert escrow transactions"
ON public.provider_escrow_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.provider_orders po
    WHERE po.id = order_id
      AND (
        po.buyer_id = auth.uid()
        OR po.provider_id IN (
          SELECT id FROM public.providers WHERE user_id = auth.uid()
        )
      )
  )
);
