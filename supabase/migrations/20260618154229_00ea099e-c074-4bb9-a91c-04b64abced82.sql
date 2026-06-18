
-- =====================================================================
-- Security hardening: CRITICAL + HIGH findings from 2026-06-18 audit
-- =====================================================================

-- ---------- C1: wallet_balances — owner read-only ----------
DROP POLICY IF EXISTS "Users can insert their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can insert their wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update their wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can delete their wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can view their wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can view their own wallet balances" ON public.wallet_balances;
-- Keep the strict authenticated read policy; drop public-role duplicates.
-- "Users can only view their own wallet balances" (authenticated) is retained.
-- "Service role can manage wallet balances" and "Admins can manage wallet balances" are retained.

-- ---------- C2: sower_balances — owner read-only; payouts admin-only ----------
DROP POLICY IF EXISTS "Users can update their own balance" ON public.sower_balances;
DROP POLICY IF EXISTS "Users can update their own wallet settings" ON public.sower_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.sower_balances;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.sower_balances;
-- SELECT for owner stays. All writes go through service-role edge functions / triggers.
CREATE POLICY "Service role manages sower balances"
  ON public.sower_balances
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- sower_payouts: drop client INSERT; route through edge function (service role)
DROP POLICY IF EXISTS "Users can request their own payouts" ON public.sower_payouts;
CREATE POLICY "Service role manages sower payouts"
  ON public.sower_payouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- "Users can view their own payouts" SELECT policy is retained.

-- ---------- C3: product_bestowals — default status pending; restrict INSERT ----------
ALTER TABLE public.product_bestowals ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.product_bestowals ALTER COLUMN release_status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Users can create bestowals" ON public.product_bestowals;
CREATE POLICY "Users can create pending product bestowals"
  ON public.product_bestowals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = bestower_id
    AND status = 'pending'
    AND (release_status IS NULL OR release_status = 'pending')
  );

-- ---------- H1: bestowals — INSERT must be pending ----------
DROP POLICY IF EXISTS "Users can create bestowals" ON public.bestowals;
CREATE POLICY "Users can create pending bestowals"
  ON public.bestowals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = bestower_id
    AND payment_status = 'pending'
    AND (release_status IS NULL OR release_status = 'pending')
  );

-- ---------- H2: usdc_transactions — INSERT must be pending ----------
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.usdc_transactions;
CREATE POLICY "Users can insert pending usdc transactions"
  ON public.usdc_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- ---------- H3: organization_wallets — admin-only writes ----------
DROP POLICY IF EXISTS "Users can create their own wallets" ON public.organization_wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.organization_wallets;
DROP POLICY IF EXISTS "Users can view their own wallets only" ON public.organization_wallets;
-- Remaining policies: admin/gosat INSERT/UPDATE/DELETE/SELECT + "Gosats can manage organization wallets".
-- End-user wallets continue to live in public.user_wallets (untouched).

-- ---------- H4: profiles — consolidate overlapping policies ----------
-- can_access_user_data(uuid) = (auth.uid() = target OR is_admin_or_gosat(auth.uid())) — safe.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and gosat can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles for moderation" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile (full)" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile securely" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.can_access_user_data(user_id));

CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.can_access_user_data(user_id))
  WITH CHECK (public.can_access_user_data(user_id));
-- "Users can insert own profile" INSERT policy is retained.
