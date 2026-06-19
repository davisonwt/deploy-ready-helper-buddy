-- =========================================================================
-- Part 1: Schema additions for multi-provider payments + sower payouts
-- =========================================================================

-- ---- bestowals: provider, fee transparency, payout tracking ----
ALTER TABLE public.bestowals
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS base_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS processor_fee_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processor_fee_currency text,
  ADD COLUMN IF NOT EXISTS buyer_total_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payout_provider text,
  ADD COLUMN IF NOT EXISTS payout_destination text,
  ADD COLUMN IF NOT EXISTS payout_currency text,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payout_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_error text;

CREATE INDEX IF NOT EXISTS bestowals_provider_idx
  ON public.bestowals (provider);
CREATE INDEX IF NOT EXISTS bestowals_provider_order_idx
  ON public.bestowals (provider, provider_order_id);
CREATE INDEX IF NOT EXISTS bestowals_payout_status_idx
  ON public.bestowals (payout_status) WHERE payout_status <> 'sent';

-- ---- user_wallets: allow new wallet types + payout metadata ----
-- Preserves all existing wallet_type values (incl. 'phantom') and adds the new ones.
ALTER TABLE public.user_wallets
  DROP CONSTRAINT IF EXISTS user_wallets_wallet_type_check;

ALTER TABLE public.user_wallets
  ADD CONSTRAINT user_wallets_wallet_type_check
  CHECK (wallet_type IN (
    'binance_pay', 'binance', 'binance_pay_id', 'phantom',
    'nowpayments_crypto', 'paypal_email'
  ));

ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS payout_currency text,
  ADD COLUMN IF NOT EXISTS network text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method text;

CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_one_primary_per_type
  ON public.user_wallets (user_id, wallet_type)
  WHERE is_primary = true;