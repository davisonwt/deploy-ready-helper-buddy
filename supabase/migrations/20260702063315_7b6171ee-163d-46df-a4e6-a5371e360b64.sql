ALTER TABLE public.curated_calendar_photos
  ADD COLUMN IF NOT EXISTS scriptural_month int;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'curated_calendar_photos_season_slot_key'
      AND conrelid = 'public.curated_calendar_photos'::regclass
  ) THEN
    ALTER TABLE public.curated_calendar_photos
      DROP CONSTRAINT curated_calendar_photos_season_slot_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'curated_calendar_photos_scriptural_month_check'
      AND conrelid = 'public.curated_calendar_photos'::regclass
  ) THEN
    ALTER TABLE public.curated_calendar_photos
      ADD CONSTRAINT curated_calendar_photos_scriptural_month_check
      CHECK (scriptural_month IS NULL OR scriptural_month BETWEEN 1 AND 12);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS curated_calendar_photos_month_slot_key
  ON public.curated_calendar_photos (scriptural_month, slot)
  WHERE scriptural_month IS NOT NULL;