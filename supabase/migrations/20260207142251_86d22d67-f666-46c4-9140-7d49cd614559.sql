-- Update all single music tracks in s2g_library_items to 2.00 USDC minimum
-- Only update singles (not albums), where price is less than 2.00
UPDATE public.s2g_library_items
SET price = 2.00, updated_at = now()
WHERE type = 'music'
  AND (price IS NULL OR price < 2.00)
  AND (tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ));

-- Update all single music tracks in dj_music_tracks to 2.00 USDC minimum
-- Only update singles (not albums), where price is less than 2.00
UPDATE public.dj_music_tracks
SET price = 2.00, updated_at = now()
WHERE (price IS NULL OR price < 2.00)
  AND (tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ));