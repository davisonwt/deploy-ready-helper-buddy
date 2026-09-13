-- Companions Village (phase 1 -- places only, no new companion logic).
-- Seven system accounts, no existing rows: created via the GoTrue Admin
-- API (secret key, resolved through the Management API's own api-keys
-- endpoint, same mechanism every other system-account script in this
-- folder uses -- service_role/legacy keys are disabled on this project,
-- so this used the new 'secret' key type instead). Random passwords
-- generated once to satisfy the Admin API call, then discarded -- never
-- printed, never stored. These are system accounts; no one logs in as
-- any of them.
--   companions@sow2growapp.com         -> b385c0c2-5e41-4058-b4e1-8afdc7c93f0c
--   companion-beech@sow2growapp.com    -> 4b6f54fa-b0be-49d3-925e-291225f0a788
--   companion-alder@sow2growapp.com    -> 971ccdd7-203b-41f7-90e3-b3e48c531a33
--   companion-hawthorn@sow2growapp.com -> aa38d402-a401-40d1-aea7-a76f4e4058b6
--   companion-thresh@sow2growapp.com   -> 9517b244-97a5-4b49-a95f-fdc1cda5862f
--   companion-willow@sow2growapp.com   -> 6983c35b-5dbe-457b-bdf4-0629a1195440
--   companion-birch@sow2growapp.com    -> 2771c2aa-7f34-40cc-8381-73b6e56a7a86
-- profiles rows auto-created (usernames came back matching the email
-- local-part, confirmed live); display_name and the two unprivileged/
-- system-bypassable onboarding flags set explicitly per account below,
-- same as scripts/studio/create-grove-station-stall.sql. is_chatapp_verified
-- left false for the same reason documented there.
--
-- Images: E:\abbi\sow2grow\, all 14 source JPEGs uniformly 1232x864 --
-- resized to width=1216 keeping aspect (no crop, height~=853), converted
-- to WebP (quality 0.92) via a headless Chromium <canvas>, uploaded to the
-- existing public "stalls" bucket under each account's own user_id folder,
-- then re-downloaded and SHA-256-compared byte-for-byte against the local
-- converted file -- all 14 matched exactly.
--
-- category: 'trades_services' (closest fit for "helpers for hire" --
-- none of STALL_CATEGORIES is a literal match). tier: 'trading_house' for
-- all seven (explicit instruction for the village stall itself; the six
-- companion stalls follow the same tier as the family they belong to,
-- no override given).
--
-- village: new text column (added below) -- 'companions' on the six
-- companion-* stalls only, so StallsFeedPage's default Tribal Gardens
-- feed excludes them (`village IS NULL`) and they surface only via
-- ?village=companions (the "Meet the helpers"/"Try one" hotspots' own
-- target). The village-square stall itself stays village=NULL: it isn't
-- part of the filtered feed, it's pinned into Tribal Gardens instead
-- (PINNED_STALL_USER_IDS in StallsFeedPage.tsx, third entry after
-- Wandering Hearts -- added in the same commit as this migration).
--
-- hotspots: four bottom-of-image boxes on every one of the 7 interiors,
-- two new kinds (src/lib/stalls/stallTypes.ts, StallInteriorView.tsx,
-- StallHotspotSheet.tsx, same commit):
--   'nav'   -- navigates immediately on tap, no sheet (`href`, an in-app
--             path). Used for "Meet the helpers"/"My helpers"/"Try one"/
--             "Try me".
--   kind:'companion_info'|'passes'|'activate'|'reviews' -- opens the usual
--             sheet but shows `text` verbatim instead of a product query.
-- The village square (s2g companion tsq.jpeg) has 4 painted wooden plaques
-- along the bottom wall -- measured by scanning the resized image for the
-- warm-glow plaque pixels against the dark cobblestone background
-- (per-column/per-row brightness sums), then padded a few percent past
-- each detected core to cover the full plaque:
--   Meet the helpers: x=6.5  y=79 w=18 h=17
--   My helpers:        x=29.5 y=79 w=18 h=17
--   Try one:            x=52.5 y=79 w=18 h=17
--   Passes:             x=75.5 y=79 w=18 h=17
-- The six companion interiors are plain photo-real rooms with no painted
-- signage of their own (confirmed by eye against beech int.jpeg, the rest
-- are the same batch/style) -- same evenly-spaced bottom-quarter
-- convention DEFAULT_HOTSPOTS/Grove Station/Wandering Hearts already use
-- for an image with no painted buttons:
--   What I do: x=2  y=79 w=22 h=17
--   Try me:    x=26 y=79 w=22 h=17
--   Activate:  x=50 y=79 w=22 h=17
--   Reviews:   x=74 y=79 w=22 h=17
--
-- "What I do" text is each companion's own `summary` from
-- src/lib/companions/registry.ts verbatim (the same copy CompanionCard.tsx
-- already shows on the /my-companions grid) -- one source of truth, no
-- content invented fresh for this sheet.
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration in the "runs in CI" sense, same one-off data-seed reasoning as
-- create-grove-station-stall.sql (documents what was already applied live
-- via the Management API). Idempotent: safe to re-run.

alter table public.stalls add column if not exists village text;

-- --- Companions Village (the square) ---------------------------------------
DO $companions_village$
DECLARE
  v_id uuid := 'b385c0c2-5e41-4058-b4e1-8afdc7c93f0c';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companions@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Companions Village', 'helpers for hire',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "nav",     "label": "Meet the helpers", "x": 6.5,  "y": 79, "w": 18, "h": 17, "href": "/stalls-feed?village=companions"},
      {"kind": "nav",     "label": "My helpers",        "x": 29.5, "y": 79, "w": 18, "h": 17, "href": "/my-companions"},
      {"kind": "nav",     "label": "Try one",            "x": 52.5, "y": 79, "w": 18, "h": 17, "href": "/stalls-feed?village=companions"},
      {"kind": "passes",  "label": "Passes",             "x": 75.5, "y": 79, "w": 18, "h": 17, "text": "Passes — coming soon."}
    ]'::jsonb,
    true, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Companions Village', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companions_village$;

-- --- Beech -- Your Writing Helper -------------------------------------------
DO $companion_beech$
DECLARE
  v_id uuid := '4b6f54fa-b0be-49d3-925e-291225f0a788';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-beech@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Beech', 'Your Writing Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "A thinking partner for the numbers you bring it — bestowal totals, weekly summaries, the 1% tribe leader finance. Share the figures and I''ll help you make sense of them."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=beech"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Beech', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_beech$;

-- --- Alder -- Your Stock & Orders Helper ------------------------------------
DO $companion_alder$
DECLARE
  v_id uuid := '971ccdd7-203b-41f7-90e3-b3e48c531a33';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-alder@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Alder', 'Your Stock & Orders Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "A thinking partner for Field & Forge stock, deliveries, and orders — describe what you have on hand and I''ll help you reason about it."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=alder"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Alder', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_alder$;

-- --- Hawthorn -- Your Pricing Helper -----------------------------------------
DO $companion_hawthorn$
DECLARE
  v_id uuid := 'aa38d402-a401-40d1-aea7-a76f4e4058b6';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-hawthorn@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Hawthorn', 'Your Pricing Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "Suggests fair pricing and talks through performance with you, working from whatever you describe — context in, ideas out."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=hawthorn"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Hawthorn', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_hawthorn$;

-- --- Thresh -- Your Session Feedback Helper ---------------------------------
DO $companion_thresh$
DECLARE
  v_id uuid := '9517b244-97a5-4b49-a95f-fdc1cda5862f';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-thresh@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Thresh', 'Your Session Feedback Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "Helps you reflect on a session you describe — together we''ll distil 3 honest insights and 1 next sacred step."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=thresh"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Thresh', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_thresh$;

-- --- Willow -- Your Cover Image Helper ---------------------------------------
DO $companion_willow$
DECLARE
  v_id uuid := '6983c35b-5dbe-457b-bdf4-0629a1195440';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-willow@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Willow', 'Your Cover Image Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "Generates and refines images — seed covers, product photos, and banners."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=willow"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Willow', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_willow$;

-- --- Birch -- Your Reel-Making Helper ----------------------------------------
DO $companion_birch$
DECLARE
  v_id uuid := '2771c2aa-7f34-40cc-8381-73b6e56a7a86';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'companion-birch@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published, village)
  VALUES (
    v_id, 'trading_house', 'trades_services', 'Birch', 'Your Reel-Making Helper',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "companion_info", "label": "What I do", "x": 2,  "y": 79, "w": 22, "h": 17, "text": "Talks through video reels, testimonial clips, and orchard introductions with you — shot lists and scripts in chat. Filming and editing stay in your hands."},
      {"kind": "nav",            "label": "Try me",     "x": 26, "y": 79, "w": 22, "h": 17, "href": "/my-companions?open=birch"},
      {"kind": "activate",       "label": "Activate",   "x": 50, "y": 79, "w": 22, "h": 17, "text": "30-day pass — coming soon."},
      {"kind": "reviews",        "label": "Reviews",    "x": 74, "y": 79, "w": 22, "h": 17, "text": "Reviews — coming soon."}
    ]'::jsonb,
    true, 'companions'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, village = EXCLUDED.village, updated_at = now();

  UPDATE public.profiles SET display_name = 'Birch', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$companion_birch$;

-- --- Proof --------------------------------------------------------------------
SELECT
  p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete,
  s.name, s.tagline, s.tier, s.category, s.published, s.village,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS hotspots_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id IN (
  'b385c0c2-5e41-4058-b4e1-8afdc7c93f0c', '4b6f54fa-b0be-49d3-925e-291225f0a788',
  '971ccdd7-203b-41f7-90e3-b3e48c531a33', 'aa38d402-a401-40d1-aea7-a76f4e4058b6',
  '9517b244-97a5-4b49-a95f-fdc1cda5862f', '6983c35b-5dbe-457b-bdf4-0629a1195440',
  '2771c2aa-7f34-40cc-8381-73b6e56a7a86'
)
GROUP BY p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete, s.name, s.tagline, s.tier, s.category, s.published, s.village
ORDER BY p.username;
