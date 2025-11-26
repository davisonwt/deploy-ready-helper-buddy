-- Update all existing single music tracks to 2 USDC (minimum)
-- Albums (identified by 'album', 'lp', or 'ep' in tags) keep their original prices
-- This migration applies the new bestowal value rules from today

-- Update s2g_library_items: Set single music tracks to 2 USDC
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
    -- Update if price is less than 2.00 (including 1.25, 0, NULL, etc.)
    price IS NULL 
    OR price < 2.00
  );

-- Update dj_music_tracks: Set single music tracks to 2 USDC
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
    -- Update if price is less than 2.00 (including 1.25, 0, NULL, etc.)
    price IS NULL 
    OR price < 2.00
  );

-- Add comment explaining the pricing rules
COMMENT ON COLUMN s2g_library_items.price IS 'Bestowal price in USDC. Single music tracks require minimum 2 USDC (updated from 1.25 USDC as of 2025-11-26). Albums can have custom prices set by sowers.';
COMMENT ON COLUMN dj_music_tracks.price IS 'Bestowal price in USDC. Single music tracks require minimum 2 USDC (updated from 1.25 USDC as of 2025-11-26). Albums can have custom prices set by sowers.';

