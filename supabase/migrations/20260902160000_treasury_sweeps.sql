-- Wallet-hardening audit item 1 ("propose a float ceiling if none is
-- documented... add a sweep... log every sweep"). spec-payments.md
-- section 2 already calls for this ("a scheduled sweep moves S2G's cut
-- from hot wallet to Squad") and lists it as an open question in section
-- 7 ("sweep threshold and cadence?") -- this is that decision, recorded
-- the same way spec-payments.md records its other numeric decisions
-- (see MIN_CRYPTO_BESTOWAL_USD's own history there).
--
-- Ceiling proposed at $500: real payout-earnings volume today is
-- $2-4/person, ~$12 total owed (see that function's own comment) -- $500
-- is roughly 40x current total float, enough headroom for real organic
-- growth before this needs revisiting, while still meaning a compromised
-- key or a runaway bug can't expose more than that before the sweep
-- (sweep-hot-wallet edge function, run on the same cron cadence as
-- payout-earnings) moves the excess out to the Squad. Overridable via
-- HOT_WALLET_CEILING_USD without a redeploy, same pattern as
-- SOLANA_MAX_PER_TX_USD / SOLANA_MAX_DAILY_USD.
--
-- Structurally separate from payouts (spec-payments.md section 9: held
-- balances must stay distinguishable from S2G's own money, "in the
-- wallet layout AND in the ledger, not just conceptually") -- this is
-- its own table, not a payouts row with a different rail.
CREATE TABLE public.treasury_sweeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address text NOT NULL,
  to_address text NOT NULL,
  amount_usdc numeric NOT NULL,
  balance_before_usdc numeric NOT NULL,
  ceiling_usd numeric NOT NULL,
  solana_cluster text NOT NULL,
  solana_tx_signature text,
  status text NOT NULL CHECK (status IN ('swept', 'failed')),
  error text,
  triggered_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treasury_sweeps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_sweeps_gosat_select" ON public.treasury_sweeps
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

-- No INSERT/UPDATE policy for authenticated: written only by the
-- sweep-hot-wallet edge function via the service-role key.
