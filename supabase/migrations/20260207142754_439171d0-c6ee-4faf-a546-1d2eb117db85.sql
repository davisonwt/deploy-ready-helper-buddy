-- Create trigger function to enforce minimum 2 USDC for single music tracks
CREATE OR REPLACE FUNCTION public.enforce_single_music_minimum_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a single track (not an album)
  -- Albums have tags containing 'album', 'lp', or 'ep'
  IF NEW.tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(NEW.tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ) THEN
    -- Enforce minimum 2 USDC for singles
    IF NEW.price IS NULL OR NEW.price < 2.00 THEN
      NEW.price := 2.00;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS enforce_dj_music_tracks_min_price ON public.dj_music_tracks;
DROP TRIGGER IF EXISTS enforce_s2g_library_items_min_price ON public.s2g_library_items;

-- Create trigger for dj_music_tracks
CREATE TRIGGER enforce_dj_music_tracks_min_price
BEFORE INSERT OR UPDATE ON public.dj_music_tracks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_music_minimum_price();

-- Create trigger function for s2g_library_items (only for music type)
CREATE OR REPLACE FUNCTION public.enforce_library_music_minimum_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply to music items
  IF NEW.type = 'music' THEN
    -- Check if this is a single track (not an album)
    IF NEW.tags IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(NEW.tags) AS tag 
      WHERE LOWER(tag) LIKE '%album%' 
         OR LOWER(tag) LIKE '%lp%' 
         OR LOWER(tag) LIKE '%ep%'
    ) THEN
      -- Enforce minimum 2 USDC for singles
      IF NEW.price IS NULL OR NEW.price < 2.00 THEN
        NEW.price := 2.00;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for s2g_library_items
CREATE TRIGGER enforce_s2g_library_items_min_price
BEFORE INSERT OR UPDATE ON public.s2g_library_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_library_music_minimum_price();

-- Also ensure any existing tracks below 2 USDC are updated
UPDATE public.dj_music_tracks
SET price = 2.00, updated_at = now()
WHERE (price IS NULL OR price < 2.00)
  AND (tags IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS tag 
    WHERE LOWER(tag) LIKE '%album%' 
       OR LOWER(tag) LIKE '%lp%' 
       OR LOWER(tag) LIKE '%ep%'
  ));

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