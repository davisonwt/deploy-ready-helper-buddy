-- Members lost the ability to read their own payout wallets (SELECT was revoked
-- from authenticated during an earlier wallet_address hardening pass), which made
-- the Payout Settings page fail with "permission denied for table user_wallets".
-- Row-level security already restricts every command to auth.uid() = user_id,
-- so granting SELECT back only ever exposes a member's own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
REVOKE ALL ON public.user_wallets FROM anon;