-- product_bestowals.sower_id stores sowers.id (that table's own PK), not the
-- sower's auth id -- products.sower_id references sowers(id) the same way,
-- and finalize_basket_order/sower_earnings_v resolve it correctly via
-- EXISTS (sowers.id = product_bestowals.sower_id AND sowers.user_id =
-- auth.uid()). mark_delivery_progress instead compared sower_id to
-- auth.uid() directly, which can never match a real seller -- "Mark
-- sent"/"Mark delivered" was rejected as 'forbidden' for every real seller.
-- Resolve the caller's sowers.id first, same pattern as sower_earnings_v.

CREATE OR REPLACE FUNCTION public.mark_delivery_progress(_bestowal_id uuid, _stage text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pb public.product_bestowals%ROWTYPE;
  v_caller_sower_id uuid;
BEGIN
  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;

  SELECT id INTO v_caller_sower_id FROM public.sowers WHERE user_id = auth.uid();

  IF (v_caller_sower_id IS NULL OR v_pb.sower_id <> v_caller_sower_id)
     AND NOT public.is_admin_or_gosat(auth.uid()) THEN
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
