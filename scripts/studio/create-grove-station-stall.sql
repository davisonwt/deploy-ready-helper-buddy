-- Grove Station: S2G's own radio station stall. Phase 1 = images + stall
-- only (hotspots are placeholder 'custom' targets -- real behaviour, i.e.
-- wiring each plaque to a /grove-station tab, comes in phase 2).
--
-- System member (2026-09-12): no existing account, so a fresh one was
-- created via the GoTrue Admin API (service/secret key, resolved through
-- the Management API's own api-keys endpoint -- same mechanism the CLI's
-- `storage cp` uses, not a hand-typed secret):
--   grovestation@sow2growapp.com -> e9758e23-fba4-4778-8e58-4fd8e5550a72
-- Random password generated once to satisfy the Admin API call, then
-- discarded -- never printed, never stored anywhere. This is a system
-- account (no one logs in as it); "store nowhere" is intentional, not an
-- oversight. profiles row auto-created (username already came back as
-- "grovestation" from the email local-part); display_name and the two
-- unprivileged/system-bypassable onboarding flags were set explicitly:
--   display_name = 'Grove Station'
--   security_setup_complete = true (unguarded column)
--   payout_setup_complete = true (via the trigger's own
--     app.system_payout_update session-var escape hatch)
-- is_chatapp_verified was left false: prevent_profile_privilege_escalation()
-- only allows changing it for an admin auth.uid(), which a raw
-- Management-API SQL session never has, and it doesn't gate anything this
-- phase needs (the account never actually uses ChatApp).
--
-- Images: E:\abbi\sow2grow\, "s2g radio front.jpeg" (1168x784) and
-- "s2g radio interior.jpeg" (1248x832) -- resized to width=1216 keeping
-- aspect, no crop, converted to WebP (quality 82), uploaded via
-- `supabase storage cp --experimental` to the existing public "stalls"
-- bucket, then re-downloaded and SHA-256-compared byte-for-byte against
-- the local converted file to confirm the upload:
--   e9758e23.../front.webp     1216x816
--   e9758e23.../interior.webp  1216x811
--
-- category: 'music' (explicit instruction -- it's a radio station).
-- tier: 'trading_house' (explicit instruction).
--
-- hotspots: the interior has 4 painted plaques along the bottom front of
-- the broadcast desk, "On Air" / "Schedule" / "Show" / "Advertise" --
-- measured directly against the real 1248x832 source image by cropping
-- each candidate box and visually confirming it fully contains the
-- plaque with a small margin and nothing else, iterating until clean.
-- All 4 are kind 'custom' (no real target yet, per phase 1 scope); label
-- text uses the plural "Shows" for the 3rd one per the brief, even though
-- the plaque itself reads "Show" (singular) -- the painted image and the
-- hotspot's own label are independent, same as every other per-stall
-- hotspot in this app.
--
-- On Air:     x=30.05 y=77.52 w=14.42 h=17.43
-- Schedule:   x=47.68 y=77.52 w=12.42 h=13.22
-- Shows:      x=62.90 y=75.72 w=10.82 h=12.02
-- Advertise:  x=76.12 y=73.92 w=10.82 h=10.82
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-seed reasoning as create-clayroses-stall.sql
-- (this script documents what was already applied live via the
-- Management API; re-running it is what makes it idempotent/reproducible,
-- not the first application).
--
-- Idempotent: safe to re-run. ON CONFLICT (user_id) DO UPDATE touches
-- every column this script owns, hotspots included.

DO $grove_station_stall$
DECLARE
  v_grove_station_id uuid := 'e9758e23-fba4-4778-8e58-4fd8e5550a72';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_grove_station_id) THEN
    RAISE EXCEPTION 'grovestation@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_grove_station_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published)
  VALUES (
    v_grove_station_id,
    'trading_house',
    'music',
    'Grove Station',
    'sow2grow radio — 24/7',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_grove_station_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_grove_station_id::text || '/interior.webp',
    '[
      {"kind": "custom", "label": "On Air",    "x": 30.05, "y": 77.52, "w": 14.42, "h": 17.43},
      {"kind": "custom", "label": "Schedule",  "x": 47.68, "y": 77.52, "w": 12.42, "h": 13.22},
      {"kind": "custom", "label": "Shows",     "x": 62.90, "y": 75.72, "w": 10.82, "h": 12.02},
      {"kind": "custom", "label": "Advertise", "x": 76.12, "y": 73.92, "w": 10.82, "h": 10.82}
    ]'::jsonb,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path,
    interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots,
    published = EXCLUDED.published,
    updated_at = now();

  -- display_name/onboarding flags on the auto-created profiles row --
  -- see the header comment for why is_chatapp_verified is left alone.
  UPDATE public.profiles
  SET display_name = 'Grove Station',
      security_setup_complete = true
  WHERE user_id = v_grove_station_id;

  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles
  SET payout_setup_complete = true
  WHERE user_id = v_grove_station_id;
END;
$grove_station_stall$;

-- --- Proof --------------------------------------------------------------------
SELECT
  p.username,
  p.display_name,
  p.security_setup_complete,
  p.payout_setup_complete,
  s.name,
  s.tagline,
  s.tier,
  s.category,
  s.published,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'x')::numeric) AS hotspots_left_to_right
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id = 'e9758e23-fba4-4778-8e58-4fd8e5550a72'
GROUP BY p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete, s.name, s.tagline, s.tier, s.category, s.published;
