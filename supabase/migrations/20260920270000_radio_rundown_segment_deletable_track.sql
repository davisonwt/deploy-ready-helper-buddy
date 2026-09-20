-- A sower's right to delete their own song must win over any radio
-- rundown it was ever added to, past or future. Today
-- radio_rundown_segments_track_product_id_fkey has no ON DELETE action
-- (implicit NO ACTION), so a member deleting their own product hits a raw
-- Postgres FK error surfaced verbatim in the delete toast, and the song
-- becomes permanently undeletable. Diagnosed first (2026-09-20): every
-- OTHER foreign key referencing products(id) is already CASCADE or SET
-- NULL -- this is the only blocker in the whole schema.
--
-- Order matters:
-- 1. Add the snapshot column and backfill it BEFORE anything can null
--    track_product_id out from under an existing segment.
-- 2. Relax the CHECK constraint's `song` branch. Changing only the FK to
--    ON DELETE SET NULL is NOT sufficient on its own: a song row's CHECK
--    currently requires track_product_id IS NOT NULL, so the SET NULL
--    Postgres performs internally would itself violate that CHECK and the
--    outer DELETE would still fail -- just with a different raw error.
--    audio_path must still be NULL for a song row; only the "must have a
--    product id" half of that branch is dropped.
-- 3. Only then change the FK itself to ON DELETE SET NULL.
--
-- No duration snapshot: duration_seconds already exists as its own
-- persisted, non-derived column and submit-radio-slot already recomputes
-- it fresh from the live product at submit time regardless -- nothing to
-- snapshot there. Playout (_shared/radioSlots.ts, radio-stream,
-- radio-now-playing) already gates on track_product_id truthiness before
-- ever dereferencing it, so a nulled segment already falls through to
-- autopilot with no code change needed there.

ALTER TABLE public.radio_rundown_segments
  ADD COLUMN IF NOT EXISTS track_title_snapshot text;

UPDATE public.radio_rundown_segments s
SET track_title_snapshot = p.title
FROM public.products p
WHERE s.track_product_id = p.id
  AND s.kind = 'song'
  AND s.track_title_snapshot IS NULL;

ALTER TABLE public.radio_rundown_segments
  DROP CONSTRAINT radio_rundown_segments_check;

ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_check
  CHECK (
    (kind = 'song' AND audio_path IS NULL)
    OR (kind <> 'song' AND track_product_id IS NULL AND audio_path IS NOT NULL)
  );

ALTER TABLE public.radio_rundown_segments
  DROP CONSTRAINT radio_rundown_segments_track_product_id_fkey;

ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_track_product_id_fkey
  FOREIGN KEY (track_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
