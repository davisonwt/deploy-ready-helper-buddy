-- Add item_id and item_title to sower_earnings_v so CatalogTab/BooksCatalogItemPage
-- (and any other per-item earnings breakdown) can read from the unified view
-- instead of querying product_bestowals directly. New migration rather than
-- editing 20260828120000_sower-earnings-view.sql — that file is already applied.
--
-- CREATE OR REPLACE VIEW can only append columns, never reorder or remove
-- existing ones, so item_id/item_title go on the end of the column list.
--
-- Per source:
--   product  — item_id = product_bestowals.product_id, item_title = products.title
--   content  — item_id = content_purchases.content_id, item_title resolved by
--              content_type (mirrors _shared/postFinalize/messaging.ts's
--              resolveContentTitle exactly, plus the one case that function
--              doesn't need: 'premium_item', whose title lives inside a JSONB
--              array on premium_rooms rather than its own row)
--   bestowal — item_id = bestowals.orchard_id, item_title = orchards.title.
--              Both are naturally NULL for a gift bestowal (no orchard_id at
--              all) and populated for an orchard bestowal — no extra logic
--              needed beyond the LEFT JOIN orchards this view already has.
CREATE OR REPLACE VIEW public.sower_earnings_v
WITH (security_barrier = true) AS
SELECT * FROM (
  SELECT
    'product'::text AS source,
    pb.id AS source_id,
    s.user_id AS sower_id,
    pb.whisperer_id,
    pb.bestower_id AS buyer_id,
    pb.amount AS gross,
    pb.s2g_fee,
    pb.sower_amount,
    pb.whisperer_amount,
    pb.payment_method AS provider,
    pb.status,
    pb.created_at AS paid_at,
    pb.product_id AS item_id,
    p.title AS item_title
  FROM public.product_bestowals pb
  JOIN public.sowers s ON s.id = pb.sower_id
  LEFT JOIN public.products p ON p.id = pb.product_id
  WHERE pb.status = 'completed'

  UNION ALL

  SELECT
    'content'::text AS source,
    cp.id AS source_id,
    cp.seller_id AS sower_id,
    NULL::uuid AS whisperer_id,
    cp.buyer_id,
    cp.buyer_total_amount AS gross,
    cp.platform_fee_amount AS s2g_fee,
    cp.base_amount AS sower_amount,
    NULL::numeric AS whisperer_amount,
    cp.provider,
    cp.payment_status AS status,
    cp.completed_at AS paid_at,
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
        -- premium_item has no row of its own — it's an entry inside a
        -- premium_rooms JSONB array (documents/artwork/music), keyed by its
        -- own "id" field, matching create-content-purchase-order's resolveContent.
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
    END AS item_title
  FROM public.content_purchases cp
  WHERE cp.payment_status = 'completed'

  UNION ALL

  SELECT
    'bestowal'::text AS source,
    b.id AS source_id,
    COALESCE((b.distribution_data ->> 'sower_user_id')::uuid, o.user_id) AS sower_id,
    NULL::uuid AS whisperer_id,
    b.bestower_id AS buyer_id,
    b.buyer_total_amount AS gross,
    (b.buyer_total_amount - COALESCE(b.processor_fee_amount, 0) - COALESCE(b.base_amount, 0)) AS s2g_fee,
    COALESCE((b.distribution_data ->> 'sower_amount')::numeric, b.base_amount) AS sower_amount,
    NULL::numeric AS whisperer_amount,
    b.provider,
    b.payment_status AS status,
    b.updated_at AS paid_at,
    b.orchard_id AS item_id,
    o.title AS item_title
  FROM public.bestowals b
  LEFT JOIN public.orchards o ON o.id = b.orchard_id
  WHERE b.payment_status = 'completed'
    AND (
      (b.distribution_data ->> 'sower_user_id') IS NOT NULL
      OR o.user_id IS NOT NULL
    )
) rows
WHERE
  rows.sower_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.whisperers w
    WHERE w.id = rows.whisperer_id AND w.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gosat'::app_role);

REVOKE ALL ON public.sower_earnings_v FROM PUBLIC, anon;
GRANT SELECT ON public.sower_earnings_v TO authenticated;
