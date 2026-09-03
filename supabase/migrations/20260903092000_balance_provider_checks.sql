-- S2G Balance — Stage 3: allow 'balance' wherever 'solana'/'paypal' was an
-- allowed order provider value (same pattern as 20260902210000_solana_pay_in.sql's
-- 'solana' addition). bestowals.provider carries no CHECK constraint
-- (confirmed against the live schema in that same earlier migration) --
-- nothing to widen there for gift/orchard.
ALTER TABLE public.basket_orders DROP CONSTRAINT basket_orders_provider_check;
ALTER TABLE public.basket_orders ADD CONSTRAINT basket_orders_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana', 'balance']));

ALTER TABLE public.content_purchases DROP CONSTRAINT content_purchases_provider_check;
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana', 'balance']));
