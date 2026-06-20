-- ============================================================
-- basket_orders: payment-first multi-item product checkout
-- ============================================================
CREATE TABLE public.basket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('nowpayments','paypal')),
  provider_order_id text,
  provider_invoice_id text,
  approve_url text,
  pay_currency text,
  subtotal numeric NOT NULL,
  processor_fee numeric NOT NULL DEFAULT 0,
  buyer_total numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','expired')),
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_basket_orders_user_id ON public.basket_orders(user_id);
CREATE INDEX idx_basket_orders_status ON public.basket_orders(status);
CREATE INDEX idx_basket_orders_provider_order_id ON public.basket_orders(provider_order_id);

GRANT SELECT ON public.basket_orders TO authenticated;
GRANT ALL ON public.basket_orders TO service_role;

ALTER TABLE public.basket_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can read own basket orders"
  ON public.basket_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gosat can read all basket orders"
  ON public.basket_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'gosat'));

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_basket_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_basket_orders_updated_at
BEFORE UPDATE ON public.basket_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_basket_orders_updated_at();

-- ============================================================
-- basket_order_bestowals: link basket order -> product_bestowals rows
-- ============================================================
CREATE TABLE public.basket_order_bestowals (
  basket_order_id uuid NOT NULL REFERENCES public.basket_orders(id) ON DELETE CASCADE,
  bestowal_id uuid NOT NULL REFERENCES public.product_bestowals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (basket_order_id, bestowal_id)
);

CREATE INDEX idx_basket_order_bestowals_bestowal_id ON public.basket_order_bestowals(bestowal_id);

GRANT SELECT ON public.basket_order_bestowals TO authenticated;
GRANT ALL ON public.basket_order_bestowals TO service_role;

ALTER TABLE public.basket_order_bestowals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can read links for own basket orders"
  ON public.basket_order_bestowals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.basket_orders bo
      WHERE bo.id = basket_order_id
        AND bo.user_id = auth.uid()
    )
  );

CREATE POLICY "Gosat can read all basket order links"
  ON public.basket_order_bestowals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'gosat'));

-- ============================================================
-- finalize_basket_order(_basket_order_id)
--   Idempotent. Called by webhook handlers on confirmed payment.
--   Inserts one product_bestowals row per item snapshot, links them
--   via basket_order_bestowals, awards XP, marks basket completed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_basket_order(_basket_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT * INTO v_order FROM public.basket_orders WHERE id = _basket_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'basket_order_not_found');
  END IF;

  -- Idempotency: if already completed, return existing links.
  IF v_order.status = 'completed' THEN
    SELECT COALESCE(array_agg(bestowal_id), ARRAY[]::uuid[])
      INTO v_created
      FROM public.basket_order_bestowals
     WHERE basket_order_id = _basket_order_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'bestowal_ids', to_jsonb(v_created)
    );
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(v_order.items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_sower_id := NULLIF(v_item->>'sower_id', '')::uuid;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_qty := COALESCE((v_item->>'qty')::integer, 1);
    v_line_total := (v_item->>'line_total')::numeric;

    -- Distribution: 15% s2g fee, 70% sower, 15% grower/whisperer pool
    -- Mirrors the breakdown displayed in BestowalCheckout (10% platform + 5% admin = 15%).
    v_s2g_fee := round(v_line_total * 0.15, 2);
    v_sower_amount := round(v_line_total * 0.70, 2);
    v_grower_amount := round(v_line_total * 0.15, 2);

    INSERT INTO public.product_bestowals (
      bestower_id, product_id, sower_id,
      amount, s2g_fee, sower_amount, grower_amount,
      status, payment_method, payment_reference
    ) VALUES (
      v_order.user_id, v_product_id, v_sower_id,
      v_line_total, v_s2g_fee, v_sower_amount, v_grower_amount,
      'completed', v_order.provider, v_order.provider_order_id
    ) RETURNING id INTO v_bestowal_id;

    INSERT INTO public.basket_order_bestowals (basket_order_id, bestowal_id)
      VALUES (_basket_order_id, v_bestowal_id);

    v_created := array_append(v_created, v_bestowal_id);
    v_total_items := v_total_items + v_qty;
  END LOOP;

  UPDATE public.basket_orders
     SET status = 'completed', completed_at = now()
   WHERE id = _basket_order_id;

  -- XP award: 100 per item (respecting quantity)
  IF v_total_items > 0 THEN
    PERFORM public.add_xp(v_order.user_id, v_total_items * 100);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bestowal_ids', to_jsonb(v_created),
    'items_count', v_total_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_basket_order(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_basket_order(uuid) TO service_role;