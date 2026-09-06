-- P0-5 Phase C2 proof / state query. Safe to run any time (read-only).
-- Run: npx supabase db query --linked -f scripts/studio/phase-c-refund-proof.sql
--
-- 1. the cron job; 2. the last worker answer (pg_net); 3. every refund row;
-- 4. the Phase A test orchard 55f4e02e and its holding 2df2ff33 (the
--    devnet cancel/refund target); 5. refund_cost ledger rows.
SELECT jsonb_build_object(
  'cron', (SELECT jsonb_agg(jsonb_build_object('jobid', jobid, 'schedule', schedule, 'active', active, 'command', command))
             FROM cron.job WHERE jobname = 'orchard-refund-worker'),
  'last_worker_answers', (SELECT jsonb_agg(jsonb_build_object('id', id, 'status', status_code, 'created', created, 'body', left(content, 600)) ORDER BY id DESC)
             FROM (SELECT * FROM net._http_response WHERE content LIKE '%"cluster"%' AND content LIKE '%claimed%' ORDER BY id DESC LIMIT 3) r),
  'refund_rows', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'orchard', left(orchard_id::text, 8), 'holding', left(holding_id::text, 8),
                                    'rail', rail, 'amount', amount, 'dest', destination, 'status', status, 'attempts', attempts,
                                    'ref', rail_reference, 'env', environment, 'fee', fee_cost, 'err', last_error, 'created', created_at) ORDER BY created_at), '[]'::jsonb)
             FROM public.orchard_refunds),
  'phase_a_orchard', (SELECT jsonb_build_object('id', left(o.id::text, 8), 'title', o.title, 'funding_state', o.funding_state, 'cancelled_at', o.cancelled_at,
                                                 'cancel_reason', o.cancel_reason, 'filled', o.filled_pockets, 'total', o.total_pockets)
             FROM public.orchards o WHERE o.id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'),
  'phase_a_holding', (SELECT jsonb_build_object('id', left(h.id::text, 8), 'status', h.status, 'gross', h.gross_amount, 'rail', h.rail,
                                                 'payer', h.payer_address, 'payer_source', h.payer_source, 'refund_id', h.refund_id,
                                                 'in_sig', left(h.rail_reference, 16), 'env', public.payment_environment(b.provider, 'orchard', b.id))
             FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
            WHERE h.id = '2df2ff33-0000-0000-0000-000000000000'::uuid OR left(h.id::text, 8) = '2df2ff33'),
  'holdings_by_status', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.orchard_holdings GROUP BY status) s),
  'refund_cost_rows', (SELECT COALESCE(jsonb_agg(jsonb_build_object('amount', amount, 'env', environment, 'rail', rail, 'source', left(source_id::text, 8), 'notes', notes)), '[]'::jsonb)
             FROM public.revenue_ledger WHERE kind = 'refund_cost'),
  'cluster_secret_note', 'SOLANA_CLUSTER is read from secrets, not the DB: check with npx supabase secrets list',
  'now', now()
) AS proof;
