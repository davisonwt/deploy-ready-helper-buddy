-- Re-sets stalls.hotspots for Ed (primitivevsns) and Amber (amberswheeles)
-- after both accounts got new interior photos (2026-09-12), uploaded to
-- the same storage path (<user_id>/interior.webp -- overwritten in place,
-- so stalls.interior_image_path itself did NOT change and needs no
-- update). The coordinates set by fix-ed-amber-hotspots.sql were measured
-- against the OLD interior images (896x1195, portrait) and no longer
-- match the new ones (1216x853, landscape -- source photos were
-- 1232x864, resized to width=1216 keeping aspect, no crop, per the
-- wizard's own non-destructive interior convention).
--
-- Same measurement method as before: candidate x/y/w/h rendered back onto
-- the ACTUAL new image as a rectangle overlay and checked against the
-- real button before finalizing -- not assumed from the old coordinates
-- or from DEFAULT_HOTSPOTS. Label -> kind mapping is unchanged from
-- fix-ed-amber-hotspots.sql (same accounts, same painted button order,
-- same "My Historic Telling" -> 'custom' caveat -- see that script for
-- the full explanation of why button 3 isn't a real content kind yet).
--
-- Ed's 4 circular buttons, left to right (measured y 75.5-93% of
-- 1216x853):
--   1 "my music"   -> kind 'music'
--   2 "my lyrics"  -> kind 'lyrics'
--   3 "my studies" -> kind 'books'
--   4 "my story"   -> kind 'story'
--
-- Amber's 4 rectangular buttons, left to right (measured y 84.5-94.5%
-- of 1216x853):
--   1 "My Music"            -> kind 'music'
--   2 "My Books:"           -> kind 'books'
--   3 "My Historic Telling" -> kind 'custom'
--   4 "My Story"            -> kind 'story'
--
-- StallInteriorView.tsx resolves a tapped hotspot by its own `kind`
-- (hotspots.find(h => h.kind === openKind)), never by array index or
-- template position -- confirmed again, unchanged since
-- fix-ed-amber-hotspots.sql; no code fix needed.
--
-- Run this by hand in Supabase Studio's SQL editor. Idempotent (a plain
-- UPDATE keyed on user_id; re-running it just re-sets the same value).

UPDATE public.stalls
SET hotspots = '[
  {"kind": "music",  "label": "my music",   "x": 18, "y": 75.5, "w": 17.5, "h": 17.5},
  {"kind": "lyrics", "label": "my lyrics",  "x": 36, "y": 75.5, "w": 17.5, "h": 17.5},
  {"kind": "books",  "label": "my studies", "x": 54, "y": 75.5, "w": 17.5, "h": 17.5},
  {"kind": "story",  "label": "my story",   "x": 72, "y": 75.5, "w": 17.5, "h": 17.5}
]'::jsonb
WHERE user_id = '110b5a23-ce07-45c8-a432-086550aa78b5';

UPDATE public.stalls
SET hotspots = '[
  {"kind": "music",  "label": "My Music",            "x": 22.8, "y": 84.5, "w": 12.7, "h": 10},
  {"kind": "books",  "label": "My Books:",           "x": 36.5, "y": 84.5, "w": 12.7, "h": 10},
  {"kind": "custom", "label": "My Historic Telling", "x": 50.2, "y": 84.5, "w": 12.7, "h": 10},
  {"kind": "story",  "label": "My Story",             "x": 64,  "y": 84.5, "w": 13,   "h": 10}
]'::jsonb
WHERE user_id = 'c34c0eba-0010-480b-8326-7063cd7221ae';

-- --- Proof --------------------------------------------------------------------
-- Label=kind pairs in left-to-right (x-ascending) order, per stall --
-- read this back and confirm it matches each new image's real button
-- order.
SELECT
  p.username,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS buttons_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id IN ('110b5a23-ce07-45c8-a432-086550aa78b5', 'c34c0eba-0010-480b-8326-7063cd7221ae')
GROUP BY p.username
ORDER BY p.username;
