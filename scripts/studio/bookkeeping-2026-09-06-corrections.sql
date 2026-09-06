-- Bookkeeping corrections after the first real mainnet payouts (2026-09-06).
-- Applied server-side 2026-09-06 ~09:40 UTC. Run once in Studio as the owner if ever needed again. Both functions are gosat-only and stamp
-- created_by = auth.uid(); Studio has no JWT, so the first statement acts as
-- the owner's own gosat account (davison.taljaard, 04754d57...). Every write
-- is idempotent: a re-run inserts nothing new.
--
-- 1. Move the sale fees of b3518c23 and 904058fc from devnet to live.
--    They were tagged devnet on 2026-09-06 because their EARNINGS had been
--    settled with devnet tokens on 2026-09-01. Those earnings were reverted
--    and then paid for real on mainnet at 09:22 UTC today (payouts 1477bdd4
--    and 115a75cc), and the sales themselves were live PayPal money, so
--    S2G's 0.30 + 0.30 belongs in live revenue. The ledger is append-only:
--    two correction rows, -0.60 devnet and +0.60 live, never an edit.
-- (The float row lives in bookkeeping-2026-09-06-float.sql.)

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '04754d57-d41d-4ea7-93df-542047a6785b', 'role', 'authenticated')::text, false);

-- 1a. take the two fees out of devnet
SELECT id, kind, environment, amount, notes
FROM public.record_revenue_correction(
  -0.60,
  'Reclassify sale_fee for product_bestowals b3518c23-7ab5-4b7d-a527-eb212a96ceea and 904058fc-d4ce-4dbb-918e-8f089ecb6d19 out of devnet: their earnings were paid for real on mainnet 2026-09-06 (payouts 1477bdd4, 115a75cc); the sales were live PayPal money. Pair of reclass-devnet-to-live-20260906.',
  'reclass-b3518c23-904058fc-devnet-20260906',
  'devnet',
  '2026-09-06 09:22:39+00');

-- 1b. put them into live
SELECT id, kind, environment, amount, notes
FROM public.record_revenue_correction(
  0.60,
  'Reclassify sale_fee for product_bestowals b3518c23-7ab5-4b7d-a527-eb212a96ceea and 904058fc-d4ce-4dbb-918e-8f089ecb6d19 into live: 0.30 + 0.30 recognised 2026-08-28 / 2026-08-29 on live PayPal sales; earnings paid on mainnet 2026-09-06. Pair of reclass-devnet-to-live-20260906.',
  'reclass-b3518c23-904058fc-live-20260906',
  'live',
  '2026-09-06 09:22:39+00');

-- proof
SELECT
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance') AS live_operating_net_expect_2_50,
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'devnet') AS devnet_net_expect_0_90,
  (SELECT count(*) FROM public.revenue_ledger WHERE kind = 'correction') AS correction_rows_expect_2;
