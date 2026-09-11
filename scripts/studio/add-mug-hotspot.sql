-- Farm-Stalls batch 2d, task 1: adds a 5th "mugs" hotspot to davison
-- .taljaard@icloud.com's existing stalls.hotspots array (the coffee mug on
-- the small round side table, bottom-left of the interior image, next to
-- the lit lantern).
--
-- His stall's hotspots were already set explicitly by
-- scripts/studio/move-stall-to-davison.sql (confirmed live: 4 entries --
-- books/music/lyrics/story, template #1's own positions). This appends
-- the 5th entry via jsonb `||` concat rather than overwriting the column,
-- so it can't clobber anything else that array might pick up in the
-- meantime. Guarded to be safe to re-run: if a "mugs" entry is already
-- present, the UPDATE's WHERE excludes the row and it's a no-op.
--
-- Coordinates are a VISUAL estimate against the 1280x853 template image
-- (public/stalls/templates/farm-stall-interior.png), not a pixel-cropped
-- measurement -- same x/y/w/h now also landed in
-- public/stalls/templates/templates.json so every stall built from
-- template #1 going forward gets this hotspot automatically via
-- resolveStallHotspots()'s template-match path (src/lib/stalls/
-- stallTypes.ts). This script only backfills davison's stall, which has
-- its own stalls.hotspots override and so won't pick up the template's
-- copy on its own (per resolveStallHotspots()'s priority order: a
-- per-stall override always wins over the template).
--
-- Run by hand: `supabase db query --linked -f scripts/studio/add-mug-hotspot.sql`
-- or paste into Supabase Studio's SQL editor. Nothing here runs
-- automatically.

UPDATE public.stalls s
   SET hotspots = s.hotspots || '[
         { "kind": "mugs", "label": "Mugs", "x": 11.5, "y": 51.0, "w": 6.5, "h": 8.0, "caption": "Every one needs a coffee to read a good book" }
       ]'::jsonb
  FROM auth.users u
 WHERE u.id = s.user_id
   AND u.email = 'davison.taljaard@icloud.com'
   AND NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(s.hotspots) h WHERE h->>'kind' = 'mugs'
   );

-- --- Proof --------------------------------------------------------------------
SELECT
  s.user_id,
  u.email,
  s.hotspots
FROM public.stalls s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'davison.taljaard@icloud.com';
