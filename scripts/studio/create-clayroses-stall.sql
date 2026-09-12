-- One more client Farm-Stall: ClayRoses. Same pattern as
-- create-cw-choice-stalls.sql.
--
-- user_id/username resolution (2026-09-12, profiles_public -- anon-
-- readable, confirms the given prefix):
--   infoclayroses -> b0e9cd73-56a1-48ef-b0f1-3b68ee09d8b1
--   (display_name on the profile is already "ClayRoses")
--
-- Images: source photos (E:\abbi\sow2grow\, "clayroses front" +
-- "clayroses interior 1" -- NOT "clayroses interior", a different file
-- that also exists in the same folder) were 1231-1232 x 864 -- resized to
-- width=1216 keeping aspect, no crop, converted to WebP (quality 90),
-- uploaded via `supabase storage cp --experimental` to the existing
-- public "stalls" bucket, then re-downloaded and re-measured to confirm:
--   b0e9cd73.../front.webp     1216x853
--   b0e9cd73.../interior.webp  1216x853
--
-- category: the prompt's own guess was art_craft ("clay-rose/craft
-- business"), but the actual interior photo is unambiguously a MUSIC
-- business, not a visual-arts/pottery one -- painted signage reads
-- "STUDIO HAKOL" / "CLAYROSES RECORDING" over a recording-booth door, and
-- its own 3 painted buttons are "our music" / "our lyrics" / "our story"
-- (no products/services/craft buttons at all, and no pottery/ceramics
-- imagery anywhere in the room -- shelves are books/scrolls, not clay
-- roses). Went with 'music' instead, overriding the prompt's guess on the
-- strength of the actual image rather than the business's craft-sounding
-- name -- same as set-ed-amber-hotspots-v2.sql already treats "kind" as
-- determined by what a button's own painted title says, not an assumed
-- category.
--
-- tier: 'trading_house', same reasoning as create-cw-choice-stalls.sql --
-- trg_stalls_default_tier has no "business account" concept, only
-- individual sower Tribal Tier / whisperer status, and leaves an
-- explicit non-default tier untouched.
--
-- hotspots: interior has its own painted button strip (not a blank
-- room), measured directly off the real uploaded 1216x853 image via a
-- column-brightness profile (bar's own top/bottom edge, and the two
-- bright rose-flourish dividers between the 3 plaques). Kind mapping:
-- all 3 titles are exact matches to existing TileKinds ('music',
-- 'lyrics', 'story') -- no products/services/custom needed here, unlike
-- CW Accounting/Choice Pharmacy where several buttons had no matching
-- in-app content kind.
--
-- ClayRoses, 3 buttons left to right (measured y 84.4-97.4% of
-- 1216x853):
--   1 "our music"  -> kind 'music'
--   2 "our lyrics" -> kind 'lyrics'
--   3 "our story"  -> kind 'story'
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-seed reasoning as
-- create-cw-choice-stalls.sql.
--
-- Idempotent: safe to re-run. ON CONFLICT (user_id) DO UPDATE touches
-- every column this script owns, hotspots included.

DO $clayroses_stall$
DECLARE
  v_clayroses_id uuid := 'b0e9cd73-56a1-48ef-b0f1-3b68ee09d8b1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_clayroses_id) THEN
    RAISE EXCEPTION 'infoclayroses user_id % not found in auth.users -- nothing changed.', v_clayroses_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, front_image_path, interior_image_path, hotspots, published)
  VALUES (
    v_clayroses_id,
    'trading_house',
    'music',
    'ClayRoses',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_clayroses_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_clayroses_id::text || '/interior.webp',
    '[
      {"kind": "music",  "label": "our music",  "x": 8.0,  "y": 84.4, "w": 25.8, "h": 13.0},
      {"kind": "lyrics", "label": "our lyrics",  "x": 37.2, "y": 84.4, "w": 25.3, "h": 13.0},
      {"kind": "story",  "label": "our story",   "x": 66.6, "y": 84.4, "w": 25.0, "h": 13.0}
    ]'::jsonb,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    front_image_path = EXCLUDED.front_image_path,
    interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots,
    published = EXCLUDED.published,
    updated_at = now();
END;
$clayroses_stall$;

-- --- Proof --------------------------------------------------------------------
SELECT
  p.username,
  s.name,
  s.tier,
  s.category,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS buttons_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id = 'b0e9cd73-56a1-48ef-b0f1-3b68ee09d8b1'
GROUP BY p.username, s.name, s.tier, s.category;
