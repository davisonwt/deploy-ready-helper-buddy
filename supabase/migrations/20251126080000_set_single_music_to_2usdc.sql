-- Set all single music tracks to 2 USDC
-- Albums (identified by having 'album' in tags or metadata) can have custom prices set by sowers
UPDATE s2g_library_items
SET price = 2.00
WHERE type = 'music'
  AND (
    -- Single tracks: no album tag or album-related metadata
    (tags IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE LOWER(tag) LIKE '%album%'))
    AND (metadata IS NULL OR metadata->>'is_album' IS NULL OR (metadata->>'is_album')::boolean = false)
  )
  AND (
    -- Only update if price is 0 or NULL (don't override custom prices)
    price IS NULL OR price = 0
  );

-- Also update dj_music_tracks if they have a price field (check if column exists first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dj_music_tracks' 
    AND column_name = 'price'
  ) THEN
    UPDATE dj_music_tracks
    SET price = 2.00
    WHERE track_type = 'music'
      AND (tags IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE LOWER(tag) LIKE '%album%'))
      AND (price IS NULL OR price = 0);
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN s2g_library_items.price IS 'Bestowal price in USDC. Single music tracks default to 2 USDC. Albums can have custom prices set by sowers.';

