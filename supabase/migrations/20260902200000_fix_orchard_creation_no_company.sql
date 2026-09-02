-- Lovable-flagged bug: orchard creation fails for any member who isn't a
-- seller yet ("null value in column company_id of relation orchards
-- violates not-null constraint"). orchards_default_company_id() only ever
-- LOOKED UP an existing default company (from a companies row created by
-- 20260829183000's backfill, which only ran for existing sowers) -- a
-- plain member who's never sown a product has no companies row at all, so
-- new.company_id stayed null and the NOT NULL constraint rejected the
-- insert. Reproduced live as the disposable Thabo seed account (confirmed
-- no companies/sowers row): "null value in column company_id... violates
-- not-null constraint", exactly this error.
--
-- Fix: create a default company on the fly, same shape and slug formula
-- as the existing backfill (20260829183000), rather than leaving
-- company_id unresolved. ON CONFLICT guards the (unlikely but real) race
-- of two orchard inserts for the same brand-new user in the same instant
-- both finding no default company and both trying to create one.
CREATE OR REPLACE FUNCTION public.orchards_default_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_slug text;
BEGIN
  IF new.company_id IS NULL THEN
    SELECT c.id INTO new.company_id
    FROM public.companies c
    WHERE c.owner_user_id = new.user_id AND c.is_default = true;
  END IF;

  IF new.company_id IS NULL THEN
    SELECT p.display_name INTO v_display_name FROM public.profiles p WHERE p.user_id = new.user_id;
    v_slug := trim(both '-' from lower(regexp_replace(
      coalesce(nullif(trim(v_display_name), ''), 'books'), '[^a-zA-Z0-9]+', '-', 'g'
    ))) || '-' || substr(new.user_id::text, 1, 6);

    INSERT INTO public.companies (owner_user_id, name, slug, is_default, books_enabled)
    VALUES (new.user_id, coalesce(nullif(trim(v_display_name), ''), 'My Business'), v_slug, true, false)
    ON CONFLICT (owner_user_id) WHERE is_default = true DO NOTHING
    RETURNING id INTO new.company_id;

    IF new.company_id IS NULL THEN
      SELECT c.id INTO new.company_id
      FROM public.companies c
      WHERE c.owner_user_id = new.user_id AND c.is_default = true;
    END IF;
  END IF;

  RETURN new;
END;
$function$;
