-- Fix finalize_basket_order: the 15% fee is now grossed up onto every line's
-- total at checkout (base * 1.15), for every product type — not just music.
-- The old per-type branch left a stale ELSE case that assumed non-music
-- line totals were NOT grossed up, and took a flat 15% off the total instead
-- of backing the fee out of it. That shorted the sower ~2.25% of their price
-- on every non-music line and produced a fee that didn't match what the
-- buyer was shown and charged at checkout.
--
-- Rather than relying on a deploy-order "drain window" for in-flight pending
-- orders, this reads a per-line `fee_inclusive` marker that
-- create-basket-bestowal-order now writes into every new order snapshot.
-- A pending order created before that marker existed instead carries the
-- older `is_music` marker (written by the pre-fix version of that function) —
-- back then, only music lines were grossed up, so that flag alone is enough
-- to tell a legacy grossed-up line from a legacy raw-price line. See the
-- LEGACY SHIM comment below.
--
-- This function is CREATE OR REPLACE: it only changes how FUTURE calls
-- compute the split. It does not touch any product_bestowals, escrow_events,
-- whisperer_earnings, whisperer_conversions, or basket_orders rows already
-- written — those keep whatever values were computed at the time. See the
-- accompanying explanation for what that means for historical data.

CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.basket_orders%ROWTYPE;
  v_item jsonb;
  v_product_id uuid;
  v_sower_id uuid;
  v_qty integer;
  v_line_total numeric;
  v_s2g_fee numeric;
  v_sower_base numeric;
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

    SELECT COALESCE(delivery_type, 'digital')
      INTO v_delivery_type
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

    -- Every line total is grossed up by Sow2Grow's 15% at checkout
    -- (base * 1.15), regardless of product type. Back the fee out of that
    -- gross the same way for everything, so the sower keeps their full base.
    IF (v_item ? 'fee_inclusive') THEN
      v_s2g_fee := round(v_line_total * 0.15 / 1.15, 2);

    -- ============================ LEGACY SHIM ============================
    -- TEMPORARY — remove this ELSIF branch (and the comment block around it)
    -- once the pending-order queue has fully drained, i.e. once no
    -- basket_orders row with status != 'completed' predates the deploy that
    -- added `fee_inclusive`. After that point every row this loop ever sees
    -- carries `fee_inclusive` and this branch is unreachable dead code.
    --
    -- A pending order created before that deploy was written by the old
    -- create-basket-bestowal-order, which only grossed up MUSIC lines —
    -- everything else was charged at the raw sower price with no fee on
    -- top. `is_music` (also written by that old version) is the only
    -- reliable record of which convention priced this specific line; the
    -- product's current `type` can't be trusted here since it may have
    -- been edited since the order was placed.
    ELSIF (v_item ? 'is_music') THEN
      IF COALESCE((v_item->>'is_music')::boolean, false) THEN
        v_s2g_fee := round(v_line_total * 0.15 / 1.15, 2);
      ELSE
        -- Nothing was collected on top of this line — don't fabricate a fee
        -- the buyer was never charged. The sower keeps the full line total.
        v_s2g_fee := 0;
      END IF;
    -- ========================== END LEGACY SHIM ==========================

    ELSE
      -- Neither marker present. Shouldn't occur once `fee_inclusive` ships
      -- in the same deploy as this migration, but default to the current
      -- convention (grossed up) rather than silently zeroing the fee.
      v_s2g_fee := round(v_line_total * 0.15 / 1.15, 2);
    END IF;

    v_sower_base := round(v_line_total - v_s2g_fee, 2);

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
      -- Whisperer share always comes out of the sower's base, never on top.
      v_grower_amount := round(v_sower_base * (v_wa.commission_percent / 100.0), 2);
      v_sower_amount := round(v_sower_base - v_grower_amount, 2);
    ELSE
      v_grower_amount := 0;
      v_sower_amount := v_sower_base;
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
$function$;
