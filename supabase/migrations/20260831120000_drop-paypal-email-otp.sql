-- Decision change: no email OTP for PayPal payout verification. Replaced by
-- "Connect with PayPal" (Log in with PayPal / Identity API) — see
-- paypal-connect and the paypal_payer_id column added below. PayPal itself
-- now asserts the verified email; there's nothing left for
-- paypal_email_verifications to track.
DROP TABLE public.paypal_email_verifications;

-- Set by paypal-connect after a successful OAuth identity exchange —
-- PayPal's own account id for the connected wallet, alongside the email
-- already stored in wallet_address.
ALTER TABLE public.user_wallets ADD COLUMN paypal_payer_id text;
