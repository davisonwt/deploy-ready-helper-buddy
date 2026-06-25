
ALTER TABLE public.bestowals
  ADD COLUMN IF NOT EXISTS context_kind text,
  ADD COLUMN IF NOT EXISTS context_id uuid;

ALTER TABLE public.bestowals
  ALTER COLUMN orchard_id DROP NOT NULL;

ALTER TABLE public.bestowals
  ADD CONSTRAINT bestowals_context_kind_check
  CHECK (context_kind IS NULL OR context_kind IN ('orchard','live_session','radio_session','chat_tip'));

-- Either the row points at an orchard, or it declares a non-orchard context.
ALTER TABLE public.bestowals
  ADD CONSTRAINT bestowals_orchard_or_context_check
  CHECK (orchard_id IS NOT NULL OR context_kind IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_bestowals_context
  ON public.bestowals (context_kind, context_id)
  WHERE context_kind IS NOT NULL;
