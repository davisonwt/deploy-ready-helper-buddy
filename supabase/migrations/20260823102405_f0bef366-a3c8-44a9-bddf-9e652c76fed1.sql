ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS whisperer_id uuid,
  ADD COLUMN IF NOT EXISTS whisperer_amount numeric NOT NULL DEFAULT 0;

-- Returns the ACTIVE (sower-approved) assignment for a seed + whisperer, or NULL.
CREATE OR REPLACE FUNCTION public.resolve_active_whisperer(_product_id uuid, _whisperer_id uuid)
RETURNS TABLE (assignment_id uuid, whisperer_id uuid, whisperer_user_id uuid, commission_percent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.whisperer_id, w.user_id, COALESCE(a.commission_percent, 15)
  FROM public.product_whisperer_assignments a
  JOIN public.whisperers w ON w.id = a.whisperer_id
  WHERE a.status = 'active'
    AND a.whisperer_id = _whisperer_id
    AND (a.product_id = _product_id OR a.book_id = _product_id OR a.orchard_id = _product_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_active_whisperer(uuid, uuid) TO authenticated, anon, service_role;

-- Allow trusted server-side engines (SECURITY DEFINER payout code) to bump
-- assignment totals without being the sower or the whisperer.
CREATE OR REPLACE FUNCTION public.enforce_whisperer_assignment_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_sower boolean := (auth.uid() = NEW.sower_id);
  is_whisperer boolean := public.is_my_whisperer(NEW.whisperer_id);
  engine boolean := COALESCE(current_setting('app.whisperer_engine', true), '') = 'on';
BEGIN
  IF engine THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF is_sower THEN
      NEW.status := COALESCE(NEW.status, 'active');
    ELSIF is_whisperer THEN
      NEW.status := 'pending';
    ELSE
      RAISE EXCEPTION 'Only the sower or the whisperer may create a whisperer link';
    END IF;
    RETURN NEW;
  END IF;

  IF is_sower THEN
    IF NEW.status NOT IN ('pending','active','declined','revoked') THEN
      RAISE EXCEPTION 'Invalid whisperer assignment status: %', NEW.status;
    END IF;
    RETURN NEW;
  ELSIF is_whisperer THEN
    IF NEW.status <> 'withdrawn' OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'A whisperer may only withdraw their own pending request';
    END IF;
    NEW.commission_percent := OLD.commission_percent;
    NEW.sower_id := OLD.sower_id;
    NEW.total_earned := OLD.total_earned;
    NEW.total_bestowals := OLD.total_bestowals;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this whisperer link';
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
  v_unit_price numeric;
  v_qty integer;
  v_line_total numeric;
  v_s2g_fee numeric;
  v_sower_amount numeric;
  v_grower_amount numeric;
  v_bestowal_id uuid;
  v_created uuid[] := ARRAY[]::uuid[];
  v_total_items integer := 0;
  v_claim_whisperer uuid;
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
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_qty := COALESCE((v_item->>'qty')::integer, 1);
    v_line_total := (v_item->>'line_total')::numeric;
    v_claim_whisperer := NULLIF(v_item->>'whisperer_id', '')::uuid;

    -- 15% platform + admin fee always.
    v_s2g_fee := round(v_line_total * 0.15, 2);

    -- Whisper share: only paid to the ACTIVE whisperer credited with THIS sale.
    v_wa := NULL;
    IF v_claim_whisperer IS NOT NULL THEN
      SELECT * INTO v_wa FROM public.resolve_active_whisperer(v_product_id, v_claim_whisperer);
    END IF;

    IF v_wa.assignment_id IS NOT NULL THEN
      v_grower_amount := round(v_line_total * 0.15, 2);
      v_sower_amount := round(v_line_total * 0.70, 2);
    ELSE
      -- No approved whisperer made this sale -> whisper share falls back to sower.
      v_grower_amount := 0;
      v_sower_amount := round(v_line_total - v_s2g_fee, 2);
    END IF;

    INSERT INTO public.product_bestowals (
      bestower_id, product_id, sower_id,
      amount, s2g_fee, sower_amount, grower_amount,
      whisperer_id, whisperer_amount,
      status, payment_method, payment_reference
    ) VALUES (
      v_order.user_id, v_product_id, v_sower_id,
      v_line_total, v_s2g_fee, v_sower_amount, v_grower_amount,
      v_wa.whisperer_id, COALESCE(v_grower_amount, 0),
      'completed', v_order.provider, v_order.provider_order_id
    ) RETURNING id INTO v_bestowal_id;

    INSERT INTO public.basket_order_bestowals (basket_order_id, bestowal_id)
      VALUES (_basket_order_id, v_bestowal_id);

    -- Immediate payout credit for the whisperer who actually made the sale.
    IF v_wa.assignment_id IS NOT NULL AND v_grower_amount > 0 THEN
      INSERT INTO public.whisperer_earnings (
        whisperer_id, assignment_id, amount, commission_percent, status, processed_at
      ) VALUES (
        v_wa.whisperer_id, v_wa.assignment_id, v_grower_amount, v_wa.commission_percent, 'payable', now()
      );

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