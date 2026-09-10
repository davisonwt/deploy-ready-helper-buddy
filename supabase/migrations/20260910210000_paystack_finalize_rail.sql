-- finalize_basket_order() and finalize_content_purchase() each compute their
-- own rail tag for record_revenue() from a hardcoded CASE on `.provider`
-- (a SQL-side twin of _shared/revenueRules.ts's railFor(), not a call to
-- it) -- both CASEs predate the Paystack rail and fall through to 'none'
-- for it, which would tag every paystack-funded basket/content sale_fee /
-- content_fee revenue row with the wrong rail (a bookkeeping/reporting
-- inaccuracy only -- the actual sower/S2G split and payout still run
-- correctly regardless of this tag). CREATE OR REPLACE with the identical
-- body from 20260906120000_revenue_ledger.sql, adding one WHEN branch to
-- each CASE.

CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid, _environment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pfr_1$
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
                                  WHEN 'balance' THEN 'balance' WHEN 'nowpayments' THEN 'nowpayments'
                                  WHEN 'paystack' THEN 'paystack' ELSE 'none' END;

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
$pfr_1$;

GRANT EXECUTE ON FUNCTION public.finalize_basket_order(uuid, text) TO service_role;

-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_content_purchase(_purchase_id uuid, _environment text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pfr_2$
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
                              WHEN 'balance' THEN 'balance' WHEN 'nowpayments' THEN 'nowpayments'
                              WHEN 'paystack' THEN 'paystack' ELSE 'none' END;
    PERFORM public.record_revenue(
      'content_fee', p.platform_fee_amount, v_env, 'content_purchases', _purchase_id, v_rail,
      p.provider_order_id, now(), format('content purchase %s (%s)', _purchase_id, p.content_type)
    );
  END IF;
END;
$pfr_2$;

GRANT EXECUTE ON FUNCTION public.finalize_content_purchase(uuid, text) TO service_role;

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'finalize_basket_order_paystack_branch', prosrc LIKE '%paystack%'
) AS proof_basket
FROM pg_proc WHERE proname = 'finalize_basket_order';

SELECT json_build_object(
  'finalize_content_purchase_paystack_branch', prosrc LIKE '%paystack%'
) AS proof_content
FROM pg_proc WHERE proname = 'finalize_content_purchase';
