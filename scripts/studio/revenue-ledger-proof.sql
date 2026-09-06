-- Bookkeeping Phase 1: read-only proof of the revenue ledger after the
-- migration 20260906120000_revenue_ledger.sql. Same checks as the
-- migration's own proof, runnable any time.
--
-- Run: npx supabase db query --linked -f scripts/studio/revenue-ledger-proof.sql

SELECT kind, environment, count(*) AS rows, round(sum(amount), 2) AS total
FROM public.revenue_ledger
GROUP BY kind, environment
ORDER BY kind, environment;

SELECT
  (SELECT round(COALESCE(sum(amount), 0), 2) FROM public.revenue_ledger WHERE environment = 'live') AS live_net,
  (SELECT round(COALESCE(sum(amount), 0), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance') AS live_operating_net,
  (SELECT round(COALESCE(sum(amount), 0), 2) FROM public.revenue_ledger WHERE environment = 'devnet') AS devnet_net,
  (SELECT count(*) FROM public.revenue_ledger WHERE kind = 'sale_fee') AS sale_fee_rows,
  (SELECT count(*) FROM public.product_bestowals WHERE status = 'completed' AND COALESCE(s2g_fee, 0) > 0) AS completed_fee_rows,
  (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE kind = 'sale_fee') AS sale_fee_total,
  (SELECT round(sum(s2g_fee), 2) FROM public.product_bestowals WHERE status = 'completed' AND COALESCE(s2g_fee, 0) > 0) AS source_fee_total,
  (SELECT count(*) = 2 FROM public.revenue_ledger WHERE environment = 'devnet'
     AND source_id IN ('b3518c23-7ab5-4b7d-a527-eb212a96ceea', '904058fc-d4ce-4dbb-918e-8f089ecb6d19')) AS named_two_are_devnet,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'revenue_ledger_no_update_delete') AS append_only_trigger,
  has_function_privilege('authenticated', 'public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)', 'EXECUTE') AS record_revenue_authenticated_should_be_false,
  has_function_privilege('service_role', 'public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)', 'EXECUTE') AS record_revenue_service_role_should_be_true,
  has_table_privilege('authenticated', 'public.revenue_ledger', 'UPDATE') AS table_update_authenticated_should_be_false;

-- every ledger row next to its source, newest first
SELECT r.kind, r.environment, r.rail, r.amount, r.recognised_at::date AS recognised, left(r.source_id::text, 8) AS source, r.release_ref, left(r.notes, 60) AS notes
FROM public.revenue_ledger r
ORDER BY r.recognised_at DESC, r.created_at DESC;
