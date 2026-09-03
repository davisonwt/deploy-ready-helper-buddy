-- S2G Balance — Stage 4: sower (and linked whisperer) earnings credit the
-- ledger the moment a bestowal's release_status actually becomes
-- 'released' -- which happens in TWO places, not one:
--   1. finalize_basket_order, for a DIGITAL product: release_status is set
--      to 'released' immediately at INSERT time, never via
--      escrow_release_bestowal at all.
--   2. escrow_release_bestowal, for a PHYSICAL product: release_status
--      flips from 'held' to 'released' later (buyer confirms delivery,
--      the auto-release sweep, or a gosat override).
--
-- Both call the same new credit_earning_for_bestowal() so there is exactly
-- one place that decides "this bestowal is now money in someone's S2G
-- Balance" -- and, critically, flips product_bestowals.payout_status to a
-- new 'credited_to_balance' value so owed_payout_balances() (the query the
-- OLD weekly automatic payout-earnings cron reads) stops seeing this row.
-- Without that flip, the same earning would be paid out twice: once
-- on-demand from the new balance (Stage 5), once by the old weekly sweep.
-- Same treatment for any linked whisperer_earnings row (it has its own
-- 'payable' -> owed_payout_balances() path today).
--
-- content_purchases and bestowals (gift/orchard) are NOT touched in this
-- stage -- they have no escrow/release concept and pay out immediately on
-- completion today; deferred as a fast-follow once this is proven for the
-- higher-volume product path.

ALTER TABLE public.whisperer_earnings DROP CONSTRAINT whisperer_earnings_status_check;
ALTER TABLE public.whisperer_earnings ADD CONSTRAINT whisperer_earnings_status_check
  CHECK (status = ANY (ARRAY['pending', 'payable', 'processing', 'awaiting_2fa', 'processed', 'paid', 'failed', 'credited_to_balance']));

CREATE OR REPLACE FUNCTION public.credit_earning_for_bestowal(
  _bestowal_id uuid, _actor_id uuid, _actor_role text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pb public.product_bestowals%ROWTYPE;
  v_sower_user_id uuid;
  v_we record;
  v_whisperer_user_id uuid;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_pb.payout_status IS DISTINCT FROM 'pending' THEN
    RETURN; -- already credited (or paid via the old rail) -- never double-credit
  END IF;

  SELECT user_id INTO v_sower_user_id FROM public.sowers WHERE id = v_pb.sower_id;
  IF v_sower_user_id IS NOT NULL AND v_pb.sower_amount > 0 THEN
    PERFORM public.credit_balance_ledger(
      v_sower_user_id, v_pb.sower_amount, 'earning_credit',
      'product_bestowals', _bestowal_id, _bestowal_id::text, _actor_id,
      'bestowal earning released'
    );
  END IF;

  UPDATE public.product_bestowals
     SET payout_status = 'credited_to_balance'
   WHERE id = _bestowal_id AND payout_status = 'pending';

  FOR v_we IN
    SELECT * FROM public.whisperer_earnings
     WHERE bestowal_id = _bestowal_id AND status = 'payable'
  LOOP
    SELECT user_id INTO v_whisperer_user_id FROM public.whisperers WHERE id = v_we.whisperer_id;
    IF v_whisperer_user_id IS NOT NULL AND v_we.amount > 0 THEN
      PERFORM public.credit_balance_ledger(
        v_whisperer_user_id, v_we.amount, 'earning_credit',
        'whisperer_earnings', v_we.id, v_we.id::text, _actor_id,
        'whisperer commission released'
      );
    END IF;
    UPDATE public.whisperer_earnings SET status = 'credited_to_balance' WHERE id = v_we.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_earning_for_bestowal(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_earning_for_bestowal(uuid, uuid, text) TO service_role;

-- --- escrow_release_bestowal: credit on release (the physical-product path) ---
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

  PERFORM public.credit_earning_for_bestowal(_bestowal_id, _actor_id, _actor_role);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.escrow_release_bestowal(uuid, uuid, text, text) FROM anon, authenticated;

-- --- finalize_basket_order: credit immediately for a digital seed --------
-- (release_status is set to 'released' right here, at INSERT time -- this
-- bestowal never passes through escrow_release_bestowal at all).
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

    IF v_release_status = 'released' THEN
      PERFORM public.credit_earning_for_bestowal(v_bestowal_id, v_order.user_id, 'system');
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
