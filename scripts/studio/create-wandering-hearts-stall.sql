-- Wandering Hearts: S2G-run stall for the Wandering Hearts feature.
-- Same pattern as create-grove-station-stall.sql. Phase 1 = images +
-- stall only (hotspots are placeholder 'custom' targets -- real
-- behaviour comes in phase 2, when "Live circle" becomes the
-- /tribal-hearts destination and the other three get their own targets).
--
-- System member (2026-09-12): no existing account, so a fresh one was
-- created via the GoTrue Admin API (service/secret key, resolved through
-- the Management API's own api-keys endpoint -- same mechanism the CLI's
-- `storage cp` uses, not a hand-typed secret):
--   wanderinghearts@sow2growapp.com -> 54ba45c3-382b-4cc2-9bb7-c1f895c3c119
-- Random password generated once to satisfy the Admin API call, then
-- discarded -- never printed, never stored anywhere. System account, no
-- one logs in as it. profiles row auto-created (username already came
-- back as "wanderinghearts" from the email local-part); display_name and
-- the two unprivileged/system-bypassable onboarding flags were set
-- explicitly:
--   display_name = 'Wandering Hearts'
--   security_setup_complete = true (unguarded column)
--   payout_setup_complete = true (via the trigger's own
--     app.system_payout_update session-var escape hatch)
-- is_chatapp_verified was left false, same reasoning as Grove Station --
-- prevent_profile_privilege_escalation() only allows changing it for an
-- admin auth.uid(), which a raw Management-API SQL session never has,
-- and this phase doesn't need it.
--
-- Images: E:\abbi\sow2grow\, "s2g wh front.jpeg" (1168x784) and
-- "s2g wh interior.jpeg" (1248x832) -- resized to width=1216 keeping
-- aspect, no crop, converted to WebP (quality 82), uploaded via
-- `supabase storage cp --experimental` to the existing public "stalls"
-- bucket, then re-downloaded and SHA-256-compared byte-for-byte against
-- the local converted file to confirm the upload:
--   54ba45c3.../front.webp     1216x816
--   54ba45c3.../interior.webp  1216x811
--
-- category: 'faith_teaching' -- already an exact match in
-- STALL_CATEGORIES (src/lib/stalls/stallTypes.ts), no substitution
-- needed.
-- tier: 'trading_house' (explicit instruction, same as Grove Station).
--
-- hotspots: the interior has 4 painted plaques along the bottom, all at
-- the same height (unlike Grove Station's angled desk) -- "Meet
-- someone" / "My connections" / "Live circle" / "Stories" -- measured
-- directly against the real 1248x832 source image by cropping each
-- candidate box and visually confirming it fully contains the plaque
-- with a small margin and nothing else. All 4 are kind 'custom' (no
-- real target yet, per phase 1 scope).
--
-- Meet someone:    x=2.00  y=79.33 w=22.84 h=16.83
-- My connections:  x=27.24 y=79.33 w=22.04 h=16.83
-- Live circle:     x=51.68 y=79.33 w=21.63 h=16.83
-- Stories:         x=75.72 y=79.33 w=22.04 h=16.83
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-seed reasoning as
-- create-grove-station-stall.sql (this script documents what was already
-- applied live via the Management API; re-running it is what makes it
-- idempotent/reproducible, not the first application).
--
-- Idempotent: safe to re-run. ON CONFLICT (user_id) DO UPDATE touches
-- every column this script owns, hotspots included.

DO $wandering_hearts_stall$
DECLARE
  v_wandering_hearts_id uuid := '54ba45c3-382b-4cc2-9bb7-c1f895c3c119';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_wandering_hearts_id) THEN
    RAISE EXCEPTION 'wanderinghearts@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_wandering_hearts_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published)
  VALUES (
    v_wandering_hearts_id,
    'trading_house',
    'faith_teaching',
    'Wandering Hearts',
    'come as you are',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_wandering_hearts_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_wandering_hearts_id::text || '/interior.webp',
    '[
      {"kind": "custom", "label": "Meet someone",   "x": 2.00,  "y": 79.33, "w": 22.84, "h": 16.83},
      {"kind": "custom", "label": "My connections", "x": 27.24, "y": 79.33, "w": 22.04, "h": 16.83},
      {"kind": "custom", "label": "Live circle",    "x": 51.68, "y": 79.33, "w": 21.63, "h": 16.83},
      {"kind": "custom", "label": "Stories",        "x": 75.72, "y": 79.33, "w": 22.04, "h": 16.83}
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
  SET display_name = 'Wandering Hearts',
      security_setup_complete = true
  WHERE user_id = v_wandering_hearts_id;

  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles
  SET payout_setup_complete = true
  WHERE user_id = v_wandering_hearts_id;
END;
$wandering_hearts_stall$;

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
WHERE s.user_id = '54ba45c3-382b-4cc2-9bb7-c1f895c3c119'
GROUP BY p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete, s.name, s.tagline, s.tier, s.category, s.published;
