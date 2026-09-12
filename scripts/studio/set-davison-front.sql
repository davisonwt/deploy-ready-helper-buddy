-- Davison's stalls row (user_id 04754d57-d41d-4ea7-93df-542047a6785b)
-- pointed front_image_path at a DIFFERENT folder than his own user_id --
-- stalls/a8872ed5-951c-4343-ba05-d4921af18eb2/1789072734556.webp -- a
-- leftover from however that row was first seeded, not the
-- <user_id>/front.webp convention Amber's and Ed's rows use (and that a
-- real wizard upload would produce for him too). Rather than keep
-- writing into that mismatched folder, the new square front photo was
-- uploaded to the standard path instead:
--   stalls/04754d57-d41d-4ea7-93df-542047a6785b/front.webp
-- (1024x1024, uploaded via `supabase storage cp --experimental`, this
-- session). This script just points the row at it.
--
-- Run this by hand in Supabase Studio's SQL editor. Idempotent (a plain
-- UPDATE keyed on user_id; re-running it just re-sets the same value).

UPDATE public.stalls
SET front_image_path = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/04754d57-d41d-4ea7-93df-542047a6785b/front.webp'
WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b';

-- --- Proof --------------------------------------------------------------------
SELECT user_id, name, front_image_path, interior_image_path, published
FROM public.stalls
WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b';
