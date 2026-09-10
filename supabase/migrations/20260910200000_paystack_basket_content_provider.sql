-- Paystack rail expansion: basket orders (products, album builder), content
-- purchases (music tracks, library items, premium items/rooms, session
-- media) and bookings now accept "paystack" as a provider, alongside the
-- gift/orchard bestowal surfaces already widened in 20260910190000.
--
-- bookings.provider carries no CHECK constraint (plain text, added by
-- 20260829290000_bookings-paypal-columns.sql) -- nothing to widen there.

ALTER TABLE public.basket_orders DROP CONSTRAINT basket_orders_provider_check;
ALTER TABLE public.basket_orders ADD CONSTRAINT basket_orders_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana', 'balance', 'paystack']));

ALTER TABLE public.content_purchases DROP CONSTRAINT content_purchases_provider_check;
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana', 'balance', 'paystack']));

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'basket_orders_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'basket_orders_provider_check')),
  'content_purchases_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'content_purchases_provider_check'))
) AS proof;
