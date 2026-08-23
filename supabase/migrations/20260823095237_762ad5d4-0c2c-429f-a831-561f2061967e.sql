CREATE TABLE public.sower_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sower_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sower_brands TO authenticated;
GRANT ALL ON public.sower_brands TO service_role;
ALTER TABLE public.sower_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands are viewable by everyone" ON public.sower_brands FOR SELECT USING (true);
CREATE POLICY "Sowers manage their own brands" ON public.sower_brands FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_sower_brands_user ON public.sower_brands(user_id);

CREATE TABLE public.item_brand_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.sower_brands(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id)
);
GRANT SELECT ON public.item_brand_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_brand_assignments TO authenticated;
GRANT ALL ON public.item_brand_assignments TO service_role;
ALTER TABLE public.item_brand_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand assignments are viewable by everyone" ON public.item_brand_assignments FOR SELECT USING (true);
CREATE POLICY "Sowers manage their own brand assignments" ON public.item_brand_assignments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_item_brand_assignments_user ON public.item_brand_assignments(user_id);

CREATE TRIGGER update_sower_brands_updated_at BEFORE UPDATE ON public.sower_brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();