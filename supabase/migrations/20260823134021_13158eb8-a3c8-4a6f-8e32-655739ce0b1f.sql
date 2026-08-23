-- 1. Session dimension on the whisperer attribution tables
ALTER TABLE public.whisperer_referral_links
  ADD COLUMN IF NOT EXISTS live_session_id uuid,
  ADD COLUMN IF NOT EXISTS session_kind text;

ALTER TABLE public.whisperer_clicks
  ADD COLUMN IF NOT EXISTS live_session_id uuid;

ALTER TABLE public.whisperer_conversions
  ADD COLUMN IF NOT EXISTS live_session_id uuid;

ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS ref_link_id uuid;

-- one evergreen link per assignment, plus one link per live session
CREATE UNIQUE INDEX IF NOT EXISTS whisperer_ref_links_assignment_session_uniq
  ON public.whisperer_referral_links (assignment_id, COALESCE(live_session_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX IF NOT EXISTS whisperer_ref_links_code_uniq
  ON public.whisperer_referral_links (ref_code);

GRANT SELECT, INSERT, UPDATE ON public.whisperer_referral_links TO authenticated;
GRANT ALL ON public.whisperer_referral_links TO service_role;
GRANT SELECT ON public.whisperer_clicks TO authenticated;
GRANT INSERT ON public.whisperer_clicks TO anon, authenticated;
GRANT ALL ON public.whisperer_clicks TO service_role;
GRANT SELECT ON public.whisperer_conversions TO authenticated;
GRANT ALL ON public.whisperer_conversions TO service_role;
GRANT SELECT ON public.whisperer_earnings TO authenticated;
GRANT ALL ON public.whisperer_earnings TO service_role;

-- 2. Create / fetch a whisperer's ref link (optionally scoped to a live session)
CREATE OR REPLACE FUNCTION public.ensure_whisperer_ref_link(
  _assignment_id uuid,
  _live_session_id uuid DEFAULT NULL,
  _session_kind text DEFAULT NULL
)
RETURNS TABLE(ref_link_id uuid, ref_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_a public.product_whisperer_assignments%ROWTYPE;
  v_owner uuid;
  v_code text;
  v_id uuid;
BEGIN
  SELECT * INTO v_a FROM public.product_whisperer_assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  IF v_a.status <> 'active' THEN RAISE EXCEPTION 'assignment_not_active'; END IF;

  SELECT user_id INTO v_owner FROM public.whisperers WHERE id = v_a.whisperer_id;
  IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not_your_assignment'; END IF;

  SELECT l.id, l.ref_code INTO v_id, v_code
    FROM public.whisperer_referral_links l
   WHERE l.assignment_id = _assignment_id
     AND COALESCE(l.live_session_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = COALESCE(_live_session_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_id IS NULL THEN
    LOOP
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.whisperer_referral_links WHERE ref_code = v_code);
    END LOOP;

    INSERT INTO public.whisperer_referral_links (
      whisperer_id, assignment_id, product_id, orchard_id, book_id,
      ref_code, is_active, live_session_id, session_kind
    ) VALUES (
      v_a.whisperer_id, v_a.id, v_a.product_id, v_a.orchard_id, v_a.book_id,
      v_code, true, _live_session_id, _session_kind
    ) RETURNING id INTO v_id;
  END IF;

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- 3. Server-side attribution resolver.
-- Precedence: valid ref_code (click / last-touch) > in-session participation > none.
CREATE OR REPLACE FUNCTION public.resolve_whisperer_by_ref_code(
  _product_id uuid,
  _ref_code text DEFAULT NULL,
  _buyer_id uuid DEFAULT NULL,
  _live_session_id uuid DEFAULT NULL,
  _source text DEFAULT 'ref_click'
)
RETURNS TABLE(
  assignment_id uuid,
  whisperer_id uuid,
  whisperer_user_id uuid,
  commission_percent numeric,
  ref_link_id uuid,
  live_session_id uuid,
  attribution_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_type text := CASE WHEN _source = 'last_touch' THEN 'last_touch' ELSE 'ref_click' END;
BEGIN
  -- (1) explicit referral code
  IF _ref_code IS NOT NULL AND length(trim(_ref_code)) > 0 THEN
    RETURN QUERY
    SELECT a.id, a.whisperer_id, w.user_id, COALESCE(a.commission_percent, 15)::numeric,
           l.id, l.live_session_id, v_type
      FROM public.whisperer_referral_links l
      JOIN public.product_whisperer_assignments a ON a.id = l.assignment_id
      JOIN public.whisperers w ON w.id = a.whisperer_id
     WHERE l.ref_code = upper(trim(_ref_code))
       AND l.is_active
       AND a.status = 'active'
       AND (a.product_id = _product_id OR a.book_id = _product_id OR a.orchard_id = _product_id)
     LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- (2) buyer was actually inside the whisperer's live session
  IF _live_session_id IS NOT NULL AND _buyer_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.whisperer_id, w.user_id, COALESCE(a.commission_percent, 15)::numeric,
           l.id, l.live_session_id, 'in_session'::text
      FROM public.whisperer_referral_links l
      JOIN public.product_whisperer_assignments a ON a.id = l.assignment_id
      JOIN public.whisperers w ON w.id = a.whisperer_id
     WHERE l.live_session_id = _live_session_id
       AND l.is_active
       AND a.status = 'active'
       AND (a.product_id = _product_id OR a.book_id = _product_id OR a.orchard_id = _product_id)
       AND EXISTS (
         SELECT 1 FROM public.live_session_participants p
          WHERE p.session_id = _live_session_id AND p.user_id = _buyer_id
       )
     LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- (3) nobody credited — whisper share stays with the sower
  RETURN;
END;
$$;

-- 4. finalize_basket_order: honour each assignment's own commission_percent
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
  v_sower_amount numeric;
  v_grower_amount numeric;
  v_bestowal_id uuid;
  v_created uuid[] := ARRAY[]::uuid[];
  v_total_items integer := 0;
  v_wa record;
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
      -- Whisperer's own agreed commission on this seed (2%-30%, sower set).
      v_grower_amount := round(v_line_total * (v_wa.commission_percent / 100.0), 2);
      v_sower_amount := round(v_line_total - v_s2g_fee - v_grower_amount, 2);
    ELSE
      -- No approved whisperer made this sale -> whisper share falls back to sower.
      v_grower_amount := 0;
      v_sower_amount := round(v_line_total - v_s2g_fee, 2);
    END IF;

    INSERT INTO public.product_bestowals (
      bestower_id, product_id, sower_id,
      amount, s2g_fee, sower_amount, grower_amount,
      whisperer_id, whisperer_amount, ref_link_id,
      status, payment_method, payment_reference
    ) VALUES (
      v_order.user_id, v_product_id, v_sower_id,
      v_line_total, v_s2g_fee, v_sower_amount, v_grower_amount,
      v_wa.whisperer_id, COALESCE(v_grower_amount, 0), v_wa.ref_link_id,
      'completed', v_order.provider, v_order.provider_order_id
    ) RETURNING id INTO v_bestowal_id;

    INSERT INTO public.basket_order_bestowals (basket_order_id, bestowal_id)
      VALUES (_basket_order_id, v_bestowal_id);

    IF v_wa.assignment_id IS NOT NULL AND v_grower_amount > 0 THEN
      INSERT INTO public.whisperer_earnings (
        whisperer_id, assignment_id, bestowal_id, amount, commission_percent, status
      ) VALUES (
        v_wa.whisperer_id, v_wa.assignment_id, v_bestowal_id, v_grower_amount, v_wa.commission_percent, 'payable'
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