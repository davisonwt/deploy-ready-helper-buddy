
-- ============================================================
-- content_purchases: unified Shape-1 ledger (fixed-price content)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN (
    'library_item',
    'live_session_media',
    'music_track',
    'premium_item',
    'premium_room_access'
  )),
  content_id uuid NOT NULL,

  -- pricing snapshot
  base_amount numeric NOT NULL,
  processor_fee_amount numeric NOT NULL DEFAULT 0,
  buyer_total_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  -- provider snapshot
  provider text NOT NULL CHECK (provider IN ('nowpayments','paypal')),
  provider_order_id text,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','processing','completed','failed','refunded')),
  payment_reference text,

  -- payout snapshot (seller payout rail captured at order time)
  payout_provider text,
  payout_destination text,
  payout_currency text,
  payout_status text DEFAULT 'pending'
    CHECK (payout_status IN ('pending','processing','sent','failed','manual_required')),
  payout_reference text,
  payout_fee_amount numeric,
  payout_attempted_at timestamptz,
  payout_completed_at timestamptz,
  payout_error text,

  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_purchases_buyer_idx     ON public.content_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS content_purchases_seller_idx    ON public.content_purchases(seller_id);
CREATE INDEX IF NOT EXISTS content_purchases_content_idx   ON public.content_purchases(content_type, content_id);
CREATE INDEX IF NOT EXISTS content_purchases_provider_idx  ON public.content_purchases(provider_order_id);
CREATE INDEX IF NOT EXISTS content_purchases_payout_ref_idx ON public.content_purchases(payout_reference);

-- Grants: clients only read their own; service_role does all writes.
GRANT SELECT ON public.content_purchases TO authenticated;
GRANT ALL    ON public.content_purchases TO service_role;

ALTER TABLE public.content_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can view own purchases"
  ON public.content_purchases FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Seller can view purchases of own content"
  ON public.content_purchases FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Service role manages content purchases"
  ON public.content_purchases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- updated_at trigger reuses touch_updated_at() if present, else create local.
CREATE OR REPLACE FUNCTION public.touch_content_purchases_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_purchases_updated_at ON public.content_purchases;
CREATE TRIGGER trg_content_purchases_updated_at
  BEFORE UPDATE ON public.content_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_purchases_updated_at();

-- ============================================================
-- finalize_content_purchase: webhook-only completion + access grant
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_content_purchase(_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.content_purchases%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.content_purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'content_purchase % not found', _purchase_id;
  END IF;

  -- Idempotent: if already completed, nothing to do.
  IF p.payment_status = 'completed' THEN
    RETURN;
  END IF;

  UPDATE public.content_purchases
     SET payment_status = 'completed',
         completed_at   = now()
   WHERE id = _purchase_id;

  -- Type-specific access grant
  IF p.content_type = 'library_item' THEN
    INSERT INTO public.s2g_library_item_access (user_id, library_item_id, access_type)
    VALUES (p.buyer_id, p.content_id, 'download')
    ON CONFLICT DO NOTHING;
  END IF;
  -- Other content types are wired in their respective frontends are migrated.
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_content_purchase(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_content_purchase(uuid) TO service_role;
