-- SNAPSHOT + RESTORE: stalls.hotspots for davison.taljaard's stall
-- (121e1fa7-90aa-4ceb-86c6-6caa3de5276f), captured 2026-09-22 BEFORE
-- restoring the deleted "Coffee Mugs" hotspot.
--
-- What happened: tests/live/stall-hotspot-editor.spec.ts deletes the mugs
-- shelf from this REAL stall and then clicks "Save & publish". It had no
-- restore step of any kind. On 2026-09-22 at 09:26:28 UTC it took the
-- array from 11 entries to 10. Corroborated independently by
-- tests/live/stall-interior-framing.spec.ts failing with
-- "wrong number of hotspots painted -- Expected: 11, Received: 10".
--
-- CLAUDE.md is explicit that repeated hotspots on this stall are
-- INTENTIONAL (a discovery mechanic) and must never be deduped or
-- deleted. The pre-damage 11-entry array is independently confirmed in
-- the 07:03 local pre-suite dump under C:\Users\Ezra\S2G-backups, whose
-- hotspots column ends in "Coffee Mugs". tiles (4 entries) was untouched
-- throughout.
--
-- This restores the DAMAGED 10-entry state exactly as found, so the
-- restore itself can be undone. Named row only, never a WHERE that could
-- match differently later.
update public.stalls
   set hotspots = '
[{"h":20,"w":20.6,"x":5.9,"y":67,"id":"2b3563eb-3c88-4efc-a4f6-7a027370eada","kind":"books","label":"Books"},{"h":20,"w":20.6,"x":28.4,"y":67,"id":"813103fc-31aa-4aa0-adad-d777bc8c1e31","kind":"music","label":"Music"},{"h":20,"w":20.6,"x":50.8,"y":67,"id":"f4dbe6d9-cbdf-460e-ab03-7d2b43862197","kind":"lyrics","label":"Lyrics"},{"h":20,"w":20.8,"x":73.4,"y":67,"id":"80dd6ebb-dace-46d2-8956-ab7e3c78062d","kind":"story","label":"My Story"},{"h":20.536577922541923,"w":16.67747111681645,"x":55.64190804086081,"y":36.122201686952174,"id":"1f8ba1b9-013b-4214-9570-ec309731c2e8","kind":"story","label":"My Story"},{"h":34.76423012338033,"w":23.994153464712753,"x":74.49353059663392,"y":26.36147996855945,"id":"bbb38914-54b4-4d84-9112-ea9910667592","kind":"music","label":"My Music"},{"h":5.658551471989334,"w":29.575948614823183,"x":40.90079386641341,"y":58.40292172315643,"id":"27b29904-b336-4f4b-886d-934cd2fde276","kind":"story","label":"My Story"},{"h":4.8862036728277545,"w":23.481065468549424,"x":27.71884019139184,"y":47.96470790956077,"id":"e783a3f3-91e2-45ac-93b1-32689934d8b1","kind":"music","label":"My Music"},{"h":29.88617389958079,"w":17.24442866157659,"x":0,"y":11.306946545112424,"id":"0a995d3b-e7b6-4473-988b-35b1473ebf6b","kind":"books","label":"My Books"},{"h":14.03251536299544,"w":13.133930661711972,"x":28.1913004864165,"y":29.527256291087077,"id":"9b3663e2-08dd-4716-a183-b36985e1432b","kind":"books","label":"My Books"}]'::jsonb
 where id = '121e1fa7-90aa-4ceb-86c6-6caa3de5276f';
