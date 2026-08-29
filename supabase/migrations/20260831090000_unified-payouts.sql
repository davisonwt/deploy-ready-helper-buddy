-- Unified payout system, replacing two separate mechanisms:
--   1. payout-sower-earnings (daily, NOWPayments crypto rails only, product_
--      bestowals only) -- deleted this migration's companion code change.
--   2. dispatchPayouts() (distribution.ts, immediate-dispatch at gift/orchard
--      finalize, PayPal-or-crypto per a snapshotted rail) -- call sites
--      removed this same change; the function body is left in place,
--      unused (matches this session's established pattern for retiring a
--      dead code path without deleting a shared module outright).
-- payout-whisperer-earnings is also retired -- whisperer balances now flow
-- through the same weekly run.
--
-- New model: ONE weekly run (Friday 02:00 UTC), PayPal Payouts only, $20
-- minimum, requires a verified PayPal email in user_wallets. See
-- supabase/functions/payout-earnings/index.ts for the run itself.

-- ---------------------------------------------------------------------------
-- owed_payout_balances(): the single source of truth for "what does the
-- platform owe this recipient right now" -- same source tables and same
-- sower-id resolution as sower_earnings_v (product_bestowals.sower_id is
-- sowers.id, not an auth id; bestowals has no sower_id column at all, only
-- distribution_data->>'sower_user_id' with an orchards.user_id fallback),
-- plus the payout-specific gate sower_earnings_v doesn't apply
-- (payout_status = 'pending' -- not yet paid) and a whisperer_earnings
-- branch (status = 'payable' is that table's own equivalent of
-- payout_status = 'pending', not a separate column).
--
-- product_bestowals is additionally gated on release_status = 'released'
-- (escrow: digital seeds release immediately, physical ones only after
-- delivery confirmation) -- bestowals has a release_status column too but
-- nothing has ever set it to 'released' for a gift/orchard bestowal (it
-- stays at its 'pending' default forever), so gating on it there would
-- make every bestowal permanently unpayable; sower_earnings_v already
-- treats a completed bestowal as immediately payable, matched here.
--
-- SECURITY DEFINER + no grants to authenticated: this is payout-machinery
-- internal, called only by payout-earnings via the service-role client.
CREATE OR REPLACE FUNCTION public.owed_payout_balances()
RETURNS TABLE (
  recipient_type text,
  recipient_user_id uuid,
  amount_usd numeric,
  covered_rows jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rows AS (
    SELECT
      'sower'::text AS recipient_type,
      s.user_id AS recipient_user_id,
      pb.sower_amount AS amount,
      jsonb_build_object('source_table', 'product_bestowals', 'source_id', pb.id) AS ref
    FROM public.product_bestowals pb
    JOIN public.sowers s ON s.id = pb.sower_id
    WHERE pb.status = 'completed'
      AND pb.release_status = 'released'
      AND pb.payout_status = 'pending'

    UNION ALL

    SELECT
      'sower',
      cp.seller_id,
      cp.base_amount,
      jsonb_build_object('source_table', 'content_purchases', 'source_id', cp.id)
    FROM public.content_purchases cp
    WHERE cp.payment_status = 'completed'
      AND cp.payout_status = 'pending'

    UNION ALL

    SELECT
      'sower',
      COALESCE((b.distribution_data ->> 'sower_user_id')::uuid, o.user_id),
      COALESCE((b.distribution_data ->> 'sower_amount')::numeric, b.base_amount),
      jsonb_build_object('source_table', 'bestowals', 'source_id', b.id)
    FROM public.bestowals b
    LEFT JOIN public.orchards o ON o.id = b.orchard_id
    WHERE b.payment_status IN ('completed', 'distributed')
      AND b.payout_status = 'pending'
      AND (
        (b.distribution_data ->> 'sower_user_id') IS NOT NULL
        OR o.user_id IS NOT NULL
      )

    UNION ALL

    SELECT
      'whisperer',
      w.user_id,
      we.amount,
      jsonb_build_object('source_table', 'whisperer_earnings', 'source_id', we.id)
    FROM public.whisperer_earnings we
    JOIN public.whisperers w ON w.id = we.whisperer_id
    WHERE we.status = 'payable'
  )
  SELECT
    recipient_type,
    recipient_user_id,
    ROUND(SUM(amount), 2) AS amount_usd,
    jsonb_agg(ref) AS covered_rows
  FROM rows
  WHERE recipient_user_id IS NOT NULL
  GROUP BY recipient_type, recipient_user_id;
$$;

REVOKE ALL ON FUNCTION public.owed_payout_balances() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owed_payout_balances() TO service_role;

-- ---------------------------------------------------------------------------
-- payouts: one row per recipient per weekly run. run_id groups every row
-- from the same PayPal batch together ("one payout batch per run").
-- paypal_item_id is filled in once PayPal's PAYMENT.PAYOUTS-ITEM.* webhook
-- arrives -- batch creation alone doesn't return real per-item ids, only
-- the batch id (see payout-earnings/index.ts).
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('sower', 'whisperer')),
  recipient_user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  paypal_batch_id text,
  paypal_item_id text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'paid', 'failed')),
  error text,
  -- [{"source_table": "product_bestowals", "source_id": "<uuid>"}, ...] --
  -- the exact rows this payout covers, marked paid/reverted together.
  covered_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payouts_run_id_idx ON public.payouts (run_id);
CREATE INDEX payouts_recipient_idx ON public.payouts (recipient_user_id);
-- Lets the webhook find a row by the item id PayPal echoes back once known;
-- partial (most rows have no item id yet at insert time).
CREATE UNIQUE INDEX payouts_paypal_item_id_idx ON public.payouts (paypal_item_id) WHERE paypal_item_id IS NOT NULL;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- A recipient can see their own payout history; admin/gosat see all.
-- No insert/update/delete policy -- only the service role (payout-earnings,
-- paypal-webhook) ever writes here.
CREATE POLICY "payouts_select_own_or_admin" ON public.payouts
  FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gosat'::app_role)
  );

-- ---------------------------------------------------------------------------
-- content_purchases' payout_status CHECK only ever allowed 'sent' as a
-- terminal success value (never 'paid') -- product_bestowals/bestowals have
-- no such constraint and product_bestowals' old code already used 'paid'
-- literally. Widening this one constraint lets all three tables share one
-- vocabulary ('pending' -> 'processing' -> 'paid'/'failed') instead of the
-- payout webhook needing a special case for one table.
ALTER TABLE public.content_purchases DROP CONSTRAINT content_purchases_payout_status_check;
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_payout_status_check
  CHECK (payout_status = ANY (ARRAY['pending', 'processing', 'paid', 'sent', 'failed', 'manual_required']));

-- ---------------------------------------------------------------------------
-- Retire the two daily crypto-rail cron jobs; replace with one weekly run.
-- cron.unschedule(name) raises rather than no-oping when the job doesn't
-- exist — payout-sower-earnings-daily was already removed by hand in Studio
-- (2026-08-31 08:55), so a bare SELECT here would abort this whole
-- migration. Wrapped in DO blocks that swallow exactly that failure.
DO $$
BEGIN
  PERFORM cron.unschedule('payout-sower-earnings-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'payout-sower-earnings-daily: already gone, nothing to unschedule';
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('payout-whisperer-earnings-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'payout-whisperer-earnings-daily: already gone, nothing to unschedule';
END;
$$;

SELECT cron.schedule(
  'payout-earnings-weekly',
  '0 2 * * 5', -- Friday 02:00 UTC
  $$ SELECT public.invoke_money_job('payout-earnings'); $$
);
