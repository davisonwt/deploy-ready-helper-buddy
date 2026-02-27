-- ============================================================
-- Phase 1: Whisperer Referral Links + Attribution Engine
-- ============================================================

-- 1. Table: whisperer_referral_links
CREATE TABLE IF NOT EXISTS public.whisperer_referral_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whisperer_id UUID NOT NULL REFERENCES public.whisperers(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.product_whisperer_assignments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.sower_books(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table: whisperer_clicks
CREATE TABLE IF NOT EXISTS public.whisperer_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_link_id UUID NOT NULL REFERENCES public.whisperer_referral_links(id) ON DELETE CASCADE,
  whisperer_id UUID NOT NULL REFERENCES public.whisperers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.sower_books(id) ON DELETE SET NULL,
  visitor_id TEXT,
  user_id UUID,
  ip_hash TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table: whisperer_conversions
CREATE TABLE IF NOT EXISTS public.whisperer_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_link_id UUID NOT NULL REFERENCES public.whisperer_referral_links(id) ON DELETE CASCADE,
  click_id UUID REFERENCES public.whisperer_clicks(id) ON DELETE SET NULL,
  whisperer_id UUID NOT NULL REFERENCES public.whisperers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.sower_books(id) ON DELETE SET NULL,
  bestowal_id UUID,
  bestower_id UUID NOT NULL,
  bestowal_amount NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  attribution_type TEXT NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whisperer_ref_links_ref_code ON public.whisperer_referral_links(ref_code);
CREATE INDEX IF NOT EXISTS idx_whisperer_ref_links_whisperer ON public.whisperer_referral_links(whisperer_id);
CREATE INDEX IF NOT EXISTS idx_whisperer_ref_links_product ON public.whisperer_referral_links(product_id);
CREATE INDEX IF NOT EXISTS idx_whisperer_ref_links_assignment ON public.whisperer_referral_links(assignment_id);
CREATE INDEX IF NOT EXISTS idx_whisperer_clicks_ref_link ON public.whisperer_clicks(ref_link_id);
CREATE INDEX IF NOT EXISTS idx_whisperer_clicks_created ON public.whisperer_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_whisperer_conversions_whisperer ON public.whisperer_conversions(whisperer_id);
CREATE INDEX IF NOT EXISTS idx_whisperer_conversions_ref_link ON public.whisperer_conversions(ref_link_id);

-- Enable RLS
ALTER TABLE public.whisperer_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whisperer_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whisperer_conversions ENABLE ROW LEVEL SECURITY;

-- RLS: whisperer_referral_links
CREATE POLICY "Whisperers can view own referral links"
  ON public.whisperer_referral_links FOR SELECT
  USING (
    whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
    OR is_active = true
    OR public.has_role(auth.uid(), 'gosat')
  );

CREATE POLICY "Whisperers can create own referral links"
  ON public.whisperer_referral_links FOR INSERT
  WITH CHECK (
    whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
  );

CREATE POLICY "Whisperers can update own referral links"
  ON public.whisperer_referral_links FOR UPDATE
  USING (
    whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
  );

-- RLS: whisperer_clicks (inserts via edge function with service role, reads by whisperer/gosat)
CREATE POLICY "Anyone can insert clicks"
  ON public.whisperer_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Whisperers and gosat can view clicks"
  ON public.whisperer_clicks FOR SELECT
  USING (
    whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gosat')
  );

-- RLS: whisperer_conversions
CREATE POLICY "Whisperers and gosat can view conversions"
  ON public.whisperer_conversions FOR SELECT
  USING (
    whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'gosat')
  );

CREATE POLICY "Service can insert conversions"
  ON public.whisperer_conversions FOR INSERT
  WITH CHECK (true);

-- Function to generate unique ref codes
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.whisperer_referral_links WHERE ref_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Auto-generate referral links when assignment is created
CREATE OR REPLACE FUNCTION public.auto_create_referral_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whisperer_referral_links (
    whisperer_id, assignment_id, product_id, orchard_id, book_id, ref_code
  ) VALUES (
    NEW.whisperer_id, NEW.id, NEW.product_id, NEW.orchard_id, NEW.book_id,
    public.generate_ref_code()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_referral_link ON public.product_whisperer_assignments;
CREATE TRIGGER trg_auto_create_referral_link
  AFTER INSERT ON public.product_whisperer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_referral_link();

-- Updated_at trigger
CREATE TRIGGER update_whisperer_referral_links_updated_at
  BEFORE UPDATE ON public.whisperer_referral_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();