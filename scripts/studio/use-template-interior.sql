-- Farm-Stalls batch 2f (revised): points davison.taljaard@icloud.com's
-- stall at the shared template #1 interior image instead of his own
-- storage-uploaded copy of the (same) art, and clears his per-stall
-- hotspots override so resolveStallHotspots() (src/lib/stalls/
-- stallTypes.ts) falls through to matching the template by
-- interior_image_path and picks up template #1's own hotspots array in
-- public/stalls/templates/templates.json.
--
-- Why: public/stalls/templates/farm-stall-interior.png IS his uploaded
-- image now (batch 2f revised, task 1 copied it there verbatim), so
-- there's no longer a reason for his stall to keep its own storage copy
-- and its own hotspots snapshot -- pointing at the template means any
-- future hotspot remeasurement on the template (e.g. if the art is
-- swapped again) applies to his stall automatically, instead of needing
-- another one-off UPDATE like this one every time.
--
-- Safe to re-run: matches on email, sets both columns to their target
-- value regardless of current state.
--
-- Run by hand: `supabase db query --linked -f scripts/studio/use-template-interior.sql`
-- or paste into Supabase Studio's SQL editor. Nothing here runs
-- automatically.

UPDATE public.stalls s
   SET interior_image_path = '/stalls/templates/farm-stall-interior.png',
       hotspots = NULL
  FROM auth.users u
 WHERE u.id = s.user_id
   AND u.email = 'davison.taljaard@icloud.com';

-- --- Proof --------------------------------------------------------------------
SELECT
  s.user_id,
  u.email,
  s.interior_image_path,
  s.hotspots
FROM public.stalls s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'davison.taljaard@icloud.com';
