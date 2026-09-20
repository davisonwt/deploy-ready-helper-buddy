-- Prevents the exact bug fixed in scripts/studio/fix-davison-image-bug-
-- 20260920.sql from recurring: a stall's front/interior image pointing at
-- a DIFFERENT specific member's own Supabase Storage folder (Sabbath Test
-- Stall's front.webp was a byte-for-byte copy of Davison's; Jamie
-- Nicole's stall never had its own image at all).
--
-- Scope, deliberately narrow: only rejects a `stalls` bucket storage URL
-- whose UUID folder segment doesn't match the row's own user_id. A shared
-- system asset (/stalls/templates/..., or any non-storage-URL path) is
-- left alone -- that's a legitimate, sanctioned mechanism (the "start
-- from a template" wizard button), not a cross-user reference, and this
-- guard has no opinion on whether that template's own artwork is
-- appropriate (a separate, content-level decision, not an ownership one).
-- Every real stall checked live (2026-09-20) -- five system stalls
-- included -- already stores its own image under its own user_id folder,
-- so this tightens nothing that was actually in use.

CREATE OR REPLACE FUNCTION public.enforce_stall_image_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_front_owner text;
  v_interior_owner text;
BEGIN
  v_front_owner := substring(NEW.front_image_path FROM '/storage/v1/object/public/stalls/([0-9a-fA-F-]{36})/');
  IF v_front_owner IS NOT NULL AND v_front_owner <> NEW.user_id::text THEN
    RAISE EXCEPTION 'front_image_path references another user''s storage folder (%), not this stall''s own user_id (%)', v_front_owner, NEW.user_id;
  END IF;

  v_interior_owner := substring(NEW.interior_image_path FROM '/storage/v1/object/public/stalls/([0-9a-fA-F-]{36})/');
  IF v_interior_owner IS NOT NULL AND v_interior_owner <> NEW.user_id::text THEN
    RAISE EXCEPTION 'interior_image_path references another user''s storage folder (%), not this stall''s own user_id (%)', v_interior_owner, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stalls_enforce_image_ownership ON public.stalls;
CREATE TRIGGER trg_stalls_enforce_image_ownership
  BEFORE INSERT OR UPDATE OF front_image_path, interior_image_path ON public.stalls
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stall_image_ownership();
