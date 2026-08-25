ALTER TABLE public.whisperer_earnings
  ADD COLUMN IF NOT EXISTS payout_fx_rate numeric(18,8),
  ADD COLUMN IF NOT EXISTS payout_fx_observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_amount_xrp numeric(18,6),
  ADD COLUMN IF NOT EXISTS payout_fx_sources jsonb;

COMMENT ON COLUMN public.whisperer_earnings.payout_fx_rate IS
  'USD per 1 XRP actually used when this earning was paid on the XRP rail. NULL for USDC/USD payouts (1:1). Audit trail: amount / payout_fx_rate = payout_amount_xrp.';
COMMENT ON COLUMN public.whisperer_earnings.payout_fx_observed_at IS
  'When the XRP/USD rate in payout_fx_rate was observed from the live price feeds.';
COMMENT ON COLUMN public.whisperer_earnings.payout_amount_xrp IS
  'XRP actually sent for this earning at payout_fx_rate.';
COMMENT ON COLUMN public.whisperer_earnings.payout_fx_sources IS
  'The individual venue prices (coinbase/kraken/bitstamp) whose median produced payout_fx_rate.';

ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS payout_fx_rate numeric(18,8),
  ADD COLUMN IF NOT EXISTS payout_fx_observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_amount_xrp numeric(18,6),
  ADD COLUMN IF NOT EXISTS payout_fx_sources jsonb;

COMMENT ON COLUMN public.product_bestowals.payout_fx_rate IS
  'USD per 1 XRP actually used when the sower share of this bestowal was paid on the XRP rail. NULL for USDC/USD payouts (1:1).';
COMMENT ON COLUMN public.product_bestowals.payout_fx_observed_at IS
  'When the XRP/USD rate in payout_fx_rate was observed from the live price feeds.';
COMMENT ON COLUMN public.product_bestowals.payout_amount_xrp IS
  'XRP actually sent for the sower share of this bestowal at payout_fx_rate.';
COMMENT ON COLUMN public.product_bestowals.payout_fx_sources IS
  'The individual venue prices whose median produced payout_fx_rate.';