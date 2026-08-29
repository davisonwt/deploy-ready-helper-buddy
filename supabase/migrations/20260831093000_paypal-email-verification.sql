-- PayPal email OTP verification. Prerequisite for the unified payout system
-- (20260831090000) actually paying anyone — payout-earnings already refuses
-- to pay a user_wallets row with verified_at IS NULL; this is what sets it.
--
-- Codes are stored hashed (SHA-256), never in plaintext, same defense-in-
-- depth reasoning as a password. RLS enabled, no policies — service-role
-- only, same lockdown as processed_webhooks / paypal_reconcile_misses.
-- A row is scoped to one (user_id, email) attempt; a fresh "send" replaces
-- it rather than accumulating history, since only the latest code is ever
-- valid.
CREATE TABLE public.paypal_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX paypal_email_verifications_user_email_idx
  ON public.paypal_email_verifications (user_id, email);

ALTER TABLE public.paypal_email_verifications ENABLE ROW LEVEL SECURITY;
