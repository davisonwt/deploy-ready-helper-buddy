ALTER TABLE public.whisperer_earnings
  DROP CONSTRAINT IF EXISTS whisperer_earnings_status_check;

ALTER TABLE public.whisperer_earnings
  ADD CONSTRAINT whisperer_earnings_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'payable'::text, 'processing'::text, 'awaiting_2fa'::text, 'processed'::text, 'paid'::text, 'failed'::text]));

ALTER TABLE public.whisperer_earnings
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_provider text;

ALTER TABLE public.product_bestowals
  ADD COLUMN IF NOT EXISTS payout_provider text;

CREATE INDEX IF NOT EXISTS idx_whisperer_earnings_payout_reference
  ON public.whisperer_earnings (payout_reference)
  WHERE payout_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_bestowals_payout_reference
  ON public.product_bestowals (payout_reference)
  WHERE payout_reference IS NOT NULL;