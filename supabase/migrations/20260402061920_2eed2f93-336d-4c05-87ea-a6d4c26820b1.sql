
-- Stay Listings (properties)
CREATE TABLE public.stay_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sower_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'guesthouse',
  description TEXT,
  short_description TEXT,
  country TEXT NOT NULL DEFAULT 'South Africa',
  province TEXT,
  city TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  amenities TEXT[] DEFAULT '{}',
  activities TEXT[] DEFAULT '{}',
  farm_produce TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  cover_photo TEXT,
  pet_friendly BOOLEAN DEFAULT false,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '10:00',
  cancellation_policy TEXT DEFAULT 'flexible',
  house_rules TEXT,
  linked_orchard_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stay Units (rooms/cottages per property)
CREATE TABLE public.stay_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.stay_listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_type TEXT DEFAULT 'room',
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  beds_description TEXT,
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  weekend_price NUMERIC(10,2),
  photos TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seasonal pricing
CREATE TABLE public.stay_seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.stay_units(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night NUMERIC(10,2) NOT NULL,
  min_nights INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability calendar
CREATE TABLE public.stay_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.stay_units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_price NUMERIC(10,2),
  notes TEXT,
  UNIQUE(unit_id, date)
);

-- Bookings
CREATE TABLE public.stay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.stay_listings(id),
  unit_id UUID NOT NULL REFERENCES public.stay_units(id),
  guest_id UUID NOT NULL,
  sower_id UUID NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending',
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  sower_message TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE public.stay_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.stay_bookings(id),
  listing_id UUID NOT NULL REFERENCES public.stay_listings(id),
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  host_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wishlists
CREATE TABLE public.stay_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.stay_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS on all tables
ALTER TABLE public.stay_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- stay_listings: anyone can view approved, sowers manage their own
CREATE POLICY "Anyone can view approved listings" ON public.stay_listings FOR SELECT USING (status = 'approved' OR sower_id = auth.uid());
CREATE POLICY "Sowers can insert own listings" ON public.stay_listings FOR INSERT TO authenticated WITH CHECK (sower_id = auth.uid());
CREATE POLICY "Sowers can update own listings" ON public.stay_listings FOR UPDATE TO authenticated USING (sower_id = auth.uid());
CREATE POLICY "Sowers can delete own listings" ON public.stay_listings FOR DELETE TO authenticated USING (sower_id = auth.uid());

-- stay_units: viewable if listing is visible, sowers manage
CREATE POLICY "Anyone can view units of visible listings" ON public.stay_units FOR SELECT USING (EXISTS (SELECT 1 FROM public.stay_listings WHERE id = stay_units.listing_id AND (status = 'approved' OR sower_id = auth.uid())));
CREATE POLICY "Sowers can manage own units" ON public.stay_units FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stay_listings WHERE id = stay_units.listing_id AND sower_id = auth.uid()));
CREATE POLICY "Sowers can update own units" ON public.stay_units FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_listings WHERE id = stay_units.listing_id AND sower_id = auth.uid()));
CREATE POLICY "Sowers can delete own units" ON public.stay_units FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_listings WHERE id = stay_units.listing_id AND sower_id = auth.uid()));

-- stay_seasonal_pricing
CREATE POLICY "Anyone can view seasonal pricing" ON public.stay_seasonal_pricing FOR SELECT USING (true);
CREATE POLICY "Sowers manage own pricing" ON public.stay_seasonal_pricing FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_seasonal_pricing.unit_id AND l.sower_id = auth.uid()));
CREATE POLICY "Sowers update own pricing" ON public.stay_seasonal_pricing FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_seasonal_pricing.unit_id AND l.sower_id = auth.uid()));
CREATE POLICY "Sowers delete own pricing" ON public.stay_seasonal_pricing FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_seasonal_pricing.unit_id AND l.sower_id = auth.uid()));

-- stay_availability
CREATE POLICY "Anyone can view availability" ON public.stay_availability FOR SELECT USING (true);
CREATE POLICY "Sowers manage own availability" ON public.stay_availability FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_availability.unit_id AND l.sower_id = auth.uid()));
CREATE POLICY "Sowers update own availability" ON public.stay_availability FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_availability.unit_id AND l.sower_id = auth.uid()));
CREATE POLICY "Sowers delete own availability" ON public.stay_availability FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stay_units u JOIN public.stay_listings l ON l.id = u.listing_id WHERE u.id = stay_availability.unit_id AND l.sower_id = auth.uid()));

-- stay_bookings: guests see own, sowers see their property bookings
CREATE POLICY "Users can view own bookings" ON public.stay_bookings FOR SELECT TO authenticated USING (guest_id = auth.uid() OR sower_id = auth.uid());
CREATE POLICY "Guests can create bookings" ON public.stay_bookings FOR INSERT TO authenticated WITH CHECK (guest_id = auth.uid());
CREATE POLICY "Sowers can update booking status" ON public.stay_bookings FOR UPDATE TO authenticated USING (sower_id = auth.uid() OR guest_id = auth.uid());

-- stay_reviews
CREATE POLICY "Anyone can view reviews" ON public.stay_reviews FOR SELECT USING (true);
CREATE POLICY "Guests can create reviews" ON public.stay_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Reviewers can update own" ON public.stay_reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());

-- stay_wishlists
CREATE POLICY "Users manage own wishlists" ON public.stay_wishlists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add to wishlist" ON public.stay_wishlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove from wishlist" ON public.stay_wishlists FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create storage bucket for stay photos
INSERT INTO storage.buckets (id, name, public) VALUES ('stay-photos', 'stay-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view stay photos" ON storage.objects FOR SELECT USING (bucket_id = 'stay-photos');
CREATE POLICY "Authenticated users can upload stay photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stay-photos');
CREATE POLICY "Users can update own stay photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'stay-photos');
CREATE POLICY "Users can delete own stay photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'stay-photos');
