-- P0-5 Phase C2 (2026-09-06): cancel an orchard and refund every bestower.
-- Design: ORCHARD-CANCEL-REFUND-PLAN.md sections 2, 4, 6, 7 and the owner's
-- answers (cancel is gosat-only; 100% of gross_amount back on the original
-- rail; S2G absorbs every refund fee; the daily cap is the payout circuit
-- breaker's ceiling; a write-off leaves the money as unclaimed surplus).
--
--   orchard_refunds            one row per holding to refund: the worker's unit
--                              of work and the audit of every attempt
--   orchards.cancelled_*       who cancelled, when, why
--   orchard_holdings.status    gains refund_failed, written_off; + refund_id
--   orchard_cancel()           gosat/admin: open|funded -> cancelling, every
--                              held holding -> refund_pending + queued refund
--                              (unknown payer -> needs_human); no holdings ->
--                              cancelled at once
--   orchard_refund_claim()     service role (worker): queued -> sending,
--                              FOR UPDATE SKIP LOCKED, returns the guardrail
--                              facts from a fresh read under lock
--   orchard_refund_confirm()   service role: sending|sent -> confirmed, holding
--                              -> refunded, refund_cost row if fee > 0,
--                              orchard -> cancelled when the last one is done
--   orchard_refund_sent()      service role: PayPal PENDING -> sent (webhook confirms)
--   orchard_refund_fail()      service role: attempt failed; back to queued, or
--                              failed + holding refund_failed on the 3rd
--   orchard_refund_defer()     service role: sending -> queued, no attempt counted
--   orchard_refund_needs_human()  service role: park with a reason, no retry
--   orchard_refund_retry()     gosat: failed|needs_human -> queued
--   orchard_refund_write_off() gosat: failed|needs_human -> written_off (terminal)
--   orchard_apply_holding()    late-payment guard: a payment into a released /
--                              cancelling / cancelled orchard is held at
--                              refund_pending with a queued refund, never counted
--   liability_snapshot()       refund_pending / refund_failed count as held
--   cron                       orchard-refund-worker every 10 minutes
--
-- Nothing here sends money. The edge function orchard-refund-worker does,
-- and only after orchard_refund_claim() hands it a row it re-checks.
-- No bare DELETE/UPDATE anywhere (PostgREST's connection preloads safeupdate).

-- 1. Columns and the refund table ------------------------------------------
ALTER TABLE public.orchards
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by  uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text;
-- Phase B's CHECK knew open|funded|released|cancelled; C2 adds the in-between state.
ALTER TABLE public.orchards DROP CONSTRAINT IF EXISTS orchards_funding_state_check;
ALTER TABLE public.orchards
  ADD CONSTRAINT orchards_funding_state_check
  CHECK (funding_state IN ('open', 'funded', 'released', 'cancelling', 'cancelled'));

ALTER TABLE public.orchard_holdings DROP CONSTRAINT IF EXISTS orchard_holdings_status_check;
ALTER TABLE public.orchard_holdings
  ADD CONSTRAINT orchard_holdings_status_check
  CHECK (status IN ('held', 'released', 'refund_pending', 'refunded', 'refund_failed', 'written_off'));
ALTER TABLE public.orchard_holdings ADD COLUMN IF NOT EXISTS refund_id uuid;

CREATE TABLE IF NOT EXISTS public.orchard_refunds (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id         uuid NOT NULL REFERENCES public.orchards(id) ON DELETE RESTRICT,
  holding_id         uuid NOT NULL UNIQUE REFERENCES public.orchard_holdings(id) ON DELETE RESTRICT,
  bestower_user_id   uuid NOT NULL,
  rail               text NOT NULL CHECK (rail IN ('solana', 'paypal', 'balance', 'unknown')),
  amount             numeric(18,2) NOT NULL CHECK (amount >= 0),      -- = holding gross_amount, always
  destination        text,                                             -- payer wallet / PayPal capture id / member id
  status             text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'sending', 'sent', 'confirmed', 'failed', 'needs_human', 'written_off')),
  attempts           integer NOT NULL DEFAULT 0,
  last_error         text,
  rail_reference     text,                                             -- refund signature / PayPal refund id
  environment        text NOT NULL CHECK (environment IN ('live', 'devnet', 'sandbox')),
  fee_cost           numeric(18,2) NOT NULL DEFAULT 0,
  claimed_at         timestamptz,
  sent_at            timestamptz,
  confirmed_at       timestamptz,
  written_off_by     uuid,
  written_off_reason text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orchard_refunds_status_idx  ON public.orchard_refunds (status, created_at);
CREATE INDEX IF NOT EXISTS orchard_refunds_orchard_idx ON public.orchard_refunds (orchard_id);

ALTER TABLE public.orchard_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orchard_refunds_select_own_or_gosat ON public.orchard_refunds;
CREATE POLICY orchard_refunds_select_own_or_gosat ON public.orchard_refunds
  FOR SELECT TO authenticated
  USING (bestower_user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid()));
REVOKE ALL ON public.orchard_refunds FROM public, anon;
GRANT SELECT ON public.orchard_refunds TO authenticated;
GRANT ALL ON public.orchard_refunds TO service_role;

ALTER TABLE public.orchard_holdings DROP CONSTRAINT IF EXISTS orchard_holdings_refund_fk;
ALTER TABLE public.orchard_holdings
  ADD CONSTRAINT orchard_holdings_refund_fk FOREIGN KEY (refund_id) REFERENCES public.orchard_refunds(id) ON DELETE SET NULL;

-- 2. Queue one refund for one holding (internal; caller holds the locks) ----
CREATE OR REPLACE FUNCTION public.orchard_queue_refund_locked(_holding_id uuid, _actor uuid, _actor_role text, _why text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_q$
DECLARE
  v_h      public.orchard_holdings%ROWTYPE;
  v_b      public.bestowals%ROWTYPE;
  v_dest   text;
  v_env    text;
  v_status text;
  v_err    text;
  v_id     uuid;
BEGIN
  SELECT * INTO v_h FROM public.orchard_holdings WHERE id = _holding_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'holding_not_found'; END IF;
  IF v_h.refund_id IS NOT NULL THEN RETURN v_h.refund_id; END IF;          -- already queued
  SELECT * INTO v_b FROM public.bestowals WHERE id = v_h.bestowal_id;

  v_env := public.payment_environment(v_b.provider, 'orchard', v_b.id);
  IF v_h.rail = 'solana' THEN
    v_dest := v_h.payer_address;
    IF v_dest IS NULL OR COALESCE(v_h.payer_source, 'unknown') = 'unknown' THEN
      v_status := 'needs_human'; v_err := 'payer wallet unknown: enter it by hand (orchard_set_payer_manual) then retry, or write off';
    END IF;
  ELSIF v_h.rail = 'paypal' THEN
    v_dest := v_h.rail_reference;                                          -- the capture id
    IF v_dest IS NULL THEN v_status := 'needs_human'; v_err := 'no PayPal capture id on the holding'; END IF;
    IF v_h.created_at < now() - interval '180 days' THEN
      v_status := 'needs_human'; v_err := 'PayPal refunds are refused after 180 days: pay the buyer by hand';
    END IF;
  ELSIF v_h.rail = 'balance' THEN
    v_dest := v_h.bestower_user_id::text;
    v_status := 'needs_human'; v_err := 'balance refunds are not automated yet';
  ELSE
    v_status := 'needs_human'; v_err := 'unknown rail';
  END IF;
  v_status := COALESCE(v_status, 'queued');

  INSERT INTO public.orchard_refunds (orchard_id, holding_id, bestower_user_id, rail, amount, destination, status, last_error, environment)
  VALUES (v_h.orchard_id, v_h.id, v_h.bestower_user_id, v_h.rail, v_h.gross_amount, v_dest, v_status, v_err, v_env)
  RETURNING id INTO v_id;

  UPDATE public.orchard_holdings
     SET status = CASE WHEN v_status = 'needs_human' THEN 'refund_failed' ELSE 'refund_pending' END, refund_id = v_id, updated_at = now()
   WHERE id = v_h.id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (v_h.orchard_id, v_h.id, 'refund_queued', v_h.status, CASE WHEN v_status = 'needs_human' THEN 'refund_failed' ELSE 'refund_pending' END,
          v_h.gross_amount, _actor, _actor_role,
          format('%s: refund %s %s via %s to %s (%s)%s', _why, v_id, v_h.gross_amount, v_h.rail, COALESCE(v_dest, '-'), v_status,
                 CASE WHEN v_err IS NULL THEN '' ELSE ': ' || v_err END));
  IF v_status = 'needs_human' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    SELECT DISTINCT ur.user_id, 'orchard_refund_failed', 'An orchard refund needs you',
           format('Refund %s (%s via %s) cannot go out by itself: %s', v_id, v_h.gross_amount, v_h.rail, v_err),
           '/admin/treasury', jsonb_build_object('orchard_id', v_h.orchard_id, 'refund_id', v_id)
      FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
  END IF;
  RETURN v_id;
END;
$c2_q$;
REVOKE ALL ON FUNCTION public.orchard_queue_refund_locked(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_queue_refund_locked(uuid, uuid, text, text) TO service_role;

-- 3. Cancel ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orchard_cancel(_orchard_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_cancel$
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
BEGIN
  IF NOT public.is_admin_or_gosat(v_actor) THEN
    RAISE EXCEPTION 'forbidden';                                           -- gosat-only, by owner decision; not even service_role
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'cancel_reason_required';
  END IF;

  SELECT * INTO v_o FROM public.orchards WHERE id = _orchard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('cancelled', false, 'reason', 'orchard_not_found'); END IF;
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

  -- Anything still to refund keeps it at cancelling; nothing to refund -> cancelled now.
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
$c2_cancel$;
REVOKE ALL ON FUNCTION public.orchard_cancel(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_cancel(uuid, text) TO authenticated, service_role;

-- 4. Worker seam: claim, sent_today, settle, confirm, sent, fail, needs_human --
-- claim: queued -> sending for up to _limit rows (SKIP LOCKED so two runs never
-- share a row), returning the facts the worker must re-check before sending.
CREATE OR REPLACE FUNCTION public.orchard_refund_claim(_limit int DEFAULT 10, _orchard_id uuid DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_claim$
DECLARE
  r record;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN
    WITH picked AS (
      SELECT id FROM public.orchard_refunds
       WHERE status = 'queued' AND (_orchard_id IS NULL OR orchard_id = _orchard_id)
       ORDER BY created_at
       LIMIT GREATEST(1, LEAST(COALESCE(_limit, 10), 50))
       FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE public.orchard_refunds f SET status = 'sending', claimed_at = now(), updated_at = now()
        FROM picked WHERE f.id = picked.id
      RETURNING f.*
    )
    SELECT c.*, h.status AS holding_status, h.gross_amount, h.payer_address, h.rail_reference AS holding_reference,
           o.funding_state, o.title
      FROM claimed c
      JOIN public.orchard_holdings h ON h.id = c.holding_id
      JOIN public.orchards o ON o.id = c.orchard_id
  LOOP
    RETURN NEXT jsonb_build_object(
      'id', r.id, 'orchard_id', r.orchard_id, 'holding_id', r.holding_id, 'bestower_user_id', r.bestower_user_id,
      'rail', r.rail, 'amount', r.amount, 'destination', r.destination, 'status', r.status, 'attempts', r.attempts,
      'rail_reference', r.rail_reference, 'environment', r.environment, 'claimed_at', r.claimed_at, 'created_at', r.created_at,
      'holding_status', r.holding_status, 'holding_gross', r.gross_amount, 'holding_payer', r.payer_address,
      'holding_reference', r.holding_reference, 'funding_state', r.funding_state, 'orchard_title', r.title);
  END LOOP;
END;
$c2_claim$;
REVOKE ALL ON FUNCTION public.orchard_refund_claim(int, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_claim(int, uuid) TO service_role;

-- Sum of refunds sent or confirmed today (UTC) in this environment: the daily
-- cap shares the payout circuit breaker's ceiling; the worker reads this.
CREATE OR REPLACE FUNCTION public.orchard_refunds_sent_today(_environment text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $c2_today$
  SELECT COALESCE(round(sum(amount), 2), 0) FROM public.orchard_refunds
   WHERE environment = _environment AND status IN ('sent', 'confirmed')
     AND COALESCE(sent_at, confirmed_at) >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$c2_today$;
REVOKE ALL ON FUNCTION public.orchard_refunds_sent_today(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refunds_sent_today(text) TO service_role;

-- If every holding of a cancelling orchard is done, the orchard is cancelled.
CREATE OR REPLACE FUNCTION public.orchard_settle_if_done_locked(_orchard_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_settle$
DECLARE
  v_state text;
BEGIN
  SELECT funding_state INTO v_state FROM public.orchards WHERE id = _orchard_id;
  IF v_state <> 'cancelling' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orchard_holdings WHERE orchard_id = _orchard_id AND status NOT IN ('refunded', 'written_off')) THEN
    RETURN false;
  END IF;
  UPDATE public.orchards SET funding_state = 'cancelled', updated_at = now() WHERE id = _orchard_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, actor_role, notes)
  VALUES (_orchard_id, NULL, 'cancel_settled', 'cancelling', 'cancelled', 'system', 'every holding refunded or written off');
  RETURN true;
END;
$c2_settle$;
REVOKE ALL ON FUNCTION public.orchard_settle_if_done_locked(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_settle_if_done_locked(uuid) TO service_role;

-- confirm: the rail confirmed the send. Idempotent on the same reference.
CREATE OR REPLACE FUNCTION public.orchard_refund_confirm(_refund_id uuid, _rail_reference text, _fee_cost numeric DEFAULT NULL, _detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_confirm$
DECLARE
  v_r      public.orchard_refunds%ROWTYPE;
  v_h      public.orchard_holdings%ROWTYPE;
  v_o      public.orchards%ROWTYPE;
  v_fee    numeric := 0;
  v_ledger public.revenue_ledger%ROWTYPE;   -- record_revenue returns the row
  v_done   boolean;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _rail_reference IS NULL OR length(_rail_reference) = 0 THEN RAISE EXCEPTION 'rail_reference_required'; END IF;

  SELECT * INTO v_o FROM public.orchards WHERE id = (SELECT orchard_id FROM public.orchard_refunds WHERE id = _refund_id) FOR UPDATE;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('confirmed', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status = 'confirmed' THEN
    RETURN jsonb_build_object('confirmed', false, 'reason', 'already_confirmed', 'rail_reference', v_r.rail_reference);
  END IF;
  IF v_r.status NOT IN ('sending', 'sent') THEN
    RETURN jsonb_build_object('confirmed', false, 'reason', 'not_in_flight', 'status', v_r.status);
  END IF;
  IF v_r.rail_reference IS NOT NULL AND v_r.rail_reference <> _rail_reference THEN
    RETURN jsonb_build_object('confirmed', false, 'reason', 'reference_mismatch', 'stored', v_r.rail_reference);
  END IF;
  SELECT * INTO v_h FROM public.orchard_holdings WHERE id = v_r.holding_id FOR UPDATE;
  v_fee := round(COALESCE(abs(_fee_cost), v_r.fee_cost, 0), 2);   -- NULL = keep what orchard_refund_sent stored

  UPDATE public.orchard_refunds
     SET status = 'confirmed', rail_reference = _rail_reference, fee_cost = v_fee,
         sent_at = COALESCE(sent_at, now()), confirmed_at = now(), last_error = NULL, updated_at = now()
   WHERE id = _refund_id;
  UPDATE public.orchard_holdings SET status = 'refunded', updated_at = now() WHERE id = v_r.holding_id;
  UPDATE public.bestowals SET payout_status = 'refunded', updated_at = now()
   WHERE id = v_h.bestowal_id AND payout_status = 'held_for_orchard';

  IF v_fee > 0 THEN
    v_ledger := public.record_revenue('refund_cost', v_fee, v_r.environment, 'orchard_refunds', _refund_id, v_r.rail,
                                      v_r.orchard_id::text, now(),
                                      format('orchard %s cancelled: fee S2G absorbed refunding %s via %s, ref %s',
                                             COALESCE(v_o.title, v_r.orchard_id::text), v_r.amount, v_r.rail, _rail_reference));
  END IF;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_confirmed', 'refund_pending', 'refunded', v_r.amount, 'system',
          format('refund %s confirmed, ref %s, fee %s%s', _refund_id, _rail_reference, v_fee, CASE WHEN _detail IS NULL THEN '' ELSE '; ' || _detail END));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  VALUES (v_r.bestower_user_id, 'orchard_refunded', 'Refunded',
          format('Your %s %s for %s has been returned%s. Reference: %s', v_r.amount, CASE v_r.rail WHEN 'solana' THEN 'USDC' ELSE 'USD' END,
                 COALESCE(v_o.title, 'the cancelled orchard'),
                 CASE v_r.rail WHEN 'solana' THEN ' to the wallet you paid from' WHEN 'paypal' THEN ' to your PayPal' ELSE '' END,
                 _rail_reference),
          '/orchard/' || v_r.orchard_id::text,
          jsonb_build_object('orchard_id', v_r.orchard_id, 'refund_id', _refund_id, 'amount', v_r.amount, 'rail', v_r.rail, 'reference', _rail_reference));

  v_done := public.orchard_settle_if_done_locked(v_r.orchard_id);
  RETURN jsonb_build_object('confirmed', true, 'refund_id', _refund_id, 'holding_id', v_r.holding_id, 'amount', v_r.amount,
                            'fee_cost', v_fee, 'ledger_row', v_ledger.id, 'orchard_cancelled', v_done);
END;
$c2_confirm$;
REVOKE ALL ON FUNCTION public.orchard_refund_confirm(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_confirm(uuid, text, numeric, text) TO service_role;

-- sent: the rail accepted it but has not settled (PayPal PENDING). The
-- reference is stored so the row can never be sent twice; the webhook confirms.
CREATE OR REPLACE FUNCTION public.orchard_refund_sent(_refund_id uuid, _rail_reference text, _fee_cost numeric DEFAULT 0, _detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_sent$
DECLARE
  v_r public.orchard_refunds%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _rail_reference IS NULL OR length(_rail_reference) = 0 THEN RAISE EXCEPTION 'rail_reference_required'; END IF;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status <> 'sending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_sending', 'status', v_r.status); END IF;
  UPDATE public.orchard_refunds SET status = 'sent', rail_reference = _rail_reference, fee_cost = round(COALESCE(abs(_fee_cost), 0), 2),
                                    sent_at = now(), last_error = NULL, updated_at = now()
   WHERE id = _refund_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_sent', 'refund_pending', 'refund_pending', v_r.amount, 'system',
          format('refund %s accepted by %s, ref %s, awaiting settlement%s', _refund_id, v_r.rail, _rail_reference, CASE WHEN _detail IS NULL THEN '' ELSE '; ' || _detail END));
  RETURN jsonb_build_object('ok', true, 'status', 'sent');
END;
$c2_sent$;
REVOKE ALL ON FUNCTION public.orchard_refund_sent(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_sent(uuid, text, numeric, text) TO service_role;

-- fail: one attempt failed before anything left. Back to queued; on the
-- third failure the row is failed and the holding refund_failed.
CREATE OR REPLACE FUNCTION public.orchard_refund_fail(_refund_id uuid, _error text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_fail$
DECLARE
  v_r     public.orchard_refunds%ROWTYPE;
  v_max   int := 3;
  v_next  text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status NOT IN ('sending', 'queued') THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_in_flight', 'status', v_r.status); END IF;
  IF v_r.rail_reference IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'has_reference_cannot_fail', 'rail_reference', v_r.rail_reference);
  END IF;
  v_next := CASE WHEN v_r.attempts + 1 >= v_max THEN 'failed' ELSE 'queued' END;
  UPDATE public.orchard_refunds
     SET status = v_next, attempts = attempts + 1, last_error = left(COALESCE(_error, 'unknown error'), 500), claimed_at = NULL, updated_at = now()
   WHERE id = _refund_id;
  IF v_next = 'failed' THEN
    UPDATE public.orchard_holdings SET status = 'refund_failed', updated_at = now() WHERE id = v_r.holding_id;
  END IF;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_failed', 'refund_pending', CASE WHEN v_next = 'failed' THEN 'refund_failed' ELSE 'refund_pending' END,
          v_r.amount, 'system', format('attempt %s of %s failed: %s%s', v_r.attempts + 1, v_max, left(COALESCE(_error, 'unknown error'), 300),
                                       CASE WHEN v_next = 'failed' THEN '; needs a human (retry or write off)' ELSE '; will retry' END));
  IF v_next = 'failed' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    SELECT DISTINCT ur.user_id, 'orchard_refund_failed', 'An orchard refund needs you',
           format('Refund %s (%s %s via %s) failed %s times: %s', _refund_id, v_r.amount, CASE v_r.rail WHEN 'solana' THEN 'USDC' ELSE 'USD' END, v_r.rail, v_max, left(COALESCE(_error, '-'), 200)),
           '/admin/treasury', jsonb_build_object('orchard_id', v_r.orchard_id, 'refund_id', _refund_id)
      FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', v_next, 'attempts', v_r.attempts + 1);
END;
$c2_fail$;
REVOKE ALL ON FUNCTION public.orchard_refund_fail(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_fail(uuid, text) TO service_role;

-- defer: the row cannot go now for a reason that is not a failure (cluster
-- flipped for a devnet proof, the daily cap is full, the hot wallet is short).
-- Back to queued, no attempt counted; the next run tries again.
CREATE OR REPLACE FUNCTION public.orchard_refund_defer(_refund_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_defer$
DECLARE
  v_r public.orchard_refunds%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status <> 'sending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_sending', 'status', v_r.status); END IF;
  IF v_r.rail_reference IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'has_reference_cannot_defer'); END IF;
  UPDATE public.orchard_refunds SET status = 'queued', last_error = left(COALESCE(_reason, 'deferred'), 500), claimed_at = NULL, updated_at = now()
   WHERE id = _refund_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_deferred', 'refund_pending', 'refund_pending', v_r.amount, 'system',
          format('refund %s deferred: %s', _refund_id, left(COALESCE(_reason, '-'), 300)));
  RETURN jsonb_build_object('ok', true, 'status', 'queued');
END;
$c2_defer$;
REVOKE ALL ON FUNCTION public.orchard_refund_defer(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_defer(uuid, text) TO service_role;

-- needs_human: the guardrail refused, or the cap was hit. No retry until a gosat acts.
CREATE OR REPLACE FUNCTION public.orchard_refund_needs_human(_refund_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_human$
DECLARE
  v_r public.orchard_refunds%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status NOT IN ('sending', 'queued', 'failed') THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_parkable', 'status', v_r.status); END IF;
  UPDATE public.orchard_refunds SET status = 'needs_human', last_error = left(COALESCE(_reason, 'needs a human'), 500), claimed_at = NULL, updated_at = now()
   WHERE id = _refund_id;
  UPDATE public.orchard_holdings SET status = 'refund_failed', updated_at = now() WHERE id = v_r.holding_id AND status = 'refund_pending';
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_needs_human', 'refund_pending', 'refund_failed', v_r.amount, 'system',
          format('refund %s parked: %s', _refund_id, left(COALESCE(_reason, '-'), 300)));
  INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
  SELECT DISTINCT ur.user_id, 'orchard_refund_failed', 'An orchard refund needs you',
         format('Refund %s (%s via %s) is parked: %s', _refund_id, v_r.amount, v_r.rail, left(COALESCE(_reason, '-'), 200)),
         '/admin/treasury', jsonb_build_object('orchard_id', v_r.orchard_id, 'refund_id', _refund_id)
    FROM public.user_roles ur WHERE ur.role IN ('admin', 'gosat');
  RETURN jsonb_build_object('ok', true, 'status', 'needs_human');
END;
$c2_human$;
REVOKE ALL ON FUNCTION public.orchard_refund_needs_human(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_refund_needs_human(uuid, text) TO service_role;

-- 5. Gosat actions: retry, write off ------------------------------------------
CREATE OR REPLACE FUNCTION public.orchard_refund_retry(_refund_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_retry$
DECLARE
  v_r public.orchard_refunds%ROWTYPE;
  v_h public.orchard_holdings%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status NOT IN ('failed', 'needs_human') THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_retryable', 'status', v_r.status); END IF;
  IF v_r.rail_reference IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'has_reference_already_sent', 'rail_reference', v_r.rail_reference); END IF;
  SELECT * INTO v_h FROM public.orchard_holdings WHERE id = v_r.holding_id FOR UPDATE;
  -- A gosat may have entered the payer by hand since it was parked: refresh the destination.
  IF v_r.rail = 'solana' AND (v_h.payer_address IS NULL OR COALESCE(v_h.payer_source, 'unknown') = 'unknown') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payer_still_unknown');
  END IF;
  IF v_r.rail NOT IN ('solana', 'paypal') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rail_not_automated', 'rail', v_r.rail);
  END IF;
  UPDATE public.orchard_refunds
     SET status = 'queued', destination = CASE WHEN rail = 'solana' THEN v_h.payer_address ELSE destination END,
         last_error = NULL, claimed_at = NULL, updated_at = now()
   WHERE id = _refund_id;
  UPDATE public.orchard_holdings SET status = 'refund_pending', updated_at = now() WHERE id = v_r.holding_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_retry', 'refund_failed', 'refund_pending', v_r.amount, auth.uid(), 'gosat',
          format('refund %s re-queued after %s attempt(s)%s', _refund_id, v_r.attempts, CASE WHEN _note IS NULL THEN '' ELSE ': ' || _note END));
  RETURN jsonb_build_object('ok', true, 'status', 'queued');
END;
$c2_retry$;
REVOKE ALL ON FUNCTION public.orchard_refund_retry(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_refund_retry(uuid, text) TO authenticated, service_role;

-- Write off: terminal. The money stays in the wallet as unclaimed surplus
-- (owner decision: NOT income, no ledger row). Reason mandatory.
CREATE OR REPLACE FUNCTION public.orchard_refund_write_off(_refund_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_wo$
DECLARE
  v_r    public.orchard_refunds%ROWTYPE;
  v_done boolean;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN RAISE EXCEPTION 'write_off_reason_required'; END IF;
  PERFORM 1 FROM public.orchards WHERE id = (SELECT orchard_id FROM public.orchard_refunds WHERE id = _refund_id) FOR UPDATE;
  SELECT * INTO v_r FROM public.orchard_refunds WHERE id = _refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'refund_not_found'); END IF;
  IF v_r.status NOT IN ('failed', 'needs_human') THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_writable_off', 'status', v_r.status); END IF;
  IF v_r.rail_reference IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'has_reference_already_sent', 'rail_reference', v_r.rail_reference); END IF;
  UPDATE public.orchard_refunds
     SET status = 'written_off', written_off_by = auth.uid(), written_off_reason = btrim(_reason), claimed_at = NULL, updated_at = now()
   WHERE id = _refund_id;
  UPDATE public.orchard_holdings SET status = 'written_off', updated_at = now() WHERE id = v_r.holding_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (v_r.orchard_id, v_r.holding_id, 'refund_written_off', 'refund_failed', 'written_off', v_r.amount, auth.uid(), 'gosat',
          format('refund %s written off: %s (money stays as unclaimed surplus, not income)', _refund_id, btrim(_reason)));
  v_done := public.orchard_settle_if_done_locked(v_r.orchard_id);
  RETURN jsonb_build_object('ok', true, 'status', 'written_off', 'orchard_cancelled', v_done);
END;
$c2_wo$;
REVOKE ALL ON FUNCTION public.orchard_refund_write_off(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_refund_write_off(uuid, text) TO authenticated, service_role;

-- 6. Late-payment guard in orchard_apply_holding ---------------------------
-- Same body as C1, plus: if the orchard is released / cancelling / cancelled
-- when the payment lands, the holding is created and queued for refund at
-- once, never counted, never released.
CREATE OR REPLACE FUNCTION public.orchard_apply_holding(_bestowal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c2_ah$
DECLARE
  v_b         public.bestowals%ROWTYPE;
  v_holding   uuid;
  v_gross     numeric;
  v_sower     numeric;
  v_s2g       numeric;
  v_rail      text;
  v_payer     text;
  v_payer_src text;
  v_state     text;
  v_refund    uuid;
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

  SELECT funding_state INTO v_state FROM public.orchards WHERE id = v_b.orchard_id FOR UPDATE;

  v_gross := round(COALESCE(v_b.base_amount, v_b.amount, 0), 2);
  v_sower := round(COALESCE((v_b.distribution_data ->> 'sower_amount')::numeric, v_gross / 1.15), 2);
  v_s2g   := round(GREATEST(v_gross - v_sower, 0), 2);
  v_rail  := CASE v_b.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' WHEN 'balance' THEN 'balance' ELSE 'unknown' END;

  IF v_rail = 'solana' THEN
    SELECT i.payer_address INTO v_payer
      FROM public.solana_payment_intents i
     WHERE i.order_kind = 'orchard' AND i.order_id = v_b.id AND i.payer_address IS NOT NULL
     ORDER BY i.paid_at DESC NULLS LAST LIMIT 1;
    v_payer_src := CASE WHEN v_payer IS NULL THEN 'unknown' ELSE 'intent' END;
  END IF;

  INSERT INTO public.orchard_holdings (
    orchard_id, bestowal_id, bestower_user_id, pockets, pocket_type,
    gross_amount, sower_amount, s2g_amount, processor_fee,
    rail, rail_reference, delivery_address, location, status,
    payer_address, payer_source
  ) VALUES (
    v_b.orchard_id, v_b.id, v_b.bestower_id, GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_b.pocket_type,
    v_gross, v_sower, v_s2g, COALESCE(v_b.processor_fee_amount, 0),
    v_rail, v_b.payment_reference, v_b.delivery_address,
    CASE WHEN v_b.provider = 'paypal' THEN 'paypal_balance' ELSE 'hot_wallet' END, 'held',
    v_payer, v_payer_src
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

  -- Phase C2: a payment that lands after the orchard closed is a late
  -- payment. It is never a pocket; it goes straight back to the payer.
  IF v_state IN ('released', 'cancelling', 'cancelled') THEN
    INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
    VALUES (v_b.orchard_id, v_holding, 'late_payment', 'held', 'refund_pending', v_gross, 'system',
            format('payment arrived while the orchard was %s: not counted, refund queued', v_state));
    v_refund := public.orchard_queue_refund_locked(v_holding, NULL, 'system', 'late payment into a ' || v_state || ' orchard');
    IF v_state = 'cancelled' THEN
      UPDATE public.orchards SET funding_state = 'cancelling', updated_at = now() WHERE id = v_b.orchard_id;
    END IF;
    RETURN v_holding;
  END IF;

  -- Phase B: if this holding completed the funding, release now, in this
  -- transaction (idempotent; a no-op when not funded or already released).
  PERFORM public.orchard_release_if_funded(v_b.orchard_id);

  RETURN v_holding;
END;
$c2_ah$;

-- 7. liability_snapshot: refund_pending / refund_failed are still held ----------
-- The bestower's money is still physically ours until the refund confirms.
-- Only the held-holdings filter and a 'refunding' sub-object change from the
-- close-to-the-cent version; everything else is verbatim.
CREATE OR REPLACE FUNCTION public.liability_snapshot(_environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ls_c2$
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
      'refunding', jsonb_build_object('total', v_orch_refunding, 'holdings', v_orch_refund_n, 'needs_human', v_refund_human)),
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
$ls_c2$;

-- 8. Cron: the worker every 10 minutes through invoke_money_job ---------------
-- cron.schedule() with an existing jobname updates that job in place.
SELECT cron.schedule(
  'orchard-refund-worker',
  '*/10 * * * *',
  $c2_cron$ SELECT public.invoke_money_job('orchard-refund-worker'); $c2_cron$
);

NOTIFY pgrst, 'reload schema';
