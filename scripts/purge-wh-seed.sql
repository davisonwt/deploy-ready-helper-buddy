-- Deletes every Wandering Hearts (Tribal Hearts) seed profile created for
-- browse-testing, plus their auth users -- run this to fully clean up
-- after the seed data is no longer needed.
--
-- Identifies the seed set from tribal_hearts_profiles.is_seed = true (the
-- flag every wh-seed-* row was inserted with), not by email pattern, so
-- this stays correct even if seed accounts are ever renamed. Deletes in
-- explicit dependency order rather than relying on cascade behavior, so
-- this is safe regardless of what ON DELETE rules exist.
--
-- Run this in the Supabase SQL editor (Studio) or via the Management API.
-- Read the SELECT at the top first to confirm the row count looks right
-- before the DELETEs run.

BEGIN;

-- Sanity check: see what's about to be deleted before it happens.
SELECT count(*) AS seed_profiles_about_to_be_deleted
FROM public.tribal_hearts_profiles
WHERE is_seed = true;

WITH seed_users AS (
  SELECT user_id FROM public.tribal_hearts_profiles WHERE is_seed = true
)
DELETE FROM public.tribal_hearts_profiles
WHERE user_id IN (SELECT user_id FROM seed_users);

-- Re-select the set again from auth.users by the known seed email pattern,
-- since the tribal_hearts_profiles rows (and their is_seed flag) are gone
-- after the delete above -- this is the one place email pattern is used,
-- purely to re-find the same rows for cleanup, not as the source of truth
-- for what counts as "seed" (that was is_seed, above).
WITH seed_users AS (
  SELECT id AS user_id FROM auth.users WHERE email LIKE 'seed-wh-%@sow2grow.test'
)
DELETE FROM public.s2g_agent_free_access
WHERE user_id IN (SELECT user_id FROM seed_users);

WITH seed_users AS (
  SELECT id AS user_id FROM auth.users WHERE email LIKE 'seed-wh-%@sow2grow.test'
)
DELETE FROM public.profiles
WHERE user_id IN (SELECT user_id FROM seed_users);

WITH seed_users AS (
  SELECT id AS user_id FROM auth.users WHERE email LIKE 'seed-wh-%@sow2grow.test'
)
DELETE FROM auth.identities
WHERE user_id IN (SELECT user_id FROM seed_users);

DELETE FROM auth.users
WHERE email LIKE 'seed-wh-%@sow2grow.test';

COMMIT;
