-- Wire Grove Station's stall interior hotspots to real destinations.
-- Before this: all four (On Air / Schedule / Shows / Advertise) were
-- kind='custom' with no href -- dead, tap did nothing. Same nav-hotspot
-- shape Gosat's Boardroom already uses (kind:'nav' + href), geometry
-- (h/w/x/y) and labels preserved exactly as they stood.
--
--   On Air     -> /grove-station?tab=listen     (Listen Now tab)
--   Schedule   -> /grove-station?tab=schedule   (the new open-booking calendar)
--   Shows      -> /grove-station?tab=listen     (new "Upcoming Shows" list
--                 added to that tab in the same deploy -- no tab listed
--                 scheduled shows before this)
--   Advertise  -> /grove-station?tab=schedule   (ad_price now shown on
--                 booked slot cards there; a real ad-purchase flow is
--                 Phase 1b, not built yet)
--
-- Stall: "Grove Station" (user_id e9758e23-fba4-4778-8e58-4fd8e5550a72,
-- username grovestation), stalls.id c5a1d858-2281-4a0a-9496-f804e3e1c110.

UPDATE public.stalls
SET hotspots = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'nav', 'href', '/grove-station?tab=listen', 'label', 'On Air',
    'h', 17.43, 'w', 14.42, 'x', 30.05, 'y', 77.52
  ),
  jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'nav', 'href', '/grove-station?tab=schedule', 'label', 'Schedule',
    'h', 13.22, 'w', 12.42, 'x', 47.68, 'y', 77.52
  ),
  jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'nav', 'href', '/grove-station?tab=listen', 'label', 'Shows',
    'h', 12.02, 'w', 10.82, 'x', 62.9, 'y', 75.72
  ),
  jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'nav', 'href', '/grove-station?tab=schedule', 'label', 'Advertise',
    'h', 10.82, 'w', 10.82, 'x', 76.12, 'y', 73.92
  )
)
WHERE id = 'c5a1d858-2281-4a0a-9496-f804e3e1c110';
