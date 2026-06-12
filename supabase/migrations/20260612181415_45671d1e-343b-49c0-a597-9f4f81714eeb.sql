
-- =========================================================================
-- Phase 0: Bulk Product Uploader — schema additions
-- Additive only. No drops, no renames.
-- =========================================================================

-- ---- products: additive columns ----------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS commission_fixed numeric(12,2),
  ADD COLUMN IF NOT EXISTS stock_qty integer,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS bulk_upload_id uuid;

-- ---- sowers: additive columns ------------------------------------------
ALTER TABLE public.sowers
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS tagline text;

-- ---- slugify helper ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.s2g_slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(_input, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- ---- backfill sower slugs ---------------------------------------------
UPDATE public.sowers
SET slug = coalesce(
  nullif(public.s2g_slugify(display_name), ''),
  'sower'
) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

-- ---- backfill product slugs -------------------------------------------
UPDATE public.products
SET slug = coalesce(
  nullif(public.s2g_slugify(title), ''),
  'product'
) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

-- ---- unique indexes (after backfill) ----------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS sowers_slug_key   ON public.sowers (slug)   WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug) WHERE slug IS NOT NULL;
CREATE INDEX        IF NOT EXISTS products_bulk_upload_id_idx ON public.products (bulk_upload_id);

-- =========================================================================
-- product_images
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON public.product_images (product_id, sort_order);

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images public read"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "product_images sower insert"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.sowers s ON s.id = p.sower_id
      WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "product_images sower update"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.sowers s ON s.id = p.sower_id
      WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "product_images sower delete"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.sowers s ON s.id = p.sower_id
      WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
    )
  );

-- =========================================================================
-- bulk_upload_jobs
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bulk_upload_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sower_id         uuid REFERENCES public.sowers(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  file_name        text,
  file_type        text,
  file_size_bytes  integer,
  status           text NOT NULL DEFAULT 'uploaded',
  total_rows       integer NOT NULL DEFAULT 0,
  valid_rows       integer NOT NULL DEFAULT 0,
  error_rows       integer NOT NULL DEFAULT 0,
  parsed_rows      jsonb NOT NULL DEFAULT '[]'::jsonb,
  parse_error      text,
  published_count  integer NOT NULL DEFAULT 0,
  scheduled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_upload_jobs_status_check
    CHECK (status IN ('uploaded','parsing','parsed','publishing','published','failed','draft'))
);

CREATE INDEX IF NOT EXISTS bulk_upload_jobs_user_id_idx ON public.bulk_upload_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bulk_upload_jobs_sower_id_idx ON public.bulk_upload_jobs (sower_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_upload_jobs TO authenticated;
GRANT ALL ON public.bulk_upload_jobs TO service_role;

ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bulk_upload_jobs owner read"
  ON public.bulk_upload_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bulk_upload_jobs owner insert"
  ON public.bulk_upload_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bulk_upload_jobs owner update"
  ON public.bulk_upload_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bulk_upload_jobs owner delete"
  ON public.bulk_upload_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---- updated_at trigger -----------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_upload_jobs_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bulk_upload_jobs_touch ON public.bulk_upload_jobs;
CREATE TRIGGER trg_bulk_upload_jobs_touch
  BEFORE UPDATE ON public.bulk_upload_jobs
  FOR EACH ROW EXECUTE FUNCTION public.bulk_upload_jobs_touch_updated_at();
