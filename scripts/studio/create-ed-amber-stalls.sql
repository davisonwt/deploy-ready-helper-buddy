-- Surprise Farm-Stalls for Ed (primitivevsns) and Amber (amberswheeles) --
-- built ahead of their own /stall/build visit so front/interior images
-- and stall metadata are already in place; publishing the surprise is
-- just `published = true`, already set here.
--
-- Images already uploaded (via `supabase storage cp --experimental`,
-- this session) to the existing public "stalls" bucket at:
--   <user_id>/front.webp     -- square, center-cropped, capped 1200px side
--   <user_id>/interior.webp  -- full aspect, capped 1920px wide
-- Same resize pipeline StallImageUpload.tsx / resizeImage.ts uses for a
-- real wizard upload (WebP, quality 0.85) -- just run outside the
-- browser since these two accounts didn't upload their own. Confirm both
-- objects exist for each user_id before trusting this script alone (the
-- proof SELECT at the bottom only proves the stalls row, not the storage
-- objects it points at).
--
-- category = 'music' for both -- not a guess between several options.
-- Public products.sower_id lookup (2026-09-11, sowers table + products
-- table are both anon-readable, unlike profiles):
--   Amber Wheeles (sowers.id 9ccd3c67-4ece-4457-a9b7-565bad7ccde1)
--     -- 3 products, all type='music', 0 sower_books, 0 dj tracks, 0 orchards.
--   Ed (sowers.id a5681aeb-c951-4ce3-8f75-b952aa87b254)
--     -- 12 products, all type='music', 0 sower_books, 0 dj tracks, 0 orchards.
-- Neither has a companies row (no business/store name to prefer over
-- their own display name for `name` below).
--
-- hotspots is left untouched (NULL on insert, never written on a
-- conflict-update) -- both interior images are personal photos, not a
-- known public/stalls/templates/templates.json template asset, so
-- resolveStallHotspots() (src/lib/stalls/stallTypes.ts) can't path-match
-- either to a template's own hotspots. NULL here means the generic
-- DEFAULT_HOTSPOTS four-button bottom strip (Books/Music/Lyrics/My
-- Story) renders, NOT "template #1"'s specific painted-button positions
-- -- there is nothing in a plain photo to match those against. Fine as a
-- starting point; either of them (or a gosat) can reposition later via a
-- future hotspot editor.
--
-- name: COALESCE'd at run time from profiles.display_name (more current
-- than what this script could see -- profiles isn't anon-readable, so it
-- couldn't be pre-fetched), falling back to the public sowers.display_name
-- already confirmed above if profiles.display_name is blank/null.
-- tagline: profiles.bio's first sentence (split on the first '.'),
-- trimmed, capped to the column's 160-char limit, re-adding the '.' only
-- if the bio actually had one. Empty/NULL bio resolves to a NULL tagline
-- (StallVisitPage renders that as no tagline, not a blank line) rather
-- than an empty string.
--
-- Run this by hand in Supabase Studio's SQL editor (or
-- `supabase db push` does NOT apply -- this isn't a migration; use the
-- SQL editor, or `psql`) -- matches scripts/studio/move-stall-to-davison.sql's
-- own reasoning: a one-off data fix/seed for two specific accounts, not
-- a schema change every environment needs.
--
-- Idempotent: safe to re-run. ON CONFLICT (user_id) DO UPDATE only
-- touches the columns this script owns (image paths, tier, category,
-- name, tagline, published) -- hotspots and tiles are never written on
-- a re-run, so a hand-edited override survives.

DO $ed_amber_stalls$
DECLARE
  v_amber_id uuid := 'c34c0eba-0010-480b-8326-7063cd7221ae';
  v_ed_id    uuid := '110b5a23-ce07-45c8-a432-086550aa78b5';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_amber_id) THEN
    RAISE EXCEPTION 'amberswheeles user_id % not found in auth.users -- nothing changed.', v_amber_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_ed_id) THEN
    RAISE EXCEPTION 'primitivevsns user_id % not found in auth.users -- nothing changed.', v_ed_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, published)
  SELECT
    v.user_id,
    'farm_stall',
    'music',
    LEFT(COALESCE(NULLIF(TRIM(p.display_name), ''), v.fallback_display_name) || '''s Stall', 80),
    NULLIF(
      LEFT(
        TRIM(SPLIT_PART(p.bio, '.', 1)) ||
        CASE WHEN POSITION('.' IN COALESCE(p.bio, '')) > 0 THEN '.' ELSE '' END,
        160
      ),
      ''
    ),
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v.user_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v.user_id::text || '/interior.webp',
    true
  FROM (
    VALUES
      (v_amber_id, 'Amber Wheeles'),
      (v_ed_id, 'Ed')
  ) AS v(user_id, fallback_display_name)
  LEFT JOIN public.profiles p ON p.user_id = v.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path,
    interior_image_path = EXCLUDED.interior_image_path,
    published = EXCLUDED.published,
    updated_at = now();
END;
$ed_amber_stalls$;

-- --- Proof --------------------------------------------------------------------
SELECT
  p.username,
  s.user_id,
  s.name,
  s.tagline,
  s.tier,
  s.category,
  s.front_image_path,
  s.interior_image_path,
  s.hotspots,
  s.published
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.user_id IN ('c34c0eba-0010-480b-8326-7063cd7221ae', '110b5a23-ce07-45c8-a432-086550aa78b5')
ORDER BY p.username;
