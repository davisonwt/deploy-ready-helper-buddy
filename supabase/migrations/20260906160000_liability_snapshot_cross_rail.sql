-- Bookkeeping Phase 2 follow-up (2026-09-06): per-wallet expectation must
-- know about CROSS-RAIL payouts. On 2026-09-06 the hot wallet paid 4.00 of
-- earnings whose sales were PayPal money; the hot wallet's expected balance
-- must drop by that, and PayPal's must rise by it (PayPal now holds money
-- that is S2G's). liability_snapshot() gains `payouts_paid`:
--   { total, by_rail: {solana, paypal}, cross_rail: {
--       solana_paid_for_paypal_sales, paypal_paid_for_solana_sales } }
-- The TOTAL-level verdict (treasury_verdict) is unchanged and was already
-- right: payouts reduce cash and liabilities equally, and float stays in
-- the system until a float_out is recorded.
-- Same body as 20260906150000 otherwise. Prefer: npx supabase db query --linked -f <this file>

CREATE OR REPLACE FUNCTION public.liability_snapshot(_environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
-- VOLATILE on purpose: it builds two temp tables (a STABLE function may not CREATE)
SECURITY DEFINER
SET search_path = public
AS $ls_pp$
DECLARE
  v_owed            jsonb;
  v_owed_total      numeric := 0;
  v_owed_recipients int := 0;
  v_owed_by_rail    jsonb;
  v_parked_total    numeric := 0;
  v_parked_members  int := 0;
  v_orch            jsonb;
  v_orch_total      numeric := 0;
  v_orch_sower      numeric := 0;
  v_orch_s2g        numeric := 0;
  v_orch_holdings   int := 0;
  v_orch_count      int := 0;
  v_orch_by_loc     jsonb;
  v_rev_by_rail     jsonb;
  v_rev_net         numeric := 0;
  v_rev_operating   numeric := 0;
  v_rev_opening     numeric := 0;
  v_rev_month       numeric := 0;
  v_unrec_proc      numeric := 0;
  v_float_total     numeric := 0;
  v_float_rows      int := 0;
  v_float_by_wallet jsonb;
  v_swept           numeric := 0;
  v_aging           jsonb;
  v_recipients      jsonb;
  v_orchards        jsonb;
  v_other           jsonb := '{}'::jsonb;
  v_paid            jsonb;
BEGIN
  IF NOT (COALESCE(auth.role(), '') = 'service_role' OR public.is_admin_or_gosat(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Owed through the pipeline (owed_payout_balances is the source of truth).
  -- A recipient's environment = devnet only if EVERY covered row is devnet.
  CREATE TEMP TABLE IF NOT EXISTS _ls_owed (
    recipient_type text, recipient_user_id uuid, amount_usd numeric, covered_rows jsonb,
    environment text, rail text, oldest_at timestamptz
  ) ON COMMIT DROP;
  TRUNCATE _ls_owed;  -- not DELETE: PostgREST's connection preloads safeupdate, which refuses a DELETE without WHERE
  INSERT INTO _ls_owed
  SELECT o.recipient_type, o.recipient_user_id, o.amount_usd, o.covered_rows,
         CASE WHEN bool_and(public.source_row_environment(e->>'source_table', (e->>'source_id')::uuid) = 'devnet') THEN 'devnet'
              WHEN bool_and(public.source_row_environment(e->>'source_table', (e->>'source_id')::uuid) = 'sandbox') THEN 'sandbox'
              ELSE 'live' END,
         public.member_payout_rail(o.recipient_user_id),
         min(public.source_row_created_at(e->>'source_table', (e->>'source_id')::uuid))
    FROM public.owed_payout_balances() o
    CROSS JOIN LATERAL jsonb_array_elements(o.covered_rows) e
   GROUP BY o.recipient_type, o.recipient_user_id, o.amount_usd, o.covered_rows;

  SELECT COALESCE(round(sum(amount_usd), 2), 0), count(*) INTO v_owed_total, v_owed_recipients
    FROM _ls_owed WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(rail, total), '{}'::jsonb) INTO v_owed_by_rail
    FROM (SELECT rail, round(sum(amount_usd), 2) AS total FROM _ls_owed WHERE environment = _environment GROUP BY rail) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', o.recipient_user_id,
           'name', COALESCE(pp.display_name, pp.username, left(o.recipient_user_id::text, 8)),
           'type', o.recipient_type,
           'amount', o.amount_usd,
           'rail', o.rail,
           'oldest_row_at', o.oldest_at,
           'days_waiting', GREATEST(0, floor(extract(epoch FROM (now() - o.oldest_at)) / 86400))::int,
           'source_rows', o.covered_rows
         ) ORDER BY o.amount_usd DESC), '[]'::jsonb)
    INTO v_recipients
    FROM _ls_owed o
    LEFT JOIN public.profiles_public pp ON pp.user_id = o.recipient_user_id
   WHERE o.environment = _environment;

  SELECT jsonb_build_object(
           'oldest_unpaid_at', min(oldest_at),
           'oldest_unpaid_days', COALESCE(GREATEST(0, floor(extract(epoch FROM (now() - min(oldest_at))) / 86400))::int, 0),
           'recipients_over_30d', count(*) FILTER (WHERE oldest_at < now() - interval '30 days'),
           'recipients_over_60d', count(*) FILTER (WHERE oldest_at < now() - interval '60 days'))
    INTO v_aging FROM _ls_owed WHERE environment = _environment;

  -- Parked S2G Balance ledger, per row environment from its source.
  SELECT COALESCE(round(sum(amount), 2), 0), count(DISTINCT user_id)
    INTO v_parked_total, v_parked_members
    FROM (SELECT l.user_id, l.amount,
                 CASE WHEN l.reference_table IS NULL THEN 'live'
                      ELSE public.source_row_environment(l.reference_table, l.reference_id) END AS env
            FROM public.balance_ledger l) x
   WHERE env = _environment;

  -- Held for orchards, per holding environment from its bestowal.
  CREATE TEMP TABLE IF NOT EXISTS _ls_hold (
    id uuid, orchard_id uuid, gross numeric, sower numeric, s2g numeric, rail text, location text, environment text
  ) ON COMMIT DROP;
  TRUNCATE _ls_hold;
  INSERT INTO _ls_hold
  SELECT h.id, h.orchard_id, h.gross_amount, h.sower_amount, h.s2g_amount, h.rail, h.location,
         public.payment_environment(b.provider, 'orchard', b.id)
    FROM public.orchard_holdings h
    JOIN public.bestowals b ON b.id = h.bestowal_id
   WHERE h.status = 'held';

  SELECT COALESCE(round(sum(gross), 2), 0), COALESCE(round(sum(sower), 2), 0), COALESCE(round(sum(s2g), 2), 0), count(*), count(DISTINCT orchard_id)
    INTO v_orch_total, v_orch_sower, v_orch_s2g, v_orch_holdings, v_orch_count
    FROM _ls_hold WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(k, total), '{}'::jsonb) INTO v_orch_by_loc
    FROM (SELECT location || '/' || rail AS k, round(sum(gross), 2) AS total FROM _ls_hold WHERE environment = _environment GROUP BY 1) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', o.id, 'title', o.title, 'kind', o.orchard_type,
           'sower', COALESCE(pp.display_name, pp.username, left(o.user_id::text, 8)),
           'held', x.held, 'target', f.target, 'pockets_held', f.pockets_held, 'pockets_total', f.pockets_total,
           'funded', f.funded, 'opened_at', o.created_at,
           'days_open', GREATEST(0, floor(extract(epoch FROM (now() - o.created_at)) / 86400))::int
         ) ORDER BY x.held DESC), '[]'::jsonb)
    INTO v_orchards
    FROM (SELECT orchard_id, round(sum(gross), 2) AS held FROM _ls_hold WHERE environment = _environment GROUP BY orchard_id) x
    JOIN public.orchards o ON o.id = x.orchard_id
    LEFT JOIN public.profiles_public pp ON pp.user_id = o.user_id
    CROSS JOIN LATERAL public.orchard_funding_status(o.id) f;

  -- S2G's own, from the revenue ledger.
  SELECT COALESCE(round(sum(amount), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind <> 'opening_balance'), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind = 'opening_balance'), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind <> 'opening_balance' AND period = date_trunc('month', now() AT TIME ZONE 'UTC')::date), 2), 0)
    INTO v_rev_net, v_rev_operating, v_rev_opening, v_rev_month
    FROM public.revenue_ledger WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(rail, total), '{}'::jsonb) INTO v_rev_by_rail
    FROM (SELECT rail, round(sum(amount), 2) AS total FROM public.revenue_ledger
           WHERE environment = _environment AND kind <> 'opening_balance' GROUP BY rail) r;

  -- Unrecorded but S2G's: the flat Solana processor fee on orders paid in this environment (phase 4 records it).
  SELECT COALESCE(round(sum(fee), 2), 0) INTO v_unrec_proc FROM (
    SELECT bo.processor_fee AS fee FROM public.basket_orders bo
     WHERE bo.provider = 'solana' AND bo.status = 'completed'
       AND public.payment_environment('solana', 'basket', bo.id) = _environment
    UNION ALL
    SELECT b.processor_fee_amount FROM public.bestowals b
     WHERE b.provider = 'solana' AND b.payment_status IN ('completed', 'distributed')
       AND public.payment_environment('solana', CASE WHEN b.orchard_id IS NULL THEN 'gift' ELSE 'orchard' END, b.id) = _environment
    UNION ALL
    SELECT cp.processor_fee_amount FROM public.content_purchases cp
     WHERE cp.provider = 'solana' AND cp.payment_status = 'completed'
       AND public.payment_environment('solana', 'content', cp.id) = _environment
  ) f;

  -- Gosat-recorded float / gas; sweeps to the Squad.
  SELECT COALESCE(round(sum(amount_usd) FILTER (WHERE currency <> 'SOL'), 2), 0), count(*)
    INTO v_float_total, v_float_rows FROM public.treasury_movements WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(wallet, total), '{}'::jsonb) INTO v_float_by_wallet
    FROM (SELECT wallet, round(sum(amount_usd), 2) AS total FROM public.treasury_movements
           WHERE environment = _environment AND currency <> 'SOL' GROUP BY wallet) r;
  SELECT COALESCE(round(sum(amount_usdc), 2), 0) INTO v_swept
    FROM public.treasury_sweeps WHERE status = 'sent'
     AND CASE WHEN solana_cluster = 'mainnet-beta' THEN 'live' ELSE 'devnet' END = _environment;

  -- Payouts already made in this environment, and which rail the money they
  -- discharged came IN on. A Solana payout of a PayPal-sale earning leaves
  -- the hot wallet while the sale proceeds stay in PayPal: the hot wallet
  -- expectation must drop by it and PayPal's must rise by it (cross-rail).
  SELECT jsonb_build_object(
           'total', COALESCE(round(sum(amt), 2), 0),
           'by_rail', jsonb_build_object(
             'solana', COALESCE(round(sum(amt) FILTER (WHERE out_rail = 'solana'), 2), 0),
             'paypal', COALESCE(round(sum(amt) FILTER (WHERE out_rail = 'paypal'), 2), 0)),
           'cross_rail', jsonb_build_object(
             'solana_paid_for_paypal_sales', COALESCE(round(sum(amt) FILTER (WHERE out_rail = 'solana' AND in_rail = 'paypal'), 2), 0),
             'paypal_paid_for_solana_sales', COALESCE(round(sum(amt) FILTER (WHERE out_rail = 'paypal' AND in_rail = 'solana'), 2), 0)))
    INTO v_paid
    FROM (
      SELECT CASE WHEN p.rail = 'solana_usdc' THEN 'solana' ELSE 'paypal' END AS out_rail,
             CASE (e->>'source_table')
               WHEN 'product_bestowals' THEN COALESCE((SELECT CASE pb.payment_method WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.product_bestowals pb WHERE pb.id = (e->>'source_id')::uuid), 'other')
               WHEN 'content_purchases' THEN COALESCE((SELECT CASE cp.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.content_purchases cp WHERE cp.id = (e->>'source_id')::uuid), 'other')
               WHEN 'bestowals' THEN COALESCE((SELECT CASE b.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.bestowals b WHERE b.id = (e->>'source_id')::uuid), 'other')
               ELSE 'other' END AS in_rail,
             COALESCE((SELECT pb.sower_amount FROM public.product_bestowals pb WHERE (e->>'source_table') = 'product_bestowals' AND pb.id = (e->>'source_id')::uuid),
                      (SELECT cp.base_amount FROM public.content_purchases cp WHERE (e->>'source_table') = 'content_purchases' AND cp.id = (e->>'source_id')::uuid),
                      (SELECT COALESCE((b.distribution_data->>'sower_amount')::numeric, b.base_amount) FROM public.bestowals b WHERE (e->>'source_table') = 'bestowals' AND b.id = (e->>'source_id')::uuid),
                      (SELECT we.amount FROM public.whisperer_earnings we WHERE (e->>'source_table') = 'whisperer_earnings' AND we.id = (e->>'source_id')::uuid),
                      0) AS amt
        FROM public.payouts p
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.covered_rows, '[]'::jsonb)) e
       WHERE p.status = 'paid'
         AND CASE WHEN p.rail = 'solana_usdc' THEN (CASE WHEN p.solana_cluster = 'mainnet-beta' THEN 'live' ELSE 'devnet' END) ELSE 'live' END = _environment
    ) x;

  -- What the other environments hold (so test money is visible, not hidden).
  IF _environment = 'live' THEN
    SELECT COALESCE(jsonb_object_agg(env, jsonb_build_object('owed', owed, 'parked', parked, 'held_for_orchards', held)), '{}'::jsonb)
      INTO v_other
      FROM (
        SELECT env,
               COALESCE((SELECT round(sum(amount_usd), 2) FROM _ls_owed WHERE environment = env), 0) AS owed,
               COALESCE((SELECT round(sum(l.amount), 2) FROM public.balance_ledger l
                          WHERE COALESCE(public.source_row_environment(l.reference_table, l.reference_id), 'live') = env), 0) AS parked,
               COALESCE((SELECT round(sum(gross), 2) FROM _ls_hold WHERE environment = env), 0) AS held
          FROM (VALUES ('devnet'), ('sandbox')) e(env)
      ) t
     WHERE owed <> 0 OR parked <> 0 OR held <> 0;
  END IF;

  RETURN jsonb_build_object(
    'environment', _environment,
    'generated_at', now(),
    'held_for_members', jsonb_build_object(
      'owed', jsonb_build_object('total', v_owed_total, 'recipients', v_owed_recipients, 'by_rail', v_owed_by_rail),
      'parked', jsonb_build_object('total', v_parked_total, 'members', v_parked_members),
      'total', round(v_owed_total + v_parked_total, 2)),
    'held_for_orchards', jsonb_build_object(
      'total', v_orch_total, 'sower_share', v_orch_sower, 's2g_share', v_orch_s2g,
      'holdings', v_orch_holdings, 'orchards', v_orch_count, 'by_location', v_orch_by_loc),
    'liabilities_total', round(v_owed_total + v_parked_total + v_orch_total, 2),
    's2g_own', jsonb_build_object(
      'operating_net', v_rev_operating, 'net', v_rev_net, 'opening_balance', v_rev_opening,
      'this_month', v_rev_month, 'by_rail', v_rev_by_rail),
    'unrecorded', jsonb_build_object('solana_processor_fees', v_unrec_proc),
    'recorded_float', jsonb_build_object('total', v_float_total, 'movements', v_float_rows, 'by_wallet', v_float_by_wallet),
    'swept_to_squad', v_swept,
    'payouts_paid', COALESCE(v_paid, '{}'::jsonb),
    'aging', v_aging,
    'recipients', v_recipients,
    'orchards', v_orchards,
    'other_environments', v_other
  );
END;
$ls_pp$;

-- Proof (as the service role; TRUNCATE keeps it safeupdate-proof through PostgREST too).
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT public.liability_snapshot('live') -> 'payouts_paid' AS payouts_paid_live;
