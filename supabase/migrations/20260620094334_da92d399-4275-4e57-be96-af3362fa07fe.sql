
ALTER TABLE public.s2g_companion_runs
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS artifact_url text,
  ADD COLUMN IF NOT EXISTS cost_usd_estimate numeric(10,4),
  ADD COLUMN IF NOT EXISTS replicate_prediction_id text;
