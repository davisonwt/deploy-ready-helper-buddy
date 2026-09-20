-- get_total_member_count() (20260920120000_total_member_count_rpc.sql)
-- counted every profiles row -- S2G-run system stall accounts and
-- Playwright test accounts included -- because no persisted "not a real
-- member" flag existed yet. profiles.is_system (20260920130000_profiles_
-- is_system.sql) is that flag now, backfilled for all 13 currently-known
-- non-member accounts (scripts/studio/backfill-profiles-is-system-
-- 20260920.sql). Confirmed live: 96 total profiles, 13 flagged system,
-- 83 real members -- the badge should read 83, not 96.

CREATE OR REPLACE FUNCTION public.get_total_member_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles WHERE NOT is_system;
$$;
