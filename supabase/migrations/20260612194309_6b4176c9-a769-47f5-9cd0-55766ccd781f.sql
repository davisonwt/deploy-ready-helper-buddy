
DO $$ BEGIN
  CREATE TYPE public.company_tier AS ENUM ('homestead','grove','orchard','estate','harvest_works');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tier public.company_tier NOT NULL DEFAULT 'grove';

CREATE INDEX IF NOT EXISTS idx_companies_tier ON public.companies(tier);
