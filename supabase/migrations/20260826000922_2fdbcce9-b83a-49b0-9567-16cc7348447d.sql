ALTER TABLE public.content_purchases
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.finalize_content_purchase(_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.content_purchases%ROWTYPE;
  v_room_id uuid;
  v_item_type text;
  v_price_cents int;
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
END;
$function$;

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
  v_product_type text;
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

    SELECT COALESCE(delivery_type, 'digital'), COALESCE(type, '')
      INTO v_delivery_type, v_product_type
      FROM public.products WHERE id = v_product_id;
    v_delivery_type := COALESCE(v_delivery_type, 'digital');
    v_product_type := COALESCE(v_product_type, '');

    IF v_delivery_type = 'physical' THEN
      v_release_status := 'held';
      v_hold_reason := 'awaiting_delivery_confirmation';
      v_earning_status := 'held';
    ELSE
      v_release_status := 'released';
      v_hold_reason := NULL;
      v_earning_status := 'payable';
    END IF;

    IF v_product_type = 'music' THEN
      -- Music: the 15% was added ON TOP of the sower price at checkout, so the
      -- line total is grossed up. Back the fee out so the sower keeps the base.
      v_s2g_fee := round(v_line_total * 0.15 / 1.15, 2);
    ELSE
      -- 15% platform + admin fee out of the line total.
      v_s2g_fee := round(v_line_total * 0.15, 2);
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