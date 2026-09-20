-- Restore script for fix-davison-image-bug-20260920.sql -- run this FIRST
-- if that fix ever needs to be undone. Full path:
-- C:\Users\Ezra\Projects\deploy-ready-helper-buddy\scripts\studio\restore-davison-image-bug-20260920.sql
--
-- Snapshotted 2026-09-20, before (a) deleting the Sabbath Test Stall row
-- and (b) resetting Jamie Nicole's row to no-stall-yet. Each statement
-- restores the EXACT row that was live before the fix, named explicitly
-- by user_id/id, not a WHERE clause that could match differently later.
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-fix reasoning as the other scripts/studio/
-- restore-*.sql files.

-- 1. Sabbath Test Stall (de22c876-d477-4a5e-81a2-cd22091ce125) -- re-insert
--    the exact row that fix-davison-image-bug-20260920.sql deletes.
--    Its front.webp storage OBJECT is untouched by that fix (only this
--    table row is deleted) -- it is not re-uploaded here, only referenced.
INSERT INTO public.stalls (
  id, user_id, tier, category, name, tagline, front_image_path,
  interior_image_path, tiles, published, created_at, updated_at,
  hotspots, story, story_pdf_path, village, enter_via_front, categories,
  story_photo_path
) VALUES (
  'f457f593-c35f-4bb9-893b-8ecc7ec8fe59',
  'de22c876-d477-4a5e-81a2-cd22091ce125',
  'farm_stall',
  'music',
  'Sabbath Test Stall',
  NULL,
  'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/front.webp',
  '/stalls/templates/farm-stall-interior.png',
  '[]'::jsonb,
  true,
  '2026-09-13 08:49:50.904712+00',
  '2026-09-19 19:15:56.446994+00',
  '[
    {"h":21.2,"w":20,"x":6.2,"y":68.5,"id":"e0a6f9b3-8957-4050-bf0b-d9cb48b0af3b","kind":"books","label":"Books"},
    {"h":21.2,"w":20,"x":28.5,"y":68.5,"id":"310f4e6c-7aa1-4e8b-8e3b-900fa7512398","kind":"music","label":"Music"},
    {"h":21.2,"w":20.3,"x":50.8,"y":68.5,"id":"0e45c69b-dd9b-4f6f-a2c9-006aa61e179e","kind":"lyrics","label":"Lyrics"},
    {"h":21.2,"w":20.4,"x":73.4,"y":68.5,"id":"6a5ba03b-98d6-4a58-9ad0-37d9c460bf40","kind":"story","label":"My Story"},
    {"h":25,"w":22,"x":52,"y":70,"kind":"custom","label":"Family Albums"}
  ]'::jsonb,
  NULL,
  NULL,
  NULL,
  false,
  ARRAY['music','books_writing','faith_teaching']::text[],
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- 2. Jamie Nicole; inspired breath (9892c99a-cae8-4057-917f-5f16fc455fd7) --
--    put back exactly what fix-davison-image-bug-20260920.sql clears.
UPDATE public.stalls SET
  front_image_path = '/stalls/templates/farm-stall-front.png',
  interior_image_path = '/stalls/templates/farm-stall-interior.png',
  published = true,
  tiles = '[]'::jsonb,
  hotspots = '[
    {"h":20,"w":20.6,"x":5.9,"y":67,"id":"7b9c01e0-8c4e-49ee-8d65-809e1c3385b4","kind":"books","label":"Books"},
    {"h":20,"w":20.6,"x":28.4,"y":67,"id":"7f450dc1-949f-4952-a6e1-f15316998a1b","kind":"music","label":"Music"},
    {"h":20,"w":20.6,"x":50.8,"y":67,"id":"f53a1fbb-894e-4cde-af25-1ad310aacf3d","kind":"lyrics","label":"Lyrics"},
    {"h":20,"w":20.8,"x":73.4,"y":67,"id":"394f70d2-cfe2-4e7b-88f4-9372ebf85a15","kind":"story","label":"My Story"},
    {"h":10,"w":7.6,"x":7.8,"y":50.3,"id":"4bca9305-fb1f-4c0c-81ae-734b2455d9d5","kind":"mugs","label":"Mugs","caption":"Every one needs a coffee to read a good book"}
  ]'::jsonb
WHERE user_id = '9892c99a-cae8-4057-917f-5f16fc455fd7';

-- --- Proof --------------------------------------------------------------------
SELECT user_id, name, published, front_image_path, interior_image_path
FROM public.stalls
WHERE user_id IN ('de22c876-d477-4a5e-81a2-cd22091ce125', '9892c99a-cae8-4057-917f-5f16fc455fd7');
