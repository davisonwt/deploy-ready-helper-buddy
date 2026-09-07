-- P0-5 Phase D (ORCHARD-MONEY-PLAN.md section 8, Phase D; owner decisions
-- 2026-09-07): Uplift orchards. A gosat opens one, the tribe fills its
-- pockets, and when it is fully funded a gosat releases it to named parties
-- whom S2G pays directly in USDC from the hot wallet. No sower payout.
--
--   orchards.opened_by_gosat        who opened an Uplift (null for Launch)
--   trg_orchards_uplift_gate        only a gosat/admin (or the service role) can
--                                   insert kind = uplift, or change a kind; a
--                                   non-gosat attempt raises
--                                   uplift_orchards_are_gosat_only (42501 -> 403)
--   orchard_release_payments        one row per party payment: label, amount,
--                                   rail, destination, reference (the USDC
--                                   signature), status sending|paid|failed|
--                                   needs_human|voided, environment, attempts
--   trg_orchard_release_payments_guard  DB-level: sum(amount) of non-voided rows
--                                   per orchard never exceeds that orchard's
--                                   release sower_total (party_payments_exceed_sower_total)
--   orchard_parties_paid_v          the tribe's read-only "where the gifts went":
--                                   label, amount, rail, paid_at of PAID rows only;
--                                   no destination, no reference
--   orchard_release_if_funded()     Uplift now stops at funded and notifies every
--                                   gosat/admin (in-app user_notifications); it
--                                   never auto-releases
--   orchard_uplift_fund_now()       gosat: open -> funded by hand, note required
--                                   (a top-up confirmed outside the app)
--   orchard_uplift_release()        gosat/admin or service role: validates the
--                                   parties, performs the ledger release on the
--                                   first call (holdings -> released, bestowal
--                                   rows -> paid_to_parties so owed_payout_balances
--                                   never counts them, orchard_fee via
--                                   record_revenue per environment exactly like
--                                   Launch, no sower Books income), inserts one
--                                   'sending' row per party, re-arms retries;
--                                   idempotent: a second call adds/retries only
--   orchard_uplift_payment_paid/fail/defer/needs_human()  the worker seam
--                                   (service role); paid is idempotent per
--                                   reference; the 3rd failure parks the row at
--                                   needs_human and alerts gosats (Phase C's state)
--   orchard_uplift_payment_void()   gosat: a failed/needs_human row with no
--                                   reference -> voided (frees the amount)
--   orchard_cancel()                Uplift: refused once ANY party row exists
--                                   (uplift_parties_already_paid) -- owner rule
--   liability_snapshot()            held_for_orchards.uplift_unpaid: released
--                                   Uplift sower money not yet paid to parties is
--                                   still S2G's liability; counted in liabilities_total
--
-- Nothing here sends money. The edge function orchard-release-uplift does,
-- and only for rows orchard_uplift_release() handed it at status 'sending'.
-- No bare DELETE/UPDATE anywhere. Unique dollar tags per block.
-- Prefer: npx supabase db query --linked -f <this file>

-- 1. orchards.opened_by_gosat + the creation gate ------------------------------
ALTER TABLE public.orchards
  ADD COLUMN IF NOT EXISTS opened_by_gosat uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.orchards_uplift_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_gate$
DECLARE
  v_gosat boolean := (COALESCE(auth.role(), '') = 'service_role' OR public.is_admin_or_gosat(auth.uid()));
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.orchard_kind = 'uplift' THEN
      IF NOT v_gosat THEN
        RAISE EXCEPTION 'uplift_orchards_are_gosat_only: only a gosat can open an Uplift orchard' USING ERRCODE = '42501';
      END IF;
      NEW.opened_by_gosat := COALESCE(NEW.opened_by_gosat, auth.uid());
    ELSE
      NEW.opened_by_gosat := NULL;
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE of orchard_kind: only before any money arrived, and only by a gosat.
  IF NEW.orchard_kind IS DISTINCT FROM OLD.orchard_kind THEN
    IF EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.orchard_id = NEW.id) THEN
      RAISE EXCEPTION 'orchard_kind_locked: pockets have already been bestowed into this orchard';
    END IF;
    IF NOT v_gosat THEN
      RAISE EXCEPTION 'uplift_orchards_are_gosat_only: only a gosat can change an orchard''s kind' USING ERRCODE = '42501';
    END IF;
    NEW.opened_by_gosat := CASE WHEN NEW.orchard_kind = 'uplift' THEN COALESCE(NEW.opened_by_gosat, auth.uid()) ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$pd_gate$;
DROP TRIGGER IF EXISTS trg_orchards_uplift_gate ON public.orchards;
CREATE TRIGGER trg_orchards_uplift_gate
  BEFORE INSERT OR UPDATE OF orchard_kind ON public.orchards
  FOR EACH ROW EXECUTE FUNCTION public.orchards_uplift_gate();

-- 2. orchard_release_payments ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orchard_release_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id     uuid NOT NULL REFERENCES public.orchards(id) ON DELETE RESTRICT,
  release_id     uuid REFERENCES public.orchard_releases(id) ON DELETE RESTRICT,
  label          text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 120),
  amount         numeric(18,2) NOT NULL CHECK (amount > 0),
  rail           text NOT NULL DEFAULT 'solana' CHECK (rail IN ('solana', 'paypal')),
  destination    text NOT NULL,                                     -- Solana wallet (PayPal: deferred until PayPal approves the app)
  reference      text,                                              -- the USDC transaction signature once paid
  status         text NOT NULL DEFAULT 'sending'
                 CHECK (status IN ('sending', 'paid', 'failed', 'needs_human', 'voided')),
  environment    text NOT NULL CHECK (environment IN ('live', 'devnet', 'sandbox')),
  attempts       integer NOT NULL DEFAULT 0,
  last_error     text,
  paid_at        timestamptz,
  paid_by_gosat  uuid,                                              -- the gosat who ordered this payment
  voided_by      uuid,
  voided_reason  text,
  claimed_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orchard_release_payments_orchard_idx ON public.orchard_release_payments (orchard_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS orchard_release_payments_reference_uq ON public.orchard_release_payments (reference) WHERE reference IS NOT NULL;

ALTER TABLE public.orchard_release_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orchard_release_payments_select_gosat ON public.orchard_release_payments;
CREATE POLICY orchard_release_payments_select_gosat ON public.orchard_release_payments
  FOR SELECT TO authenticated USING (public.is_admin_or_gosat(auth.uid()));
REVOKE ALL ON public.orchard_release_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orchard_release_payments TO authenticated;   -- gosat/admin rows only, via the policy; writes only through the RPCs below
GRANT ALL ON public.orchard_release_payments TO service_role;

-- The tribe's read-only list: paid rows, four columns, nothing that identifies a wallet.
CREATE OR REPLACE VIEW public.orchard_parties_paid_v
WITH (security_barrier = true) AS
  SELECT p.orchard_id, p.label, p.amount, p.rail, p.paid_at
    FROM public.orchard_release_payments p
   WHERE p.status = 'paid';
REVOKE ALL ON public.orchard_parties_paid_v FROM PUBLIC, anon;
GRANT SELECT ON public.orchard_parties_paid_v TO authenticated, service_role;

-- 3. DB-level guard: never more than the sower total ------------------------------
CREATE OR REPLACE FUNCTION public.orchard_release_payments_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_guard$
DECLARE
  v_kind      text;
  v_total     numeric;
  v_committed numeric;
BEGIN
  IF NEW.status = 'voided' THEN RETURN NEW; END IF;                 -- a voided row commits nothing
  PERFORM 1 FROM public.orchards WHERE id = NEW.orchard_id FOR UPDATE;   -- serialise per orchard
  SELECT o.orchard_kind, r.sower_total INTO v_kind, v_total
    FROM public.orchards o LEFT JOIN public.orchard_releases r ON r.orchard_id = o.id
   WHERE o.id = NEW.orchard_id;
  IF v_kind IS DISTINCT FROM 'uplift' THEN
    RAISE EXCEPTION 'party_payments_are_uplift_only';
  END IF;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'orchard_not_released: party payments need the orchard''s release row';
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_committed
    FROM public.orchard_release_payments
   WHERE orchard_id = NEW.orchard_id AND status <> 'voided' AND id <> NEW.id;
  IF round(v_committed + NEW.amount, 2) > v_total THEN
    RAISE EXCEPTION 'party_payments_exceed_sower_total: % already committed + % > sower total %',
      round(v_committed, 2), NEW.amount, v_total;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$pd_guard$;
DROP TRIGGER IF EXISTS trg_orchard_release_payments_guard ON public.orchard_release_payments;
CREATE TRIGGER trg_orchard_release_payments_guard
  BEFORE INSERT OR UPDATE OF amount, status, orchard_id ON public.orchard_release_payments
  FOR EACH ROW EXECUTE FUNCTION public.orchard_release_payments_guard();

-- 4. Funded detection: Uplift stops at funded and tells the gosats -----------------
CREATE OR REPLACE FUNCTION public.orchard_release_if_funded(_orchard_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_auto$
DECLARE
  v_o public.orchards%ROWTYPE;
  v_f record;
BEGIN
  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('released', false, 'reason', 'orchard_not_found'); END IF;
  IF v_o.funding_state IN ('released', 'cancelling', 'cancelled') THEN
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
    -- Phase D: an Uplift waits for a gosat. Tell every gosat/admin once, in-app
    -- (S2G has no email), the moment it becomes funded.
    IF v_o.funding_state = 'open' THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
      SELECT DISTINCT ur.user_id, 'orchard_uplift_funded', 'An Uplift orchard is fully funded',
             format('%s reached its target of $%s. Release it to the parties from the orchard console.', COALESCE(v_o.title, 'An Uplift orchard'), v_f.target),
             '/admin/orchards', jsonb_build_object('orchard_id', _orchard_id, 'held_total', v_f.held_total, 'target', v_f.target)
        FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
    END IF;
    RETURN jsonb_build_object('released', false, 'reason', 'uplift_waits_for_gosat', 'funding_state', 'funded');
  END IF;
  RETURN public.orchard_release_locked(_orchard_id, NULL, 'auto');
END;
$pd_auto$;
REVOKE ALL ON FUNCTION public.orchard_release_if_funded(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_release_if_funded(uuid) TO service_role;

-- 5. Fund-now override (Uplift only, gosat only) ----------------------------------
CREATE OR REPLACE FUNCTION public.orchard_uplift_fund_now(_orchard_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_fundnow$
DECLARE
  v_o public.orchards%ROWTYPE;
  v_f record;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _note IS NULL OR length(btrim(_note)) < 5 THEN RAISE EXCEPTION 'fund_now_note_required'; END IF;
  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'orchard_not_found'); END IF;
  IF v_o.orchard_kind <> 'uplift' THEN RETURN jsonb_build_object('ok', false, 'reason', 'fund_now_is_uplift_only'); END IF;
  IF v_o.funding_state <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_' || v_o.funding_state); END IF;
  SELECT * INTO v_f FROM public.orchard_funding_status(_orchard_id);
  UPDATE public.orchards SET funding_state = 'funded', funded_at = COALESCE(funded_at, now()), updated_at = now() WHERE id = _orchard_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (_orchard_id, 'funded_override', 'open', 'funded', v_f.held_total, auth.uid(), 'gosat',
          format('fund-now by a gosat with %s of %s held on-app: %s', v_f.held_total, v_f.target, btrim(_note)));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  VALUES (v_o.user_id, 'orchard_funded', 'Your Uplift orchard is marked fully funded',
          format('%s was marked fully funded by Sow2Grow. The parties will be paid directly from the orchard console.', COALESCE(v_o.title, 'Your orchard')),
          '/orchard/' || _orchard_id::text, jsonb_build_object('orchard_id', _orchard_id, 'override', true));
  RETURN jsonb_build_object('ok', true, 'funding_state', 'funded', 'held_total', v_f.held_total, 'target', v_f.target);
END;
$pd_fundnow$;
REVOKE ALL ON FUNCTION public.orchard_uplift_fund_now(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_fund_now(uuid, text) TO authenticated, service_role;

-- 6. The Uplift ledger release (internal; caller holds the orchard lock) ------------
CREATE OR REPLACE FUNCTION public.orchard_release_uplift_locked(_orchard_id uuid, _actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_rl$
DECLARE
  v_o        public.orchards%ROWTYPE;
  v_release  public.orchard_releases%ROWTYPE;
  v_gross    numeric; v_sower numeric; v_s2g numeric;
  v_holdings int; v_pockets int; v_gift int;
  v_env      record;
  v_envs     jsonb := '{}'::jsonb;
  v_rail     text;
  v_fee_rows int := 0;
  v_title    text;
BEGIN
  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('released', false, 'reason', 'orchard_not_found'); END IF;
  IF v_o.orchard_kind <> 'uplift' THEN RETURN jsonb_build_object('released', false, 'reason', 'not_uplift'); END IF;
  SELECT * INTO v_release FROM public.orchard_releases WHERE orchard_id = _orchard_id;
  IF FOUND OR v_o.funding_state = 'released' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'already_released', 'release_id', v_release.id);
  END IF;
  IF v_o.funding_state IN ('cancelling', 'cancelled') THEN RETURN jsonb_build_object('released', false, 'reason', 'cancelled'); END IF;
  -- funded by pockets or by a gosat's fund-now; the state is the truth here, not the holdings sum
  IF v_o.funding_state <> 'funded' THEN RETURN jsonb_build_object('released', false, 'reason', 'not_funded'); END IF;

  SELECT COALESCE(round(sum(gross_amount), 2), 0), COALESCE(round(sum(sower_amount), 2), 0), COALESCE(round(sum(s2g_amount), 2), 0),
         count(*), COALESCE(sum(pockets), 0), COALESCE(sum(pockets) FILTER (WHERE pocket_type = 'gift'), 0)
    INTO v_gross, v_sower, v_s2g, v_holdings, v_pockets, v_gift
    FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'held';
  IF v_holdings = 0 THEN RETURN jsonb_build_object('released', false, 'reason', 'no_held_holdings'); END IF;

  FOR v_env IN
    SELECT public.payment_environment(b.provider, 'orchard', b.id) AS env, round(sum(h.s2g_amount), 2) AS s2g
      FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
     WHERE h.orchard_id = _orchard_id AND h.status = 'held'
     GROUP BY 1
  LOOP
    v_envs := v_envs || jsonb_build_object(v_env.env, v_env.s2g);
  END LOOP;

  INSERT INTO public.orchard_releases (orchard_id, sower_user_id, gross_total, sower_total, s2g_total, holdings_count, pockets, gift_units,
                                       environments, released_by, release_trigger)
  VALUES (_orchard_id, v_o.user_id, v_gross, v_sower, v_s2g, v_holdings, v_pockets, v_gift, v_envs, _actor, 'gosat')
  RETURNING * INTO v_release;

  UPDATE public.orchard_holdings SET status = 'released', updated_at = now()
   WHERE orchard_id = _orchard_id AND status = 'held';

  -- No sower payout on an Uplift: S2G pays the parties directly. paid_to_parties
  -- is never 'pending', so owed_payout_balances() never counts these rows.
  UPDATE public.bestowals b SET payout_status = 'paid_to_parties', updated_at = now()
   WHERE b.orchard_id = _orchard_id AND b.payout_status = 'held_for_orchard'
     AND EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.bestowal_id = b.id AND h.status = 'released');

  -- S2G's 15%, exactly as Launch: one ledger row per environment, idempotent.
  FOR v_env IN SELECT key AS env, value::numeric AS s2g FROM jsonb_each_text(v_envs) LOOP
    IF v_env.s2g > 0 THEN
      SELECT CASE WHEN count(DISTINCT h.rail) = 1 THEN min(h.rail) ELSE 'none' END INTO v_rail
        FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
       WHERE h.orchard_id = _orchard_id AND public.payment_environment(b.provider, 'orchard', b.id) = v_env.env;
      IF v_rail NOT IN ('solana', 'paypal', 'balance', 'nowpayments') THEN v_rail := 'none'; END IF;
      PERFORM public.record_revenue('orchard_fee', v_env.s2g, v_env.env, 'orchard_releases', v_release.id, v_rail,
                                    _orchard_id::text, now(),
                                    format('uplift orchard %s released: S2G share of %s pocket(s), %s', v_o.title, v_pockets, v_env.env));
      v_fee_rows := v_fee_rows + 1;
    END IF;
  END LOOP;

  UPDATE public.orchards SET funding_state = 'released', released_at = now(), funded_at = COALESCE(funded_at, now()), updated_at = now()
   WHERE id = _orchard_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (_orchard_id, NULL, 'released', 'held', 'released', v_sower, _actor, 'gosat',
          format('uplift release %s: %s holding(s), %s pocket(s); %s to be paid to parties by S2G, S2G fee %s (%s ledger row(s))',
                 v_release.id, v_holdings, v_pockets, v_sower, v_s2g, v_fee_rows));

  v_title := COALESCE(v_o.title, 'Your orchard');
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  VALUES (v_o.user_id, 'orchard_released', 'Uplift orchard fully funded and released',
          format('%s is fully funded. Sow2Grow is paying the parties directly; the orchard page lists where the gifts went.', v_title),
          '/orchard/' || _orchard_id::text, jsonb_build_object('orchard_id', _orchard_id, 'release_id', v_release.id, 'sower_total', v_sower));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  SELECT DISTINCT h.bestower_user_id, 'orchard_released', 'An Uplift orchard you bestowed into is fully funded',
         format('%s reached its target. Sow2Grow is paying the parties directly; the orchard page shows where your gift went.', v_title),
         '/orchard/' || _orchard_id::text, jsonb_build_object('orchard_id', _orchard_id, 'release_id', v_release.id)
    FROM public.orchard_holdings h WHERE h.orchard_id = _orchard_id AND h.bestower_user_id IS NOT NULL AND h.bestower_user_id <> v_o.user_id;

  RETURN jsonb_build_object('released', true, 'release_id', v_release.id, 'sower_total', v_sower, 's2g_total', v_s2g, 'gross_total', v_gross,
                            'holdings', v_holdings, 'pockets', v_pockets, 'gift_units', v_gift, 'fee_rows', v_fee_rows, 'environments', v_envs);
END;
$pd_rl$;
REVOKE ALL ON FUNCTION public.orchard_release_uplift_locked(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

-- 7. orchard_uplift_release: validate the parties, release once, hand rows to the worker
CREATE OR REPLACE FUNCTION public.orchard_uplift_release(_orchard_id uuid, _parties jsonb DEFAULT '[]'::jsonb, _retry_ids uuid[] DEFAULT NULL, _actor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_rel$
DECLARE
  v_o          public.orchards%ROWTYPE;
  v_actor      uuid;
  v_p          jsonb;
  v_label      text;
  v_amount     numeric;
  v_dest       text;
  v_rail       text;
  v_new_sum    numeric := 0;
  v_committed  numeric := 0;
  v_paid       numeric := 0;
  v_total      numeric;
  v_release    public.orchard_releases%ROWTYPE;
  v_res        jsonb := NULL;
  v_env        text;
  v_env_n      int;
  v_ids        uuid[] := ARRAY[]::uuid[];
  v_id         uuid;
  v_rows       jsonb;
  i            int;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    v_actor := _actor;
  ELSIF public.is_admin_or_gosat(auth.uid()) THEN
    v_actor := auth.uid();
  ELSE
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'orchard_not_found'); END IF;
  IF v_o.orchard_kind <> 'uplift' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_uplift'); END IF;
  IF v_o.funding_state IN ('cancelling', 'cancelled') THEN RETURN jsonb_build_object('ok', false, 'reason', 'cancelled'); END IF;
  IF v_o.funding_state = 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_funded'); END IF;

  -- Validate every party before anything changes.
  IF jsonb_typeof(COALESCE(_parties, '[]'::jsonb)) <> 'array' THEN RETURN jsonb_build_object('ok', false, 'reason', 'parties_must_be_an_array'); END IF;
  IF jsonb_array_length(COALESCE(_parties, '[]'::jsonb)) = 0 AND COALESCE(array_length(_retry_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_parties');
  END IF;
  FOR i IN 0 .. jsonb_array_length(COALESCE(_parties, '[]'::jsonb)) - 1 LOOP
    v_p := _parties -> i;
    v_label := btrim(COALESCE(v_p ->> 'label', ''));
    v_dest  := btrim(COALESCE(v_p ->> 'destination', ''));
    v_rail  := COALESCE(v_p ->> 'rail', 'solana');
    BEGIN
      v_amount := round((v_p ->> 'amount')::numeric, 2);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'party_amount_invalid', 'party', i + 1);
    END;
    IF v_label = '' OR length(v_label) > 120 THEN RETURN jsonb_build_object('ok', false, 'reason', 'party_label_required', 'party', i + 1); END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'party_amount_invalid', 'party', i + 1); END IF;
    IF v_rail <> 'solana' THEN RETURN jsonb_build_object('ok', false, 'reason', 'paypal_party_payments_not_yet_available', 'party', i + 1); END IF;
    IF v_dest !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' THEN RETURN jsonb_build_object('ok', false, 'reason', 'party_destination_invalid', 'party', i + 1); END IF;
    v_new_sum := v_new_sum + v_amount;
  END LOOP;

  -- Everything below is checked BEFORE the ledger release, so a refused
  -- request never leaves a released orchard with no party rows.
  -- The sower total: the release row once released, else what is held now
  -- (the exact figure the release will write).
  SELECT * INTO v_release FROM public.orchard_releases WHERE orchard_id = _orchard_id;
  IF FOUND THEN
    v_total := v_release.sower_total;
  ELSE
    SELECT COALESCE(round(sum(sower_amount), 2), 0) INTO v_total FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'held';
    IF v_total <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_held_holdings'); END IF;
  END IF;

  -- One environment per Uplift (live or devnet); a mix needs a human.
  SELECT count(DISTINCT public.payment_environment(b.provider, 'orchard', b.id)), min(public.payment_environment(b.provider, 'orchard', b.id))
    INTO v_env_n, v_env
    FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
   WHERE h.orchard_id = _orchard_id AND h.status IN ('held', 'released');
  IF v_env_n <> 1 OR v_env IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'mixed_environments_need_human', 'environments', v_env_n); END IF;

  SELECT COALESCE(sum(amount) FILTER (WHERE status <> 'voided'), 0), COALESCE(sum(amount) FILTER (WHERE status = 'paid'), 0)
    INTO v_committed, v_paid FROM public.orchard_release_payments WHERE orchard_id = _orchard_id;
  IF round(v_committed + v_new_sum, 2) > v_total THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exceeds_sower_total', 'sower_total', v_total, 'committed', round(v_committed, 2),
                              'requested', round(v_new_sum, 2), 'remaining', round(v_total - v_committed, 2));
  END IF;

  -- First call on a funded Uplift: the ledger release, in this transaction.
  IF v_o.funding_state = 'funded' THEN
    v_res := public.orchard_release_uplift_locked(_orchard_id, v_actor);
    IF NOT COALESCE((v_res ->> 'released')::boolean, false) THEN
      RETURN jsonb_build_object('ok', false, 'reason', COALESCE(v_res ->> 'reason', 'release_failed'), 'release', v_res);
    END IF;
    SELECT * INTO v_release FROM public.orchard_releases WHERE orchard_id = _orchard_id;
    v_total := v_release.sower_total;
  END IF;
  IF v_release.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_release_row'); END IF;

  -- Retries: failed / needs_human rows with no reference go back to sending.
  IF COALESCE(array_length(_retry_ids, 1), 0) > 0 THEN
    FOR v_id IN SELECT p.id FROM public.orchard_release_payments p
                 WHERE p.id = ANY (_retry_ids) AND p.orchard_id = _orchard_id
                   AND p.status IN ('failed', 'needs_human') AND p.reference IS NULL
                 FOR UPDATE
    LOOP
      UPDATE public.orchard_release_payments SET status = 'sending', claimed_at = now(), updated_at = now() WHERE id = v_id;
      v_ids := array_append(v_ids, v_id);
    END LOOP;
  END IF;

  -- New parties: one row each, at sending, for the worker.
  FOR i IN 0 .. jsonb_array_length(COALESCE(_parties, '[]'::jsonb)) - 1 LOOP
    v_p := _parties -> i;
    INSERT INTO public.orchard_release_payments (orchard_id, release_id, label, amount, rail, destination, status, environment, paid_by_gosat, claimed_at)
    VALUES (_orchard_id, v_release.id, btrim(v_p ->> 'label'), round((v_p ->> 'amount')::numeric, 2), 'solana', btrim(v_p ->> 'destination'), 'sending', v_env, v_actor, now())
    RETURNING id INTO v_id;
    v_ids := array_append(v_ids, v_id);
    INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
    VALUES (_orchard_id, 'party_payment_queued', NULL, 'sending', round((v_p ->> 'amount')::numeric, 2), v_actor, 'gosat',
            format('party "%s": %s USDC to %s (%s)', btrim(v_p ->> 'label'), round((v_p ->> 'amount')::numeric, 2), left(btrim(v_p ->> 'destination'), 6) || '…', v_env));
  END LOOP;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'label', p.label, 'amount', p.amount, 'rail', p.rail, 'destination', p.destination,
                                               'environment', p.environment, 'attempts', p.attempts, 'status', p.status, 'created_at', p.created_at,
                                               'claimed_at', p.claimed_at) ORDER BY p.created_at), '[]'::jsonb)
    INTO v_rows FROM public.orchard_release_payments p WHERE p.id = ANY (v_ids);

  RETURN jsonb_build_object('ok', true, 'release_id', v_release.id, 'released_now', v_res IS NOT NULL, 'release', v_res,
                            'sower_total', v_total, 'committed', round(v_committed + v_new_sum, 2), 'paid', round(v_paid, 2),
                            'environment', v_env, 'rows', v_rows);
END;
$pd_rel$;
REVOKE ALL ON FUNCTION public.orchard_uplift_release(uuid, jsonb, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_release(uuid, jsonb, uuid[], uuid) TO authenticated, service_role;

-- 8. Worker seam (service role) --------------------------------------------------
CREATE OR REPLACE FUNCTION public.orchard_uplift_payments_sent_today(_environment text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pd_today$
  SELECT COALESCE(round(sum(amount), 2), 0) FROM public.orchard_release_payments
   WHERE environment = _environment AND status = 'paid' AND paid_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$pd_today$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payments_sent_today(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payments_sent_today(text) TO service_role;

CREATE OR REPLACE FUNCTION public.orchard_uplift_payment_paid(_payment_id uuid, _reference text, _detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_paid$
DECLARE
  v_p     public.orchard_release_payments%ROWTYPE;
  v_o     public.orchards%ROWTYPE;
  v_total numeric;
  v_paid  numeric;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reference IS NULL OR length(btrim(_reference)) < 8 THEN RAISE EXCEPTION 'reference_required'; END IF;
  SELECT * INTO v_p FROM public.orchard_release_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found'); END IF;
  IF v_p.status = 'paid' THEN
    IF v_p.reference = btrim(_reference) THEN RETURN jsonb_build_object('ok', true, 'status', 'paid', 'already', true); END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid_with_another_reference', 'reference', v_p.reference);
  END IF;
  IF v_p.status = 'voided' THEN RETURN jsonb_build_object('ok', false, 'reason', 'voided'); END IF;
  UPDATE public.orchard_release_payments
     SET status = 'paid', reference = btrim(_reference), paid_at = now(), last_error = NULL, claimed_at = NULL, updated_at = now()
   WHERE id = _payment_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_p.orchard_id, 'party_paid', v_p.status, 'paid', v_p.amount, 'system',
          format('party "%s": %s USDC paid, ref %s%s', v_p.label, v_p.amount, btrim(_reference), CASE WHEN _detail IS NULL THEN '' ELSE ' (' || left(_detail, 200) || ')' END));

  SELECT r.sower_total INTO v_total FROM public.orchard_releases r WHERE r.orchard_id = v_p.orchard_id;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.orchard_release_payments WHERE orchard_id = v_p.orchard_id AND status = 'paid';
  IF v_total IS NOT NULL AND round(v_paid, 2) >= v_total
     AND NOT EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_p.orchard_id AND event = 'uplift_settled') THEN
    SELECT * INTO v_o FROM public.orchards WHERE id = v_p.orchard_id;
    INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
    VALUES (v_p.orchard_id, 'uplift_settled', 'released', 'released', v_paid, 'system', format('every party paid: %s of %s', v_paid, v_total));
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    SELECT DISTINCT h.bestower_user_id, 'orchard_parties_paid', 'Your gift reached its parties',
           format('%s: every party has now been paid by Sow2Grow. The orchard page lists where the gifts went.', COALESCE(v_o.title, 'An Uplift orchard')),
           '/orchard/' || v_p.orchard_id::text, jsonb_build_object('orchard_id', v_p.orchard_id, 'paid_total', v_paid)
      FROM public.orchard_holdings h WHERE h.orchard_id = v_p.orchard_id AND h.bestower_user_id IS NOT NULL;
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', 'paid', 'paid_total', round(v_paid, 2), 'sower_total', v_total);
END;
$pd_paid$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payment_paid(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payment_paid(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.orchard_uplift_payment_fail(_payment_id uuid, _error text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_fail$
DECLARE
  v_p    public.orchard_release_payments%ROWTYPE;
  v_next text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_p FROM public.orchard_release_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found'); END IF;
  IF v_p.status <> 'sending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_sending', 'status', v_p.status); END IF;
  v_next := CASE WHEN v_p.attempts + 1 >= 3 THEN 'needs_human' ELSE 'failed' END;
  UPDATE public.orchard_release_payments
     SET status = v_next, attempts = attempts + 1, last_error = left(COALESCE(_error, 'send failed'), 500), claimed_at = NULL, updated_at = now()
   WHERE id = _payment_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_p.orchard_id, 'party_payment_failed', 'sending', v_next, v_p.amount, 'system',
          format('party "%s" attempt %s: %s', v_p.label, v_p.attempts + 1, left(COALESCE(_error, '-'), 300)));
  IF v_next = 'needs_human' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    SELECT DISTINCT ur.user_id, 'orchard_party_payment_failed', 'An Uplift party payment needs you',
           format('Party "%s" (%s USDC) failed 3 times and is parked: %s', v_p.label, v_p.amount, left(COALESCE(_error, '-'), 200)),
           '/admin/orchards', jsonb_build_object('orchard_id', v_p.orchard_id, 'payment_id', _payment_id)
      FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', v_next, 'attempts', v_p.attempts + 1);
END;
$pd_fail$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payment_fail(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payment_fail(uuid, text) TO service_role;

-- defer: not sent, not a failure (cluster mismatch, cap, wallet short); no attempt counted
CREATE OR REPLACE FUNCTION public.orchard_uplift_payment_defer(_payment_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_defer$
DECLARE v_p public.orchard_release_payments%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_p FROM public.orchard_release_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found'); END IF;
  IF v_p.status <> 'sending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_sending', 'status', v_p.status); END IF;
  UPDATE public.orchard_release_payments
     SET status = 'failed', last_error = 'not sent: ' || left(COALESCE(_reason, 'deferred'), 480), claimed_at = NULL, updated_at = now()
   WHERE id = _payment_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_p.orchard_id, 'party_payment_deferred', 'sending', 'failed', v_p.amount, 'system', format('party "%s": %s', v_p.label, left(COALESCE(_reason, '-'), 300)));
  RETURN jsonb_build_object('ok', true, 'status', 'failed', 'deferred', true);
END;
$pd_defer$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payment_defer(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payment_defer(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.orchard_uplift_payment_needs_human(_payment_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_human$
DECLARE v_p public.orchard_release_payments%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_p FROM public.orchard_release_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found'); END IF;
  IF v_p.status NOT IN ('sending', 'failed') THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_parkable', 'status', v_p.status); END IF;
  UPDATE public.orchard_release_payments
     SET status = 'needs_human', last_error = left(COALESCE(_reason, 'needs a human'), 500), claimed_at = NULL, updated_at = now()
   WHERE id = _payment_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_p.orchard_id, 'party_payment_needs_human', v_p.status, 'needs_human', v_p.amount, 'system', format('party "%s" parked: %s', v_p.label, left(COALESCE(_reason, '-'), 300)));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  SELECT DISTINCT ur.user_id, 'orchard_party_payment_failed', 'An Uplift party payment needs you',
         format('Party "%s" (%s USDC) is parked: %s', v_p.label, v_p.amount, left(COALESCE(_reason, '-'), 200)),
         '/admin/orchards', jsonb_build_object('orchard_id', v_p.orchard_id, 'payment_id', _payment_id)
    FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
  RETURN jsonb_build_object('ok', true, 'status', 'needs_human');
END;
$pd_human$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payment_needs_human(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payment_needs_human(uuid, text) TO service_role;

-- 9. Gosat: void a row that will never be sent (frees the amount for a corrected party)
CREATE OR REPLACE FUNCTION public.orchard_uplift_payment_void(_payment_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_void$
DECLARE v_p public.orchard_release_payments%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN RAISE EXCEPTION 'void_reason_required'; END IF;
  SELECT * INTO v_p FROM public.orchard_release_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found'); END IF;
  IF v_p.status NOT IN ('failed', 'needs_human') OR v_p.reference IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'only_unsent_failed_rows_can_be_voided', 'status', v_p.status);
  END IF;
  UPDATE public.orchard_release_payments
     SET status = 'voided', voided_by = auth.uid(), voided_reason = btrim(_reason), claimed_at = NULL, updated_at = now()
   WHERE id = _payment_id;
  INSERT INTO public.orchard_events (orchard_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (v_p.orchard_id, 'party_payment_voided', v_p.status, 'voided', v_p.amount, auth.uid(), 'gosat', format('party "%s": %s', v_p.label, btrim(_reason)));
  RETURN jsonb_build_object('ok', true, 'status', 'voided');
END;
$pd_void$;
REVOKE ALL ON FUNCTION public.orchard_uplift_payment_void(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_uplift_payment_void(uuid, text) TO authenticated, service_role;

-- 10. orchard_cancel: the Uplift rule (owner decision 2026-09-07) -------------------
-- Same body as Phase C2, plus: an Uplift with ANY party-payment row cannot be
-- cancelled; it is finished with further release payments and anything
-- unresolved goes to needs_human.
CREATE OR REPLACE FUNCTION public.orchard_cancel(_orchard_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pd_cancel$
DECLARE
  v_o        public.orchards%ROWTYPE;
  v_actor    uuid := auth.uid();
  v_h        record;
  v_queued   int := 0;
  v_human    int := 0;
  v_total    numeric := 0;
  v_ids      uuid[] := ARRAY[]::uuid[];
  v_id       uuid;
  v_final    text;
  v_title    text;
  v_party_n  int := 0;
  v_party_paid numeric := 0;
BEGIN
  IF NOT public.is_admin_or_gosat(v_actor) THEN
    RAISE EXCEPTION 'forbidden';                                           -- gosat-only, by owner decision; not even service_role
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'cancel_reason_required';
  END IF;

  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('cancelled', false, 'reason', 'orchard_not_found'); END IF;

  -- Phase D: once any party row exists on an Uplift, cancel is refused.
  IF v_o.orchard_kind = 'uplift' THEN
    SELECT count(*), COALESCE(sum(amount) FILTER (WHERE status = 'paid'), 0) INTO v_party_n, v_party_paid
      FROM public.orchard_release_payments WHERE orchard_id = _orchard_id;
    IF v_party_n > 0 THEN
      RETURN jsonb_build_object('cancelled', false, 'reason', 'uplift_parties_already_paid', 'party_rows', v_party_n, 'paid_total', round(v_party_paid, 2),
        'message', format('This Uplift orchard already has %s party payment(s) ($%s paid). It cannot be cancelled: finish it with further release payments, and route anything unresolved to needs-human.', v_party_n, round(v_party_paid, 2)));
    END IF;
    IF v_o.funding_state = 'released' THEN
      RETURN jsonb_build_object('cancelled', false, 'reason', 'uplift_released', 'message', 'This Uplift orchard has been released to its parties and cannot be cancelled.');
    END IF;
  END IF;

  IF v_o.funding_state = 'released' OR EXISTS (SELECT 1 FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'released') THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'released_orchards_cannot_be_cancelled');
  END IF;
  IF v_o.funding_state IN ('cancelling', 'cancelled') THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'already_' || v_o.funding_state);
  END IF;

  PERFORM 1 FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'held' FOR UPDATE;
  FOR v_h IN SELECT id, gross_amount FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status = 'held' ORDER BY created_at LOOP
    v_id := public.orchard_queue_refund_locked(v_h.id, v_actor, 'gosat', 'orchard cancelled');
    v_ids := array_append(v_ids, v_id);
    v_total := v_total + v_h.gross_amount;
  END LOOP;
  SELECT count(*) FILTER (WHERE status = 'queued'), count(*) FILTER (WHERE status = 'needs_human')
    INTO v_queued, v_human FROM public.orchard_refunds WHERE id = ANY (v_ids);

  IF EXISTS (SELECT 1 FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status IN ('refund_pending', 'refund_failed')) THEN
    v_final := 'cancelling';
  ELSE
    v_final := 'cancelled';
  END IF;

  UPDATE public.orchards
     SET funding_state = v_final, cancelled_at = now(), cancelled_by = v_actor, cancel_reason = btrim(_reason), updated_at = now()
   WHERE id = _orchard_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (_orchard_id, NULL, 'cancelled', v_o.funding_state, v_final, v_total, v_actor, 'gosat',
          format('reason: %s; %s refund(s) queued, %s need a human, %s to return', btrim(_reason), v_queued, v_human, v_total));

  v_title := COALESCE(v_o.title, 'An orchard');
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  VALUES (v_o.user_id, 'orchard_cancelled', 'Your orchard was cancelled',
          format('%s was cancelled by Sow2Grow. Every bestower is being refunded in full. Reason: %s', v_title, btrim(_reason)),
          '/orchard/' || _orchard_id::text, jsonb_build_object('orchard_id', _orchard_id, 'reason', btrim(_reason)));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  SELECT r.bestower_user_id, 'orchard_refund_pending', 'Your orchard bestowal is being refunded',
         format('%s was cancelled. Your %s %s is being returned %s.', v_title, r.amount,
                CASE r.rail WHEN 'solana' THEN 'USDC' ELSE 'USD' END,
                CASE r.rail WHEN 'solana' THEN 'to the wallet you paid from' WHEN 'paypal' THEN 'to your PayPal' ELSE 'to you' END),
         '/orchard/' || _orchard_id::text,
         jsonb_build_object('orchard_id', _orchard_id, 'refund_id', r.id, 'amount', r.amount, 'rail', r.rail)
    FROM public.orchard_refunds r WHERE r.id = ANY (v_ids) AND r.bestower_user_id <> v_o.user_id;

  RETURN jsonb_build_object('cancelled', true, 'state', v_final, 'refunds_queued', v_queued, 'refunds_needing_human', v_human,
                            'total_to_return', round(v_total, 2), 'refund_ids', to_jsonb(v_ids));
END;
$pd_cancel$;
REVOKE ALL ON FUNCTION public.orchard_cancel(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_cancel(uuid, text) TO authenticated, service_role;

-- 11. liability_snapshot: released-but-unpaid Uplift money is still ours to pay ------
-- Generated from the Phase C2 body (20260906210000) with four edits: two new
-- variables, one computation, and the uplift_unpaid sub-object counted in
-- liabilities_total. Everything else is verbatim.
CREATE OR REPLACE FUNCTION public.liability_snapshot(_environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ls_d$
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
  v_orch_refunding  numeric := 0;
  v_orch_refund_n   int := 0;
  v_refund_human    int := 0;
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
  v_parked_by_rail  jsonb;
  v_uplift_unpaid   numeric := 0;   -- Phase D: released Uplift money not yet paid to parties
  v_uplift_n        int := 0;
BEGIN
  IF NOT (COALESCE(auth.role(), '') = 'service_role' OR public.is_admin_or_gosat(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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

  CREATE TEMP TABLE IF NOT EXISTS _ls_parked (user_id uuid, amount numeric, env text, in_rail text) ON COMMIT DROP;
  TRUNCATE _ls_parked;
  INSERT INTO _ls_parked
  SELECT l.user_id, l.amount,
         CASE WHEN l.reference_table IS NULL THEN 'live'
              ELSE public.source_row_environment(l.reference_table, l.reference_id) END,
         CASE l.reference_table
           WHEN 'product_bestowals' THEN COALESCE((SELECT CASE pb.payment_method WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.product_bestowals pb WHERE pb.id = l.reference_id), 'other')
           WHEN 'content_purchases' THEN COALESCE((SELECT CASE cp.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.content_purchases cp WHERE cp.id = l.reference_id), 'other')
           WHEN 'bestowals' THEN COALESCE((SELECT CASE b.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' ELSE 'other' END FROM public.bestowals b WHERE b.id = l.reference_id), 'other')
           ELSE 'other' END
    FROM public.balance_ledger l;
  SELECT COALESCE(round(sum(amount), 2), 0), count(DISTINCT user_id)
    INTO v_parked_total, v_parked_members
    FROM _ls_parked WHERE env = _environment;
  SELECT COALESCE(jsonb_object_agg(in_rail, total), '{}'::jsonb) INTO v_parked_by_rail
    FROM (SELECT in_rail, round(sum(amount), 2) AS total FROM _ls_parked WHERE env = _environment GROUP BY in_rail) r;

  -- Held for orchards: held, plus refund_pending / refund_failed (Phase C2:
  -- still our liability until the refund confirms or is written off).
  CREATE TEMP TABLE IF NOT EXISTS _ls_hold (
    id uuid, orchard_id uuid, gross numeric, sower numeric, s2g numeric, rail text, location text, environment text, status text
  ) ON COMMIT DROP;
  TRUNCATE _ls_hold;
  INSERT INTO _ls_hold
  SELECT h.id, h.orchard_id, h.gross_amount, h.sower_amount, h.s2g_amount, h.rail, h.location,
         public.payment_environment(b.provider, 'orchard', b.id), h.status
    FROM public.orchard_holdings h
    JOIN public.bestowals b ON b.id = h.bestowal_id
   WHERE h.status IN ('held', 'refund_pending', 'refund_failed');

  SELECT COALESCE(round(sum(gross), 2), 0), COALESCE(round(sum(sower), 2), 0), COALESCE(round(sum(s2g), 2), 0), count(*), count(DISTINCT orchard_id),
         COALESCE(round(sum(gross) FILTER (WHERE status <> 'held'), 2), 0), count(*) FILTER (WHERE status <> 'held')
    INTO v_orch_total, v_orch_sower, v_orch_s2g, v_orch_holdings, v_orch_count, v_orch_refunding, v_orch_refund_n
    FROM _ls_hold WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(k, total), '{}'::jsonb) INTO v_orch_by_loc
    FROM (SELECT location || '/' || rail AS k, round(sum(gross), 2) AS total FROM _ls_hold WHERE environment = _environment GROUP BY 1) r;
  SELECT count(*) INTO v_refund_human FROM public.orchard_refunds
   WHERE environment = _environment AND status IN ('failed', 'needs_human');

  -- Phase D: an Uplift's released sower money stays in the hot wallet until
  -- each party is actually paid; until then it is still a liability.
  SELECT COALESCE(round(sum(GREATEST(x.unpaid, 0)), 2), 0), count(*) FILTER (WHERE x.unpaid > 0)
    INTO v_uplift_unpaid, v_uplift_n
    FROM (
      SELECT r.orchard_id,
             COALESCE((SELECT sum(h.sower_amount) FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
                        WHERE h.orchard_id = r.orchard_id AND h.status = 'released'
                          AND public.payment_environment(b.provider, 'orchard', b.id) = _environment), 0)
           - COALESCE((SELECT sum(p.amount) FROM public.orchard_release_payments p
                        WHERE p.orchard_id = r.orchard_id AND p.status = 'paid' AND p.environment = _environment), 0) AS unpaid
        FROM public.orchard_releases r JOIN public.orchards o ON o.id = r.orchard_id
       WHERE o.orchard_kind = 'uplift'
    ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', o.id, 'title', o.title, 'kind', o.orchard_type,
           'sower', COALESCE(pp.display_name, pp.username, left(o.user_id::text, 8)),
           'held', x.held, 'refunding', x.refunding, 'target', f.target, 'pockets_held', f.pockets_held, 'pockets_total', f.pockets_total,
           'funded', f.funded, 'funding_state', f.funding_state, 'opened_at', o.created_at,
           'days_open', GREATEST(0, floor(extract(epoch FROM (now() - o.created_at)) / 86400))::int
         ) ORDER BY x.held DESC), '[]'::jsonb)
    INTO v_orchards
    FROM (SELECT orchard_id, round(sum(gross), 2) AS held, round(COALESCE(sum(gross) FILTER (WHERE status <> 'held'), 0), 2) AS refunding
            FROM _ls_hold WHERE environment = _environment GROUP BY orchard_id) x
    JOIN public.orchards o ON o.id = x.orchard_id
    LEFT JOIN public.profiles_public pp ON pp.user_id = o.user_id
    CROSS JOIN LATERAL public.orchard_funding_status(o.id) f;

  SELECT COALESCE(round(sum(amount), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind <> 'opening_balance'), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind = 'opening_balance'), 2), 0),
         COALESCE(round(sum(amount) FILTER (WHERE kind <> 'opening_balance' AND period = date_trunc('month', now() AT TIME ZONE 'UTC')::date), 2), 0)
    INTO v_rev_net, v_rev_operating, v_rev_opening, v_rev_month
    FROM public.revenue_ledger WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(rail, total), '{}'::jsonb) INTO v_rev_by_rail
    FROM (SELECT rail, round(sum(amount), 2) AS total FROM public.revenue_ledger
           WHERE environment = _environment AND kind <> 'opening_balance' GROUP BY rail) r;

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

  SELECT COALESCE(round(sum(amount_usd) FILTER (WHERE currency <> 'SOL'), 2), 0), count(*)
    INTO v_float_total, v_float_rows FROM public.treasury_movements WHERE environment = _environment;
  SELECT COALESCE(jsonb_object_agg(wallet, total), '{}'::jsonb) INTO v_float_by_wallet
    FROM (SELECT wallet, round(sum(amount_usd), 2) AS total FROM public.treasury_movements
           WHERE environment = _environment AND currency <> 'SOL' GROUP BY wallet) r;
  SELECT COALESCE(round(sum(amount_usdc), 2), 0) INTO v_swept
    FROM public.treasury_sweeps WHERE status = 'sent'
     AND CASE WHEN solana_cluster = 'mainnet-beta' THEN 'live' ELSE 'devnet' END = _environment;

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
      'parked', jsonb_build_object('total', v_parked_total, 'members', v_parked_members, 'by_rail', v_parked_by_rail),
      'total', round(v_owed_total + v_parked_total, 2)),
    'held_for_orchards', jsonb_build_object(
      'total', v_orch_total, 'sower_share', v_orch_sower, 's2g_share', v_orch_s2g,
      'holdings', v_orch_holdings, 'orchards', v_orch_count, 'by_location', v_orch_by_loc,
      'refunding', jsonb_build_object('total', v_orch_refunding, 'holdings', v_orch_refund_n, 'needs_human', v_refund_human),
      'uplift_unpaid', jsonb_build_object('total', v_uplift_unpaid, 'orchards', v_uplift_n)),
    'liabilities_total', round(v_owed_total + v_parked_total + v_orch_total + v_uplift_unpaid, 2),
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
$ls_d$;

-- 12. Proof --------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT jsonb_build_object(
  'opened_by_gosat_column', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'orchards' AND column_name = 'opened_by_gosat') = 1,
  'payments_table', to_regclass('public.orchard_release_payments') IS NOT NULL,
  'parties_view', to_regclass('public.orchard_parties_paid_v') IS NOT NULL,
  'gate_trigger', (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_orchards_uplift_gate' AND NOT tgisinternal) = 1,
  'guard_trigger', (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_orchard_release_payments_guard' AND NOT tgisinternal) = 1,
  'functions', (SELECT jsonb_object_agg(p.proname, true) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname IN ('orchard_uplift_release', 'orchard_release_uplift_locked', 'orchard_uplift_fund_now',
                   'orchard_uplift_payment_paid', 'orchard_uplift_payment_fail', 'orchard_uplift_payment_defer', 'orchard_uplift_payment_needs_human',
                   'orchard_uplift_payment_void', 'orchard_uplift_payments_sent_today', 'orchards_uplift_gate', 'orchard_release_payments_guard')),
  'grants', jsonb_build_object(
    'release_authenticated', has_function_privilege('authenticated', 'public.orchard_uplift_release(uuid, jsonb, uuid[], uuid)', 'EXECUTE'),
    'paid_authenticated_denied', NOT has_function_privilege('authenticated', 'public.orchard_uplift_payment_paid(uuid, text, text)', 'EXECUTE'),
    'locked_service_role_denied', NOT has_function_privilege('service_role', 'public.orchard_release_uplift_locked(uuid, uuid)', 'EXECUTE'),
    'payments_table_authenticated_insert_denied', NOT has_table_privilege('authenticated', 'public.orchard_release_payments', 'INSERT'),
    'parties_view_authenticated_select', has_table_privilege('authenticated', 'public.orchard_parties_paid_v', 'SELECT')),
  'liability_has_uplift_unpaid', (public.liability_snapshot('live') -> 'held_for_orchards') ? 'uplift_unpaid',
  'uplift_orchards', (SELECT count(*) FROM public.orchards WHERE orchard_kind = 'uplift'),
  'party_rows', (SELECT count(*) FROM public.orchard_release_payments)
) AS proof;

NOTIFY pgrst, 'reload schema';
