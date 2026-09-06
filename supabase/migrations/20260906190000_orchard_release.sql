-- P0-5 Phase B (ORCHARD-MONEY-PLAN.md section 4): release a Launch orchard
-- the moment it is fully funded.
--
--   orchards.orchard_kind / funding_state / funded_at / released_at (plan §2)
--   orchard_releases   one row per release, totals at release, UNIQUE(orchard_id)
--   orchard_stock      gift units the sower now holds as stock (plan §4 step 4)
--   orchard_release(_orchard_id)  the single entry point: SECURITY DEFINER,
--                      idempotent, one orchard at a time, callable by the
--                      service role or a gosat/admin ("release now")
--   orchard_release_if_funded()   the automatic seam, called by
--                      orchard_apply_holding() after every new holding
--
-- What release does, all-or-nothing:
--   1. every held holding -> released (the recount trigger keeps filled_pockets)
--   2. the sower's share becomes OWED through the normal pipeline: each
--      bestowals row flips payout_status held_for_orchard -> pending, which
--      is exactly the condition owed_payout_balances() already reads for a
--      sale; payout-earnings then pays it on the sower's current rail with
--      the usual threshold, cooling-off and caps. Nothing is paid here.
--   3. S2G's 15%: record_revenue('orchard_fee', sum(s2g_amount), <env>,
--      'orchard_releases', <release id>, <rail>, <orchard id>) -- one row per
--      environment (a live/devnet mix records two), idempotent
--   4. gift pockets -> orchard_stock units for the sower
--   5. Books: the sower's income row per pocket is written now, not at pocket
--      time (books.ts stops writing orchard income at finalize)
--   6. orchards.funding_state = released, released_at; orchard_events row;
--      notifications to the sower and every bestower
-- Refuses cleanly (returns released=false with a reason) when the orchard is
-- not launch, not funded, has no held holdings, or is already released.
--
-- Trigger choice: automatic, inside orchard_apply_holding, in the same
-- transaction as the holding that completes the funding. Every rail and
-- every retry path (webhook, capture, sweep, check) goes through that
-- function under the orchard row lock, so there is exactly one place the
-- transition can happen and it cannot half-complete. A gosat can still call
-- orchard_release() by hand; calling it twice is a no-op.
--
-- revenue_ledger's unique key gains `environment` so a release that mixes
-- live and devnet holdings can carry one fee row per environment.
-- Unique dollar tags per block. Prefer: npx supabase db query --linked -f <this file>

-- ---------------------------------------------------------------------
-- 1. orchards: kind and funding state
-- ---------------------------------------------------------------------
ALTER TABLE public.orchards
  ADD COLUMN IF NOT EXISTS orchard_kind  text NOT NULL DEFAULT 'launch' CHECK (orchard_kind IN ('launch', 'uplift')),
  ADD COLUMN IF NOT EXISTS funding_state text NOT NULL DEFAULT 'open'   CHECK (funding_state IN ('open', 'funded', 'released', 'cancelled')),
  ADD COLUMN IF NOT EXISTS funded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS released_at   timestamptz;

-- ---------------------------------------------------------------------
-- 2. orchard_releases, orchard_stock
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orchard_releases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id      uuid NOT NULL UNIQUE REFERENCES public.orchards(id),
  sower_user_id   uuid,
  gross_total     numeric(18,2) NOT NULL,
  sower_total     numeric(18,2) NOT NULL,
  s2g_total       numeric(18,2) NOT NULL,
  holdings_count  integer NOT NULL,
  pockets         integer NOT NULL,
  gift_units      integer NOT NULL DEFAULT 0,
  environments    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"live": s2g, "devnet": s2g}
  released_by     uuid,                                   -- null = automatic
  release_trigger text NOT NULL CHECK (release_trigger IN ('auto', 'gosat')),
  released_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.orchard_stock (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id    uuid NOT NULL REFERENCES public.orchards(id),
  release_id    uuid REFERENCES public.orchard_releases(id),
  sower_user_id uuid NOT NULL,
  units         integer NOT NULL CHECK (units > 0),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orchard_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchard_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orchard_releases_select ON public.orchard_releases;
CREATE POLICY orchard_releases_select ON public.orchard_releases FOR SELECT TO authenticated
  USING (sower_user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid())
         OR EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.orchard_id = orchard_releases.orchard_id AND h.bestower_user_id = auth.uid()));
DROP POLICY IF EXISTS orchard_stock_select ON public.orchard_stock;
CREATE POLICY orchard_stock_select ON public.orchard_stock FOR SELECT TO authenticated
  USING (sower_user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid()));
REVOKE ALL ON public.orchard_releases, public.orchard_stock FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.orchard_releases, public.orchard_stock TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. revenue ledger: one fee row per environment per source
-- ---------------------------------------------------------------------
DROP INDEX IF EXISTS public.revenue_ledger_one_per_source;
CREATE UNIQUE INDEX revenue_ledger_one_per_source
  ON public.revenue_ledger (kind, source_table, source_id, environment)
  WHERE kind <> 'correction' AND source_table IS NOT NULL;

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
AS $pb_rr$
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
  ON CONFLICT (kind, source_table, source_id, environment) WHERE kind <> 'correction' AND source_table IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    -- duplicate source: hand back the row that already exists
    SELECT * INTO v_row FROM public.revenue_ledger
     WHERE kind = _kind AND source_table = _source_table AND source_id = _source_id AND environment = _environment
     LIMIT 1;
  END IF;
  RETURN v_row;
END;
$pb_rr$;

-- ---------------------------------------------------------------------
-- 4. orchard_funding_status: now also says whether it is released
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.orchard_funding_status(uuid);
CREATE OR REPLACE FUNCTION public.orchard_funding_status(_orchard_id uuid)
RETURNS TABLE(orchard_id uuid, target numeric, held_total numeric, pockets_total integer, pockets_held integer, funded boolean,
              funding_state text, released boolean, released_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pb_fs$
  SELECT
    o.id,
    round(COALESCE(o.total_pockets, 0) * COALESCE(o.pocket_price, 0), 2)                        AS target,
    round(COALESCE((SELECT sum(h.gross_amount) FROM public.orchard_holdings h
                    WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0), 2)       AS held_total,
    COALESCE(o.total_pockets, 0)                                                                 AS pockets_total,
    COALESCE((SELECT sum(h.pockets) FROM public.orchard_holdings h
              WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0)::integer         AS pockets_held,
    (COALESCE(o.total_pockets, 0) > 0
      AND COALESCE((SELECT sum(h.gross_amount) FROM public.orchard_holdings h
                    WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0)
          >= COALESCE(o.total_pockets, 0) * COALESCE(o.pocket_price, 0))                          AS funded,
    o.funding_state,
    (o.funding_state = 'released')                                                               AS released,
    o.released_at
  FROM public.orchards o
  WHERE o.id = _orchard_id;
$pb_fs$;
REVOKE ALL ON FUNCTION public.orchard_funding_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_funding_status(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. The release
-- ---------------------------------------------------------------------
-- Internal: assumes the caller holds the orchard row lock. Not granted to anyone.
CREATE OR REPLACE FUNCTION public.orchard_release_locked(_orchard_id uuid, _actor uuid, _trigger text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pb_rl$
DECLARE
  v_o          public.orchards%ROWTYPE;
  v_f          record;
  v_release    public.orchard_releases%ROWTYPE;
  v_gross      numeric;
  v_sower      numeric;
  v_s2g        numeric;
  v_holdings   int;
  v_pockets    int;
  v_gift       int;
  v_env        record;
  v_envs       jsonb := '{}'::jsonb;
  v_rail       text;
  v_fee_rows   int := 0;
  v_company    uuid;
  v_title      text;
  r            record;
BEGIN
  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('released', false, 'reason', 'orchard_not_found');
  END IF;
  IF v_o.orchard_kind <> 'launch' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_launch');   -- Uplift is Phase D
  END IF;
  SELECT id INTO v_release FROM public.orchard_releases WHERE orchard_id = _orchard_id;
  IF FOUND OR v_o.funding_state = 'released' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'already_released', 'release_id', v_release.id);
  END IF;
  IF v_o.funding_state = 'cancelled' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'cancelled');
  END IF;
  SELECT * INTO v_f FROM public.orchard_funding_status(_orchard_id);
  IF NOT COALESCE(v_f.funded, false) THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_funded', 'held_total', v_f.held_total, 'target', v_f.target);
  END IF;

  SELECT COALESCE(round(sum(gross_amount), 2), 0), COALESCE(round(sum(sower_amount), 2), 0), COALESCE(round(sum(s2g_amount), 2), 0),
         count(*), COALESCE(sum(pockets), 0), COALESCE(sum(pockets) FILTER (WHERE pocket_type = 'gift'), 0)
    INTO v_gross, v_sower, v_s2g, v_holdings, v_pockets, v_gift
    FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'held';
  IF v_holdings = 0 THEN
    RETURN jsonb_build_object('released', false, 'reason', 'no_held_holdings');
  END IF;

  -- S2G share per environment (from each holding's bestowal), for the ledger
  FOR v_env IN
    SELECT public.payment_environment(b.provider, 'orchard', b.id) AS env, round(sum(h.s2g_amount), 2) AS s2g,
           count(DISTINCT h.rail) AS rails, min(h.rail) AS rail
      FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
     WHERE h.orchard_id = _orchard_id AND h.status = 'held'
     GROUP BY 1
  LOOP
    v_envs := v_envs || jsonb_build_object(v_env.env, v_env.s2g);
  END LOOP;

  INSERT INTO public.orchard_releases (orchard_id, sower_user_id, gross_total, sower_total, s2g_total, holdings_count, pockets, gift_units,
                                       environments, released_by, release_trigger)
  VALUES (_orchard_id, v_o.user_id, v_gross, v_sower, v_s2g, v_holdings, v_pockets, v_gift, v_envs, _actor, _trigger)
  RETURNING * INTO v_release;

  -- 1. holdings held -> released
  UPDATE public.orchard_holdings SET status = 'released', updated_at = now()
   WHERE orchard_id = _orchard_id AND status = 'held';

  -- 2. the sower's share is now OWED through the normal pipeline
  UPDATE public.bestowals b SET payout_status = 'pending', updated_at = now()
   WHERE b.orchard_id = _orchard_id AND b.payout_status = 'held_for_orchard'
     AND EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.bestowal_id = b.id AND h.status = 'released');

  -- 3. S2G's 15%, one ledger row per environment, idempotent
  FOR v_env IN SELECT key AS env, value::numeric AS s2g FROM jsonb_each_text(v_envs) LOOP
    IF v_env.s2g > 0 THEN
      SELECT CASE WHEN count(DISTINCT h.rail) = 1 THEN min(h.rail) ELSE 'none' END INTO v_rail
        FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
       WHERE h.orchard_id = _orchard_id AND public.payment_environment(b.provider, 'orchard', b.id) = v_env.env;
      IF v_rail NOT IN ('solana', 'paypal', 'balance', 'nowpayments') THEN v_rail := 'none'; END IF;
      PERFORM public.record_revenue('orchard_fee', v_env.s2g, v_env.env, 'orchard_releases', v_release.id, v_rail,
                                    _orchard_id::text, now(),
                                    format('orchard %s released: S2G share of %s pocket(s), %s', v_o.title, v_pockets, v_env.env));
      v_fee_rows := v_fee_rows + 1;
    END IF;
  END LOOP;

  -- 4. gift pockets become the sower's stock
  IF v_gift > 0 THEN
    INSERT INTO public.orchard_stock (orchard_id, release_id, sower_user_id, units, note)
    VALUES (_orchard_id, v_release.id, v_o.user_id, v_gift,
            format('%s free-will gift pocket(s) released on %s: units the sower holds as cashflow stock', v_gift, to_char(now(), 'YYYY-MM-DD')));
  END IF;

  -- 5. Books: the sower's income rows, one per pocket, written now (not at pocket time)
  SELECT c.id INTO v_company FROM public.companies c
   WHERE c.id = v_o.company_id AND c.books_enabled = true;
  IF v_company IS NOT NULL THEN
    FOR r IN
      SELECT h.bestowal_id, h.sower_amount, h.s2g_amount, h.rail, b.bestower_id
        FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
       WHERE h.orchard_id = _orchard_id AND h.status = 'released'
    LOOP
      INSERT INTO public.books_income (business_id, income_type, description, amount, platform_fee, currency, payment_method,
                                       buyer_reference, source_table, source_id, occurred_at)
      VALUES (v_company, 'sale', v_o.title, r.sower_amount, r.s2g_amount, 'USD', r.rail,
              (SELECT COALESCE(pp.display_name, pp.username) FROM public.profiles_public pp WHERE pp.user_id = r.bestower_id),
              'bestowals', r.bestowal_id, now())
      ON CONFLICT (source_table, source_id) DO UPDATE
        SET amount = EXCLUDED.amount, platform_fee = EXCLUDED.platform_fee, occurred_at = EXCLUDED.occurred_at;
    END LOOP;
  END IF;

  -- 6. state, event, notifications
  UPDATE public.orchards SET funding_state = 'released', released_at = now(),
                             funded_at = COALESCE(funded_at, now()), updated_at = now()
   WHERE id = _orchard_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (_orchard_id, NULL, 'released', 'held', 'released', v_sower, _actor, CASE WHEN _trigger = 'gosat' THEN 'gosat' ELSE 'system' END,
          format('release %s: %s holding(s), %s pocket(s); sower owed %s, S2G fee %s (%s ledger row(s)), gift units %s',
                 v_release.id, v_holdings, v_pockets, v_sower, v_s2g, v_fee_rows, v_gift));

  v_title := COALESCE(v_o.title, 'Your orchard');
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  VALUES (v_o.user_id, 'orchard_released', 'Orchard fully funded and released',
          format('%s is fully funded. $%s is now owed to you and will be paid on your next payout run.%s',
                 v_title, v_sower, CASE WHEN v_gift > 0 THEN format(' %s gift unit(s) are yours as stock.', v_gift) ELSE '' END),
          '/orchard/' || _orchard_id::text,
          jsonb_build_object('orchard_id', _orchard_id, 'release_id', v_release.id, 'sower_total', v_sower, 'gift_units', v_gift));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  SELECT DISTINCT h.bestower_user_id, 'orchard_released', 'An orchard you bestowed into is fully funded',
         format('%s reached its target and has been released to the sower.', v_title),
         '/orchard/' || _orchard_id::text,
         jsonb_build_object('orchard_id', _orchard_id, 'release_id', v_release.id)
    FROM public.orchard_holdings h WHERE h.orchard_id = _orchard_id AND h.bestower_user_id IS NOT NULL AND h.bestower_user_id <> v_o.user_id;

  RETURN jsonb_build_object('released', true, 'release_id', v_release.id, 'sower_total', v_sower, 's2g_total', v_s2g,
                            'gross_total', v_gross, 'holdings', v_holdings, 'pockets', v_pockets, 'gift_units', v_gift,
                            'fee_rows', v_fee_rows, 'environments', v_envs, 'trigger', _trigger);
END;
$pb_rl$;
REVOKE ALL ON FUNCTION public.orchard_release_locked(uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;

-- Public entry point: service role, or a gosat/admin pressing "release now".
CREATE OR REPLACE FUNCTION public.orchard_release(_orchard_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pb_pub$
DECLARE
  v_lock uuid;
BEGIN
  IF NOT (COALESCE(auth.role(), '') = 'service_role' OR public.is_admin_or_gosat(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO v_lock FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF v_lock IS NULL THEN
    RETURN jsonb_build_object('released', false, 'reason', 'orchard_not_found');
  END IF;
  RETURN public.orchard_release_locked(_orchard_id, auth.uid(), CASE WHEN COALESCE(auth.role(), '') = 'service_role' THEN 'auto' ELSE 'gosat' END);
END;
$pb_pub$;
REVOKE ALL ON FUNCTION public.orchard_release(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_release(uuid) TO authenticated, service_role;

-- The automatic seam: lock the orchard, mark it funded, release if launch.
CREATE OR REPLACE FUNCTION public.orchard_release_if_funded(_orchard_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pb_auto$
DECLARE
  v_o public.orchards%ROWTYPE;
  v_f record;
BEGIN
  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('released', false, 'reason', 'orchard_not_found'); END IF;
  IF v_o.funding_state IN ('released', 'cancelled') THEN
    RETURN jsonb_build_object('released', false, 'reason', 'already_' || v_o.funding_state);
  END IF;
  SELECT * INTO v_f FROM public.orchard_funding_status(_orchard_id);
  IF NOT COALESCE(v_f.funded, false) THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_funded');
  END IF;
  IF v_o.funding_state = 'open' THEN
    UPDATE public.orchards SET funding_state = 'funded', funded_at = COALESCE(funded_at, now()), updated_at = now() WHERE id = _orchard_id;
    INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
    VALUES (_orchard_id, 'funded', 'open', 'funded', v_f.held_total, 'system', format('target %s reached', v_f.target));
  END IF;
  IF v_o.orchard_kind <> 'launch' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'not_launch');   -- Uplift waits for a gosat (Phase D)
  END IF;
  RETURN public.orchard_release_locked(_orchard_id, NULL, 'auto');
END;
$pb_auto$;
REVOKE ALL ON FUNCTION public.orchard_release_if_funded(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_release_if_funded(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 6. orchard_apply_holding: same body as Phase A plus the release seam
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orchard_apply_holding(_bestowal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pb_ah$
DECLARE
  v_b         public.bestowals%ROWTYPE;
  v_holding   uuid;
  v_gross     numeric;
  v_sower     numeric;
  v_s2g       numeric;
  v_rail      text;
BEGIN
  SELECT * INTO v_b FROM public.bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_b.orchard_id IS NULL THEN
    RETURN NULL;                                           -- not an orchard bestowal
  END IF;
  IF v_b.payment_status NOT IN ('completed', 'distributed') THEN
    RETURN NULL;                                           -- not paid yet
  END IF;

  SELECT id INTO v_holding FROM public.orchard_holdings WHERE bestowal_id = _bestowal_id;
  IF v_holding IS NOT NULL THEN
    RETURN v_holding;                                      -- already applied
  END IF;

  v_gross := round(COALESCE(v_b.base_amount, v_b.amount, 0), 2);
  v_sower := round(COALESCE((v_b.distribution_data ->> 'sower_amount')::numeric, v_gross / 1.15), 2);
  v_s2g   := round(GREATEST(v_gross - v_sower, 0), 2);
  v_rail  := CASE v_b.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' WHEN 'balance' THEN 'balance' ELSE 'unknown' END;

  INSERT INTO public.orchard_holdings (
    orchard_id, bestowal_id, bestower_user_id, pockets, pocket_type,
    gross_amount, sower_amount, s2g_amount, processor_fee,
    rail, rail_reference, delivery_address, location, status
  ) VALUES (
    v_b.orchard_id, v_b.id, v_b.bestower_id, GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_b.pocket_type,
    v_gross, v_sower, v_s2g, COALESCE(v_b.processor_fee_amount, 0),
    v_rail, v_b.payment_reference, v_b.delivery_address,
    CASE WHEN v_b.provider = 'paypal' THEN 'paypal_balance' ELSE 'hot_wallet' END, 'held'
  )
  ON CONFLICT (bestowal_id) DO NOTHING
  RETURNING id INTO v_holding;

  IF v_holding IS NULL THEN
    SELECT id INTO v_holding FROM public.orchard_holdings WHERE bestowal_id = _bestowal_id;
    RETURN v_holding;
  END IF;

  -- Orchard money is not an earning until release.
  UPDATE public.bestowals SET payout_status = 'held_for_orchard' WHERE id = _bestowal_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_b.orchard_id, v_holding, 'holding_created', NULL, 'held', v_gross, 'system',
          format('%s pocket(s) via %s, ref %s', GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_rail, COALESCE(v_b.payment_reference, '-')));

  -- Phase B: if this holding completed the funding, release now, in this
  -- transaction (idempotent; a no-op when not funded or already released).
  PERFORM public.orchard_release_if_funded(v_b.orchard_id);

  RETURN v_holding;
END;
$pb_ah$;

-- ---------------------------------------------------------------------
-- 7. Proof
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT jsonb_build_object(
  'tables', jsonb_build_object('orchard_releases', to_regclass('public.orchard_releases') IS NOT NULL, 'orchard_stock', to_regclass('public.orchard_stock') IS NOT NULL),
  'orchards_columns', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'orchards' AND column_name IN ('orchard_kind','funding_state','funded_at','released_at')),
  'funding_status_has_released', (SELECT count(*) FROM information_schema.parameters WHERE specific_name LIKE 'orchard_funding_status%' AND parameter_name = 'released'),
  'ledger_index', (SELECT indexdef LIKE '%environment%' FROM pg_indexes WHERE indexname = 'revenue_ledger_one_per_source'),
  'unfunded_test_orchard_refuses', (SELECT public.orchard_release('55f4e02e-32fe-4013-aa7b-4eff6da77d37') ->> 'reason'),
  'grants', jsonb_build_object(
    'release_authenticated', has_function_privilege('authenticated', 'public.orchard_release(uuid)', 'EXECUTE'),
    'release_locked_service_role', has_function_privilege('service_role', 'public.orchard_release_locked(uuid, uuid, text)', 'EXECUTE'),
    'if_funded_authenticated', has_function_privilege('authenticated', 'public.orchard_release_if_funded(uuid)', 'EXECUTE'))
) AS proof;
