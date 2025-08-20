-- Remove overly restrictive constraint on total_pockets column
-- Allow users to edit their orchards when no bestowals have been made

-- First, let's check if there are any constraints on the total_pockets column
-- and remove/modify them to be more flexible

-- Drop any existing restrictive constraints on total_pockets
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop constraints that prevent updating total_pockets
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.orchards'::regclass
        AND conname LIKE '%total_pockets%'
    LOOP
        EXECUTE 'ALTER TABLE public.orchards DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Add a more reasonable constraint that only prevents changing total_pockets
-- when there are actual bestowals (filled_pockets > 0)
CREATE OR REPLACE FUNCTION public.validate_orchard_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all updates if no bestowals have been made yet
  IF OLD.filled_pockets = 0 THEN
    RETURN NEW;
  END IF;
  
  -- If bestowals exist, prevent reducing total_pockets below filled_pockets
  IF NEW.total_pockets < OLD.filled_pockets THEN
    RAISE EXCEPTION 'Cannot reduce total_pockets below the number of filled_pockets (%)' , OLD.filled_pockets;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_orchard_updates_trigger ON public.orchards;

-- Create new trigger that's more flexible
CREATE TRIGGER validate_orchard_updates_trigger
  BEFORE UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_orchard_updates();

-- Also ensure the orchard stats update trigger handles the case properly
CREATE OR REPLACE FUNCTION public.update_orchard_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update if this is a bestowal-related change
  IF TG_TABLE_NAME = 'bestowals' THEN
    -- Update filled_pockets and supporters count
    UPDATE public.orchards
    SET 
      filled_pockets = (
        SELECT COALESCE(SUM(pockets_count), 0)
        FROM public.bestowals
        WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
      ),
      supporters = (
        SELECT COUNT(DISTINCT bestower_id)
        FROM public.bestowals
        WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
      )
    WHERE id = NEW.orchard_id;
  END IF;
  
  RETURN NEW;
END;
$function$;