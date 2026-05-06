ALTER TABLE public.orchards
ADD COLUMN IF NOT EXISTS whisperer_share_pct numeric NOT NULL DEFAULT 10
CHECK (whisperer_share_pct >= 0 AND whisperer_share_pct <= 50);