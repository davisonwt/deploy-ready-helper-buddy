-- buyer_purchases_v: the buyer-side mirror of sower_earnings_v — one shape
-- for everything a user has completed-and-paid-for, across the four tables
-- that record a buyer's own spend: product_bestowals (via basket_orders),
-- content_purchases, bestowals (gift + orchard), and topups (self-funding,
-- no sower/item — a wallet credit, not a seed).
--
-- Column shape: source, source_id, buyer_id, sower_id, item_id, item_title,
-- subtotal, processor_fee, buyer_total, provider, status, paid_at.
-- subtotal + processor_fee = buyer_total always; this mirrors the same
-- split messaging.ts's receipts use (see _shared/postFinalize/messaging.ts).
--
-- RLS is baked into the view's own WHERE clause (a plain view runs as its
-- owner, bypassing base-table RLS) — a caller sees only rows where they are
-- the buyer, or is admin/gosat. Unlike sower_earnings_v, there is no
-- additional "I'm the whisperer" grant here; this view is buyer-only.
CREATE OR REPLACE VIEW public.buyer_purchases_v
WITH (security_barrier = true) AS
SELECT * FROM (
  -- product_bestowals rows don't carry their own processor fee — it's
  -- charged once per basket_orders row, not per line — so it's prorated
  -- here by this line's share of the order's subtotal, the same way
  -- messaging.ts's basket branch prorates it for receipts.
  SELECT
    'product'::text AS source,
    pb.id AS source_id,
    pb.bestower_id AS buyer_id,
    s.user_id AS sower_id,
    pb.product_id AS item_id,
    p.title AS item_title,
    pb.amount AS subtotal,
    CASE WHEN bo.subtotal > 0
      THEN round(bo.processor_fee * (pb.amount / bo.subtotal), 2)
      ELSE 0
    END AS processor_fee,
    pb.amount + CASE WHEN bo.subtotal > 0
      THEN round(bo.processor_fee * (pb.amount / bo.subtotal), 2)
      ELSE 0
    END AS buyer_total,
    bo.provider,
    pb.status,
    pb.created_at AS paid_at
  FROM public.product_bestowals pb
  JOIN public.basket_order_bestowals bob ON bob.bestowal_id = pb.id
  JOIN public.basket_orders bo ON bo.id = bob.basket_order_id
  LEFT JOIN public.sowers s ON s.id = pb.sower_id
  LEFT JOIN public.products p ON p.id = pb.product_id
  WHERE pb.status = 'completed'

  UNION ALL

  SELECT
    'content'::text AS source,
    cp.id AS source_id,
    cp.buyer_id,
    cp.seller_id AS sower_id,
    cp.content_id AS item_id,
    CASE cp.content_type
      WHEN 'library_item' THEN (
        SELECT li.title FROM public.s2g_library_items li WHERE li.id = cp.content_id
      )
      WHEN 'premium_room_access' THEN (
        SELECT pr.title FROM public.premium_rooms pr WHERE pr.id = cp.content_id
      )
      WHEN 'live_session_media' THEN (
        SELECT lsm.file_name FROM public.live_session_media lsm WHERE lsm.id = cp.content_id
      )
      WHEN 'music_track' THEN (
        SELECT dmt.track_title FROM public.dj_music_tracks dmt WHERE dmt.id = cp.content_id
      )
      WHEN 'premium_item' THEN (
        SELECT COALESCE(item ->> 'name', item ->> 'title')
        FROM public.premium_rooms pr2,
             LATERAL jsonb_array_elements(
               COALESCE(pr2.documents, '[]'::jsonb) ||
               COALESCE(pr2.artwork, '[]'::jsonb) ||
               COALESCE(pr2.music, '[]'::jsonb)
             ) AS item
        WHERE item ->> 'id' = cp.content_id::text
        LIMIT 1
      )
      ELSE NULL
    END AS item_title,
    (COALESCE(cp.base_amount, 0) + COALESCE(cp.platform_fee_amount, 0)) AS subtotal,
    COALESCE(cp.processor_fee_amount, 0) AS processor_fee,
    cp.buyer_total_amount AS buyer_total,
    cp.provider,
    cp.payment_status AS status,
    cp.completed_at AS paid_at
  FROM public.content_purchases cp
  WHERE cp.payment_status = 'completed'

  UNION ALL

  SELECT
    'bestowal'::text AS source,
    b.id AS source_id,
    b.bestower_id AS buyer_id,
    COALESCE((b.distribution_data ->> 'sower_user_id')::uuid, o.user_id) AS sower_id,
    b.orchard_id AS item_id,
    o.title AS item_title,
    (b.buyer_total_amount - COALESCE(b.processor_fee_amount, 0)) AS subtotal,
    COALESCE(b.processor_fee_amount, 0) AS processor_fee,
    b.buyer_total_amount AS buyer_total,
    b.provider,
    b.payment_status AS status,
    b.updated_at AS paid_at
  FROM public.bestowals b
  LEFT JOIN public.orchards o ON o.id = b.orchard_id
  WHERE b.payment_status IN ('completed', 'distributed')

  UNION ALL

  -- Self-funding: no sower, no item, just a wallet credit.
  SELECT
    'topup'::text AS source,
    t.id AS source_id,
    t.user_id AS buyer_id,
    NULL::uuid AS sower_id,
    NULL::uuid AS item_id,
    'Wallet top-up'::text AS item_title,
    t.amount AS subtotal,
    COALESCE(t.fee_amount, 0) AS processor_fee,
    (t.amount + COALESCE(t.fee_amount, 0)) AS buyer_total,
    t.provider,
    t.status,
    COALESCE(t.credited_at, t.created_at) AS paid_at
  FROM public.topups t
  WHERE t.status = 'completed'
) rows
WHERE
  rows.buyer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gosat'::app_role);

REVOKE ALL ON public.buyer_purchases_v FROM PUBLIC, anon;
GRANT SELECT ON public.buyer_purchases_v TO authenticated;
