
-- Remove the one duplicate dj music track row, plus any future per-(dj_id, lower(track_title)) duplicates,
-- keeping the earliest-uploaded copy.
DELETE FROM public.dj_music_tracks d
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY dj_id, lower(trim(track_title))
           ORDER BY upload_date NULLS LAST, created_at NULLS LAST, id
         ) AS rn
  FROM public.dj_music_tracks
) ranked
WHERE d.id = ranked.id
  AND ranked.rn > 1;
