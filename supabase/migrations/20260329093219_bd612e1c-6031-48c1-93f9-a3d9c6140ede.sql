
-- =============================================
-- GIG ECONOMY EXTENSIONS TO EXISTING TABLES
-- =============================================

-- 1. Extend community_drivers with gig fields
ALTER TABLE public.community_drivers
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_doc_url text,
  ADD COLUMN IF NOT EXISTS registration_doc_url text,
  ADD COLUMN IF NOT EXISTS background_check_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lng double precision,
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trips integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings_balance numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_max_km integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- 2. Extend service_providers with gig fields
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_jobs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings_balance numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- =============================================
-- NEW TABLES
-- =============================================

-- 3. Booking types enum
DO $$ BEGIN
  CREATE TYPE public.booking_type AS ENUM ('ride', 'delivery', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending', 'authorized', 'captured', 'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tracking_status AS ENUM (
    'en_route_to_pickup', 'picking_up', 'in_transit', 'dropping_off', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM (
    'payment', 'payout', 'refund', 'platform_fee', 'admin_fee', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Availability Calendar
CREATE TABLE IF NOT EXISTS public.availability_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('driver', 'provider')),
  available_date date NOT NULL,
  time_slots jsonb DEFAULT '[]'::jsonb,
  max_distance_km_remaining integer DEFAULT 200,
  estimated_hours_remaining numeric(4,1) DEFAULT 12,
  location_zone text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, available_date)
);

-- 5. Bookings table
CREATE TABLE IF NOT EXISTS public.gig_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type public.booking_type NOT NULL,
  status public.booking_status DEFAULT 'pending',
  customer_id uuid NOT NULL REFERENCES auth.users(id),
  provider_id uuid NOT NULL REFERENCES auth.users(id),
  provider_type text NOT NULL CHECK (provider_type IN ('driver', 'service_provider')),
  parent_booking_id uuid REFERENCES public.gig_bookings(id),
  
  -- Pickup
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_datetime timestamptz,
  
  -- Dropoff
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  dropoff_datetime timestamptz,
  
  -- Round trip
  is_round_trip boolean DEFAULT false,
  return_pickup_datetime timestamptz,
  return_dropoff_datetime timestamptz,
  
  -- Distance/duration estimates
  estimated_distance_km numeric(8,2),
  estimated_duration_min integer,
  estimated_fare numeric(10,2),
  
  -- Actuals
  actual_distance_km numeric(8,2),
  actual_duration_min integer,
  final_fare numeric(10,2),
  
  -- Service details (for tribal services)
  service_details jsonb DEFAULT '{}'::jsonb,
  
  -- Multi-day
  is_multi_day boolean DEFAULT false,
  booking_dates date[] DEFAULT '{}',
  
  -- Payment
  payment_status public.payment_status DEFAULT 'pending',
  stripe_payment_intent_id text,
  platform_fee_amount numeric(10,2) DEFAULT 0,
  admin_fee_amount numeric(10,2) DEFAULT 0,
  provider_earnings numeric(10,2) DEFAULT 0,
  
  -- Notes
  customer_notes text,
  provider_notes text,
  cancellation_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Live tracking
CREATE TABLE IF NOT EXISTS public.gig_live_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.gig_bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed numeric(6,2),
  heading numeric(5,2),
  accuracy numeric(6,2),
  status public.tracking_status NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- Index for fast tracking queries
CREATE INDEX IF NOT EXISTS idx_live_tracking_booking ON public.gig_live_tracking(booking_id, recorded_at DESC);

-- 7. Transactions / Bookkeeping
CREATE TABLE IF NOT EXISTS public.gig_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  booking_id uuid REFERENCES public.gig_bookings(id),
  transaction_type public.transaction_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  stripe_transaction_id text,
  status text DEFAULT 'pending',
  breakdown jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 8. Service Zones
CREATE TABLE IF NOT EXISTS public.service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary_geojson jsonb,
  active_drivers_count integer DEFAULT 0,
  base_fare_per_km numeric(6,2) DEFAULT 2.50,
  surge_multiplier numeric(3,2) DEFAULT 1.00,
  min_trip_minutes integer DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_availability_user_date ON public.availability_calendar(user_id, available_date);
CREATE INDEX IF NOT EXISTS idx_gig_bookings_customer ON public.gig_bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_gig_bookings_provider ON public.gig_bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_gig_bookings_dates ON public.gig_bookings(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_gig_transactions_user ON public.gig_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON public.community_drivers(current_lat, current_lng) WHERE is_online = true;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.availability_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_live_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;

-- Availability: users manage their own, anyone can read
CREATE POLICY "Users can manage own availability" ON public.availability_calendar
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view availability" ON public.availability_calendar
  FOR SELECT TO authenticated USING (true);

-- Bookings: customers and providers see their own
CREATE POLICY "Users see own bookings" ON public.gig_bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id);

CREATE POLICY "Customers create bookings" ON public.gig_bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Booking parties can update" ON public.gig_bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Live tracking: booking parties can view
CREATE POLICY "Booking parties see tracking" ON public.gig_live_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gig_bookings b 
      WHERE b.id = booking_id 
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Providers insert tracking" ON public.gig_live_tracking
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id);

-- Transactions: users see their own
CREATE POLICY "Users see own transactions" ON public.gig_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Zones: public read
CREATE POLICY "Anyone can view zones" ON public.service_zones
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_availability_calendar_updated_at
  BEFORE UPDATE ON public.availability_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gig_bookings_updated_at
  BEFORE UPDATE ON public.gig_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_zones_updated_at
  BEFORE UPDATE ON public.service_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BOOKING FEE CALCULATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_booking_fees(
  total_fare numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  platform_fee numeric;
  admin_fee numeric;
  provider_share numeric;
BEGIN
  platform_fee := ROUND(total_fare * 0.10, 2);
  admin_fee := ROUND(total_fare * 0.05, 2);
  provider_share := total_fare - platform_fee - admin_fee;
  
  RETURN jsonb_build_object(
    'subtotal', total_fare,
    'platform_fee_10pct', platform_fee,
    'admin_fee_5pct', admin_fee,
    'provider_earnings', provider_share,
    'total_fees', platform_fee + admin_fee
  );
END;
$$;

-- =============================================
-- AVAILABILITY CHECK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.check_provider_availability(
  p_provider_id uuid,
  p_date date,
  p_duration_min integer DEFAULT 60,
  p_distance_km numeric DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_record availability_calendar%ROWTYPE;
  existing_hours numeric;
  existing_distance numeric;
BEGIN
  SELECT * INTO cal_record
  FROM availability_calendar
  WHERE user_id = p_provider_id AND available_date = p_date;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Provider has not set availability for this date'
    );
  END IF;
  
  IF NOT cal_record.is_available THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Provider is not available on this date'
    );
  END IF;
  
  -- Check remaining hours
  SELECT COALESCE(SUM(estimated_duration_min), 0) / 60.0 INTO existing_hours
  FROM gig_bookings
  WHERE provider_id = p_provider_id
    AND pickup_datetime::date = p_date
    AND status NOT IN ('cancelled');
  
  -- Check remaining distance
  SELECT COALESCE(SUM(estimated_distance_km), 0) INTO existing_distance
  FROM gig_bookings
  WHERE provider_id = p_provider_id
    AND pickup_datetime::date = p_date
    AND status NOT IN ('cancelled');
  
  IF (cal_record.estimated_hours_remaining - existing_hours) < (p_duration_min / 60.0) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Not enough hours remaining',
      'hours_remaining', cal_record.estimated_hours_remaining - existing_hours
    );
  END IF;
  
  IF (cal_record.max_distance_km_remaining - existing_distance) < p_distance_km THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Not enough distance capacity remaining',
      'km_remaining', cal_record.max_distance_km_remaining - existing_distance
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', true,
    'hours_remaining', cal_record.estimated_hours_remaining - existing_hours,
    'km_remaining', cal_record.max_distance_km_remaining - existing_distance,
    'time_slots', cal_record.time_slots
  );
END;
$$;
