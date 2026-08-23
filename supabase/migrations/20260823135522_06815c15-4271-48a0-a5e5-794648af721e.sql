ALTER TABLE public.crypto_payout_transfers
  ADD COLUMN IF NOT EXISTS amount_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS fx_rate numeric(18,8),
  ADD COLUMN IF NOT EXISTS fx_sources jsonb;

COMMENT ON COLUMN public.crypto_payout_transfers.amount_usd IS
  'What the recipient actually earned, in USD (the unit of account). For XRP the "amount" column is the XRP sent at fx_rate; for USDC the two match 1:1.';
COMMENT ON COLUMN public.crypto_payout_transfers.fx_rate IS
  'USD per 1 unit of the payout asset at send time. Null for USDC (always 1).';