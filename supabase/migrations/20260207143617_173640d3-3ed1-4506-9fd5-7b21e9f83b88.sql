-- Create trigger function to enforce minimum 2 USDC for single music in products table
CREATE OR REPLACE FUNCTION public.enforce_product_music_minimum_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply to music products
  IF NEW.type = 'music' THEN
    -- Check if this is a single track (not an album)
    -- Albums typically have 'album', 'vol', 'project' in title or category
    IF NOT (
      LOWER(COALESCE(NEW.title, '')) LIKE '%album%' OR
      LOWER(COALESCE(NEW.title, '')) LIKE '%vol%' OR
      LOWER(COALESCE(NEW.title, '')) LIKE '%project%' OR
      LOWER(COALESCE(NEW.category, '')) LIKE '%album%'
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS enforce_products_music_min_price ON public.products;

-- Create trigger for products table
CREATE TRIGGER enforce_products_music_min_price
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_product_music_minimum_price();

-- Update existing single music products to 2 USDC minimum
UPDATE public.products
SET price = 2.00, updated_at = now()
WHERE type = 'music'
  AND (price IS NULL OR price < 2.00)
  AND NOT (
    LOWER(COALESCE(title, '')) LIKE '%album%' OR
    LOWER(COALESCE(title, '')) LIKE '%vol%' OR
    LOWER(COALESCE(title, '')) LIKE '%project%' OR
    LOWER(COALESCE(category, '')) LIKE '%album%'
  );