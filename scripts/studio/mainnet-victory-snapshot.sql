-- Mainnet victory lap: BEFORE/AFTER snapshot (read-only). Run any time.
-- Run: npx supabase db query --linked -f scripts/studio/mainnet-victory-snapshot.sql
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT jsonb_build_object(
  'at', now(),
  'orchards', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'state', o.funding_state, 'pockets', o.total_pockets, 'filled', o.filled_pockets,
                  'released_at', o.released_at, 'cancelled_at', o.cancelled_at, 'reason', o.cancel_reason) ORDER BY o.created_at), '[]'::jsonb)
                FROM public.orchards o WHERE o.title IN ('Mainnet refund test', 'Mainnet release test')),
  'holdings', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', left(h.id::text,8), 'orchard', o.title, 'status', h.status, 'gross', h.gross_amount, 'sower', h.sower_amount, 's2g', h.s2g_amount,
                  'fee', h.processor_fee, 'rail', h.rail, 'sig_in', h.rail_reference, 'payer', h.payer_address, 'payer_source', h.payer_source, 'env', public.payment_environment(b.provider, 'orchard', b.id),
                  'bestowal_status', b.payment_status, 'payout_status', b.payout_status) ORDER BY h.created_at), '[]'::jsonb)
                FROM public.orchard_holdings h JOIN public.orchards o ON o.id = h.orchard_id JOIN public.bestowals b ON b.id = h.bestowal_id
               WHERE o.title IN ('Mainnet refund test', 'Mainnet release test')),
  'refunds', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', left(r.id::text,8), 'orchard', o.title, 'status', r.status, 'amount', r.amount, 'dest', r.destination, 'env', r.environment,
                  'attempts', r.attempts, 'ref', r.rail_reference, 'fee', r.fee_cost, 'err', r.last_error, 'confirmed_at', r.confirmed_at) ORDER BY r.created_at), '[]'::jsonb)
                FROM public.orchard_refunds r JOIN public.orchards o ON o.id = r.orchard_id WHERE o.title IN ('Mainnet refund test', 'Mainnet release test')),
  'releases', (SELECT COALESCE(jsonb_agg(jsonb_build_object('orchard', o.title, 'sower_total', x.sower_total, 's2g_total', x.s2g_total, 'trigger', x.release_trigger, 'at', x.released_at)), '[]'::jsonb)
                FROM public.orchard_releases x JOIN public.orchards o ON o.id = x.orchard_id WHERE o.title IN ('Mainnet refund test', 'Mainnet release test')),
  'ledger_live_rows_for_these', (SELECT COALESCE(jsonb_agg(jsonb_build_object('kind', l.kind, 'amount', l.amount, 'env', l.environment, 'rail', l.rail, 'source', l.source_table, 'at', l.recognised_at) ORDER BY l.created_at), '[]'::jsonb)
                FROM public.revenue_ledger l WHERE l.release_ref IN (SELECT id::text FROM public.orchards WHERE title IN ('Mainnet refund test', 'Mainnet release test'))),
  'live_revenue', (SELECT jsonb_build_object('operating_net', s->'operating_net', 'net', s->'net', 'rows', s->'rows', 'by_kind', s->'by_kind') FROM public.revenue_summary(NULL, 'live') s),
  'live_liability', (SELECT jsonb_build_object('held_for_orchards', s->'held_for_orchards'->'total', 'refunding', s->'held_for_orchards'->'refunding'->'total',
                        'owed_total', s->'held_for_members'->'owed'->'total', 'parked_total', s->'held_for_members'->'parked'->'total', 'liabilities_total', s->'liabilities_total',
                        's2g_operating_net', s->'s2g_own'->'operating_net') FROM public.liability_snapshot('live') s),
  'b_owed', (SELECT COALESCE(sum(amount_usd), 0) FROM public.owed_payout_balances() WHERE recipient_user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
  'a_notifications', (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', type, 'title', title, 'at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
                FROM (SELECT * FROM public.user_notifications WHERE user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125' AND type LIKE 'orchard_%' AND created_at > now() - interval '3 hours' ORDER BY created_at DESC LIMIT 6) n),
  'b_notifications', (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', type, 'title', title, 'at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
                FROM (SELECT * FROM public.user_notifications WHERE user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2' AND type LIKE 'orchard_%' AND created_at > now() - interval '3 hours' ORDER BY created_at DESC LIMIT 6) n)
) AS snapshot;
