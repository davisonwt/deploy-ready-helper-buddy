-- 1. Seed delivery type -------------------------------------------------
ALTER TABLE public.products
  ALTER COLUMN delivery_type SET DEFAULT 'digital';

UPDATE public.products SET delivery_type = 'digital' WHERE delivery_type IS NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_delivery_type_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_delivery_type_check
  CHECK (delivery_type IN ('digital','physical'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_method text;

-- 2. Escrow columns on product_bestowals ---------------------------------
ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text;

UPDATE public.product_bestowals
   SET release_status = 'released',
       released_at = COALESCE(released_at, created_at)
 WHERE release_status IS NULL OR release_status NOT IN ('held','released','disputed','refunded');

ALTER TABLE public.product_bestowals
  ALTER COLUMN release_status SET DEFAULT 'released';

CREATE INDEX IF NOT EXISTS idx_product_bestowals_release_status
  ON public.product_bestowals (release_status);
CREATE INDEX IF NOT EXISTS idx_product_bestowals_auto_release
  ON public.product_bestowals (auto_release_at)
  WHERE release_status = 'held';

-- 3. Escrow audit ledger --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escrow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bestowal_id uuid NOT NULL REFERENCES public.product_bestowals(id) ON DELETE CASCADE,
  event text NOT NULL,
  from_status text,
  to_status text,
  amount numeric,
  actor_id uuid,
  actor_role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.escrow_events TO authenticated;
GRANT ALL ON public.escrow_events TO service_role;

ALTER TABLE public.escrow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_events_party_read"
  ON public.escrow_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_bestowals pb
       WHERE pb.id = escrow_events.bestowal_id
         AND (pb.bestower_id = auth.uid() OR pb.sower_id = auth.uid())
    )
  );

CREATE POLICY "escrow_events_gosat_read"
  ON public.escrow_events FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_escrow_events_bestowal
  ON public.escrow_events (bestowal_id, created_at DESC);

-- 4. Core release primitive ----------------------------------------------
CREATE OR REPLACE FUNCTION public.escrow_release_bestowal(
  _bestowal_id uuid, _actor_id uuid, _actor_role text, _notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pb public.product_bestowals%ROWTYPE;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_pb.release_status = 'released' OR v_pb.release_status = 'refunded' THEN
    RETURN false;
  END IF;

  UPDATE public.product_bestowals
     SET release_status = 'released',
         released_at = now(),
         hold_reason = NULL
   WHERE id = _bestowal_id;

  UPDATE public.whisperer_earnings
     SET status = 'payable'
   WHERE bestowal_id = _bestowal_id AND status = 'held';

  INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, amount, actor_id, actor_role, notes)
  VALUES (_bestowal_id, 'released', v_pb.release_status, 'released', v_pb.amount, _actor_id, _actor_role, _notes);

  RETURN true;
END;
$$;

-- 5. Buyer / sower / gosat actions ---------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_delivery(_bestowal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pb public.product_bestowals%ROWTYPE;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_pb.bestower_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'forbidden'); END IF;
  IF v_pb.release_status = 'released' THEN RETURN jsonb_build_object('success', true, 'already_released', true); END IF;
  IF v_pb.release_status = 'refunded' THEN RETURN jsonb_build_object('success', false, 'error', 'refunded'); END IF;

  UPDATE public.product_bestowals
     SET delivery_confirmed_at = now(), delivered_at = COALESCE(delivered_at, now())
   WHERE id = _bestowal_id;

  INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, actor_id, actor_role)
  VALUES (_bestowal_id, 'delivery_confirmed', v_pb.release_status, v_pb.release_status, auth.uid(), 'bestower');

  PERFORM public.escrow_release_bestowal(_bestowal_id, auth.uid(), 'bestower', 'buyer confirmed delivery');
  RETURN jsonb_build_object('success', true, 'released', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.raise_delivery_issue(_bestowal_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pb public.product_bestowals%ROWTYPE;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_pb.bestower_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'forbidden'); END IF;
  IF v_pb.release_status <> 'held' THEN RETURN jsonb_build_object('success', false, 'error', 'not_held'); END IF;

  UPDATE public.product_bestowals
     SET release_status = 'disputed', dispute_reason = _reason, auto_release_at = NULL,
         hold_reason = 'buyer_dispute'
   WHERE id = _bestowal_id;

  INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, actor_id, actor_role, notes)
  VALUES (_bestowal_id, 'disputed', 'held', 'disputed', auth.uid(), 'bestower', _reason);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_delivery_progress(_bestowal_id uuid, _stage text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pb public.product_bestowals%ROWTYPE;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_pb.sower_id <> auth.uid() AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF v_pb.release_status <> 'held' THEN RETURN jsonb_build_object('success', false, 'error', 'not_held'); END IF;

  IF _stage = 'shipped' THEN
    UPDATE public.product_bestowals SET shipped_at = now() WHERE id = _bestowal_id;
  ELSIF _stage = 'delivered' THEN
    UPDATE public.product_bestowals
       SET delivered_at = now(), auto_release_at = now() + interval '3 days'
     WHERE id = _bestowal_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'bad_stage');
  END IF;

  INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, actor_id, actor_role)
  VALUES (_bestowal_id, _stage, 'held', 'held', auth.uid(), 'sower');

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.gosat_resolve_escrow(_bestowal_id uuid, _action text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pb public.product_bestowals%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;

  IF _action = 'release' THEN
    PERFORM public.escrow_release_bestowal(_bestowal_id, auth.uid(), 'gosat', _notes);
  ELSIF _action = 'refund' THEN
    UPDATE public.product_bestowals
       SET release_status = 'refunded', hold_reason = 'gosat_refund', auto_release_at = NULL
     WHERE id = _bestowal_id;
    UPDATE public.whisperer_earnings SET status = 'cancelled'
     WHERE bestowal_id = _bestowal_id AND status = 'held';
    INSERT INTO public.escrow_events (bestowal_id, event, from_status, to_status, amount, actor_id, actor_role, notes)
    VALUES (_bestowal_id, 'refunded', v_pb.release_status, 'refunded', v_pb.amount, auth.uid(), 'gosat', _notes);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'bad_action');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Scheduled sweep: release everything whose auto-release window has passed.
CREATE OR REPLACE FUNCTION public.release_due_escrow(_limit integer DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.product_bestowals
     WHERE release_status = 'held'
       AND auto_release_at IS NOT NULL
       AND auto_release_at <= now()
     ORDER BY auto_release_at
     LIMIT GREATEST(1, _limit)
  LOOP
    IF public.escrow_release_bestowal(r.id, NULL, 'system', 'auto-release window elapsed') THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'released', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.escrow_release_bestowal(uuid, uuid, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.release_due_escrow(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_delivery_issue(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivery_progress(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gosat_resolve_escrow(uuid, text, text) TO authenticated;

-- 6. finalize_basket_order: hold physical lines, release digital ----------
CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.basket_orders%ROWTYPE;
  v_item jsonb;
  v_product_id uuid;
  v_sower_id uuid;
  v_qty integer;
  v_line_total numeric;
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

  PERFORM set_config('app.whisperer_engine', 'on', true);

  FOR v_item IN SELECT jsonb_array_elements(v_order.items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_sower_id := NULLIF(v_item->>'sower_id', '')::uuid;
    v_qty := COALESCE((v_item->>'qty')::integer, 1);
    v_line_total := (v_item->>'line_total')::numeric;

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

    -- 15% platform + admin fee always.
    v_s2g_fee := round(v_line_total * 0.15, 2);

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
      v_grower_amount := round(v_line_total * (v_wa.commission_percent / 100.0), 2);
      v_sower_amount := round(v_line_total - v_s2g_fee - v_grower_amount, 2);
    ELSE
      v_grower_amount := 0;
      v_sower_amount := round(v_line_total - v_s2g_fee, 2);
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
$$;