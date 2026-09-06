-- Part A (2026-09-06): two REAL earnings were marked paid by a devnet test
-- run on 2026-09-01. Same fix as Amber's 02c6b716 revert on 2026-09-05:
-- the earning goes back to the payout queue (payout_status pending, paid_at
-- cleared) and the devnet payouts row is marked failed with a note.
--
--   product_bestowals b3518c23-7ab5-4b7d-a527-eb212a96ceea  <- payouts 4b7274bd (davison.taljaard, 2.00, sig 3mjfNahG...)
--   product_bestowals 904058fc-d4ce-4dbb-918e-8f089ecb6d19  <- payouts 7fe7f2e6 (Amber, 2.00, sig 2B8KxTK7...)
--
-- Every UPDATE is guarded on the current state, so a re-run touches nothing.
-- The revenue_ledger is NOT changed: both sales are already tagged
-- environment = 'devnet' there, so live revenue is unaffected.
--
-- Run: npx supabase db query --linked -f scripts/studio/revert-devnet-earnings.sql

-- 1. earnings back to the queue
UPDATE public.product_bestowals
   SET payout_status = 'pending',
       paid_at = NULL,
       payout_reference = NULL
 WHERE id IN ('b3518c23-7ab5-4b7d-a527-eb212a96ceea', '904058fc-d4ce-4dbb-918e-8f089ecb6d19')
   AND payout_status = 'paid'
   AND paid_at::date = '2026-09-01'
RETURNING 'product_bestowals' AS touched, left(id::text, 8) AS id, payout_status, paid_at, payout_reference;

-- 2. the devnet payout rows are failures, not payments
UPDATE public.payouts
   SET status = 'failed',
       error = 'reverted 2026-09-06: devnet test settled a real mainnet-origin earning; earning returned to payout queue',
       updated_at = now()
 WHERE id IN (
         SELECT p.id FROM public.payouts p
          WHERE p.status = 'paid' AND p.solana_cluster = 'devnet'
            AND p.covered_rows @> '[{"source_table": "product_bestowals", "source_id": "b3518c23-7ab5-4b7d-a527-eb212a96ceea"}]'::jsonb
         UNION
         SELECT p.id FROM public.payouts p
          WHERE p.status = 'paid' AND p.solana_cluster = 'devnet'
            AND p.covered_rows @> '[{"source_table": "product_bestowals", "source_id": "904058fc-d4ce-4dbb-918e-8f089ecb6d19"}]'::jsonb)
RETURNING 'payouts' AS touched, left(id::text, 8) AS id, status, error, left(solana_tx_signature, 12) AS sig;

-- 3. proof
SELECT
  (SELECT string_agg(left(id::text, 8) || '=' || payout_status || '/paid_at=' || COALESCE(paid_at::text, 'null'), ', ')
     FROM public.product_bestowals
    WHERE id IN ('b3518c23-7ab5-4b7d-a527-eb212a96ceea', '904058fc-d4ce-4dbb-918e-8f089ecb6d19')) AS earnings_now,
  (SELECT string_agg(left(id::text, 8) || '=' || status, ', ') FROM public.payouts WHERE solana_cluster = 'devnet') AS devnet_payouts_now,
  (SELECT round(sum(amount_usd), 2) FROM public.owed_payout_balances()) AS owed_total_now,
  (SELECT count(*) FROM public.owed_payout_balances()) AS owed_recipients_now,
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'live') AS live_revenue_net_unchanged,
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance') AS live_operating_net_unchanged,
  (SELECT string_agg(left(source_id::text, 8) || '=' || environment, ', ') FROM public.revenue_ledger
    WHERE source_id IN ('b3518c23-7ab5-4b7d-a527-eb212a96ceea', '904058fc-d4ce-4dbb-918e-8f089ecb6d19')) AS ledger_tags_unchanged;
