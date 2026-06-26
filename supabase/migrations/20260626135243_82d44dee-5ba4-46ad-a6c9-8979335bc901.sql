ALTER TABLE public.whisperers
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS portfolio_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS rates text,
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can view listed whisperers" ON public.whisperers;
CREATE POLICY "Anyone can view listed whisperers"
  ON public.whisperers FOR SELECT
  USING (is_listed = true AND is_active = true);

GRANT SELECT ON public.whisperers TO anon;