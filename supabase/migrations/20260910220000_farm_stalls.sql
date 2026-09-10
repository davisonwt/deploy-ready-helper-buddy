-- Farm-Stalls, batch 1 (data + owner view). Every sower/whisperer gets a
-- "stall": a shop-front image that, tapped, opens an interior image with
-- 3-5 tile buttons leading to their products/music/orchard/etc.
--
-- tier is a display/decoration bucket derived from the member's Tribal
-- Tier (public.sowers.tier) or whisperer status at stall-creation time --
-- NOT re-derived automatically if their tier changes later (same one-shot
-- snapshot pattern distribution_data uses elsewhere in this app). A gosat
-- can update it by hand via a future admin tool if that's ever needed.
--
-- category is the member's own choice of what kind of stall this is
-- (fixed list, independent of tier).

CREATE TABLE public.stalls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                  text NOT NULL DEFAULT 'farm_stall'
                        CHECK (tier IN ('farm_stall', 'country_store', 'market_hall', 'trading_house', 'the_works', 'wayside_table')),
  category              text NOT NULL
                        CHECK (category IN ('music', 'books_writing', 'art_craft', 'faith_teaching', 'trades_services', 'food_home', 'whisperer', 'orchard')),
  name                  text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  tagline               text CHECK (tagline IS NULL OR length(tagline) <= 160),
  front_image_path      text,
  interior_image_path   text,
  -- One row per tile, in display order, 3-5 entries once published (not
  -- enforced by a CHECK -- the /stall/build wizard is the one writer and
  -- enforces the 3-5 range client-side; a DB-level count constraint on a
  -- jsonb array needs a CHECK function, more machinery than this batch
  -- warrants). Shape per element:
  --   { label: text,
  --     kind: 'books' | 'music' | 'lyrics' | 'story' | 'products' | 'services' | 'orchard' | 'custom',
  --     image_path?: text,       -- optional tile thumbnail, same "stalls" bucket
  --     link_target: text }      -- in-app path (kind-derived) or, for 'custom', a member-supplied in-app URL
  tiles                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  published             boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stalls_published ON public.stalls (published) WHERE published = true;

CREATE TRIGGER trg_stalls_updated BEFORE UPDATE ON public.stalls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- Default tier from Tribal Tier / whisperer status at creation time -----
CREATE OR REPLACE FUNCTION public.stalls_default_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $sdt$
DECLARE
  v_sower_tier text;
BEGIN
  IF NEW.tier IS NOT NULL AND NEW.tier <> 'farm_stall' THEN
    -- Caller already picked a tier explicitly (or a future admin tool did) -- leave it.
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.whisperers WHERE user_id = NEW.user_id) THEN
    NEW.tier := 'wayside_table';
    RETURN NEW;
  END IF;

  SELECT tier INTO v_sower_tier FROM public.sowers WHERE user_id = NEW.user_id;
  NEW.tier := CASE v_sower_tier
    WHEN 'homestead'      THEN 'farm_stall'
    WHEN 'grove'          THEN 'country_store'
    WHEN 'orchard'        THEN 'market_hall'
    WHEN 'estate'         THEN 'trading_house'
    WHEN 'harvest_works'  THEN 'the_works'
    ELSE 'farm_stall'  -- no sowers row yet, or an unrecognised tier -- entry-level default
  END;
  RETURN NEW;
END;
$sdt$;

CREATE TRIGGER trg_stalls_default_tier
  BEFORE INSERT ON public.stalls
  FOR EACH ROW EXECUTE FUNCTION public.stalls_default_tier();

-- --- RLS: owner full access; everyone reads published rows -----------------
ALTER TABLE public.stalls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stalls FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stalls TO authenticated;
GRANT ALL ON public.stalls TO service_role;

CREATE POLICY "stalls_owner_all" ON public.stalls
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "stalls_read_published" ON public.stalls
  FOR SELECT TO authenticated
  USING (published = true);

-- A guest (not signed in) can browse published stalls too -- there's no
-- member-private data on this table (front/interior/tile images are meant
-- to be a public storefront), matching orchards' own public-read pattern.
GRANT SELECT ON public.stalls TO anon;
CREATE POLICY "stalls_read_published_anon" ON public.stalls
  FOR SELECT TO anon
  USING (published = true);

-- --- Storage bucket: public read, owner write (same shape as orchard-images) ---
INSERT INTO storage.buckets (id, name, public) VALUES ('stalls', 'stalls', true);

CREATE POLICY "Anyone can view stall images"
ON storage.objects FOR SELECT
USING (bucket_id = 'stalls');

CREATE POLICY "Authenticated users can upload their own stall images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stalls' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own stall images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stalls' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own stall images"
ON storage.objects FOR DELETE
USING (bucket_id = 'stalls' AND auth.uid()::text = (storage.foldername(name))[1]);

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'stalls_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stalls'),
  'bucket_exists', EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'stalls'),
  'tier_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'stalls_tier_check')),
  'category_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'stalls_category_check'))
) AS proof;
