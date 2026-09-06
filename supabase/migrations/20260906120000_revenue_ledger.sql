-- Bookkeeping Phase 1 (BOOKKEEPING-PLAN.md section 3, audit P1-2):
-- public.revenue_ledger, the single source of truth for S2G's own earnings.
--
--   * one row per fee event, append-only (a trigger refuses UPDATE/DELETE);
--   * writes only through record_revenue(), which returns the existing row
--     on a duplicate (kind, source_table, source_id) and refuses -- as a
--     clean no-op with a WARNING -- any source row that is not actually
--     completed / released;
--   * every row carries environment live | devnet | sandbox so test money
--     can never inflate a live figure;
--   * corrections are new rows (record_revenue_correction, gosat-only,
--     note mandatory), never edits;
--   * revenue_summary() reads it for admins/gosats;
--   * finalize_basket_order() and finalize_content_purchase() record the
--     fee in the same transaction as the sale; gift and booking fees are
--     recorded by the Deno finalizers (_shared/paypal/capture.ts);
--   * backfill: one sale_fee row per completed product_bestowals row.
--     Owner's decision 2026-09-06: the two sales whose EARNINGS were
--     settled with devnet tokens on 2026-09-01 are tagged environment =
--     'devnet' --
--        b3518c23-7ab5-4b7d-a527-eb212a96ceea
--        904058fc-d4ce-4dbb-918e-8f089ecb6d19
--     -- every other row takes its environment from the payment: the
--     Solana intent's cluster for solana orders, live for PayPal / legacy.
--   * opening balance: the parked S2G Balance ledger total (balance_ledger,
--     13.95 at the time of writing) is recorded once as kind
--     opening_balance, a COST (negative) because it is money S2G holds for
--     members with no recorded cash trail -- a liability carried into the
--     ledger, not income. revenue_summary() reports net (all rows) and
--     operating_net (opening_balance excluded) side by side.
--
-- Phase B seam: orchard_release() will call record_revenue('orchard_fee',
-- ..., 'orchard_releases', <release id>, ...). record_revenue already knows
-- that source table and refuses it until the table exists.
--
-- Dollar-quote tags are unique per block (Studio's editor mis-splits
-- repeated $$). Prefer: npx supabase db query --linked -f <this file>

-- ---------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN (
                    'sale_fee', 'gift_fee', 'content_fee', 'booking_fee', 'orchard_fee',
                    'processor_fee_income', 'refund_cost', 'payout_fee_cost',
                    'correction', 'opening_balance')),
  direction       text NOT NULL CHECK (direction IN ('income', 'cost')),
  amount          numeric(18,2) NOT NULL CHECK (amount <> 0),
  currency        text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'USDC')),
  rail            text NOT NULL DEFAULT 'none' CHECK (rail IN ('solana', 'paypal', 'balance', 'nowpayments', 'none')),
  environment     text NOT NULL CHECK (environment IN ('live', 'devnet', 'sandbox')),
  source_table    text,
  source_id       uuid,
  release_ref     text,                                   -- PayPal capture id / Solana signature / release id
  recognised_at   timestamptz NOT NULL DEFAULT now(),     -- when the money became S2G's
  period          date GENERATED ALWAYS AS ((date_trunc('month', (recognised_at AT TIME ZONE 'UTC')))::date) STORED,
  idempotency_key text,                                   -- corrections and other source-less rows
  notes           text,
  created_by      uuid,                                   -- null = system
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_ledger_sign_matches_direction
    CHECK ((direction = 'income' AND amount > 0) OR (direction = 'cost' AND amount < 0)),
  CONSTRAINT revenue_ledger_source_pair
    CHECK ((source_table IS NULL) = (source_id IS NULL)),
  CONSTRAINT revenue_ledger_correction_needs_note
    CHECK (kind <> 'correction' OR (notes IS NOT NULL AND length(btrim(notes)) >= 10))
);

COMMENT ON TABLE public.revenue_ledger IS
  'S2G''s own earnings, one append-only row per fee event. Written only by record_revenue(). BOOKKEEPING-PLAN.md section 3.';

-- One fee per source row (corrections and source-less rows are exempt).
CREATE UNIQUE INDEX IF NOT EXISTS revenue_ledger_one_per_source
  ON public.revenue_ledger (kind, source_table, source_id)
  WHERE kind <> 'correction' AND source_table IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS revenue_ledger_idempotency_key
  ON public.revenue_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS revenue_ledger_period_env
  ON public.revenue_ledger (environment, period);

-- Append-only: nobody edits or deletes, not even the owner.
CREATE OR REPLACE FUNCTION public.revenue_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $rl_1$
BEGIN
  RAISE EXCEPTION 'revenue_ledger_is_append_only: % refused; write a correction row instead', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$rl_1$;

DROP TRIGGER IF EXISTS revenue_ledger_no_update_delete ON public.revenue_ledger;
CREATE TRIGGER revenue_ledger_no_update_delete
  BEFORE UPDATE OR DELETE ON public.revenue_ledger
  FOR EACH ROW EXECUTE FUNCTION public.revenue_ledger_append_only();

-- RLS: admins and gosats read; nobody writes through the API.
ALTER TABLE public.revenue_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS revenue_ledger_select_admin_gosat ON public.revenue_ledger;
CREATE POLICY revenue_ledger_select_admin_gosat
  ON public.revenue_ledger FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

REVOKE ALL ON public.revenue_ledger FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.revenue_ledger TO authenticated;
GRANT SELECT, INSERT ON public.revenue_ledger TO service_role;

-- ---------------------------------------------------------------------
-- 2. Which environment did an order's money move on?
-- ---------------------------------------------------------------------
-- solana  -> the order's payment intent cluster (mainnet-beta = live, else
--            devnet; an unknown solana order is devnet so a live figure is
--            never overstated)
-- paypal  -> app_settings.paypal_environment if the owner ever sets it,
--            else live (the Deno writers pass PAYPAL_ENV explicitly)
-- balance / nowpayments / legacy null -> live
CREATE OR REPLACE FUNCTION public.payment_environment(_provider text, _order_kind text, _order_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $rl_2$
DECLARE
  v_cluster text;
  v_pp text;
BEGIN
  IF _provider = 'solana' THEN
    SELECT i.cluster INTO v_cluster
      FROM public.solana_payment_intents i
     WHERE i.order_kind = _order_kind AND i.order_id = _order_id
     ORDER BY (i.status = 'paid') DESC, i.paid_at DESC NULLS LAST, i.created_at DESC
     LIMIT 1;
    RETURN CASE WHEN v_cluster = 'mainnet-beta' THEN 'live' ELSE 'devnet' END;
  ELSIF _provider = 'paypal' THEN
    SELECT value #>> '{}' INTO v_pp FROM public.app_settings WHERE key = 'paypal_environment';
    RETURN CASE WHEN v_pp = 'sandbox' THEN 'sandbox' ELSE 'live' END;
  END IF;
  RETURN 'live';
END;
$rl_2$;

REVOKE ALL ON FUNCTION public.payment_environment(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_environment(text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 3. record_revenue(): the only writer
-- ---------------------------------------------------------------------
-- Returns the inserted row, the existing row on a duplicate source, or
-- NULL (with a WARNING) when the source is not released or the amount is
-- zero. Raises only on structural misuse (unknown kind, bad sign for a
-- kind, source-less row for a kind that needs one), which the CHECKs
-- would refuse anyway.
CREATE OR REPLACE FUNCTION public.record_revenue(
  _kind            text,
  _amount          numeric,
  _environment     text,
  _source_table    text    DEFAULT NULL,
  _source_id       uuid    DEFAULT NULL,
  _rail            text    DEFAULT 'none',
  _release_ref     text    DEFAULT NULL,
  _recognised_at   timestamptz DEFAULT now(),
  _notes           text    DEFAULT NULL,
  _currency        text    DEFAULT 'USD',
  _idempotency_key text    DEFAULT NULL,
  _created_by      uuid    DEFAULT NULL
) RETURNS public.revenue_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rl_3$
DECLARE
  v_direction text;
  v_amount    numeric(18,2);
  v_released  boolean := false;
  v_row       public.revenue_ledger%ROWTYPE;
BEGIN
  IF _kind IN ('sale_fee', 'gift_fee', 'content_fee', 'booking_fee', 'orchard_fee', 'processor_fee_income') THEN
    v_direction := 'income';
    v_amount := round(_amount, 2);
  ELSIF _kind IN ('refund_cost', 'payout_fee_cost') THEN
    v_direction := 'cost';
    v_amount := -abs(round(_amount, 2));
  ELSIF _kind IN ('correction', 'opening_balance') THEN
    v_amount := round(_amount, 2);
    v_direction := CASE WHEN v_amount > 0 THEN 'income' ELSE 'cost' END;
  ELSE
    RAISE EXCEPTION 'record_revenue: unknown kind %', _kind;
  END IF;

  IF v_amount = 0 THEN
    RAISE WARNING 'record_revenue: zero amount for % % % -- nothing recorded', _kind, _source_table, _source_id;
    RETURN NULL;
  END IF;
  IF v_direction = 'income' AND v_amount < 0 THEN
    RAISE EXCEPTION 'record_revenue: % must be positive, got %', _kind, _amount;
  END IF;

  -- Source guard: income is recorded only for a source that is really
  -- completed / released. Unknown source tables are refused.
  IF _kind IN ('correction', 'opening_balance') THEN
    v_released := true;
  ELSIF _source_table IS NULL OR _source_id IS NULL THEN
    RAISE EXCEPTION 'record_revenue: % needs a source row', _kind;
  ELSIF _source_table = 'product_bestowals' AND _kind IN ('sale_fee', 'booking_fee', 'processor_fee_income', 'refund_cost') THEN
    SELECT (status = 'completed') INTO v_released FROM public.product_bestowals WHERE id = _source_id;
  ELSIF _source_table = 'bookings' AND _kind IN ('booking_fee', 'refund_cost') THEN
    SELECT (status = 'paid') INTO v_released FROM public.bookings WHERE id = _source_id;
  ELSIF _source_table = 'content_purchases' AND _kind IN ('content_fee', 'processor_fee_income', 'refund_cost') THEN
    SELECT (payment_status = 'completed') INTO v_released FROM public.content_purchases WHERE id = _source_id;
  ELSIF _source_table = 'bestowals' AND _kind IN ('gift_fee', 'processor_fee_income', 'refund_cost') THEN
    -- gifts only: orchard money is held until orchard_release() (Phase B)
    SELECT (payment_status IN ('completed', 'distributed') AND orchard_id IS NULL)
      INTO v_released FROM public.bestowals WHERE id = _source_id;
  ELSIF _source_table = 'orchard_releases' AND _kind IN ('orchard_fee', 'refund_cost') THEN
    -- Phase B seam: the table does not exist yet; refuse cleanly until it does.
    IF to_regclass('public.orchard_releases') IS NULL THEN
      RAISE WARNING 'record_revenue: orchard_releases is not built yet (Phase B) -- nothing recorded';
      RETURN NULL;
    END IF;
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.orchard_releases WHERE id = $1)' INTO v_released USING _source_id;
  ELSIF _source_table = 'orchard_refunds' AND _kind = 'refund_cost' THEN
    IF to_regclass('public.orchard_refunds') IS NULL THEN
      RAISE WARNING 'record_revenue: orchard_refunds is not built yet (Phase C) -- nothing recorded';
      RETURN NULL;
    END IF;
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.orchard_refunds WHERE id = $1)' INTO v_released USING _source_id;
  ELSIF _source_table = 'payouts' AND _kind = 'payout_fee_cost' THEN
    SELECT (status = 'paid') INTO v_released FROM public.payouts WHERE id = _source_id;
  ELSE
    RAISE EXCEPTION 'record_revenue: % is not a valid source for %', _source_table, _kind;
  END IF;

  IF NOT COALESCE(v_released, false) THEN
    RAISE WARNING 'record_revenue: % % is not completed/released -- nothing recorded (kind %)', _source_table, _source_id, _kind;
    RETURN NULL;
  END IF;

  INSERT INTO public.revenue_ledger (
    kind, direction, amount, currency, rail, environment,
    source_table, source_id, release_ref, recognised_at, idempotency_key, notes, created_by
  ) VALUES (
    _kind, v_direction, v_amount, COALESCE(_currency, 'USD'), COALESCE(_rail, 'none'), _environment,
    _source_table, _source_id, _release_ref, COALESCE(_recognised_at, now()), _idempotency_key, _notes, _created_by
  )
  ON CONFLICT (kind, source_table, source_id) WHERE kind <> 'correction' AND source_table IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    -- duplicate source: hand back the row that already exists
    SELECT * INTO v_row FROM public.revenue_ledger
     WHERE kind = _kind AND source_table = _source_table AND source_id = _source_id
     LIMIT 1;
  END IF;
  RETURN v_row;
END;
$rl_3$;

REVOKE ALL ON FUNCTION public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)
  TO service_role;

-- Corrections: a gosat/admin, through the API, with a mandatory note.
CREATE OR REPLACE FUNCTION public.record_revenue_correction(
  _amount          numeric,
  _notes           text,
  _idempotency_key text,
  _environment     text DEFAULT 'live',
  _recognised_at   timestamptz DEFAULT now()
) RETURNS public.revenue_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rl_4$
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _notes IS NULL OR length(btrim(_notes)) < 10 THEN
    RAISE EXCEPTION 'correction_needs_note';
  END IF;
  IF _idempotency_key IS NULL OR length(btrim(_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'correction_needs_idempotency_key';
  END IF;
  RETURN public.record_revenue('correction', _amount, _environment, NULL, NULL, 'none', NULL,
                               _recognised_at, _notes, 'USD', _idempotency_key, auth.uid());
END;
$rl_4$;

REVOKE ALL ON FUNCTION public.record_revenue_correction(numeric, text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_revenue_correction(numeric, text, text, text, timestamptz) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. revenue_summary(): totals by kind, net, operating net
-- ---------------------------------------------------------------------
-- Admin/gosat (or the service role) only. Roles are application roles in
-- user_roles, so the grant is to authenticated and the check is inside.
CREATE OR REPLACE FUNCTION public.revenue_summary(_period date DEFAULT NULL, _environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $rl_5$
DECLARE
  v_by_kind jsonb;
  v_income numeric;
  v_cost numeric;
  v_opening numeric;
  v_rows int;
  v_from date;
BEGIN
  IF NOT (COALESCE(auth.role(), '') = 'service_role' OR public.is_admin_or_gosat(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_from := CASE WHEN _period IS NULL THEN NULL ELSE date_trunc('month', _period)::date END;

  SELECT COALESCE(jsonb_object_agg(kind, total), '{}'::jsonb)
    INTO v_by_kind
    FROM (SELECT kind, round(sum(amount), 2) AS total
            FROM public.revenue_ledger
           WHERE environment = _environment AND (v_from IS NULL OR period = v_from)
           GROUP BY kind) k;

  SELECT COALESCE(sum(CASE WHEN direction = 'income' THEN amount END), 0),
         COALESCE(sum(CASE WHEN direction = 'cost'   THEN amount END), 0),
         COALESCE(sum(CASE WHEN kind = 'opening_balance' THEN amount END), 0),
         count(*)
    INTO v_income, v_cost, v_opening, v_rows
    FROM public.revenue_ledger
   WHERE environment = _environment AND (v_from IS NULL OR period = v_from);

  RETURN jsonb_build_object(
    'environment',   _environment,
    'period',        COALESCE(to_char(v_from, 'YYYY-MM'), 'all'),
    'by_kind',       v_by_kind,
    'income_total',  round(v_income, 2),
    'cost_total',    round(v_cost, 2),
    'net',           round(v_income + v_cost, 2),
    'operating_net', round(v_income + v_cost - v_opening, 2),
    'rows',          v_rows
  );
END;
$rl_5$;

REVOKE ALL ON FUNCTION public.revenue_summary(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revenue_summary(date, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Writers at the release moment (SQL side)
-- ---------------------------------------------------------------------
-- finalize_basket_order: same body as live (2026-09-04 base-on-top
-- version) plus an optional _environment and one record_revenue call per
-- line, inside the same transaction as the sale. The fee is S2G's from
-- completion whether or not the sower's share is still in escrow.
DROP FUNCTION IF EXISTS public.finalize_basket_order(uuid);
CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid, _environment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rl_6$
DECLARE
  v_order public.basket_orders%ROWTYPE;
  v_item jsonb;
  v_product_id uuid;
  v_sower_id uuid;
  v_qty integer;
  v_line_total numeric;
  v_unit_price numeric;
  v_base numeric;
  v_s2g_fee numeric;
  v_sower_amount numeric;
  v_grower_amount numeric;
  v_bestowal_id uuid;
  v_created uuid[] := ARRAY[]::uuid[];
  v_total_items integer := 0;
  v_wa record;
  v_delivery_type text;
  v_release_status text;
  v_hold_reason text;
  v_earning_status text;
  v_env text;
  v_rail text;
BEGIN
  SELECT * INTO v_order FROM public.basket_orders WHERE id = _basket_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'basket_order_not_found');
  END IF;

  IF v_order.status = 'completed' THEN
    SELECT COALESCE(array_agg(bestowal_id), ARRAY[]::uuid[])
      INTO v_created
      FROM public.basket_order_bestowals
     WHERE basket_order_id = _basket_order_id;
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'bestowal_ids', to_jsonb(v_created));
  END IF;

  v_env := COALESCE(_environment, public.payment_environment(v_order.provider, 'basket', _basket_order_id));
  v_rail := CASE v_order.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal'
                                  WHEN 'balance' THEN 'balance' WHEN 'nowpayments' THEN 'nowpayments' ELSE 'none' END;

  PERFORM set_config('app.whisperer_engine', 'on', true);

  FOR v_item IN SELECT jsonb_array_elements(v_order.items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_sower_id := NULLIF(v_item->>'sower_id', '')::uuid;
    v_qty := COALESCE((v_item->>'qty')::integer, 1);
    v_line_total := (v_item->>'line_total')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;

    SELECT COALESCE(delivery_type, 'digital') INTO v_delivery_type
      FROM public.products WHERE id = v_product_id;
    v_delivery_type := COALESCE(v_delivery_type, 'digital');

    IF v_delivery_type = 'physical' THEN
      v_release_status := 'held';
      v_hold_reason := 'awaiting_delivery_confirmation';
      v_earning_status := 'held';
    ELSE
      v_release_status := 'released';
      v_hold_reason := NULL;
      v_earning_status := 'payable';
    END IF;

    -- Base-on-top split: line_total already carries S2G's 15% on top of the
    -- sower's base. The sower receives the FULL base; the fee is what was
    -- added at checkout, never deducted from the base.
    IF COALESCE((v_item->>'fee_inclusive')::boolean, false) AND v_unit_price IS NOT NULL THEN
      v_base := round(v_unit_price * v_qty, 2);
    ELSE
      -- Legacy snapshot without unit_price/fee_inclusive: back the 15% out.
      v_base := round(v_line_total / 1.15, 2);
    END IF;
    v_s2g_fee := round(v_line_total - v_base, 2);

    v_wa := NULL;
    SELECT * INTO v_wa
      FROM public.resolve_whisperer_by_ref_code(
        v_product_id,
        NULLIF(v_item->>'ref_code', ''),
        v_order.user_id,
        NULLIF(v_item->>'live_session_id', '')::uuid,
        COALESCE(v_item->>'attribution_source', 'ref_click')
      );

    IF v_wa.assignment_id IS NOT NULL THEN
      -- Whisperer share comes OUT OF the sower's base, never the buyer total.
      v_grower_amount := round(v_base * (v_wa.commission_percent / 100.0), 2);
      v_sower_amount := round(v_base - v_grower_amount, 2);
    ELSE
      v_grower_amount := 0;
      v_sower_amount := v_base;
    END IF;

    INSERT INTO public.product_bestowals (
      bestower_id, product_id, sower_id,
      amount, s2g_fee, sower_amount, grower_amount,
      whisperer_id, whisperer_amount, ref_link_id,
      status, payment_method, payment_reference,
      delivery_type, release_status, hold_reason, released_at
    ) VALUES (
      v_order.user_id, v_product_id, v_sower_id,
      v_line_total, v_s2g_fee, v_sower_amount, v_grower_amount,
      v_wa.whisperer_id, COALESCE(v_grower_amount, 0), v_wa.ref_link_id,
      'completed', v_order.provider, v_order.provider_order_id,
      v_delivery_type, v_release_status, v_hold_reason,
      CASE WHEN v_release_status = 'released' THEN now() ELSE NULL END
    ) RETURNING id INTO v_bestowal_id;

    INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, amount, actor_id, actor_role, notes)
    VALUES (
      v_bestowal_id,
      CASE WHEN v_release_status = 'held' THEN 'held' ELSE 'released' END,
      NULL, v_release_status, v_line_total, v_order.user_id, 'system',
      CASE WHEN v_release_status = 'held' THEN 'physical seed — held until delivery' ELSE 'digital seed — released on payment' END
    );

    INSERT INTO public.basket_order_bestowals (basket_order_id, bestowal_id)
      VALUES (_basket_order_id, v_bestowal_id);

    IF v_wa.assignment_id IS NOT NULL AND v_grower_amount > 0 THEN
      INSERT INTO public.whisperer_earnings (
        whisperer_id, assignment_id, bestowal_id, amount, commission_percent, status
      ) VALUES (
        v_wa.whisperer_id, v_wa.assignment_id, v_bestowal_id, v_grower_amount, v_wa.commission_percent, v_earning_status
      );

      INSERT INTO public.whisperer_conversions (
        ref_link_id, whisperer_id, product_id, bestowal_id, bestower_id,
        bestowal_amount, commission_percent, commission_amount,
        attribution_type, live_session_id
      ) VALUES (
        v_wa.ref_link_id, v_wa.whisperer_id, v_product_id, v_bestowal_id, v_order.user_id,
        v_line_total, v_wa.commission_percent, v_grower_amount,
        v_wa.attribution_type, v_wa.live_session_id
      );

      UPDATE public.whisperer_referral_links
         SET total_conversions = COALESCE(total_conversions, 0) + 1,
             total_earned = COALESCE(total_earned, 0) + v_grower_amount,
             updated_at = now()
       WHERE id = v_wa.ref_link_id;

      UPDATE public.product_whisperer_assignments
         SET total_bestowals = COALESCE(total_bestowals, 0) + 1,
             total_earned = COALESCE(total_earned, 0) + v_grower_amount,
             updated_at = now()
       WHERE id = v_wa.assignment_id;
    END IF;

    IF v_release_status = 'released' THEN
      PERFORM public.credit_earning_for_bestowal(v_bestowal_id, v_order.user_id, 'system');
    END IF;

    -- Bookkeeping Phase 1: S2G's 15% on this line is earned now.
    IF v_s2g_fee > 0 THEN
      PERFORM public.record_revenue(
        'sale_fee', v_s2g_fee, v_env, 'product_bestowals', v_bestowal_id, v_rail,
        v_order.provider_order_id, now(),
        format('basket order %s line %s', _basket_order_id, v_product_id)
      );
    END IF;

    v_created := array_append(v_created, v_bestowal_id);
    v_total_items := v_total_items + v_qty;
  END LOOP;

  UPDATE public.basket_orders
     SET status = 'completed', completed_at = now()
   WHERE id = _basket_order_id;

  IF v_total_items > 0 THEN
    PERFORM public.add_xp(v_order.user_id, v_total_items * 100);
  END IF;

  PERFORM set_config('app.whisperer_engine', 'off', true);

  RETURN jsonb_build_object('success', true, 'bestowal_ids', to_jsonb(v_created), 'items_count', v_total_items);
END;
$rl_6$;

GRANT EXECUTE ON FUNCTION public.finalize_basket_order(uuid, text) TO service_role;

-- finalize_content_purchase: same body as live plus _environment and the
-- content_fee record, in the same transaction.
DROP FUNCTION IF EXISTS public.finalize_content_purchase(uuid);
CREATE OR REPLACE FUNCTION public.finalize_content_purchase(_purchase_id uuid, _environment text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rl_7$
DECLARE
  p public.content_purchases%ROWTYPE;
  v_room_id uuid;
  v_item_type text;
  v_price_cents int;
  v_env text;
  v_rail text;
BEGIN
  SELECT * INTO p FROM public.content_purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'content_purchase % not found', _purchase_id;
  END IF;

  IF p.payment_status = 'completed' THEN
    RETURN;
  END IF;

  UPDATE public.content_purchases
     SET payment_status = 'completed',
         completed_at   = now()
   WHERE id = _purchase_id;

  IF p.seller_id IS NOT NULL AND p.base_amount > 0 THEN
    PERFORM public.credit_balance_ledger(
      p.seller_id, p.base_amount, 'earning_credit',
      'content_purchases', _purchase_id, _purchase_id::text, NULL,
      'content purchase earning released'
    );
  END IF;
  UPDATE public.content_purchases
     SET payout_status = 'credited_to_balance'
   WHERE id = _purchase_id AND payout_status = 'pending';

  IF p.content_type = 'library_item' THEN
    INSERT INTO public.s2g_library_item_access (user_id, library_item_id, access_type)
    VALUES (p.buyer_id, p.content_id, 'download')
    ON CONFLICT DO NOTHING;

  ELSIF p.content_type = 'premium_item' THEN
    v_room_id := NULLIF(p.metadata->>'room_id','')::uuid;
    v_item_type := COALESCE(p.metadata->>'item_type', 'document');
    INSERT INTO public.premium_item_purchases
      (buyer_id, room_id, item_type, item_id, amount, payment_status)
    VALUES
      (p.buyer_id, v_room_id, v_item_type, p.content_id::text, p.base_amount, 'completed');

  ELSIF p.content_type = 'premium_room_access' THEN
    INSERT INTO public.premium_room_access
      (user_id, room_id, access_granted_at, payment_amount, payment_status)
    VALUES
      (p.buyer_id, p.content_id, now(), p.base_amount, 'paid');

  ELSIF p.content_type = 'live_session_media' THEN
    v_price_cents := ROUND(p.base_amount * 100)::int;
    INSERT INTO public.live_session_media_purchases
      (media_id, buyer_id, seller_id, price_paid_cents, payment_method, payment_reference, delivered_at)
    VALUES
      (p.content_id, p.buyer_id, p.seller_id, v_price_cents, p.provider, p.provider_order_id, now());

  ELSIF p.content_type = 'music_track' THEN
    -- Sower keeps base_amount ($2 floor for singles); Sow2Grow's 15% sits on top
    -- and is carried by the bestower, as is the processor fee.
    INSERT INTO public.music_purchases
      (buyer_id, track_id, amount, total_amount, artist_amount, platform_amount, admin_amount,
       platform_fee, sow2grow_fee, payment_status, payment_reference, delivered_at)
    VALUES
      (p.buyer_id, p.content_id, p.base_amount, p.buyer_total_amount,
       p.base_amount, COALESCE(p.platform_fee_amount, 0), 0,
       COALESCE(p.platform_fee_amount, 0), p.processor_fee_amount,
       'completed', p.provider_order_id, now());

    INSERT INTO public.user_notifications (user_id, type, title, message, metadata)
    VALUES (
      p.buyer_id,
      'music_purchase',
      'Your music purchase is ready',
      'Your purchased track has been added to your music library.',
      jsonb_build_object('track_id', p.content_id, 'purchase_id', p.id)
    );
  END IF;

  -- Bookkeeping Phase 1: the platform fee on this purchase is earned now.
  IF COALESCE(p.platform_fee_amount, 0) > 0 THEN
    v_env := COALESCE(_environment, public.payment_environment(p.provider, 'content', _purchase_id));
    v_rail := CASE p.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal'
                              WHEN 'balance' THEN 'balance' WHEN 'nowpayments' THEN 'nowpayments' ELSE 'none' END;
    PERFORM public.record_revenue(
      'content_fee', p.platform_fee_amount, v_env, 'content_purchases', _purchase_id, v_rail,
      p.provider_order_id, now(), format('content purchase %s (%s)', _purchase_id, p.content_type)
    );
  END IF;
END;
$rl_7$;

GRANT EXECUTE ON FUNCTION public.finalize_content_purchase(uuid, text) TO service_role;

-- ---------------------------------------------------------------------
-- 6. Backfill (idempotent: record_revenue returns the existing row)
-- ---------------------------------------------------------------------
DO $rl_8$
DECLARE
  r record;
  v_env text;
  v_parked numeric;
  v_devnet_settled uuid[] := ARRAY[
    'b3518c23-7ab5-4b7d-a527-eb212a96ceea',   -- paid 2026-09-01 by devnet payout (davison.taljaard)
    '904058fc-d4ce-4dbb-918e-8f089ecb6d19'    -- paid 2026-09-01 by devnet payout (Amber)
  ]::uuid[];
BEGIN
  FOR r IN
    SELECT pb.id, pb.s2g_fee, pb.payment_method, pb.payment_reference, pb.created_at, bob.basket_order_id
      FROM public.product_bestowals pb
      LEFT JOIN public.basket_order_bestowals bob ON bob.bestowal_id = pb.id
     WHERE pb.status = 'completed' AND COALESCE(pb.s2g_fee, 0) > 0
     ORDER BY pb.created_at
  LOOP
    IF r.id = ANY (v_devnet_settled) THEN
      v_env := 'devnet';
    ELSIF r.basket_order_id IS NOT NULL THEN
      v_env := public.payment_environment(r.payment_method, 'basket', r.basket_order_id);
    ELSE
      v_env := public.payment_environment(r.payment_method, 'basket', r.id);
    END IF;

    PERFORM public.record_revenue(
      'sale_fee', r.s2g_fee, v_env, 'product_bestowals', r.id,
      CASE r.payment_method WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal'
                            WHEN 'balance' THEN 'balance' WHEN 'nowpayments' THEN 'nowpayments' ELSE 'none' END,
      r.payment_reference, r.created_at,
      CASE WHEN r.id = ANY (v_devnet_settled)
           THEN 'backfill 2026-09-06; earnings for this sale were settled with devnet tokens on 2026-09-01 (owner decision: tag devnet)'
           ELSE 'backfill 2026-09-06 from product_bestowals.s2g_fee' END
    );
  END LOOP;

  -- Opening balance: the parked S2G Balance ledger, carried in as a cost.
  SELECT COALESCE(sum(amount), 0) INTO v_parked FROM public.balance_ledger;
  IF v_parked > 0 THEN
    PERFORM public.record_revenue(
      'opening_balance', -v_parked, 'live', NULL, NULL, 'none', NULL,
      '2026-09-06 00:00:00+00'::timestamptz,
      format('Opening balance at ledger start: %s of pre-ledger member credits still held in balance_ledger (S2G Balance, parked 2026-09-03). A liability carried into the books, not income; no cash trail is asserted for it. revenue_summary().operating_net excludes this row.', v_parked),
      'USD', 'opening-balance-2026-09-06'
    );
  END IF;
END;
$rl_8$;

-- ---------------------------------------------------------------------
-- 7. Proof
-- ---------------------------------------------------------------------
-- Second record_revenue call for an existing source must insert nothing.
SELECT public.record_revenue('sale_fee', 0.30, 'live', 'product_bestowals', '158ee443-107e-4f81-902c-a88fa70a2dcd', 'paypal', NULL, now(), 'idempotency re-run in migration proof');

SELECT json_build_object(
  'rows_by_kind_env', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.kind, t.environment), '[]'::json) FROM (
      SELECT kind, environment, count(*) AS rows, round(sum(amount), 2) AS total
      FROM public.revenue_ledger GROUP BY kind, environment
    ) t
  ),
  'live_net',            (SELECT round(COALESCE(sum(amount), 0), 2) FROM public.revenue_ledger WHERE environment = 'live'),
  'live_operating_net',  (SELECT round(COALESCE(sum(amount), 0), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind <> 'opening_balance'),
  'devnet_tagged_sales', (SELECT COALESCE(json_agg(left(source_id::text, 8) ORDER BY source_id), '[]'::json)
                            FROM public.revenue_ledger WHERE environment = 'devnet' AND kind = 'sale_fee'),
  'named_two_are_devnet', (SELECT count(*) = 2 FROM public.revenue_ledger
                            WHERE environment = 'devnet' AND source_id IN ('b3518c23-7ab5-4b7d-a527-eb212a96ceea', '904058fc-d4ce-4dbb-918e-8f089ecb6d19')),
  'sale_fee_rows_vs_completed_fee_rows', json_build_object(
      'ledger', (SELECT count(*) FROM public.revenue_ledger WHERE kind = 'sale_fee'),
      'source', (SELECT count(*) FROM public.product_bestowals WHERE status = 'completed' AND COALESCE(s2g_fee, 0) > 0)),
  'sale_fee_total_vs_source_total', json_build_object(
      'ledger', (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE kind = 'sale_fee'),
      'source', (SELECT round(sum(s2g_fee), 2) FROM public.product_bestowals WHERE status = 'completed' AND COALESCE(s2g_fee, 0) > 0)),
  'idempotent_rerun_still_one_row', (SELECT count(*) = 1 FROM public.revenue_ledger
                                       WHERE kind = 'sale_fee' AND source_id = '158ee443-107e-4f81-902c-a88fa70a2dcd'),
  'append_only_trigger', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'revenue_ledger_no_update_delete'),
  'grants', json_build_object(
      'record_revenue_authenticated', has_function_privilege('authenticated', 'public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)', 'EXECUTE'),
      'record_revenue_service_role',  has_function_privilege('service_role',  'public.record_revenue(text, numeric, text, text, uuid, text, text, timestamptz, text, text, text, uuid)', 'EXECUTE'),
      'revenue_summary_anon',         has_function_privilege('anon', 'public.revenue_summary(date, text)', 'EXECUTE'),
      'table_update_authenticated',   has_table_privilege('authenticated', 'public.revenue_ledger', 'UPDATE'),
      'table_delete_service_role',    has_table_privilege('service_role', 'public.revenue_ledger', 'DELETE'))
) AS proof;
