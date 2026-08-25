ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_product_bestowals_payout
  ON public.product_bestowals (sower_id, payout_status)
  WHERE release_status = 'released';

-- Historical rows predate the payout ledger; do not re-pay them.
UPDATE public.product_bestowals
   SET payout_status = 'legacy'
 WHERE payout_status = 'pending'
   AND created_at < now() - interval '1 day';