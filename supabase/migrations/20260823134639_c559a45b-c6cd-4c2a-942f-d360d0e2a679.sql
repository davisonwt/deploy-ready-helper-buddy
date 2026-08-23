COMMENT ON TABLE public.whisperer_payout_wallets IS
  'DEPRECATED — do not use. Whisperer payouts read profiles.payout_network / payout_address / payout_tag / payout_wallet_type, the same config sowers use, so one person has one payout setup. Kept only to avoid data loss; table is empty.';

REVOKE INSERT, UPDATE, DELETE ON public.whisperer_payout_wallets FROM anon, authenticated;