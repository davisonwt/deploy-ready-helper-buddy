-- Farm-Stalls: adds a dedicated story field for the MY STORY hotspot sheet,
-- separate from profiles.bio (a stall owner may want a longer or
-- differently-formatted story than what shows on their general profile).
-- Nullable -- no backfill; StallHotspotSheet falls back to profiles.bio
-- when this is null (src/components/stalls/StallHotspotSheet.tsx).
--
-- No RLS change needed: stalls_owner_all / stalls_read_published
-- (20260910220000_farm_stalls.sql) are row-level policies on the whole
-- table, so they already cover this new column.

ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS story text;
