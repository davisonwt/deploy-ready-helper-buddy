-- Update ALL existing single music tracks to 2 USDC (minimum)
-- Albums (identified by 'album', 'lp', or 'ep' in tags) keep their original prices
-- This migration applies the new bestowal value rules from today
-- Note: 2 USDC already includes 10% tithing and 5% admin fees

-- Update s2g_library_items: Set ALL single music tracks to 2 USDC (regardless of current price)
UPDATE s2g_library_items
SET price = 2.00,
    updated_at = NOW()
WHERE type = 'music'
  AND (
    -- Single tracks: no album tag or album-related metadata
    (tags IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(tags) AS tag 
      WHERE LOWER(tag) LIKE '%album%' 
         OR LOWER(tag) LIKE '%lp%' 
         OR LOWER(tag) LIKE '%ep%'
    ))
    AND (metadata IS NULL OR metadata->>'is_album' IS NULL OR (metadata->>'is_album')::boolean = false)
  )
  AND (
    -- Update ALL single tracks regardless of current price (including 1.25, 0, NULL, etc.)
    -- Only skip if price is already >= 2.00 AND sower explicitly set it higher
    price IS NULL 
    OR price < 2.00
    OR price = 1.25  -- Explicitly update 1.25 to 2.00
  );

-- Update dj_music_tracks: Set ALL single music tracks to 2 USDC (regardless of current price)
UPDATE dj_music_tracks
SET price = 2.00,
    updated_at = NOW()
WHERE track_type = 'music'
  AND (
    -- Single tracks: no album tag
    tags IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(tags) AS tag 
      WHERE LOWER(tag) LIKE '%album%' 
         OR LOWER(tag) LIKE '%lp%' 
         OR LOWER(tag) LIKE '%ep%'
    )
  )
  AND (
    -- Update ALL single tracks regardless of current price (including 1.25, 0, NULL, etc.)
    price IS NULL 
    OR price < 2.00
    OR price = 1.25  -- Explicitly update 1.25 to 2.00
  );

-- Change default value for new music tracks from 1.25 to 2.00
ALTER TABLE dj_music_tracks 
ALTER COLUMN price SET DEFAULT 2.00;

-- Add constraint to enforce minimum 2 USDC for single music tracks (via trigger)
CREATE OR REPLACE FUNCTION enforce_minimum_music_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for single music tracks (not albums)
  IF NEW.track_type = 'music' THEN
    -- Check if it's an album
    IF NEW.tags IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(NEW.tags) AS tag 
      WHERE LOWER(tag) LIKE '%album%' 
         OR LOWER(tag) LIKE '%lp%' 
         OR LOWER(tag) LIKE '%ep%'
    ) THEN
      -- Single track: enforce minimum 2 USDC
      IF NEW.price IS NULL OR NEW.price < 2.00 THEN
        NEW.price := 2.00;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce minimum price
DROP TRIGGER IF EXISTS enforce_minimum_music_price_trigger ON dj_music_tracks;
CREATE TRIGGER enforce_minimum_music_price_trigger
  BEFORE INSERT OR UPDATE ON dj_music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_minimum_music_price();

-- Add comment explaining the pricing rules
COMMENT ON COLUMN s2g_library_items.price IS 'Bestowal price in USDC. Single music tracks require minimum 2 USDC (updated from 1.25 USDC as of 2025-11-26). Albums can have custom prices set by sowers.';
COMMENT ON COLUMN dj_music_tracks.price IS 'Bestowal price in USDC. Single music tracks require minimum 2 USDC (updated from 1.25 USDC as of 2025-11-26). Albums can have custom prices set by sowers.';

