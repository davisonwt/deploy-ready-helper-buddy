-- Wires the 5 painted wooden plaques on the "Karoo Honey" stall's interior
-- to real hotspot kinds. Found by searching stalls.name ILIKE
-- '%karoo honey%' -- that exact phrase matched NOTHING; the row's actual
-- `name` column is "KAROO BEE/BY" (tagline "Anything Bee"), not "Karoo
-- Honey". "Karoo Honey" is the shop's own hand-painted sign text inside
-- the interior image itself ("KAROO HONEY -- Remedies & Homemade
-- Products"), confirmed by downloading and viewing interior_image_path --
-- same stall, just a different string than what's in the `name` column.
-- Broadened the search (ILIKE '%karoo%' OR '%honey%' across name/tagline/
-- username) to find it rather than guess a different row.
--
-- Found via:
--   SELECT s.id, s.user_id, p.username, s.name, s.tagline, s.category,
--          s.front_image_path, s.interior_image_path, s.hotspots, s.published
--   FROM public.stalls s LEFT JOIN public.profiles p ON p.user_id = s.user_id
--   WHERE s.user_id = 'b6932c56-6892-4648-b171-bd181b6c13d1';
--
--   id:                   3c4917e5-e0a4-4170-b081-5193743e31c5
--   user_id:              b6932c56-6892-4648-b171-bd181b6c13d1
--   username:             wesselsangelique3
--   name:                 KAROO BEE/BY
--   tagline:              Anything Bee
--   category:             food_home
--   front_image_path:     .../stalls/b6932c56.../1789226041522.webp
--   interior_image_path:  .../stalls/b6932c56.../1789226725241.webp
--   hotspots:             NULL  (falls back to DEFAULT_HOTSPOTS today --
--                          4 evenly-spaced buttons keyed books/music/
--                          lyrics/story, none of which match this
--                          interior's real 5 painted plaques at all)
--   published:            true
--
-- Coordinates measured directly off the downloaded interior.webp
-- (1280x676 natural size), not assumed from a template or from
-- DEFAULT_HOTSPOTS -- same methodology as fix-ed-amber-hotspots.sql:
-- averaged pixel brightness over a horizontal band (y 590-645, inside the
-- plaques but below the carved letters, so individual glyphs don't break
-- up the signal) across every column found 5 clean, evenly-spaced spans
-- separated by dark gaps; a separate vertical scan on a plain-wood margin
-- column (x=35, x=650, left edge of two different plaques) found the row's
-- top/bottom edges. Confirmed by rendering a red-rectangle overlay at each
-- x/y/w/h back onto the actual image -- all 5 boxes land cleanly on their
-- own plaque with margin to spare, no clipping, no drift onto a neighbor.
--
-- Left to right, matching the interior's own painted order:
--   1 "Our Products"  -> kind 'products'
--   2 "Our Recipes"   -> kind 'books'    (recipes are sown as PDF book
--                                         products -- category <> 'lyrics'
--                                         products of type book/ebook,
--                                         same data source "My Books" uses
--                                         on every other stall)
--   3 "Our Services"  -> kind 'services'
--   4 "Our Story"     -> kind 'story'
--   5 "Bee Facts"     -> kind 'custom'
--
-- IMPORTANT -- code change shipped alongside this script, not just data:
-- 'products' and 'services' are valid TileKind values (used elsewhere for
-- stall TILES, a different UI element with its own default-target
-- routing) but StallHotspotSheet.tsx (the sheet a painted HOTSPOT tap
-- actually opens) had no data-source branch for either one -- its type
-- filter ternary fell through to the generic else (['book','ebook']) for
-- any kind that wasn't 'music' or 'mugs', meaning a hotspot painted
-- 'products' or 'services' before this would have silently shown BOOKS
-- instead, not an error, not an empty state -- just the wrong content.
-- Confirmed live: products.type's own CHECK constraint already allows
-- 'product' and 'service' values (products_type_check), so this needed no
-- migration -- just two new branches in StallHotspotSheet.tsx (type
-- filter, SHEET_KIND_TO_SEED_KIND, KIND_LABEL, EMPTY_TEXT, ADD_ONE_PATH),
-- purely additive, no existing kind's behavior changed. Without that
-- code fix this SQL alone would NOT have actually wired 2 of the 5
-- buttons correctly.
--
-- 'custom' (Bee Facts) still has the SAME pre-existing gap already
-- documented in fix-ed-amber-hotspots.sql: StallHotspotSheet has no
-- KIND_LABEL/EMPTY_TEXT entry for 'custom', so tapping it opens a sheet
-- titled literally "custom", falling through to the generic
-- ['book','ebook'] type filter (shows Karoo's books/recipes, or the empty
-- state if none exist) rather than dedicated "Bee Facts" content. There is
-- no bee-facts/informational content type in this schema today. Not fixed
-- here -- same reasoning as the prior script: it needs either a genuine
-- static-content kind, or the owner repainting/relabelling that button;
-- flagged as a follow-up, not blocking this fix (every OTHER button now
-- opens exactly the right content, which is the actual complaint this
-- closes).
--
-- StallInteriorView.tsx resolves a tapped hotspot by its own `kind`
-- (activeHotspot = hotspots.find(h => h.kind === openKind)) -- never by
-- array index or template position, so this is a pure data fix for 4 of
-- the 5 buttons (plus the StallHotspotSheet.tsx code fix above for
-- 'products'/'services' specifically).
--
-- Run this by hand in Supabase Studio's SQL editor. Idempotent (a plain
-- UPDATE keyed on user_id; re-running it just re-sets the same value).

UPDATE public.stalls
SET hotspots = '[
  {"kind": "products", "label": "Our Products", "x": 2.0,  "y": 86.0, "w": 17.7, "h": 11.0},
  {"kind": "books",    "label": "Our Recipes",  "x": 21.6, "y": 86.0, "w": 17.7, "h": 11.0},
  {"kind": "services", "label": "Our Services", "x": 41.3, "y": 86.0, "w": 17.5, "h": 11.0},
  {"kind": "story",    "label": "Our Story",    "x": 60.9, "y": 86.0, "w": 17.6, "h": 11.0},
  {"kind": "custom",   "label": "Bee Facts",    "x": 80.5, "y": 86.0, "w": 17.7, "h": 11.0}
]'::jsonb
WHERE user_id = 'b6932c56-6892-4648-b171-bd181b6c13d1';

-- --- Proof --------------------------------------------------------------------
-- Label=kind pairs in left-to-right (x-ascending) order -- read this back
-- and confirm it matches the interior image's real button order.
SELECT
  p.username,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS buttons_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id = 'b6932c56-6892-4648-b171-bd181b6c13d1'
GROUP BY p.username;
