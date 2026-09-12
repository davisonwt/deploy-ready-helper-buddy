-- Fixes stalls.hotspots for Ed (primitivevsns) and Amber (amberswheeles).
-- Both rows currently have hotspots = NULL, so resolveStallHotspots()
-- (src/lib/stalls/stallTypes.ts) falls back to DEFAULT_HOTSPOTS -- a
-- generic left-to-right order of books/music/lyrics/story. Neither
-- interior photo's PAINTED button order matches that generic order, so
-- tapping the visually-leftmost button (which reads "my music" /
-- "My Music" on both images) was opening whatever DEFAULT_HOTSPOTS put
-- first (books), not music. This sets a real per-stall override so each
-- button opens the content its own label promises.
--
-- Coordinates were measured directly off the CURRENT interior.webp for
-- each account (both 896x1195), not copied from a template or from
-- DEFAULT_HOTSPOTS -- confirmed by rendering a red-rectangle overlay at
-- each candidate x/y/w/h back onto the actual image and checking it
-- lands on the real painted button, not assumed from the generic
-- 4-evenly-spaced-columns layout. x/y/w/h are percentages of the image's
-- own natural width/height, same convention as
-- public/stalls/templates/templates.json's own hotspots arrays.
--
-- Ed's 4 circular buttons, left to right (measured y 74.5-92.5%):
--   1 "my music"   -> kind 'music'
--   2 "my lyrics"  -> kind 'lyrics'
--   3 "my studies" -> kind 'books'   (closest existing content kind -- a
--                                     books-type product with category
--                                     'lyrics' would show under button 2
--                                     instead, so this can't collide)
--   4 "my story"   -> kind 'story'
--
-- Amber's 4 rectangular buttons, left to right (measured y 80-94%):
--   1 "My Music"           -> kind 'music'
--   2 "My Books:"          -> kind 'books'
--   3 "My Historic Telling"-> kind 'custom'  -- see note below
--   4 "My Story"           -> kind 'story'
--
-- Note on button 3 ("My Historic Telling"): the label doesn't match any
-- of StallHotspotSheet's five implemented kinds (books/music/lyrics/
-- story/mugs), and 'story' is already correctly claimed by button 4 --
-- using it twice would just move the collision instead of fixing it.
-- 'custom' is a valid StallHotspot kind (TileKind includes it,
-- src/lib/stalls/stallTypes.ts) but StallHotspotSheet.tsx has no
-- KIND_LABEL/EMPTY_TEXT entry for it today -- tapping this button will
-- open a sheet titled literally "custom" showing Amber's book-type
-- products (falls through to the default type filter, currently none,
-- so it'll show the empty state) rather than dedicated "Historic
-- Telling" content. That's a real gap, not a bug this script can close
-- -- it needs either a genuine content type for spoken/written history
-- pieces, or Amber relabelling/repainting that button. Flagged for a
-- follow-up; not blocking this fix (the button no longer silently opens
-- the wrong content, which was the actual complaint).
--
-- StallInteriorView.tsx already resolves a tapped hotspot by its OWN
-- `kind` (activeHotspot = hotspots.find(h => h.kind === openKind), each
-- button keyed and positioned by h.kind/h.x/h.y/h.w/h.h) -- never by
-- array index or template position. No code fix was needed there; this
-- is a pure data fix.
--
-- Run this by hand in Supabase Studio's SQL editor. Idempotent (a plain
-- UPDATE keyed on user_id; re-running it just re-sets the same value).

UPDATE public.stalls
SET hotspots = '[
  {"kind": "music",  "label": "my music",   "x": 4,  "y": 74.5, "w": 22, "h": 18},
  {"kind": "lyrics", "label": "my lyrics",  "x": 27, "y": 74.5, "w": 22, "h": 18},
  {"kind": "books",  "label": "my studies", "x": 50, "y": 74.5, "w": 22, "h": 18},
  {"kind": "story",  "label": "my story",   "x": 73, "y": 74.5, "w": 22, "h": 18}
]'::jsonb
WHERE user_id = '110b5a23-ce07-45c8-a432-086550aa78b5';

UPDATE public.stalls
SET hotspots = '[
  {"kind": "music",  "label": "My Music",            "x": 5,  "y": 80, "w": 21, "h": 14},
  {"kind": "books",  "label": "My Books:",           "x": 29, "y": 80, "w": 21, "h": 14},
  {"kind": "custom", "label": "My Historic Telling", "x": 52, "y": 80, "w": 21, "h": 14},
  {"kind": "story",  "label": "My Story",            "x": 76, "y": 80, "w": 20, "h": 14}
]'::jsonb
WHERE user_id = 'c34c0eba-0010-480b-8326-7063cd7221ae';

-- --- Proof --------------------------------------------------------------------
-- Label=kind pairs in left-to-right (x-ascending) order, per stall --
-- read this back and confirm it matches each image's real button order.
SELECT
  p.username,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS buttons_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id IN ('110b5a23-ce07-45c8-a432-086550aa78b5', 'c34c0eba-0010-480b-8326-7063cd7221ae')
GROUP BY p.username
ORDER BY p.username;
