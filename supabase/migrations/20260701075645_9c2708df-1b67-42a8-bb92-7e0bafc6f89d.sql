
-- Curated calendar photos table
CREATE TABLE public.curated_calendar_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL CHECK (season IN ('autumn','summer','spring','winter')),
  slot int NOT NULL CHECK (slot BETWEEN 1 AND 3),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season, slot)
);

GRANT SELECT ON public.curated_calendar_photos TO anon;
GRANT SELECT ON public.curated_calendar_photos TO authenticated;
GRANT ALL ON public.curated_calendar_photos TO service_role;

ALTER TABLE public.curated_calendar_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curated calendar photos are publicly readable"
  ON public.curated_calendar_photos FOR SELECT
  USING (true);

-- Storage policy: allow anyone to read files from calendar-photos bucket
CREATE POLICY "Public read access to calendar-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'calendar-photos');

-- Seed 12 rows (season/slot combos). storage_path + public URL follow the fixed convention.
INSERT INTO public.curated_calendar_photos (season, slot, storage_path, public_url, label) VALUES
  ('autumn', 1, 'autumn/autumn-1.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/autumn/autumn-1.jpg', 'Autumn 1'),
  ('autumn', 2, 'autumn/autumn-2.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/autumn/autumn-2.jpg', 'Autumn 2'),
  ('autumn', 3, 'autumn/autumn-3.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/autumn/autumn-3.jpg', 'Autumn 3'),
  ('summer', 1, 'summer/summer-1.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/summer/summer-1.jpg', 'Summer 1'),
  ('summer', 2, 'summer/summer-2.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/summer/summer-2.jpg', 'Summer 2'),
  ('summer', 3, 'summer/summer-3.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/summer/summer-3.jpg', 'Summer 3'),
  ('spring', 1, 'spring/spring-1.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/spring/spring-1.jpg', 'Spring 1'),
  ('spring', 2, 'spring/spring-2.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/spring/spring-2.jpg', 'Spring 2'),
  ('spring', 3, 'spring/spring-3.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/spring/spring-3.jpg', 'Spring 3'),
  ('winter', 1, 'winter/winter-1.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/winter/winter-1.jpg', 'Winter 1'),
  ('winter', 2, 'winter/winter-2.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/winter/winter-2.jpg', 'Winter 2'),
  ('winter', 3, 'winter/winter-3.jpg', 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/calendar-photos/winter/winter-3.jpg', 'Winter 3');
