-- Farm-Stalls batch 2b: per-stall hotspot override. Template interiors
-- ship their hotspot layout in public/stalls/templates/templates.json
-- (each template's own `hotspots` array); a custom-uploaded interior has
-- no template to carry one, so the wizard/StallInterior falls back to
-- DEFAULT_HOTSPOTS (src/lib/stalls/stallTypes.ts) -- four evenly-spaced
-- bottom regions. This column lets either case be overridden per stall
-- later (e.g. a member repositioning the tap regions on their own
-- uploaded image) without touching the shared template file.
--
-- Nullable, no default: NULL means "use the template's own hotspots, or
-- DEFAULT_HOTSPOTS if none" -- the app resolves that fallback chain, not
-- the database.
ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS hotspots jsonb;

-- Same documented shape as public/stalls/templates/templates.json's own
-- `hotspots` arrays: [{ kind, label, x, y, w, h }, ...], x/y/w/h as
-- percentages of the interior image's own natural width/height.

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'stalls_hotspots_column_exists', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stalls' AND column_name = 'hotspots'
  )
) AS proof;
