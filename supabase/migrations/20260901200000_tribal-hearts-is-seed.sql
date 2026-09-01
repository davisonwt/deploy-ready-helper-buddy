-- Marks synthetic/test Wandering Hearts profiles so they're distinguishable
-- from real members and can be purged in one clean sweep (see
-- scripts/purge-wh-seed.sql). Defaults false -- every existing and future
-- real profile is untouched.
ALTER TABLE public.tribal_hearts_profiles
  ADD COLUMN is_seed boolean NOT NULL DEFAULT false;
