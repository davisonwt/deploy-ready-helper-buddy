-- P0-5 Phase A devnet pocket test: BEFORE snapshot (read-only).
-- Run in Studio before the pocket is bestowed; download the CSV.
-- Same shape as phase-a-devnet-after.sql so the two line up side by side.

WITH o AS (
  SELECT id, filled_pockets, total_pockets, pocket_price, status
  FROM public.orchards
  WHERE id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'
), f AS (
  SELECT * FROM public.orchard_funding_status('55f4e02e-32fe-4013-aa7b-4eff6da77d37')
)
SELECT
  'before'                                                       AS snapshot,
  now()                                                          AS taken_at,
  o.status                                                       AS orchard_status,
  o.filled_pockets,
  o.total_pockets,
  o.pocket_price,
  f.target,
  f.held_total,
  f.pockets_held,
  f.funded,
  (SELECT count(*) FROM public.orchard_holdings h WHERE h.orchard_id = o.id)                      AS holdings_rows,
  (SELECT count(*) FROM public.orchard_holdings h WHERE h.orchard_id = o.id AND h.status = 'held') AS holdings_held,
  (SELECT count(*) FROM public.bestowals b WHERE b.orchard_id = o.id)                             AS bestowal_rows,
  (SELECT count(*) FROM public.bestowals b WHERE b.orchard_id = o.id AND b.payment_status = 'completed') AS bestowals_completed,
  -- sower = test account B (reassigned 2026-09-06); this total must be identical AFTER (no earning credit)
  (SELECT count(*)                 FROM public.balance_ledger l WHERE l.user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2') AS sower_ledger_rows,
  (SELECT COALESCE(sum(amount), 0) FROM public.balance_ledger l WHERE l.user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2') AS sower_ledger_total,
  -- what treasury-balances reports as "Held for orchards" (solana, hot wallet, held)
  (SELECT COALESCE(sum(gross_amount), 0) FROM public.orchard_holdings h
     WHERE h.status = 'held' AND h.rail = 'solana' AND h.location = 'hot_wallet')                   AS treasury_held_for_orchards,
  (SELECT count(*) FROM public.solana_payment_intents i WHERE i.order_kind = 'orchard')             AS orchard_solana_intents
FROM o, f;
