-- Add a field to store the intended number of pockets for full_value orchards
ALTER TABLE public.orchards ADD COLUMN intended_pockets integer DEFAULT 1;

-- Create a trigger function to set total_pockets based on orchard data
CREATE OR REPLACE FUNCTION public.calculate_orchard_pockets()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total_pockets based on orchard_type
  IF NEW.orchard_type = 'full_value' THEN
    -- For full_value orchards, use intended_pockets
    NEW.total_pockets = COALESCE(NEW.intended_pockets, 1);
  ELSE
    -- For standard orchards, calculate based on seed_value and pocket_price
    IF NEW.pocket_price > 0 THEN
      NEW.total_pockets = GREATEST(1, FLOOR((NEW.seed_value * 1.105) / NEW.pocket_price));
    ELSE
      NEW.total_pockets = 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total_pockets on insert and update
DROP TRIGGER IF EXISTS calculate_pockets_trigger ON public.orchards;
CREATE TRIGGER calculate_pockets_trigger
  BEFORE INSERT OR UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_orchard_pockets();