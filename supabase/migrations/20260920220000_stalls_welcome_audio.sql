-- Welcome voice note: a stall owner's own short WAV/MP3 that plays once
-- per browser session when a VISITOR enters the interior. Same `stalls`
-- bucket, same owner-folder convention as front/interior images
-- (uid as the first path segment) -- and per the existing rule that any
-- unsure column counts as member-created content, this column gets the
-- SAME two-layer protection front_image_path/interior_image_path already
-- have: the CHECK constraint AND the BEFORE trigger, not just storage RLS.

ALTER TABLE public.stalls ADD COLUMN welcome_audio_path text;

-- Exact match to the live constraint's existing front/interior clauses
-- (confirmed via pg_get_constraintdef before writing this -- no
-- "/stalls/templates/%" exception actually exists in the live version,
-- whatever an older comment elsewhere says) plus one new clause in the
-- same shape for welcome_audio_path.
ALTER TABLE public.stalls DROP CONSTRAINT stalls_images_own_folder_only;
ALTER TABLE public.stalls ADD CONSTRAINT stalls_images_own_folder_only CHECK (
  (front_image_path IS NULL
   OR front_image_path LIKE 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%')
  AND
  (interior_image_path IS NULL
   OR interior_image_path LIKE 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%')
  AND
  (welcome_audio_path IS NULL
   OR welcome_audio_path LIKE 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%')
);

CREATE OR REPLACE FUNCTION public.enforce_stall_image_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_front_owner text;
  v_interior_owner text;
  v_audio_owner text;
BEGIN
  v_front_owner := substring(NEW.front_image_path FROM '/storage/v1/object/public/stalls/([0-9a-fA-F-]{36})/');
  IF v_front_owner IS NOT NULL AND v_front_owner <> NEW.user_id::text THEN
    RAISE EXCEPTION 'front_image_path references another user''s storage folder (%), not this stall''s own user_id (%)', v_front_owner, NEW.user_id;
  END IF;

  v_interior_owner := substring(NEW.interior_image_path FROM '/storage/v1/object/public/stalls/([0-9a-fA-F-]{36})/');
  IF v_interior_owner IS NOT NULL AND v_interior_owner <> NEW.user_id::text THEN
    RAISE EXCEPTION 'interior_image_path references another user''s storage folder (%), not this stall''s own user_id (%)', v_interior_owner, NEW.user_id;
  END IF;

  v_audio_owner := substring(NEW.welcome_audio_path FROM '/storage/v1/object/public/stalls/([0-9a-fA-F-]{36})/');
  IF v_audio_owner IS NOT NULL AND v_audio_owner <> NEW.user_id::text THEN
    RAISE EXCEPTION 'welcome_audio_path references another user''s storage folder (%), not this stall''s own user_id (%)', v_audio_owner, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stalls_enforce_image_ownership ON public.stalls;
CREATE TRIGGER trg_stalls_enforce_image_ownership
  BEFORE INSERT OR UPDATE OF front_image_path, interior_image_path, welcome_audio_path ON public.stalls
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stall_image_ownership();
