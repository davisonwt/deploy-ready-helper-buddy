-- Signature-first payment checking (2026-09-04): the client records the
-- signature Phantom returns at send time, so the watcher can verify that
-- exact transaction with one getTransaction call instead of depending on
-- getSignaturesForAddress (which the public RPC intermittently fails with
-- "Failed to query long-term storage" -- the failure that hung a real
-- payment watch today). Also lets a late-confirming payment be credited
-- after intent expiry (checkAndFinalizeSolanaIntent now re-checks expired
-- intents; the sweep covers the last 24h of them).
ALTER TABLE public.solana_payment_intents
  ADD COLUMN IF NOT EXISTS client_signature text;
