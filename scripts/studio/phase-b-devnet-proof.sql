-- P0-5 Phase B devnet proof: run BEFORE and AFTER the single devnet pocket
-- payment into "Phase B release test orchard". READ-ONLY. Acts as a gosat
-- for the two gosat-only reads.
--
--   npx supabase db query --linked -f scripts/studio/phase-b-devnet-proof.sql

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, false);

WITH o AS (SELECT * FROM public.orchards WHERE title = 'Phase B release test orchard'),
     f AS (SELECT f.* FROM o CROSS JOIN LATERAL public.orchard_funding_status(o.id) f),
     snap AS (SELECT public.liability_snapshot('devnet') AS d, public.liability_snapshot('live') AS l)
SELECT
  now()                                                        AS at,
  o.id                                                         AS orchard_id,
  o.funding_state, o.funded_at, o.released_at,
  f.held_total, f.target, f.pockets_held, f.pockets_total, f.funded, f.released,
  (SELECT string_agg(status || '/' || rail || '/' || gross_amount, ', ') FROM public.orchard_holdings h WHERE h.orchard_id = o.id)  AS holdings,
  (SELECT string_agg(payout_status, ', ') FROM public.bestowals b WHERE b.orchard_id = o.id AND b.payment_status = 'completed')      AS bestowal_payout_status,
  (SELECT round(COALESCE(sum(amount_usd), 0), 2) FROM public.owed_payout_balances() WHERE recipient_user_id = o.user_id)              AS sower_b_owed_now,
  (SELECT string_agg(environment || ':' || amount || '/' || rail, ', ') FROM public.revenue_ledger r
     WHERE r.kind = 'orchard_fee' AND r.source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = o.id))                AS orchard_fee_rows,
  (SELECT sower_total || ' / ' || s2g_total || ' / gift ' || gift_units || ' / ' || release_trigger FROM public.orchard_releases WHERE orchard_id = o.id) AS release_row,
  (SELECT string_agg(event || '@' || to_char(created_at, 'HH24:MI:SS'), ', ' ORDER BY created_at) FROM public.orchard_events e WHERE e.orchard_id = o.id) AS events,
  (SELECT count(*) FROM public.user_notifications n WHERE n.type = 'orchard_released' AND (n.metadata ->> 'orchard_id')::uuid = o.id) AS release_notifications,
  snap.d -> 'held_for_orchards' ->> 'total'                    AS devnet_held_for_orchards,
  snap.d -> 'held_for_members' -> 'owed' ->> 'total'           AS devnet_owed_to_members,
  snap.d -> 's2g_own' ->> 'operating_net'                      AS devnet_s2g_own,
  snap.l ->> 'liabilities_total'                               AS live_liabilities_unchanged
FROM o, f, snap;
