-- processed_webhooks_provider_check only ever allowed 'binance_pay'/'stripe'/
-- 'other' — a leftover from an earlier payment system, never updated when
-- paypal-webhook and nowpayments-webhook started inserting provider='paypal'/
-- 'nowpayments'. Every insert from either function has violated this
-- constraint since they were written; neither ever checked the insert's
-- error, so the failure was completely silent. This is why
-- processed_webhooks has been 0 rows all session regardless of whether the
-- webhooks themselves were working — confirmed live: basket_orders
-- 0a6a0b1a-a799-4a7e-a287-249e142af78c finalized at 08:36:53 UTC via a
-- paypal-webhook call that returned 200 with no verification failure
-- logged, and still left no row here.
ALTER TABLE public.processed_webhooks DROP CONSTRAINT processed_webhooks_provider_check;
ALTER TABLE public.processed_webhooks ADD CONSTRAINT processed_webhooks_provider_check
  CHECK (provider = ANY (ARRAY['binance_pay', 'stripe', 'other', 'paypal', 'nowpayments']));
