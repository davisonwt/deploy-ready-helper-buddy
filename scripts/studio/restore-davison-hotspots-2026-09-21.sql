-- SNAPSHOT of davison.taljaard's stall hotspots as at 2026-09-21.
--
-- ** THE B2 CLEANUP WAS NOT RUN. ** This file is the snapshot that the
-- golden rule requires before touching member content; it was written
-- first, and then the cleanup was stopped on the evidence below. Nothing
-- has been deleted. Running this file restores the exact 11 entries that
-- are live right now, so it is a no-op unless a cleanup happens later.
--
-- Why it was stopped: B2 attributed these duplicates to 0222fb67
-- ("Stop wiping hotspots on interior republish", 2026-09-20 13:17). They
-- predate it. scripts/studio/restore_davison_hotspots_20260918.sql holds
-- a snapshot from 2026-09-18 whose 11 entries are byte-identical to these,
-- in the same order, ids included -- two days before that commit. Whatever
-- produced them, it was not the no-wipe change.
--
-- Also at stake: six live specs locate hotspots on THIS stall by their
-- stored label. Removing the boxes labelled "Books" and "Music" breaks
-- stall-hotspot-editor, stall-hotspot-one-tap, stall-interior-framing,
-- stall-sheet-back-gesture and stall-shelf-close.
--
-- Per the snapshot golden rule in CLAUDE.md. stalls.hotspots is member-placed content: these are boxes
-- Davison painted onto his own interior by hand. On 2026-09-11 a similar
-- one-line change nulled a member's hotspots and they were unrecoverable.
--
-- Runnable on its own. Names the row by stall id, not by a WHERE clause
-- that could match differently later.
--
--   stall id   : 121e1fa7-90aa-4ceb-86c6-6caa3de5276f
--   user_id    : 04754d57-d41d-4ea7-93df-542047a6785b
--   username   : davison.taljaard
--   stall name : Davison's - Music, Books & Faith Teachings
--   interior   : 1789892508111.webp
--   captured   : 2026-09-21, updated_at was 2026-09-20 15:04:58.129962+00
--   hotspots   : 11 entries
--
-- To roll the cleanup back completely, run this whole file.

update public.stalls
   set hotspots = $restore$[{"h": 20, "w": 20.6, "x": 5.9, "y": 67, "id": "2b3563eb-3c88-4efc-a4f6-7a027370eada", "kind": "books", "label": "Books"}, {"h": 20, "w": 20.6, "x": 28.4, "y": 67, "id": "813103fc-31aa-4aa0-adad-d777bc8c1e31", "kind": "music", "label": "Music"}, {"h": 20, "w": 20.6, "x": 50.8, "y": 67, "id": "f4dbe6d9-cbdf-460e-ab03-7d2b43862197", "kind": "lyrics", "label": "Lyrics"}, {"h": 20, "w": 20.8, "x": 73.4, "y": 67, "id": "80dd6ebb-dace-46d2-8956-ab7e3c78062d", "kind": "story", "label": "My Story"}, {"h": 20.536577922541923, "w": 16.67747111681645, "x": 55.64190804086081, "y": 36.122201686952174, "id": "1f8ba1b9-013b-4214-9570-ec309731c2e8", "kind": "story", "label": "My Story"}, {"h": 34.76423012338033, "w": 23.994153464712753, "x": 74.49353059663392, "y": 26.36147996855945, "id": "bbb38914-54b4-4d84-9112-ea9910667592", "kind": "music", "label": "My Music"}, {"h": 5.658551471989334, "w": 29.575948614823183, "x": 40.90079386641341, "y": 58.40292172315643, "id": "27b29904-b336-4f4b-886d-934cd2fde276", "kind": "story", "label": "My Story"}, {"h": 4.8862036728277545, "w": 23.481065468549424, "x": 27.71884019139184, "y": 47.96470790956077, "id": "e783a3f3-91e2-45ac-93b1-32689934d8b1", "kind": "music", "label": "My Music"}, {"h": 29.88617389958079, "w": 17.24442866157659, "x": 0, "y": 11.306946545112424, "id": "0a995d3b-e7b6-4473-988b-35b1473ebf6b", "kind": "books", "label": "My Books"}, {"h": 14.03251536299544, "w": 13.133930661711972, "x": 28.1913004864165, "y": 29.527256291087077, "id": "9b3663e2-08dd-4716-a183-b36985e1432b", "kind": "books", "label": "My Books"}, {"h": 12, "w": 12, "x": 3.697205882629472, "y": 49.66259988924352, "id": "aa85588f-13f1-4442-afc7-e43b1a61d6fd", "kind": "mugs", "label": "Coffee Mugs"}]$restore$::jsonb
 where id = '121e1fa7-90aa-4ceb-86c6-6caa3de5276f'::uuid;

-- Confirm: expect 1 row, 11 hotspots.
select id, jsonb_array_length(hotspots) as n
  from public.stalls
 where id = '121e1fa7-90aa-4ceb-86c6-6caa3de5276f'::uuid;
