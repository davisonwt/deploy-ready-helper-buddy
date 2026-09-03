-- S2G Balance — Stage 4 fast-follow: content_purchases and bestowals
-- (gift/orchard) earnings now credit the ledger at their own finalize
-- point too, same shape as product_bestowals in Stage 4 — flipping
-- payout_status so owed_payout_balances() never double-pays the same
-- earning once via on-demand withdrawal and once via the old weekly
-- payout-earnings cron.
--
-- Neither table ever has a linked whisperer_earnings row (only
-- finalize_basket_order inserts those) -- no whisperer handling needed
-- here, unlike credit_earning_for_bestowal.

ALTER TABLE public.content_purchases DROP CONSTRAINT content_purchases_payout_status_check;
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_payout_status_check
  CHECK (payout_status = ANY (ARRAY['pending', 'processing', 'paid', 'sent', 'failed', 'manual_required', 'credited_to_balance']));
-- bestowals.payout_status carries no CHECK constraint (confirmed against
-- the live schema, same as product_bestowals before Stage 4) -- nothing
-- to widen there.

-- --- finalize_content_purchase: credit the seller atomically, same
-- transaction as the existing idempotent finalize (mirrors how Stage 4
-- folded credit_earning_for_bestowal into finalize_basket_order itself).
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
END;
$function$;

-- --- credit_earning_for_gift_bestowal: gift/orchard (bestowals table). No
-- RPC previously existed for their finalize step (see capture.ts's
-- finalizeBestowal — it's a plain TS status flip, unlike basket/content).
-- Same recipient/amount resolution owed_payout_balances() already uses for
-- this table, so a row this credits is guaranteed to also be the row that
-- function would otherwise have paid.
CREATE OR REPLACE FUNCTION public.credit_earning_for_gift_bestowal(_bestowal_id uuid, _actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.bestowals%ROWTYPE;
  v_recipient uuid;
  v_amount numeric;
BEGIN
  SELECT * INTO v_b FROM public.bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_b.payout_status IS DISTINCT FROM 'pending' THEN
    RETURN; -- already credited (or paid via the old rail) -- never double-credit
  END IF;

  v_recipient := COALESCE(
    (v_b.distribution_data ->> 'sower_user_id')::uuid,
    (SELECT o.user_id FROM public.orchards o WHERE o.id = v_b.orchard_id)
  );
  v_amount := COALESCE((v_b.distribution_data ->> 'sower_amount')::numeric, v_b.base_amount);

  IF v_recipient IS NOT NULL AND v_amount > 0 THEN
    PERFORM public.credit_balance_ledger(
      v_recipient, v_amount, 'earning_credit',
      'bestowals', _bestowal_id, _bestowal_id::text, _actor_id,
      'gift/orchard bestowal earning released'
    );
  END IF;

  UPDATE public.bestowals
     SET payout_status = 'credited_to_balance'
   WHERE id = _bestowal_id AND payout_status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.credit_earning_for_gift_bestowal(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_earning_for_gift_bestowal(uuid, uuid) TO service_role;

-- --- One-time backfill: content_purchases + bestowals rows already
-- completed-but-unpaid at cutover, same reasoning as Stage 4's backfill.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, seller_id, base_amount FROM public.content_purchases
     WHERE payment_status = 'completed' AND payout_status = 'pending'
  LOOP
    IF r.seller_id IS NOT NULL AND r.base_amount > 0 THEN
      PERFORM public.credit_balance_ledger(
        r.seller_id, r.base_amount, 'earning_credit',
        'content_purchases', r.id, r.id::text, NULL, 'backfill at S2G Balance cutover'
      );
    END IF;
    UPDATE public.content_purchases SET payout_status = 'credited_to_balance'
     WHERE id = r.id AND payout_status = 'pending';
  END LOOP;

  FOR r IN
    SELECT id FROM public.bestowals
     WHERE payment_status IN ('completed', 'distributed') AND payout_status = 'pending'
  LOOP
    PERFORM public.credit_earning_for_gift_bestowal(r.id, NULL);
  END LOOP;
END $$;
