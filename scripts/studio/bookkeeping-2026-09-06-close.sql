-- Closing the books to the cent (2026-09-06, owner's decisions). Needs
-- migration 20260906170000_books_close_to_the_cent.sql first. Acts as the
-- owner's gosat account (Studio carries no JWT); every write is idempotent.
--
-- 1. The original hot-wallet seed: 1.000090 USDC from the owner's wallet
--    (EbSUvuE8...) on 2026-09-03 16:03:13 UTC, signature uQvYQnmc...
--    Recorded as float_in 1.00 dated when it actually moved. (The owner
--    remembered 2026-09-01; that was the wallet's creation and SOL funding.
--    The USDC seed is the first inbound on the wallet's USDC account.)
-- 2. -0.10 correction for the legacy 2025 sale fff9fdc6: recognised as live
--    income by the backfill, but the sale predates every wallet the books
--    track, so no cash backs it.
-- 3. Relabel the +0.60 reclass correction onto the PayPal rail: the fees it
--    restores are on PayPal sales and the money sits in PayPal. Append-only,
--    so a -0.60 (rail none) / +0.60 (rail paypal) pair with net 0.
-- Applied server-side 2026-09-06.

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '04754d57-d41d-4ea7-93df-542047a6785b', 'role', 'authenticated')::text, false);

-- 1. seed float
SELECT id, kind, wallet, amount_usd, occurred_at, left(reference, 12) AS ref
FROM public.record_treasury_movement(
  'float_in', 'hot', 1.00,
  'Original hot-wallet USDC seed: 1.000090 USDC from the owner''s wallet EbSUvuE8... on 2026-09-03 16:03:13 UTC (first inbound on the USDC account). S2G float, not income.',
  'USDC',
  'uQvYQnmcYENXhQ9ApGkPjs6AQU8qmoVB3kHhZZ6D2tsVMg8hdUThKzwcSNfwUEPGyyksUQiqAxsWN919rdxHZDg',
  'live',
  '2026-09-03 16:03:13+00')
WHERE NOT EXISTS (SELECT 1 FROM public.treasury_movements
                   WHERE reference = 'uQvYQnmcYENXhQ9ApGkPjs6AQU8qmoVB3kHhZZ6D2tsVMg8hdUThKzwcSNfwUEPGyyksUQiqAxsWN919rdxHZDg');

-- 2. legacy fee with no cash behind it
SELECT id, kind, environment, rail, amount
FROM public.record_revenue_correction(
  -0.10,
  'Legacy 2025-11-20 sale fff9fdc6-8a63-4d0f-a0ed-146ccca5df28: its 0.10 fee was backfilled as live income, but the sale predates the hot wallet, the Squad and the live PayPal flow, so no wallet the books track holds that cash. Written off so recognised revenue matches cash.',
  'legacy-fff9fdc6-no-cash-20260906',
  'live',
  '2025-11-20 00:00:00+00',
  'none');

-- 3. move the +0.60 reclass onto the PayPal rail (net 0)
SELECT id, kind, environment, rail, amount
FROM public.record_revenue_correction(
  -0.60,
  'Relabel: the +0.60 reclass of b3518c23 / 904058fc sale fees (reclass-b3518c23-904058fc-live-20260906) was written with rail none; the fees are on PayPal sales and the cash sits in PayPal. This row removes it from rail none; its pair adds it on rail paypal.',
  'reclass-b3518c23-904058fc-rail-none-out-20260906',
  'live',
  '2026-09-06 09:22:39+00',
  'none');
SELECT id, kind, environment, rail, amount
FROM public.record_revenue_correction(
  0.60,
  'Relabel: +0.60 reclass of b3518c23 / 904058fc sale fees on rail paypal, where the money sits. Pair of reclass-b3518c23-904058fc-rail-none-out-20260906.',
  'reclass-b3518c23-904058fc-rail-paypal-in-20260906',
  'live',
  '2026-09-06 09:22:39+00',
  'paypal');

-- proof
SELECT
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance') AS live_operating_net_expect_2_40,
  (SELECT jsonb_object_agg(rail, t) FROM (SELECT rail, round(sum(amount), 2) AS t FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance' GROUP BY rail) r) AS live_own_by_rail_expect_solana_0_60_paypal_1_80_none_0,
  (SELECT round(sum(amount_usd), 2) FROM public.treasury_movements WHERE wallet = 'hot' AND environment = 'live') AS hot_float_expect_16;
