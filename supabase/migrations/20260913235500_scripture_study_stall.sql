-- Scripture Study gathering room (minimum version). System account, no
-- existing row: created via the GoTrue Admin API (the new 'secret' key
-- type -- legacy service_role/anon keys are disabled on this project,
-- confirmed live), same mechanism as every other system-account script in
-- this folder. Random password generated once to satisfy the Admin API
-- call, then discarded -- never printed, never stored. System account, no
-- one logs in as it.
--   scripturestudy@sow2growapp.com -> 50f485b8-8aa0-462f-a01d-9c2f18d2105e
-- profiles row auto-created (username came back "scripturestudy" from the
-- email local-part, confirmed live); display_name and the two
-- unprivileged/system-bypassable onboarding flags set explicitly below,
-- same as create-grove-station-stall.sql. is_chatapp_verified left false
-- for the same reason documented there.
--
-- Images: E:\abbi\sow2grow\, "s2g scripture study live front.jpeg"
-- (1280x897) and "s2g scripture study live int.jpeg" (1233x864) --
-- resized to width=1216 keeping aspect (no crop), converted to WebP
-- (quality 0.92) via a headless Chromium <canvas>, uploaded to the
-- existing public "stalls" bucket under this account's own user_id
-- folder, then re-downloaded and SHA-256-compared byte-for-byte against
-- the local converted file -- both matched exactly.
--
-- tier: 'trading_house' (explicit instruction). category: 'faith_teaching'
-- (closest real STALL_CATEGORIES fit).
--
-- hotspots: four bottom plaques on the hall's front bench, measured by
-- scanning the resized interior image for the warm-lit plaque-oval pixels
-- against the dark wood bench (per-column/per-row brightness sums,
-- excluding the two edge lanterns which read similarly warm), then padded
-- a few percent past each detected core to cover the full plaque -- same
-- method as Companions Village's village-square plaques:
--   Raise hand: x=10.3 y=79 w=16 h=16 (kind 'raise_hand')
--   Queue:      x=30.9 y=79 w=16 h=16 (kind 'queue')
--   Gift:       x=52.9 y=79 w=16 h=16 (kind 'gift')
--   Share:      x=75.0 y=79 w=16 h=16 (kind 'share')
-- Plus one more, eyeballed against the actual image (the wooden reading
-- stand with a candle+scroll, center-right of the stage, distinct from
-- the gramophone table at far left and the ring-light/camera rig at far
-- right): the lectern, x=77 y=29 w=8 h=17 (kind 'go_live') -- rendered
-- only for an admin/gosat viewer (StallInteriorView.tsx's
-- `visibleHotspots` filter), so it's painted into the data for every
-- viewer but invisible to everyone else.
--
-- Engine reuse (src/components/stalls/StallInteriorView.tsx, same
-- commit): 'go_live' calls the existing useTribalLiveOrchard().goLive()
-- with this account's own user_id as the synthetic seedId (no real
-- products/orchards row backs it -- confirmed live that seed_id/
-- gathering_sessions have no FK to either); 'raise_hand'/'queue' open the
-- existing full-screen LiveStageOverlay when a session is live (its own
-- LiveStage already contains the guest raise-hand controls and the host's
-- queue tray -- no separate queue UI built); 'share' calls the same
-- shareStallLink the header's own Share button already uses. 'gift' is a
-- static "coming soon" placeholder for now -- a real Bestow-shaped tip
-- needs a backing orchards row (company_id/profile_id/seed_value all NOT
-- NULL, confirmed live against information_schema), which is a
-- money-routing decision for Davison, not guessed here.
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration in the "runs in CI" sense, same one-off data-seed reasoning
-- as create-grove-station-stall.sql. Idempotent: safe to re-run.

DO $scripture_study$
DECLARE
  v_id uuid := '50f485b8-8aa0-462f-a01d-9c2f18d2105e';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'scripturestudy@sow2growapp.com user_id % not found in auth.users -- nothing changed.', v_id;
  END IF;

  INSERT INTO public.stalls (user_id, tier, category, name, tagline, front_image_path, interior_image_path, hotspots, published)
  VALUES (
    v_id, 'trading_house', 'faith_teaching', 'Scripture Study', 'all welcome',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/front.webp',
    'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || v_id::text || '/interior.webp',
    '[
      {"kind": "raise_hand", "label": "Raise hand", "x": 10.3, "y": 79, "w": 16, "h": 16, "text": "No session live right now — check back soon."},
      {"kind": "queue",      "label": "Queue",       "x": 30.9, "y": 79, "w": 16, "h": 16, "text": "No session live right now — check back soon."},
      {"kind": "gift",       "label": "Gift",        "x": 52.9, "y": 79, "w": 16, "h": 16, "text": "Gift — coming soon."},
      {"kind": "share",      "label": "Share",       "x": 75.0, "y": 79, "w": 16, "h": 16},
      {"kind": "go_live",    "label": "Go Live",     "x": 77,   "y": 29, "w": 8,  "h": 17}
    ]'::jsonb,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier, category = EXCLUDED.category, name = EXCLUDED.name, tagline = EXCLUDED.tagline,
    front_image_path = EXCLUDED.front_image_path, interior_image_path = EXCLUDED.interior_image_path,
    hotspots = EXCLUDED.hotspots, published = EXCLUDED.published, updated_at = now();

  UPDATE public.profiles SET display_name = 'Scripture Study', security_setup_complete = true WHERE user_id = v_id;
  PERFORM set_config('app.system_payout_update', 'on', true);
  UPDATE public.profiles SET payout_setup_complete = true WHERE user_id = v_id;
END;
$scripture_study$;

-- --- Proof --------------------------------------------------------------------
SELECT
  p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete,
  s.name, s.tagline, s.tier, s.category, s.published,
  jsonb_agg((h->>'label') || '=' || (h->>'kind') ORDER BY (h->>'y')::numeric, (h->>'x')::numeric) AS hotspots
FROM public.stalls s
JOIN public.profiles p ON p.user_id = s.user_id
CROSS JOIN LATERAL jsonb_array_elements(s.hotspots) AS h
WHERE s.user_id = '50f485b8-8aa0-462f-a01d-9c2f18d2105e'
GROUP BY p.username, p.display_name, p.security_setup_complete, p.payout_setup_complete, s.name, s.tagline, s.tier, s.category, s.published;
