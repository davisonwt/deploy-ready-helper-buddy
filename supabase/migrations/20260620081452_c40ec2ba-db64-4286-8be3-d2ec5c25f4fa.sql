ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_payout_method text
  CHECK (preferred_payout_method IS NULL OR preferred_payout_method IN ('nowpayments_crypto', 'paypal_email'));

COMMENT ON COLUMN public.profiles.preferred_payout_method IS
  'Sower-chosen default payout rail when multiple user_wallets rows exist across nowpayments_crypto + paypal_email. NULL = fall back to is_primary DESC, updated_at DESC.';