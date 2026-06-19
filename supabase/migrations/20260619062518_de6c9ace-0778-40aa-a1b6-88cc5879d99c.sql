
CREATE TABLE public.sacred_moon_phases (
  day_of_year INT PRIMARY KEY CHECK (day_of_year BETWEEN 1 AND 364),
  phase TEXT NOT NULL,
  illumination_pct INT NOT NULL CHECK (illumination_pct BETWEEN 0 AND 100),
  sample_gregorian_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sacred_moon_phases TO anon, authenticated;
GRANT ALL ON public.sacred_moon_phases TO service_role;
ALTER TABLE public.sacred_moon_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moon phases readable by all" ON public.sacred_moon_phases FOR SELECT USING (true);
CREATE POLICY "moon phases admin write" ON public.sacred_moon_phases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.sacred_day_scriptures (
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
  note TEXT,
  song TEXT,
  portal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (month, day)
);
GRANT SELECT ON public.sacred_day_scriptures TO anon, authenticated;
GRANT ALL ON public.sacred_day_scriptures TO service_role;
ALTER TABLE public.sacred_day_scriptures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scriptures readable by all" ON public.sacred_day_scriptures FOR SELECT USING (true);
CREATE POLICY "scriptures admin write" ON public.sacred_day_scriptures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_scriptures_updated_at BEFORE UPDATE ON public.sacred_day_scriptures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
