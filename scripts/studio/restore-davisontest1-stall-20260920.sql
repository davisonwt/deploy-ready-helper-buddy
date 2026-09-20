-- Restore script for davisontest1's stall row (user_id
-- de22c876-d477-4a5e-81a2-cd22091ce125, "Sabbath Test Stall"), snapshotted
-- 2026-09-20 immediately before reproducing the interior-republish
-- hotspot-wipe bug live against this same account. Named row, not a
-- WHERE clause that could match differently later.
--
-- Run this if the reproduction step (or anything after it in this same
-- task) leaves this row's interior_image_path, hotspots, or categories
-- different from the snapshot below.

UPDATE public.stalls
SET
  interior_image_path = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/interior.webp?v=1789885046984',
  front_image_path = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/front.webp?v=1789885046984',
  hotspots = '[
    {"h":20,"w":20.6,"x":5.9,"y":67,"kind":"books","label":"Books"},
    {"h":20,"w":20.6,"x":28.4,"y":67,"kind":"music","label":"Music"},
    {"h":20,"w":20.6,"x":50.8,"y":67,"kind":"lyrics","label":"Lyrics"},
    {"h":20,"w":20.8,"x":73.4,"y":67,"kind":"story","label":"My Story"}
  ]'::jsonb,
  categories = ARRAY['music','books_writing'],
  name = 'Sabbath Test Stall',
  tagline = NULL
WHERE user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125'::uuid;
