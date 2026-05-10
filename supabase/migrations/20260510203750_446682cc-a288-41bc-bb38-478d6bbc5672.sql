
-- 1) Lock down wallet API credentials: revoke column-level access from anon/authenticated.
REVOKE SELECT (api_key, api_secret, merchant_id) ON public.user_wallets FROM anon, authenticated;
REVOKE SELECT (api_key, api_secret, merchant_id) ON public.organization_wallets FROM anon, authenticated;
REVOKE UPDATE (api_key, api_secret, merchant_id) ON public.user_wallets FROM anon;
REVOKE UPDATE (api_key, api_secret, merchant_id) ON public.organization_wallets FROM anon;
-- Authenticated users may still INSERT/UPDATE their own credentials (write-only, can't read back).
GRANT INSERT (api_key, api_secret, merchant_id) ON public.user_wallets TO authenticated;
GRANT UPDATE (api_key, api_secret, merchant_id) ON public.user_wallets TO authenticated;

-- Helper RPC: report whether the current user has stored credentials, without returning them.
CREATE OR REPLACE FUNCTION public.user_wallet_credentials_status()
RETURNS TABLE(has_api_key boolean, has_api_secret boolean, has_merchant_id boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (api_key IS NOT NULL AND length(api_key) > 0),
    (api_secret IS NOT NULL AND length(api_secret) > 0),
    (merchant_id IS NOT NULL AND length(merchant_id) > 0)
  FROM public.user_wallets
  WHERE user_id = auth.uid()
    AND wallet_type = 'binance_pay'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.user_wallet_credentials_status() TO authenticated;

-- 2) Remove plaintext password_hash from password_reset_requests; rely on Supabase Auth tokens.
ALTER TABLE public.password_reset_requests DROP COLUMN IF EXISTS password_hash;

-- 3) Realtime channel authorization: require authentication to subscribe / broadcast.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
