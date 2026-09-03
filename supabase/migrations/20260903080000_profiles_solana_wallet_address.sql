-- New field for the Solana fallback payment matcher (checkAndFinalizeSolanaIntent):
-- "a Solana address this person is known to control." Deliberately separate
-- from profiles.payout_address (payout_network='solana_usdc') -- that field
-- is where a person wants to RECEIVE payouts, which is commonly a different
-- wallet than the one they actually pay FROM (confirmed live: davison's
-- payout_address is 3yf8t5z...; the wallet he manually sent a real USDC
-- payment from was EbSUvuE8... -- his Squad-signing wallet, not his payout
-- address). Reusing payout_address for this would have silently failed to
-- match that exact case.
--
-- No self-serve UI yet to set this (out of scope for this change) -- for
-- now it's set by direct ops action when a manual send needs matching, same
-- as any other one-off recovery. Full cryptographic validation (decodes to
-- a real 32-byte ed25519 key) happens app-side via validateSolanaAddress,
-- same convention as payout_address; this is just a cheap format guard.
ALTER TABLE public.profiles
  ADD COLUMN solana_wallet_address text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_solana_wallet_address_format
  CHECK (solana_wallet_address IS NULL OR length(solana_wallet_address) BETWEEN 32 AND 44);
