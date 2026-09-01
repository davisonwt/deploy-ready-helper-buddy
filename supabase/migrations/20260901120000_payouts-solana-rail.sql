-- Adds the Solana USDC rail to the existing `payouts` table (spec-payments.md
-- section 4/8). No new payout table, no new "who is owed what" function --
-- owed_payout_balances() stays the single source of truth; this only lets
-- payout-earnings record WHICH rail a given payout row went out on and,
-- for Solana, the on-chain signature that proves it.

ALTER TABLE public.payouts
  ADD COLUMN rail text NOT NULL DEFAULT 'paypal' CHECK (rail IN ('paypal', 'solana_usdc')),
  ADD COLUMN solana_tx_signature text;

-- A signature must never be attributable to two payout rows -- the same
-- protection payouts_paypal_item_id_idx gives the PayPal side.
CREATE UNIQUE INDEX payouts_solana_tx_signature_idx
  ON public.payouts (solana_tx_signature) WHERE solana_tx_signature IS NOT NULL;

CREATE INDEX payouts_rail_status_created_idx ON public.payouts (rail, status, created_at);
