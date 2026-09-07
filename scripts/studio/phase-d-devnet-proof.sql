-- P0-5 Phase D (2026-09-07): read-only before/after snapshot for the devnet
-- Uplift proof. Run before the owner's pocket, after it (funded, gosats
-- notified), and after the gosat's release (parties paid).
-- Run: npx supabase db query --linked -f scripts/studio/phase-d-devnet-proof.sql
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);   -- liability_snapshot() is service-role/gosat only
WITH o AS (
  SELECT * FROM public.orchards WHERE orchard_kind = 'uplift' AND title = 'Phase D uplift test orchard'
   ORDER BY created_at DESC LIMIT 1
)
SELECT jsonb_build_object(
  'orchard', (SELECT jsonb_build_object('id', o.id, 'title', o.title, 'kind', o.orchard_kind, 'state', o.funding_state, 'opened_by_gosat', o.opened_by_gosat,
                                        'pockets', o.total_pockets, 'pocket_price', o.pocket_price, 'funded_at', o.funded_at, 'released_at', o.released_at) FROM o),
  'funding', (SELECT to_jsonb(f) FROM o, LATERAL public.orchard_funding_status(o.id) f),
  'holdings', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', left(h.id::text, 8), 'status', h.status, 'gross', h.gross_amount, 'sower', h.sower_amount, 's2g', h.s2g_amount,
                                                          'rail', h.rail, 'payer', left(h.payer_address, 8), 'ref', left(h.rail_reference, 12)) ORDER BY h.created_at), '[]'::jsonb)
                 FROM public.orchard_holdings h, o WHERE h.orchard_id = o.id),
  'release', (SELECT to_jsonb(r) FROM public.orchard_releases r, o WHERE r.orchard_id = o.id),
  'party_payments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', left(p.id::text, 8), 'label', p.label, 'amount', p.amount, 'status', p.status, 'env', p.environment,
                                                                'attempts', p.attempts, 'destination', left(p.destination, 8), 'reference', p.reference, 'paid_at', p.paid_at, 'error', p.last_error) ORDER BY p.created_at), '[]'::jsonb)
                       FROM public.orchard_release_payments p, o WHERE p.orchard_id = o.id),
  'tribe_view', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', v.label, 'amount', v.amount, 'rail', v.rail, 'paid_at', v.paid_at) ORDER BY v.paid_at), '[]'::jsonb)
                   FROM public.orchard_parties_paid_v v, o WHERE v.orchard_id = o.id),
  'revenue_rows', (SELECT COALESCE(jsonb_agg(jsonb_build_object('kind', l.kind, 'amount', l.amount, 'env', l.environment, 'rail', l.rail, 'release_ref', l.release_ref) ORDER BY l.created_at), '[]'::jsonb)
                     FROM public.revenue_ledger l, o WHERE l.release_ref = o.id::text),
  'events', (SELECT COALESCE(jsonb_agg(jsonb_build_object('at', e.created_at, 'event', e.event, 'from', e.from_state, 'to', e.to_state, 'amount', e.amount, 'notes', left(e.notes, 160)) ORDER BY e.created_at), '[]'::jsonb)
               FROM public.orchard_events e, o WHERE e.orchard_id = o.id),
  'gosat_notifications', (SELECT count(*) FROM public.user_notifications n, o WHERE n.type = 'orchard_uplift_funded' AND (n.metadata ->> 'orchard_id')::uuid = o.id),
  'bestower_notifications', (SELECT COALESCE(jsonb_agg(n.type ORDER BY n.created_at), '[]'::jsonb) FROM public.user_notifications n, o
                               WHERE n.user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125' AND (n.metadata ->> 'orchard_id')::uuid = o.id),
  'owed_gosat_opener', (SELECT COALESCE(sum(b.amount_usd), 0) FROM public.owed_payout_balances() b, o WHERE b.recipient_user_id = o.user_id),
  'liability_devnet', (SELECT jsonb_build_object('held_for_orchards', s -> 'held_for_orchards', 'liabilities_total', s -> 'liabilities_total', 's2g_own', s -> 's2g_own' -> 'operating_net')
                         FROM public.liability_snapshot('devnet') s),
  'liability_live', (SELECT jsonb_build_object('held_for_orchards', s -> 'held_for_orchards', 'liabilities_total', s -> 'liabilities_total', 's2g_own', s -> 's2g_own' -> 'operating_net')
                       FROM public.liability_snapshot('live') s)
) AS snapshot;
