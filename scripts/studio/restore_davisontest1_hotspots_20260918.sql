-- SNAPSHOT / RESTORE -- davisontest1's stall hotspots, taken 2026-09-18
-- before adding a temporary 'custom' shelf to verify the owner "+".
--
-- Restores the EXACT hotspots this stall had, named by stall id, not by a
-- WHERE clause that could match differently later.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/restore_davisontest1_hotspots_20260918.sql

update public.stalls
   set hotspots = '[{"h": 21.2, "w": 20, "x": 6.2, "y": 68.5, "id": "e0a6f9b3-8957-4050-bf0b-d9cb48b0af3b", "kind": "books", "label": "Books"}, {"h": 21.2, "w": 20, "x": 28.5, "y": 68.5, "id": "310f4e6c-7aa1-4e8b-8e3b-900fa7512398", "kind": "music", "label": "Music"}, {"h": 21.2, "w": 20.3, "x": 50.8, "y": 68.5, "id": "0e45c69b-dd9b-4f6f-a2c9-006aa61e179e", "kind": "lyrics", "label": "Lyrics"}, {"h": 21.2, "w": 20.4, "x": 73.4, "y": 68.5, "id": "6a5ba03b-98d6-4a58-9ad0-37d9c460bf40", "kind": "story", "label": "My Story"}]'::jsonb
 where id = 'f457f593-c35f-4bb9-893b-8ecc7ec8fe59';

select id, jsonb_array_length(hotspots) as hotspot_count
from public.stalls where id = 'f457f593-c35f-4bb9-893b-8ecc7ec8fe59';
