
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
    INSERT INTO public.music_purchases
      (buyer_id, track_id, amount, total_amount, artist_amount, platform_amount, admin_amount,
       platform_fee, sow2grow_fee, payment_status, payment_reference, delivered_at)
    VALUES
      (p.buyer_id, p.content_id, p.base_amount, p.buyer_total_amount,
       p.base_amount, p.processor_fee_amount, 0,
       p.processor_fee_amount, 0,
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
