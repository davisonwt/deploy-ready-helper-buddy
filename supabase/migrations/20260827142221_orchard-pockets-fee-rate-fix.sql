-- Fix calculate_orchard_pockets(): the standard-orchard pocket-count estimate
-- used seed_value * 1.105 (a stale 10% tithing + 0.5% admin split from an
-- older fee structure). The platform's fee rate everywhere else is a single
-- flat 15% (see src/lib/pricing/platformFee.ts / supabase/functions/_shared/
-- platformFee.ts). This brings the trigger in line with that, and with the
-- matching fix to CreateOrchardPage.jsx / SeedSubmissionPage.jsx, both of
-- which compute pocket_price itself using the same 15% rate via the shared
-- platformFee module.
--
-- No data migration: public.orchards has 0 rows and public.bestowals has 0
-- rows with orchard_id set, confirmed immediately before this migration was
-- written. This only changes total_pockets computed for orchards created
-- from this point forward.
--
-- The full_value branch does not use this factor at all and is unchanged.

CREATE OR REPLACE FUNCTION public.calculate_orchard_pockets()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.orchard_type = 'full_value' THEN
    NEW.total_pockets = COALESCE(NEW.intended_pockets, 1);
  ELSE
    IF NEW.pocket_price > 0 THEN
      NEW.total_pockets = GREATEST(1, FLOOR((NEW.seed_value * 1.15) / NEW.pocket_price));
    ELSE
      NEW.total_pockets = 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
