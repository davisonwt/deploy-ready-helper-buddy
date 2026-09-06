-- Bookkeeping Phase 2: the full reconciliation from SQL alone, so the
-- owner can check /gosat/treasury against the database without trusting
-- the page. READ-ONLY.
--
-- The database cannot read wallets or PayPal. Enter the live balances in
-- the `assets` block below (they are printed on /gosat/treasury and by
-- the explorer), then run:
--   npx supabase db query --linked -f scripts/studio/bookkeeping-reconcile.sql
--
-- Values below are what was read on 2026-09-06 ~09:35 UTC (after the first mainnet payouts).

-- liability_snapshot() is gosat/admin-only; when this runs as the postgres role there is no JWT, so act as a gosat.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, false);

WITH assets(wallet, usdc) AS (VALUES
  ('hot',    12.62),   -- 6zbpF3HQ... mainnet USDC
  ('squad',  0.00),   -- BjBY4uCC... (no USDC account yet)
  ('launch', 0.00),   -- 13M2yVLW...
  ('uplift', 0.00),   -- 8Aj2bWN4...
  ('paypal', 0.00)    -- PayPal available balance, USD (live); 0 if unknown
), s AS (
  SELECT public.liability_snapshot('live') AS j
), v AS (
  SELECT public.treasury_verdict(
           (SELECT sum(usdc) FROM assets),
           (s.j->>'liabilities_total')::numeric,
           (s.j->'s2g_own'->>'operating_net')::numeric,
           (s.j->'unrecorded'->>'solana_processor_fees')::numeric,
           (s.j->'recorded_float'->>'total')::numeric) AS r
    FROM s
)
SELECT line, value FROM (
  SELECT 1 AS n, 'A. held for members: owed via pipeline'            AS line, s.j->'held_for_members'->'owed'->>'total'   AS value FROM s
  UNION ALL SELECT 2,  'A.   by rail',                                        (s.j->'held_for_members'->'owed'->'by_rail')::text FROM s
  UNION ALL SELECT 3,  'A. held for members: parked S2G Balance',             s.j->'held_for_members'->'parked'->>'total' FROM s
  UNION ALL SELECT 4,  'A. total held for members',                           s.j->'held_for_members'->>'total' FROM s
  UNION ALL SELECT 5,  'B. held for orchards (gross)',                        s.j->'held_for_orchards'->>'total' FROM s
  UNION ALL SELECT 6,  'B.   by location/rail',                               (s.j->'held_for_orchards'->'by_location')::text FROM s
  UNION ALL SELECT 7,  'TOTAL LIABILITY (A + B)',                             s.j->>'liabilities_total' FROM s
  UNION ALL SELECT 8,  'C. S2G own, recognised operating net (ledger, live)', s.j->'s2g_own'->>'operating_net' FROM s
  UNION ALL SELECT 9,  'C.   net incl. opening balance',                      s.j->'s2g_own'->>'net' FROM s
  UNION ALL SELECT 10, 'C.   this month',                                     s.j->'s2g_own'->>'this_month' FROM s
  UNION ALL SELECT 11, 'unrecorded S2G own: Solana processor fees',           s.j->'unrecorded'->>'solana_processor_fees' FROM s
  UNION ALL SELECT 12, 'recorded float (treasury_movements)',                 s.j->'recorded_float'->>'total' FROM s
  UNION ALL SELECT 13, 'swept to Squad',                                      s.j->>'swept_to_squad' FROM s
  UNION ALL SELECT 14, 'aging',                                               (s.j->'aging')::text FROM s
  UNION ALL SELECT 15, 'other environments (test money, excluded above)',     (s.j->'other_environments')::text FROM s
  UNION ALL SELECT 16, 'ASSETS entered above (sum)',                          (SELECT sum(usdc)::text FROM assets)
  UNION ALL SELECT 17, 'expected assets = liabilities + own + unrecorded + float', v.r->>'expected_assets' FROM v
  UNION ALL SELECT 18, 'unexplained = assets - expected',                     v.r->>'unexplained' FROM v
  UNION ALL SELECT 19, 'VERDICT',                                             v.r->>'verdict' || ' (shortfall ' || (v.r->>'shortfall') || ', tolerance ' || (v.r->>'tolerance') || ', beyond tolerance ' || (v.r->>'unexplained_beyond_tolerance') || ')' FROM v
) t ORDER BY n;

-- who is owed what, with rail and age
SELECT r->>'name' AS recipient, r->>'type' AS type, (r->>'amount')::numeric AS amount, r->>'rail' AS rail,
       (r->>'days_waiting')::int AS days_waiting, (r->>'oldest_row_at')::timestamptz::date AS oldest_row
FROM public.liability_snapshot('live') s, jsonb_array_elements(s->'recipients') r
ORDER BY amount DESC;

-- orchards holding money
SELECT r->>'title' AS orchard, r->>'sower' AS sower, (r->>'held')::numeric AS held, (r->>'target')::numeric AS target,
       (r->>'pockets_held')::int || '/' || (r->>'pockets_total')::int AS pockets, (r->>'days_open')::int AS days_open
FROM public.liability_snapshot('live') s, jsonb_array_elements(s->'orchards') r
ORDER BY held DESC;
