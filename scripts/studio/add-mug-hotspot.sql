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

-- Recategorizes his actual mug product so it shows up under the new Mugs
-- hotspot -- StallHotspotSheet's mugs branch filters strictly on
-- products.category = 'mugs' (src/components/stalls/StallHotspotSheet.tsx),
-- and the batch 2d audit found this row still on its old category
-- ('kitchenware'). Owner resolved the same way as every other script in
-- this directory (products.sower_id -> sowers.id OR products.company_id
-- -> companies.id, since an owner can have either or both) -- there is no
-- literal `products.owner` column. Matched by title rather than the id
-- captured during the audit (f5ba15aa-97ac-4f7d-af15-db24c37a0bc4) so this
-- still works if that changes; ILIKE 'coffee mugs%' is specific enough
-- that it won't catch anything else of his. Guarded on category already
-- being 'mugs' -- safe to re-run.
UPDATE public.products p
   SET category = 'mugs'
  FROM auth.users u
 WHERE u.email = 'davison.taljaard@icloud.com'
   AND p.title ILIKE 'coffee mugs%'
   AND (
     p.sower_id IN (SELECT id FROM public.sowers WHERE user_id = u.id)
     OR p.company_id IN (SELECT id FROM public.companies WHERE owner_user_id = u.id)
   )
   AND p.category IS DISTINCT FROM 'mugs';

-- --- Proof --------------------------------------------------------------------
SELECT
  s.user_id,
  u.email,
  s.hotspots
FROM public.stalls s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'davison.taljaard@icloud.com';

SELECT
  p.id,
  p.title,
  p.category
FROM public.products p
JOIN auth.users u ON true
WHERE u.email = 'davison.taljaard@icloud.com'
  AND p.title ILIKE 'coffee mugs%'
  AND (
    p.sower_id IN (SELECT id FROM public.sowers WHERE user_id = u.id)
    OR p.company_id IN (SELECT id FROM public.companies WHERE owner_user_id = u.id)
  );
