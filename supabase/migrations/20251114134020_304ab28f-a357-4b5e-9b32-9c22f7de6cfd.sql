-- Add product_type field to orchards table to distinguish physical vs digital products
ALTER TABLE public.orchards
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'physical' CHECK (product_type IN ('physical', 'digital'));

COMMENT ON COLUMN public.orchards.product_type IS 'Type of product: physical (goes to s2gholding, requires courier) or digital (goes directly to user wallet)';

-- Add distribution_mode and hold_reason columns to bestowals if not exists
ALTER TABLE public.bestowals
ADD COLUMN IF NOT EXISTS distribution_mode text DEFAULT 'automatic' CHECK (distribution_mode IN ('automatic', 'manual'));

ALTER TABLE public.bestowals
ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.bestowals
ADD COLUMN IF NOT EXISTS distribution_data jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.bestowals
ADD COLUMN IF NOT EXISTS distributed_at timestamp with time zone;

COMMENT ON COLUMN public.bestowals.distribution_mode IS 'automatic: instant split for digital products, manual: requires gosat approval after courier delivery';
COMMENT ON COLUMN public.bestowals.hold_reason IS 'Reason for manual distribution hold (e.g., awaiting_courier_confirmation)';
COMMENT ON COLUMN public.bestowals.distribution_data IS 'Stores distribution transaction details including transfer IDs';

-- Create index for distribution queue queries
CREATE INDEX IF NOT EXISTS idx_bestowals_distribution ON public.bestowals(distribution_mode, payment_status, distributed_at) WHERE distribution_mode = 'manual' AND payment_status = 'completed' AND distributed_at IS NULL;