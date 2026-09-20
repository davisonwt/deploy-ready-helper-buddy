-- Restores stalls.hotspots for the Grove Station stall
-- (id c5a1d858-2281-4a0a-9496-f804e3e1c110) as it stood on 2026-09-20,
-- before wire-grovestation-hotspots-20260920.sql rewired the four
-- kind='custom'/dead hotspots into kind='nav' + href.
UPDATE public.stalls
SET hotspots = '[
  {"h": 17.43, "w": 14.42, "x": 30.05, "y": 77.52, "kind": "custom", "label": "On Air"},
  {"h": 13.22, "w": 12.42, "x": 47.68, "y": 77.52, "kind": "custom", "label": "Schedule"},
  {"h": 12.02, "w": 10.82, "x": 62.9,  "y": 75.72, "kind": "custom", "label": "Shows"},
  {"h": 10.82, "w": 10.82, "x": 76.12, "y": 73.92, "kind": "custom", "label": "Advertise"}
]'::jsonb
WHERE id = 'c5a1d858-2281-4a0a-9496-f804e3e1c110';
