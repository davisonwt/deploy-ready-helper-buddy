CREATE TABLE public.seasonal_calendar_art (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key text NOT NULL,
  scriptural_month int NOT NULL CHECK (scriptural_month BETWEEN 1 AND 12),
  season_label text NOT NULL,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  prompt text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_key, scriptural_month)
);

GRANT SELECT ON public.seasonal_calendar_art TO anon, authenticated;
GRANT ALL ON public.seasonal_calendar_art TO service_role;

ALTER TABLE public.seasonal_calendar_art ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read seasonal calendar art"
  ON public.seasonal_calendar_art FOR SELECT
  USING (true);

CREATE TRIGGER seasonal_calendar_art_touch
  BEFORE UPDATE ON public.seasonal_calendar_art
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_seasonal_calendar_art_region ON public.seasonal_calendar_art(region_key);