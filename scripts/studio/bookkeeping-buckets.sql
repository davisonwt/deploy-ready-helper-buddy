-- BOOKKEEPING-PLAN.md section 1: where the money is, today. READ-ONLY.
-- Three buckets the database can account for, plus the raw fee totals that
-- nothing sums yet. Compare the "db_total" lines with the live wallet and
-- PayPal balances on /gosat/treasury; the difference is section 4's "gap".
--
-- Bucket A  held-for-members   earnings owed but not yet paid out
--                              (owed_payout_balances() + the parked S2G Balance ledger)
-- Bucket B  held-for-orchards  orchard_holdings in state held
-- Bucket C  S2G's own          15% fee on completed sales that are no longer owed to anyone,
--                              i.e. released (paid, credited, or legacy) -- NOT the fee on rows
--                              still held for an orchard. Until the revenue ledger exists this
--                              is computed from the source tables, not read from a ledger.

WITH owed AS (
  SELECT recipient_type, recipient_user_id, amount_usd FROM public.owed_payout_balances()
), parked AS (
  SELECT user_id, sum(amount) AS bal FROM public.balance_ledger GROUP BY user_id
), held AS (
  SELECT * FROM public.orchard_holdings WHERE status = 'held'
), fees AS (
  -- every place a 15% fee is written, by source, split into "already S2G's" vs "still held"
  SELECT 'product_bestowals' AS source,
         round(sum(CASE WHEN payout_status IN ('paid','credited_to_balance','legacy','pending') THEN s2g_fee ELSE 0 END), 2) AS fee_released,
         0::numeric AS fee_held,
         count(*) AS rows_completed
    FROM public.product_bestowals WHERE status = 'completed'
  UNION ALL
  SELECT 'content_purchases',
         round(sum(coalesce(platform_fee_amount, 0)), 2), 0, count(*)
    FROM public.content_purchases WHERE payment_status = 'completed'
  UNION ALL
  SELECT 'bestowals (gifts, no orchard)',
         round(sum(coalesce(base_amount, amount) - coalesce((distribution_data ->> 'sower_amount')::numeric, coalesce(base_amount, amount))), 2), 0, count(*)
    FROM public.bestowals WHERE payment_status IN ('completed','distributed') AND orchard_id IS NULL
  UNION ALL
  SELECT 'orchard_holdings (held)', 0, round(coalesce(sum(s2g_amount), 0), 2), count(*)
    FROM held
  UNION ALL
  SELECT 'orchard_holdings (released)', round(coalesce(sum(s2g_amount), 0), 2), 0, count(*)
    FROM public.orchard_holdings WHERE status = 'released'
  UNION ALL
  SELECT 'bookings', round(sum(coalesce(s2g_fee, 0)), 2), 0, count(*)
    FROM public.bookings WHERE status IN ('paid','completed','confirmed')
)
SELECT 'A. held-for-members: owed (old pipeline, owed_payout_balances)' AS line,
       round(coalesce(sum(amount_usd), 0), 2)::text AS db_total, count(*)::text AS detail FROM owed
UNION ALL
SELECT 'A. held-for-members: S2G Balance ledger (parked, withdrawable if the flag were on)',
       round(coalesce(sum(bal), 0), 2)::text, count(*)::text || ' members' FROM parked
UNION ALL
SELECT 'B. held-for-orchards: orchard_holdings held (gross, incl. the S2G share inside it)',
       round(coalesce(sum(gross_amount), 0), 2)::text, count(*)::text || ' holdings / ' || count(DISTINCT orchard_id)::text || ' orchards' FROM held
UNION ALL
SELECT 'B.   of which sower share / S2G share (both stay held)',
       round(coalesce(sum(sower_amount), 0), 2)::text || ' / ' || round(coalesce(sum(s2g_amount), 0), 2)::text, string_agg(rail || '/' || location, ',') FROM held
UNION ALL
SELECT 'C. S2G own: 15% on released sales, computed from source tables (no ledger yet)',
       round(sum(fee_released), 2)::text, string_agg(source || '=' || fee_released::text, ', ') FROM fees WHERE fee_released <> 0
UNION ALL
SELECT 'C.   fee written but still held for orchards (NOT S2G''s yet)',
       round(sum(fee_held), 2)::text, string_agg(source || '=' || fee_held::text, ', ') FROM fees WHERE fee_held <> 0
UNION ALL
SELECT 'D. what the DB says should exist across hot wallet + PayPal (A + B + C, ignoring gas float and processor fees)',
       round((SELECT coalesce(sum(amount_usd), 0) FROM owed) + (SELECT coalesce(sum(bal), 0) FROM parked)
             + (SELECT coalesce(sum(gross_amount), 0) FROM held) + (SELECT sum(fee_released) FROM fees), 2)::text,
       'compare with /gosat/treasury custody total'
UNION ALL
SELECT 'E. paid out so far (payouts table, status paid)',
       round(coalesce(sum(amount), 0), 2)::text, string_agg(coalesce(rail,'-') || '/' || coalesce(solana_cluster,'-'), ',') FROM public.payouts WHERE status = 'paid'
UNION ALL
SELECT 'F. swept to the Squad so far (treasury_sweeps)',
       round(coalesce(sum(amount_usdc), 0), 2)::text, count(*)::text || ' sweeps' FROM public.treasury_sweeps WHERE status = 'sent'
UNION ALL
SELECT 'G. Solana intents PAID on mainnet (inbound real money)',
       round(coalesce(sum(coalesce(received_amount_usdc, amount_usdc)), 0), 2)::text, count(*)::text || ' intents' FROM public.solana_payment_intents WHERE status = 'paid' AND cluster = 'mainnet-beta'
UNION ALL
SELECT 'G. Solana intents PAID on devnet (test money, must be excluded from every real figure)',
       round(coalesce(sum(coalesce(received_amount_usdc, amount_usdc)), 0), 2)::text, count(*)::text || ' intents' FROM public.solana_payment_intents WHERE status = 'paid' AND cluster = 'devnet';
