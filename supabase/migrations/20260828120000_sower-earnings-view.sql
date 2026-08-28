-- sower_earnings_v: one unified, RLS-safe shape for every completed/paid
-- earning a sower or whisperer has, across the three tables that currently
-- each track their own slice with their own column names and their own
-- (sometimes missing) status filters:
--
--   product_bestowals  — basket-flow product sales (has sower_id, s2g_fee,
--                         sower_amount, whisperer_id/whisperer_amount directly)
--   content_purchases  — library/premium/session-media/music-track sales
--                         (seller_id, platform_fee_amount, base_amount;
--                         no whisperer support today)
--   bestowals          — orchard + gift bestowals (no sower_id column at
--                         all; the recipient lives in distribution_data
--                         ->>'sower_user_id', with an orchards.user_id
--                         fallback for orchard rows written before
--                         distribution_data carried it; no whisperer
--                         support today)
--
-- Amounts are always USD. NOWPayments bestowals happen to be crypto-settled
-- but every column here (buyer_total_amount / base_amount / s2g_fee /
-- amount / sower_amount) is USD-denominated throughout this schema; PayPal
-- bestowals never touch crypto at all. Nothing in this view is USDC.
--
-- Row-level security is baked directly into this view's WHERE clause rather
-- than relying on the three base tables' own RLS: a plain view runs as its
-- owner (a privileged role, since migrations run privileged), which
-- bypasses the base tables' RLS entirely regardless of their policies.
-- security_barrier prevents a leaky-view optimization from evaluating a
-- caller-supplied predicate before this view's own row filter runs.
CREATE OR REPLACE VIEW public.sower_earnings_v
WITH (security_barrier = true) AS
SELECT * FROM (
  SELECT
    'product'::text AS source,
    pb.id AS source_id,
    pb.sower_id,
    pb.whisperer_id,
    pb.bestower_id AS buyer_id,
    pb.amount AS gross,
    pb.s2g_fee,
    pb.sower_amount,
    pb.whisperer_amount,
    pb.payment_method AS provider,
    pb.status,
    pb.created_at AS paid_at
  FROM public.product_bestowals pb
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
    cp.completed_at AS paid_at
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
    b.updated_at AS paid_at
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
  -- rows.whisperer_id stores whisperers.id (its own PK), not the
  -- whisperer's auth.users id — resolve_whisperer_by_ref_code returns it
  -- that way and finalize_basket_order inserts it unchanged. Comparing it
  -- to auth.uid() directly would never match a real whisperer's session.
  OR EXISTS (
    SELECT 1 FROM public.whisperers w
    WHERE w.id = rows.whisperer_id AND w.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gosat'::app_role);

REVOKE ALL ON public.sower_earnings_v FROM PUBLIC, anon;
GRANT SELECT ON public.sower_earnings_v TO authenticated;
