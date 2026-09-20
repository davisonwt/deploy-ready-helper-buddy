-- Fixes two published stalls that were displaying Davison's own personal
-- stall images to every visitor, plus the trigger that prevents this class
-- of bug going forward (20260920121500_stall_image_ownership_guard.sql,
-- applied separately).
--
-- If this needs to be undone, restore-davison-image-bug-20260920.sql
-- (same directory) has both rows' exact prior values, snapshotted before
-- this ran.
--
-- Root cause, diagnosed before any change (2026-09-20):
--
-- public/stalls/templates/farm-stall-front.png and farm-stall-interior.png
-- -- registered as the "books_writing" category's starter template in
-- templates.json (commit bd03be6e, 2026-09-10) -- are not generic at all.
-- They are Davison's own real, personally-branded stall photos ("DAVISON
-- -- Self Employed Lyricist and Writer -- Books & Music" baked directly
-- into the image pixels). That commit's own message says the images were
-- "already in this folder" and explicitly generated no new art -- the
-- mislabeling happened before that commit, in whatever untracked step
-- first produced these files using his profile as the example subject
-- (StallBuildPage.tsx's own "Stall name" placeholder, "e.g. Davison —
-- Lyricist and Writer", points at the same origin: his account was used
-- as the illustrative case throughout this feature's build, and that
-- example became the shipped default).
--
-- Two different mechanisms put his content on two different stalls:
--
-- 1. Sabbath Test Stall (de22c876-d477-4a5e-81a2-cd22091ce125, the
--    davisontest1 QA account) -- scripts/studio/seed-test-user-stall.mjs
--    explicitly copies Davison's real published stall's front_image_path/
--    interior_image_path (source.front_image_path/source.interior_image_path)
--    onto this row "so the pre-flight is realistic". Its front.webp is a
--    byte-for-byte copy of his (confirmed live: identical MD5, identical
--    339296-byte size), uploaded to its own storage path by that or a
--    predecessor script; its interior is the shared, Davison-branded
--    template. Pure test artifact -- deleted outright below. The script
--    itself is fixed in the same commit as this file so it can't
--    recreate this.
--
-- 2. Jamie Nicole; inspired breath (9892c99a-cae8-4057-917f-5f16fc455fd7,
--    a real member) -- reached the SAME template images through the
--    legitimate, user-facing "Or start from a template" button
--    (StallImageUpload.tsx's pickTemplate(), offered for her chosen
--    books_writing category). She never uploaded her own front/interior
--    or customized hotspots; both images and all 5 hotspots exactly match
--    templates.json's own farm-stall-1 entry. Her genuinely own content
--    -- name, categories, and story_pdf_path (a real uploaded PDF at her
--    own storage path) -- is untouched by this fix; only the borrowed
--    front/interior/hotspots/tiles are cleared and the stall unpublished,
--    which is exactly DashboardPage.tsx's own empty-plot condition
--    (`!stall.published || !stall.interior_image_path`) -- she lands back
--    on "your plot is ready" to build her own, not a broken half-stall.
--
-- Full-table sweep (2026-09-20): exactly these two rows plus Davison's
-- own (legitimately his own content, left alone) reference either
-- template path. No other published stall does, and no stall anywhere
-- references another specific member's own per-user storage path.
--
-- Residual, NOT fixed here (flagged for a separate decision): the
-- "Farm Stall" template button itself still points at these same two
-- images. Nothing stops the NEXT books_writing sower who taps it from
-- getting his likeness too -- the ownership trigger only blocks a stall
-- referencing another SPECIFIC USER's storage folder, and a shared
-- /stalls/templates/... path isn't that. Replacing the template art (or
-- disabling the button until it's reshot) is a content decision left to
-- Davison, not guessed at here.
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-fix reasoning as the other scripts/studio/
-- fix-*.sql files. NOT idempotent on the delete (a second run's DELETE is
-- a no-op, fine); the UPDATE is idempotent (sets exact final values).

DELETE FROM public.stalls WHERE user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125';

UPDATE public.stalls SET
  front_image_path = NULL,
  interior_image_path = NULL,
  hotspots = NULL,
  tiles = '[]'::jsonb,
  published = false
WHERE user_id = '9892c99a-cae8-4057-917f-5f16fc455fd7';

-- --- Proof --------------------------------------------------------------------
SELECT user_id, name, published, front_image_path, interior_image_path, hotspots
FROM public.stalls
WHERE user_id IN ('de22c876-d477-4a5e-81a2-cd22091ce125', '9892c99a-cae8-4057-917f-5f16fc455fd7');
-- Sabbath Test Stall's row should return zero rows above; Jamie Nicole's
-- should show published=false, front/interior/hotspots all null.
