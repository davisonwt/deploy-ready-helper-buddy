-- Bookkeeping Phase 2 (BOOKKEEPING-PLAN.md section 4): the gosat liability
-- view, database side.
--
--   liability_snapshot(_environment)  the three buckets and their detail,
--                                     computed per environment so devnet /
--                                     sandbox money never lands in a live
--                                     figure; admin/gosat or service role only
--   treasury_verdict(...)             pure reconciliation math shared with
--                                     the edge function's TypeScript twin
--                                     (_shared/liabilityRules.ts): GREEN when
--                                     assets cover liabilities, RED on a
--                                     shortfall, plus the explained /
--                                     unexplained gap
--   treasury_movements                gosat-entered float and gas the
--                                     reconciliation should know about
--                                     (seeded USDC float, SOL for gas), via
--                                     record_treasury_movement() with a note
--   member_payout_rail(uuid)          the rail a recipient would be paid on
--   source_row_environment(...)       which environment a source row's money
--                                     moved on (reuses payment_environment)
--
-- Reads only owed_payout_balances() for owed money (spec section 9: the
-- view reads it, it does not compute its own parallel figures) and splits
-- it by environment from the covered rows.
--
-- Unique dollar tags per block. Prefer: npx supabase db query --linked -f <this file>

-- ---------------------------------------------------------------------
-- 1. treasury_movements (minimal)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treasury_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('float_in', 'float_out', 'gas_in', 'adjustment')),
  wallet      text NOT NULL CHECK (wallet IN ('hot', 'squad', 'launch', 'uplift', 'paypal')),
  amount_usd  numeric(18,2) NOT NULL CHECK (amount_usd <> 0),   -- positive = money S2G put in; negative = taken out
  currency    text NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USD', 'USDC', 'SOL')),
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'devnet', 'sandbox')),
  reference   text,                                            -- signature / PayPal transaction id
  notes       text NOT NULL,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.treasury_movements IS
  'Gosat-entered float, gas and adjustments the reconciliation must account for. Not transactions; those live in their own tables.';

ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS treasury_movements_select_admin_gosat ON public.treasury_movements;
CREATE POLICY treasury_movements_select_admin_gosat
  ON public.treasury_movements FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));
REVOKE ALL ON public.treasury_movements FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.treasury_movements TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_treasury_movement(
  _kind text, _wallet text, _amount_usd numeric, _notes text,
  _currency text DEFAULT 'USDC', _reference text DEFAULT NULL, _environment text DEFAULT 'live'
) RETURNS public.treasury_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ls_1$
DECLARE
  v_row public.treasury_movements%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _notes IS NULL OR length(btrim(_notes)) < 10 THEN
    RAISE EXCEPTION 'movement_needs_note';
  END IF;
  INSERT INTO public.treasury_movements (kind, wallet, amount_usd, currency, environment, reference, notes, created_by)
  VALUES (_kind, _wallet, round(_amount_usd, 2), COALESCE(_currency, 'USDC'), COALESCE(_environment, 'live'), _reference, _notes, auth.uid())
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$ls_1$;
REVOKE ALL ON FUNCTION public.record_treasury_movement(text, text, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_treasury_movement(text, text, numeric, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
-- The rail a member would be paid on, in the order resolveSowerPayout
-- (payout-earnings) uses: the preferred method if it resolves, else
-- Solana address on the profile, else an active PayPal wallet, else an
-- active NOWPayments wallet, else unassigned.
CREATE OR REPLACE FUNCTION public.member_payout_rail(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $ls_2$
  WITH p AS (
    SELECT preferred_payout_method, payout_network, payout_address
      FROM public.profiles WHERE user_id = _user_id LIMIT 1
  ), w AS (
    SELECT bool_or(wallet_type = 'paypal_email' AND wallet_address IS NOT NULL) AS has_paypal,
           bool_or(wallet_type = 'nowpayments_crypto' AND wallet_address IS NOT NULL) AS has_np
      FROM public.user_wallets WHERE user_id = _user_id AND is_active
  )
  SELECT CASE
    WHEN p.preferred_payout_method = 'solana_usdc' AND p.payout_network = 'solana_usdc' AND p.payout_address IS NOT NULL THEN 'solana'
    WHEN p.preferred_payout_method = 'paypal_email' AND COALESCE(w.has_paypal, false) THEN 'paypal'
    WHEN p.preferred_payout_method = 'nowpayments_crypto' AND COALESCE(w.has_np, false) THEN 'nowpayments'
    WHEN p.payout_network = 'solana_usdc' AND p.payout_address IS NOT NULL THEN 'solana'
    WHEN COALESCE(w.has_paypal, false) THEN 'paypal'
    WHEN COALESCE(w.has_np, false) THEN 'nowpayments'
    ELSE 'unassigned' END
  FROM (SELECT 1) one LEFT JOIN p ON true LEFT JOIN w ON true;
$ls_2$;
REVOKE ALL ON FUNCTION public.member_payout_rail(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_payout_rail(uuid) TO service_role;

-- Which environment did a source row's money move on, and when was it created.
CREATE OR REPLACE FUNCTION public.source_row_environment(_source_table text, _source_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $ls_3$
DECLARE
  v_method text;
  v_basket uuid;
  v_provider text;
  v_orchard uuid;
  v_pb uuid;
BEGIN
  IF _source_table = 'product_bestowals' THEN
    SELECT pb.payment_method, bob.basket_order_id INTO v_method, v_basket
      FROM public.product_bestowals pb
      LEFT JOIN public.basket_order_bestowals bob ON bob.bestowal_id = pb.id
     WHERE pb.id = _source_id LIMIT 1;
    IF NOT FOUND THEN RETURN 'live'; END IF;
    RETURN public.payment_environment(v_method, 'basket', COALESCE(v_basket, _source_id));
  ELSIF _source_table = 'content_purchases' THEN
    SELECT provider INTO v_provider FROM public.content_purchases WHERE id = _source_id;
    RETURN public.payment_environment(v_provider, 'content', _source_id);
  ELSIF _source_table = 'bestowals' THEN
    SELECT provider, orchard_id INTO v_provider, v_orchard FROM public.bestowals WHERE id = _source_id;
    RETURN public.payment_environment(v_provider, CASE WHEN v_orchard IS NULL THEN 'gift' ELSE 'orchard' END, _source_id);
  ELSIF _source_table = 'whisperer_earnings' THEN
    SELECT bestowal_id INTO v_pb FROM public.whisperer_earnings WHERE id = _source_id;
    IF v_pb IS NULL THEN RETURN 'live'; END IF;
    RETURN public.source_row_environment('product_bestowals', v_pb);
  END IF;
  RETURN 'live';
END;
$ls_3$;
REVOKE ALL ON FUNCTION public.source_row_environment(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.source_row_environment(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.source_row_created_at(_source_table text, _source_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $ls_4$
  SELECT CASE _source_table
    WHEN 'product_bestowals'  THEN (SELECT created_at FROM public.product_bestowals WHERE id = _source_id)
    WHEN 'content_purchases'  THEN (SELECT created_at FROM public.content_purchases WHERE id = _source_id)
    WHEN 'bestowals'          THEN (SELECT created_at FROM public.bestowals WHERE id = _source_id)
    WHEN 'whisperer_earnings' THEN (SELECT created_at FROM public.whisperer_earnings WHERE id = _source_id)
    ELSE NULL END;
$ls_4$;
REVOKE ALL ON FUNCTION public.source_row_created_at(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.source_row_created_at(text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 3. liability_snapshot(_environment)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.liability_snapshot(_environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
-- VOLATILE on purpose: it builds two temp tables (a STABLE function may not CREATE)
SECURITY DEFINER
SET search_path = public
AS $ls_5$
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
  DELETE FROM _ls_owed;
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
  DELETE FROM _ls_hold;
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
    'aging', v_aging,
    'recipients', v_recipients,
    'orchards', v_orchards,
    'other_environments', v_other
  );
END;
$ls_5$;
REVOKE ALL ON FUNCTION public.liability_snapshot(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liability_snapshot(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. treasury_verdict(): the reconciliation, as pure math
-- ---------------------------------------------------------------------
-- expected_assets = liabilities + max(s2g_own, 0) + unrecorded + recorded_float
-- unexplained     = assets - expected_assets
-- verdict         = RED   when assets < liabilities  (held money is not backed)
--                   GREEN otherwise; `unexplained_beyond_tolerance` flags a
--                   gap the expected components do not account for.
-- tolerance defaults to the larger of 1.00 and 1% of expected assets.
CREATE OR REPLACE FUNCTION public.treasury_verdict(
  _assets_usd numeric, _liabilities_usd numeric, _s2g_own_usd numeric,
  _unrecorded_usd numeric DEFAULT 0, _recorded_float_usd numeric DEFAULT 0, _tolerance_usd numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $ls_6$
  WITH x AS (
    SELECT round(COALESCE(_assets_usd, 0), 2) AS assets,
           round(COALESCE(_liabilities_usd, 0), 2) AS liabilities,
           round(GREATEST(COALESCE(_s2g_own_usd, 0), 0), 2) AS own,
           round(COALESCE(_unrecorded_usd, 0), 2) AS unrec,
           round(COALESCE(_recorded_float_usd, 0), 2) AS flt
  ), y AS (
    SELECT *, round(liabilities + own + unrec + flt, 2) AS expected FROM x
  ), z AS (
    SELECT *, round(assets - expected, 2) AS unexplained,
           round(COALESCE(_tolerance_usd, GREATEST(1.00, expected * 0.01)), 2) AS tolerance
      FROM y
  )
  SELECT jsonb_build_object(
    'verdict', CASE WHEN assets < liabilities THEN 'RED' ELSE 'GREEN' END,
    'assets', assets, 'liabilities', liabilities, 's2g_own', own,
    'unrecorded', unrec, 'recorded_float', flt, 'expected_assets', expected,
    'unexplained', unexplained, 'tolerance', tolerance,
    'unexplained_beyond_tolerance', abs(unexplained) > tolerance,
    'shortfall', CASE WHEN assets < liabilities THEN round(liabilities - assets, 2) ELSE 0 END,
    'coverage_ratio', CASE WHEN liabilities > 0 THEN round(assets / liabilities, 4) ELSE NULL END
  ) FROM z;
$ls_6$;
GRANT EXECUTE ON FUNCTION public.treasury_verdict(numeric, numeric, numeric, numeric, numeric, numeric) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Proof
-- ---------------------------------------------------------------------
-- The proof runs as the postgres role (no JWT), so act as a gosat for it.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);

SELECT jsonb_build_object(
  'live', public.liability_snapshot('live') - 'recipients' - 'orchards',
  'devnet', public.liability_snapshot('devnet') - 'recipients' - 'orchards',
  'verdict_green_example', public.treasury_verdict(100, 60, 20, 1, 19),
  'verdict_red_example', public.treasury_verdict(5.62, 21.95, 1.90, 0.02, 0),
  'grants', jsonb_build_object(
     'snapshot_anon', has_function_privilege('anon', 'public.liability_snapshot(text)', 'EXECUTE'),
     'movements_insert_authenticated', has_table_privilege('authenticated', 'public.treasury_movements', 'INSERT'))
) AS proof;
