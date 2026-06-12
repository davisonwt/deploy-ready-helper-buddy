
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  about text,
  logo_url text,
  banner_url text,
  website text,
  is_factory boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  ads_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified companies are publicly viewable"
  ON public.companies FOR SELECT
  USING (is_verified = true OR owner_user_id = auth.uid());

CREATE POLICY "Owners can insert their company"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update their company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete their company"
  ON public.companies FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_companies_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_companies_updated_at();

CREATE INDEX companies_owner_idx ON public.companies(owner_user_id);
CREATE INDEX companies_verified_idx ON public.companies(is_verified) WHERE is_verified;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_company_idx ON public.products(company_id);
