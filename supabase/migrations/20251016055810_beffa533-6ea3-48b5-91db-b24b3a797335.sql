-- Delete duplicate tracks, keeping only the earliest upload of each song
-- Duplicates are identified by track_title and artist_name combination

WITH duplicates AS (
  SELECT 
    id,
    track_title,
    artist_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(track_title)), LOWER(TRIM(artist_name))
      ORDER BY created_at ASC
    ) as row_num
  FROM dj_music_tracks
)
DELETE FROM dj_music_tracks
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);