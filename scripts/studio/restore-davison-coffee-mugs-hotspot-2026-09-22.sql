-- RESTORE the "Coffee Mugs" hotspot deleted from davison.taljaard's stall
-- (121e1fa7-90aa-4ceb-86c6-6caa3de5276f) by
-- tests/live/stall-hotspot-editor.spec.ts on 2026-09-22 09:26:28 UTC.
--
-- The entry below is taken byte for byte from the pre-suite dump
-- (C:\Users\Ezra\S2G-backups\s2g-dump-2026-09-22.sql, 07:03 local), where
-- it is the 11th and last element of stalls.hotspots.
--
-- NOT restored with scripts/studio/add-mug-hotspot.sql, deliberately.
-- That script re-adds the TEMPLATE's mug box:
--     label "Mugs", x 11.5, y 51.0, w 6.5, h 8.0, plus a caption
-- while what was actually lost is the owner's own, which he had since
-- renamed, moved and resized:
--     label "Coffee Mugs", x 3.697…, y 49.663…, w 12, h 12, no caption
-- Running the template version would have restored the count to 11 and
-- quietly replaced his placement with someone else's -- which is the
-- 2026-09-11 hotspots loss repeated, not repaired. The original id is
-- preserved so anything referencing it still resolves.
--
-- Appended with `||` rather than overwriting the column, and guarded on a
-- mugs entry already being present, so it is safe to re-run.
UPDATE public.stalls s
   SET hotspots = s.hotspots || '[
         {"h": 12, "w": 12, "x": 3.697205882629472, "y": 49.66259988924352,
          "id": "aa85588f-13f1-4442-afc7-e43b1a61d6fd",
          "kind": "mugs", "label": "Coffee Mugs"}
       ]'::jsonb,
       updated_at = now()
 WHERE s.id = '121e1fa7-90aa-4ceb-86c6-6caa3de5276f'
   AND NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(s.hotspots) h WHERE h->>'kind' = 'mugs'
   );
