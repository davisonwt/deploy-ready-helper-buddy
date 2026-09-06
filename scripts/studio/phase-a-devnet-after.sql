-- P0-5 Phase A devnet pocket test: AFTER proof (read-only).
-- Run in Studio after the pocket is bestowed and the page shows success;
-- download the CSV. Three result sets:
--   1. the same summary row as phase-a-devnet-before.sql (compare side by side)
--   2. the new holding + its bestowal row (split, kind, address, signature, payout_status)
--   3. the sower's ledger rows written today (must be none from this bestowal)

-- 1. summary (identical shape to BEFORE)
WITH o AS (
  SELECT id, filled_pockets, total_pockets, pocket_price, status
  FROM public.orchards
  WHERE id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'
), f AS (
  SELECT * FROM public.orchard_funding_status('55f4e02e-32fe-4013-aa7b-4eff6da77d37')
)
SELECT
  'after'                                                        AS snapshot,
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
  (SELECT count(*)                 FROM public.balance_ledger l WHERE l.user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125') AS sower_ledger_rows,
  (SELECT COALESCE(sum(amount), 0) FROM public.balance_ledger l WHERE l.user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125') AS sower_ledger_total,
  (SELECT COALESCE(sum(gross_amount), 0) FROM public.orchard_holdings h
     WHERE h.status = 'held' AND h.rail = 'solana' AND h.location = 'hot_wallet')                   AS treasury_held_for_orchards,
  (SELECT count(*) FROM public.solana_payment_intents i WHERE i.order_kind = 'orchard')             AS orchard_solana_intents
FROM o, f;

-- 2. the holding and its bestowal
SELECT
  h.id                    AS holding_id,
  h.status                AS holding_status,
  h.pocket_type,
  h.pockets,
  h.gross_amount,
  h.sower_amount,
  h.s2g_amount,
  h.processor_fee,
  h.rail,
  h.location,
  h.rail_reference        AS signature,
  h.payer_address,
  h.delivery_address      AS holding_delivery_address,
  h.created_at            AS holding_created_at,
  b.id                    AS bestowal_id,
  b.payment_status,
  b.payout_status,        -- must be held_for_orchard
  b.base_amount,
  b.processor_fee_amount,
  b.buyer_total_amount,
  b.payment_reference     AS bestowal_signature,
  b.pocket_type           AS bestowal_pocket_type,
  b.delivery_address      AS bestowal_delivery_address,
  b.distribution_data ->> 'sower_amount' AS snapshot_sower_amount,
  (SELECT count(*) FROM public.balance_ledger l
     WHERE l.reference_table = 'bestowals' AND l.reference_id = b.id)   AS ledger_rows_for_this_bestowal, -- must be 0
  (SELECT string_agg(e.event || '@' || to_char(e.created_at, 'HH24:MI:SS'), ', ' ORDER BY e.created_at)
     FROM public.orchard_events e WHERE e.holding_id = h.id)             AS events
FROM public.orchard_holdings h
JOIN public.bestowals b ON b.id = h.bestowal_id
WHERE h.orchard_id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'
ORDER BY h.created_at DESC;

-- 3. any sower ledger movement today (expected: no rows)
SELECT id, amount, kind, reference_table, reference_id, notes, created_at
FROM public.balance_ledger
WHERE user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125'
  AND created_at >= date_trunc('day', now())
ORDER BY created_at DESC;
