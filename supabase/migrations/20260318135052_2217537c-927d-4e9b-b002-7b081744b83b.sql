
-- Garden Profiles: stores user's garden setup (soil pH, location, hemisphere)
CREATE TABLE public.garden_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  soil_ph numeric,
  hardiness_zone text,
  latitude numeric DEFAULT -26.2,
  longitude numeric DEFAULT 28.0,
  hemisphere text DEFAULT 'southern',
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.garden_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own garden profile"
  ON public.garden_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own garden profile"
  ON public.garden_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own garden profile"
  ON public.garden_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- User Crops: tracks which crops a user is growing
CREATE TABLE public.user_crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crop_key text NOT NULL,
  planted_date text,
  status text DEFAULT 'growing',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crops"
  ON public.user_crops FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own crops"
  ON public.user_crops FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own crops"
  ON public.user_crops FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own crops"
  ON public.user_crops FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Garden Activity Log: tracks daily garden activities
CREATE TABLE public.garden_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  crop_key text,
  notes text,
  photo_url text,
  moon_phase text,
  moon_element text,
  yhwh_year integer,
  yhwh_month integer,
  yhwh_day integer,
  gregorian_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.garden_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own garden activities"
  ON public.garden_activities FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own garden activities"
  ON public.garden_activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own garden activities"
  ON public.garden_activities FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
