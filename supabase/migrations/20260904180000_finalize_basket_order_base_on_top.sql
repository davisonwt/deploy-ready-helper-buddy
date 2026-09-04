-- finalize_basket_order: fee split corrected to the base-on-top model.
--
-- The old lines
--     v_s2g_fee := round(v_line_total * 0.15, 2);
--     v_sower_amount := round(v_line_total - v_s2g_fee, 2);
-- took 15% OUT of the fee-inclusive line_total (2.30 -> fee 0.35, sower
-- 1.95). But line_total is ALREADY base + 15% (create-basket-bestowal-order
-- stamps unit_price=2.00, line_total=2.30, fee_inclusive=true on every
-- snapshot line): the decided model is 15% ON TOP -- the sower receives the
-- full base (2.00), S2G's fee is the 0.30 that was added at checkout.
-- Flagged 2026-09-03 during the first-mainnet-payment verification; shipped
-- to the ledger and Louw's receipt on order ad805aa6 (intent 70ca8056),
-- 2026-09-04. The whisperer share moves to the base too, per the golden
-- rule ("whisperer share comes out of the sower's price" -- platformFee.ts).
--
-- Split now derives from the snapshot itself:
--   fee_inclusive line: base = unit_price * qty; s2g_fee = line_total - base
--   legacy line (no fee_inclusive/unit_price): base = line_total / 1.15
-- Correction of the three already-finalized wrong rows is a separate,
-- operator-run guarded UPDATE (see the session report) -- this migration
-- changes the function only.

CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
