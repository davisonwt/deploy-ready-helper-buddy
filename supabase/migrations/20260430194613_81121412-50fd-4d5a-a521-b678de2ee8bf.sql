-- ============================================================================
-- 1. EXPAND verification_status enum (additive, safe)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='not_submitted' AND enumtypid='public.verification_status'::regtype) THEN
    ALTER TYPE public.verification_status ADD VALUE 'not_submitted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='expired' AND enumtypid='public.verification_status'::regtype) THEN
    ALTER TYPE public.verification_status ADD VALUE 'expired';
  END IF;
END $$;

-- ============================================================================
-- 2. CATEGORY / SUBCATEGORY / TAG LOOKUP TABLES
-- ============================================================================
CREATE TABLE public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE TABLE public.marketplace_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  tag_group TEXT NOT NULL CHECK (tag_group IN ('trust','logistics','condition','service','travel','quality')),
  description TEXT,
  requires_verification BOOLEAN NOT NULL DEFAULT false,
  required_credential_type TEXT, -- references seller_credentials.credential_type
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subcat_category ON public.marketplace_subcategories(category_id);
CREATE INDEX idx_tags_group ON public.marketplace_tags(tag_group);

-- ============================================================================
-- 3. LISTING JUNCTION TABLES (work for any seed type)
-- ============================================================================
CREATE TABLE public.listing_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('product','orchard','music','book','video','seed')),
  listing_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.marketplace_tags(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_type, listing_id, tag_id)
);

CREATE TABLE public.listing_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('product','orchard','music','book','video','seed')),
  listing_id UUID NOT NULL,
  subcategory_id UUID NOT NULL REFERENCES public.marketplace_subcategories(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_type, listing_id, subcategory_id)
);

CREATE INDEX idx_listing_tags_lookup ON public.listing_tags(listing_type, listing_id);
CREATE INDEX idx_listing_tags_tag ON public.listing_tags(tag_id);
CREATE INDEX idx_listing_subcat_lookup ON public.listing_subcategories(listing_type, listing_id);

-- ============================================================================
-- 4. SELLER CREDENTIALS (license, insurance, ID, background check proofs)
-- ============================================================================
CREATE TABLE public.seller_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('identity','license','insurance','background_check')),
  file_url TEXT,
  notes TEXT,
  status public.verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_creds_user ON public.seller_credentials(user_id);
CREATE INDEX idx_seller_creds_status ON public.seller_credentials(status);

CREATE TRIGGER seller_credentials_updated_at
  BEFORE UPDATE ON public.seller_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_credentials ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin via existing has_role pattern. Fall back to checking user_roles directly.
CREATE OR REPLACE FUNCTION public.is_marketplace_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('admin','moderator')
  );
$$;

-- Categories / subcategories / tags: public read, admin write
CREATE POLICY "categories public read" ON public.marketplace_categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.marketplace_categories FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

CREATE POLICY "subcategories public read" ON public.marketplace_subcategories FOR SELECT USING (true);
CREATE POLICY "subcategories admin write" ON public.marketplace_subcategories FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

CREATE POLICY "tags public read" ON public.marketplace_tags FOR SELECT USING (true);
CREATE POLICY "tags admin write" ON public.marketplace_tags FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

-- Listing tags / subcategories: public read; owner manages own; admin manages any
CREATE POLICY "listing_tags public read" ON public.listing_tags FOR SELECT USING (true);
CREATE POLICY "listing_tags owner insert" ON public.listing_tags FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "listing_tags owner delete" ON public.listing_tags FOR DELETE USING (auth.uid() = owner_user_id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "listing_tags admin all" ON public.listing_tags FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

CREATE POLICY "listing_subcat public read" ON public.listing_subcategories FOR SELECT USING (true);
CREATE POLICY "listing_subcat owner insert" ON public.listing_subcategories FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "listing_subcat owner delete" ON public.listing_subcategories FOR DELETE USING (auth.uid() = owner_user_id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "listing_subcat admin all" ON public.listing_subcategories FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

-- Seller credentials: owner + admin read; owner insert; admin update; nobody else
CREATE POLICY "creds owner read" ON public.seller_credentials FOR SELECT USING (auth.uid() = user_id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "creds owner insert" ON public.seller_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creds owner update own pending" ON public.seller_credentials FOR UPDATE USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creds admin all" ON public.seller_credentials FOR ALL USING (public.is_marketplace_admin(auth.uid())) WITH CHECK (public.is_marketplace_admin(auth.uid()));

-- ============================================================================
-- 6. ENFORCE "BLOCK UNTIL VERIFIED" AT THE DATABASE LEVEL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_trust_tag_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_required TEXT;
  v_requires BOOLEAN;
BEGIN
  SELECT requires_verification, required_credential_type
    INTO v_requires, v_required
  FROM public.marketplace_tags WHERE id = NEW.tag_id;

  IF v_requires AND v_required IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.seller_credentials
      WHERE user_id = NEW.owner_user_id
        AND credential_type = v_required
        AND status = 'verified'
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Trust tag requires a verified % credential', v_required
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_trust_tag
  BEFORE INSERT ON public.listing_tags
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trust_tag_verification();

-- ============================================================================
-- 7. STORAGE BUCKET for credential proofs (private)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-credentials','seller-credentials', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "creds bucket owner read" ON storage.objects FOR SELECT
  USING (bucket_id = 'seller-credentials' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_marketplace_admin(auth.uid())));
CREATE POLICY "creds bucket owner upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'seller-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "creds bucket owner update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'seller-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "creds bucket owner delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'seller-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- 8. SEED DATA — 18 categories
-- ============================================================================
INSERT INTO public.marketplace_categories (slug, label, icon, sort_order) VALUES
  ('vehicles','Vehicles','🚗',10),
  ('electronics','Electronics','📱',20),
  ('home-garden','Home & Garden','🏡',30),
  ('clothing','Clothing & Accessories','👕',40),
  ('sports-outdoors','Sports & Outdoors','⚽',50),
  ('books-movies-music','Books, Movies & Music','📚',60),
  ('toys-hobbies','Toys & Hobbies','🧩',70),
  ('health-beauty','Health & Beauty','💄',80),
  ('baby-kids','Baby & Kids','🍼',90),
  ('pet-supplies','Pet Supplies','🐾',100),
  ('business-industrial','Business & Industrial','🏭',110),
  ('collectibles-art','Collectibles & Art','🎨',120),
  ('real-estate','Real Estate','🏠',130),
  ('travel-holidays','Travel & Holidays','✈️',140),
  ('homestead-produce','Homestead & Produce','🌾',150),
  ('services','Services','🔧',160),
  ('tickets-events','Tickets & Events','🎟️',170),
  ('other','Other / Miscellaneous','📦',999);

-- Subcategories: full lists for Travel, Homestead, Services + starters for others
WITH cat AS (SELECT id, slug FROM public.marketplace_categories)
INSERT INTO public.marketplace_subcategories (category_id, slug, label, sort_order)
SELECT cat.id, sc.slug, sc.label, sc.sort_order FROM cat JOIN (VALUES
  -- Travel & Holidays
  ('travel-holidays','flights','Flights & Transportation',10),
  ('travel-holidays','hotels-rentals','Hotels & Rentals',20),
  ('travel-holidays','tour-packages','Tour Packages & Cruises',30),
  ('travel-holidays','travel-gear','Travel Gear & Luggage',40),
  ('travel-holidays','timeshares','Timeshares & Vacation Clubs',50),
  -- Homestead & Produce
  ('homestead-produce','fresh-produce','Fresh Produce & Fruit',10),
  ('homestead-produce','dairy-eggs-honey','Dairy, Eggs & Honey',20),
  ('homestead-produce','meat-poultry','Meat & Poultry',30),
  ('homestead-produce','preserves-pantry','Preserves, Baked Goods & Pantry',40),
  ('homestead-produce','seeds-plants','Seeds, Plants & Trees',50),
  ('homestead-produce','livestock','Livestock & Poultry',60),
  ('homestead-produce','farming-equipment','Farming & Homestead Equipment',70),
  ('homestead-produce','handmade-goods','Handmade & Home-processed Goods',80),
  -- Services
  ('services','home-services','Home Services (Plumbing, Electrical, HVAC, Roofing)',10),
  ('services','professional','Professional & Technical (Engineering, Accounting, Legal)',20),
  ('services','education','Education & Tutoring',30),
  ('services','security','Security & Protection',40),
  ('services','cleaning','Cleaning & Maintenance',50),
  ('services','landscaping','Landscaping & Outdoor',60),
  ('services','automotive','Automotive & Mechanical',70),
  ('services','creative','Creative & Digital (Design, Writing, Marketing)',80),
  ('services','health-wellness','Health & Wellness (Training, Massage, Therapy)',90),
  ('services','events','Event & Personal Services',100),
  -- Vehicles starters
  ('vehicles','cars','Cars',10),('vehicles','trucks','Trucks',20),('vehicles','motorcycles','Motorcycles',30),
  ('vehicles','rvs','RVs',40),('vehicles','boats','Boats',50),('vehicles','atvs','ATVs',60),('vehicles','parts','Parts & Trailers',70),
  -- Electronics starters
  ('electronics','phones','Phones',10),('electronics','laptops','Laptops',20),('electronics','cameras','Cameras',30),
  ('electronics','tvs','TVs',40),('electronics','gaming','Gaming',50),('electronics','smart-home','Smart Home',60),
  -- Real Estate
  ('real-estate','rentals','Rentals',10),('real-estate','sales','Sales',20),('real-estate','land','Land',30),('real-estate','parking-storage','Parking & Storage',40),
  -- Tickets
  ('tickets-events','concerts','Concerts',10),('tickets-events','sports','Sports',20),('tickets-events','theater','Theater',30),('tickets-events','festivals','Festivals',40)
) AS sc(cat_slug, slug, label, sort_order) ON cat.slug = sc.cat_slug;

-- ============================================================================
-- 9. SEED DATA — Tag library
-- ============================================================================
INSERT INTO public.marketplace_tags (slug, label, tag_group, description, requires_verification, required_credential_type, sort_order) VALUES
  -- Trust (require verified credential)
  ('verified-identity','Verified Identity','trust','Government ID confirmed',true,'identity',10),
  ('licensed-bonded','Licensed / Bonded','trust','Trade license or professional certification on file',true,'license',20),
  ('insured','Insured','trust','Liability or professional insurance verified',true,'insurance',30),
  ('background-checked','Background Checked','trust','For services involving home access or security personnel',true,'background_check',40),
  ('top-rated','Top Rated','trust','4.5+ stars, 10+ completed transactions',false,NULL,50),
  ('established-seller','Established Seller','trust','6+ months on platform, 50+ sales',false,NULL,60),
  -- Logistics
  ('local-pickup','Local Pickup Only','logistics',NULL,false,NULL,10),
  ('local-delivery','Local Delivery','logistics',NULL,false,NULL,20),
  ('ships-nationwide','Ships Nationwide','logistics',NULL,false,NULL,30),
  ('digital-delivery','Digital Delivery','logistics',NULL,false,NULL,40),
  ('instant-booking','Instant Booking','logistics',NULL,false,NULL,50),
  ('quote-required','Quote Required','logistics',NULL,false,NULL,60),
  -- Condition
  ('new','New','condition',NULL,false,NULL,10),
  ('like-new','Like New / Open Box','condition',NULL,false,NULL,20),
  ('used-excellent','Used — Excellent','condition',NULL,false,NULL,30),
  ('used-good','Used — Good','condition',NULL,false,NULL,40),
  ('used-fair','Used — Fair','condition',NULL,false,NULL,50),
  ('for-parts','For Parts / Repair','condition',NULL,false,NULL,60),
  ('refurbished','Refurbished','condition',NULL,false,NULL,70),
  -- Quality
  ('organic','Organic','quality',NULL,false,NULL,10),
  ('farm-fresh','Farm Fresh','quality',NULL,false,NULL,20),
  ('raw-unpasteurized','Raw / Unpasteurized','quality','Triggers legal disclaimer',false,NULL,30),
  ('handmade','Handmade','quality',NULL,false,NULL,40),
  ('vintage','Vintage / Antique','quality','20+ years old',false,NULL,50),
  ('rare-limited','Rare / Limited','quality',NULL,false,NULL,60),
  -- Service
  ('emergency-same-day','Emergency / Same Day','service',NULL,false,NULL,10),
  ('weekend-after-hours','Weekend / After Hours','service',NULL,false,NULL,20),
  ('free-estimate','Free Estimate','service',NULL,false,NULL,30),
  ('warranty-included','Warranty Included','service',NULL,false,NULL,40),
  ('flat-rate','Flat Rate','service',NULL,false,NULL,50),
  ('hourly-rate','Hourly Rate','service',NULL,false,NULL,60),
  ('commercial-residential','Commercial / Residential','service',NULL,false,NULL,70),
  -- Travel
  ('flexible-cancellation','Flexible Cancellation','travel',NULL,false,NULL,10),
  ('non-refundable','Non-Refundable','travel',NULL,false,NULL,20),
  ('all-inclusive','All-Inclusive','travel',NULL,false,NULL,30),
  ('family-friendly','Family Friendly','travel',NULL,false,NULL,40),
  ('adults-only','Adults Only','travel',NULL,false,NULL,50),
  ('pet-friendly','Pet Friendly','travel',NULL,false,NULL,60),
  ('last-minute-deal','Last Minute Deal','travel',NULL,false,NULL,70),
  ('peak-off-peak','Peak Season / Off-Peak','travel',NULL,false,NULL,80),
  ('group-discount','Group Discount Available','travel',NULL,false,NULL,90);