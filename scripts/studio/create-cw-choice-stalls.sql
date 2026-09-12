-- Two client Farm-Stalls: CW Accounting (coenie) and Choice Pharmacy
-- (grootbrak). Same pattern as create-ed-amber-stalls.sql -- built ahead
-- of a /stall/build visit, images already uploaded outside the browser,
-- published = true.
--
-- user_id resolution (2026-09-12, profiles_public -- anon-readable,
-- confirms both given prefixes):
--   coenie    -> 58249abb-829a-406c-a78b-a831ca528cd1
--   grootbrak -> 8d183fc5-2e38-487f-afd5-f97c59a42476
--
-- Images: source photos (E:\abbi\sow2grow\) were 1229-1232 x 864 --
-- resized to width=1216 keeping aspect, no crop (same convention as the
-- Ed/Amber interior re-shoot), converted to WebP (quality 90), uploaded
-- via `supabase storage cp --experimental` to the existing public
-- "stalls" bucket, then re-downloaded and re-measured to confirm:
--   58249abb.../front.webp     1216x855
--   58249abb.../interior.webp  1216x853
--   8d183fc5.../front.webp     1216x853
--   8d183fc5.../interior.webp  1216x853
--
-- tier: trg_stalls_default_tier (20260910220000_farm_stalls.sql) only
-- knows two things -- public.whisperers membership, or public.sowers.tier
-- (an individual creative sower's Tribal Tier: homestead/grove/orchard/
-- estate/harvest_works). It has no concept of "business account" at all,
-- and its own guard (`IF NEW.tier IS NOT NULL AND NEW.tier <> 'farm_stall'
-- THEN RETURN NEW`) leaves an explicit non-default tier untouched -- so
-- setting one here is what actually sticks, not a trigger override. Chose
-- 'trading_house' (STALL_TIER_LABEL: "Trading House") for both: the only
-- tier name on the ladder that reads as an established place of commerce
-- rather than a personal creative stall, which fits two real registered
-- businesses better than the entry-level 'farm_stall' default the trigger
-- would otherwise fall back to (no sowers row for either account).
--
-- category: STALL_CATEGORIES (src/lib/stalls/stallTypes.ts) has no
-- accounting or health/pharmacy option at all -- closest fit for BOTH is
-- 'trades_services': an accounting firm is a professional service by
-- definition, and a pharmacy is too (prescriptions/dispensing is a
-- licensed service, not the food/home retail 'food_home' implies) --
-- there's no dedicated health category to reach for instead.
--
-- Hotspots: both interior photos have their own painted button strip
-- (not a blank room), so hotspots is set here directly rather than left
-- NULL for DEFAULT_HOTSPOTS. Coordinates measured against the actual
-- uploaded 1216-wide images via a column-brightness profile (finding the
-- bar's own top/bottom edge and, for Choice Pharmacy, its crisp metallic
-- inter-button dividers; CW Accounting's dividers are a soft continuous
-- highlight rather than a hard edge, so its 5 buttons are an equal
-- 5-way split of the bar's own measured left/right bounds instead) --
-- not assumed from a template or DEFAULT_HOTSPOTS' generic 4-slot
-- layout. Kind mapping: an exact/near-exact label match to an existing
-- TileKind goes straight to that kind (products->products, "our
-- story"->story); a label that's a real professional service offering
-- goes to 'services'; a label that's a specific action/link with no
-- matching in-app content kind (company-registration filing, a software
-- portal, a delivery-request link) goes to 'custom', same as "My Historic
-- Telling" did in set-ed-amber-hotspots-v2.sql.
--
-- CW Accounting, 5 buttons left to right (measured y 84.3-94.7% of
-- 1216x853):
--   1 "accounting" -> services   (their core professional service)
--   2 "tax"         -> services   (another professional service they offer)
--   3 "cipc"        -> custom     (company-registration filing -- a specific
--                                  compliance action, not a marketplace
--                                  services listing)
--   4 "software"    -> custom     (external accounting-software/portal
--                                  link, not a marketplace product)
--   5 "our story"   -> story
--
-- Choice Pharmacy, 4 buttons left to right (measured y 80.1-94.0% of
-- 1216x853):
--   1 "products"      -> products
--   2 "prescriptions" -> services   (dispensing is a licensed pharmacy service)
--   3 "deliveries"    -> custom     (a specific request/logistics action,
--                                    not a products or services listing)
--   4 "our story"     -> story
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-seed reasoning as create-ed-amber-stalls.sql
-- and move-stall-to-davison.sql.
--
-- Idempotent: safe to re-run. ON CONFLICT (user_id) DO UPDATE touches
-- every column this script owns, hotspots included (unlike
-- create-ed-amber-stalls.sql, which deliberately left hotspots alone --
-- there was no painted-button data to set yet there; here there is, so a
-- re-run is meant to re-assert it).

DO $cw_choice_stalls$
DECLARE
  v_coenie_id    uuid := '58249abb-829a-406c-a78b-a831ca528cd1';
  v_grootbrak_id uuid := '8d183fc5-2e38-487f-afd5-f97c59a42476';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_coenie_id) THEN
    RAISE EXCEPTION 'coenie user_id % not found in auth.users -- nothing changed.', v_coenie_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_grootbrak_id) THEN
    RAISE EXCEPTION 'grootbrak user_id % not found in auth.users -- nothing changed.', v_grootbrak_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, front_image_path, interior_image_path, hotspots, published)
  VALUES
    (
      v_coenie_id,
      'trading_house',
      'trades_services',
      'CW Accounting',
      'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_coenie_id::text || '/front.webp',
      'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_coenie_id::text || '/interior.webp',
      '[
        {"kind": "services", "label": "accounting", "x": 4.3,  "y": 84.3, "w": 17.8, "h": 10.4},
        {"kind": "services", "label": "tax",         "x": 22.7, "y": 84.3, "w": 17.8, "h": 10.4},
        {"kind": "custom",   "label": "cipc",        "x": 41.1, "y": 84.3, "w": 17.8, "h": 10.4},
        {"kind": "custom",   "label": "software",    "x": 59.5, "y": 84.3, "w": 17.8, "h": 10.4},
        {"kind": "story",    "label": "our story",   "x": 77.9, "y": 84.3, "w": 17.8, "h": 10.4}
      ]'::jsonb,
      true
    ),
    (
      v_grootbrak_id,
      'trading_house',
      'trades_services',
      'Choice Pharmacy',
      'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_grootbrak_id::text || '/front.webp',
      'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_grootbrak_id::text || '/interior.webp',
      '[
        {"kind": "products", "label": "products",      "x": 4.1,  "y": 80.1, "w": 21.1, "h": 13.9},
        {"kind": "services", "label": "prescriptions",  "x": 27.4, "y": 80.1, "w": 21.5, "h": 13.9},
        {"kind": "custom",   "label": "deliveries",     "x": 51.0, "y": 80.1, "w": 21.4, "h": 13.9},
        {"kind": "story",    "label": "our story",      "x": 74.6, "y": 80.1, "w": 21.5, "h": 13.9}
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
$cw_choice_stalls$;

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
WHERE s.user_id IN ('58249abb-829a-406c-a78b-a831ca528cd1', '8d183fc5-2e38-487f-afd5-f97c59a42476')
GROUP BY p.username, s.name, s.tier, s.category
ORDER BY p.username;
