-- SNAPSHOT / RESTORE -- taken 2026-09-19 BEFORE
-- supabase/migrations/20260919170000_booking_live_location.sql
--
-- STATE AT SNAPSHOT TIME, measured not assumed:
--   public.booking_live_locations ........ does not exist
--   public.live_location_host(text) ...... does not exist
--   public.booking_live_locations_guard()  does not exist
--   public.bookings ...................... NOT modified by the forward
--                                          migration -- no column added,
--                                          dropped, widened or nulled
--
-- NO MEMBER CONTENT IS OVERWRITTEN by the forward migration. It only
-- creates a new table and two new functions. This script exists because the
-- snapshot rule has no exceptions, and because a way back should be written
-- before the way forward, not after.
--
-- What it restores: the absence of those three objects.
--
-- THE DROP BELOW DESTROYS SHARED LINKS. Once members have used the feature,
-- booking_live_locations holds links members pasted themselves -- member
-- content by the rule's own definition. Run the SELECT in section 0 FIRST
-- and keep its output; the table is small and the rows are short.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/restore_booking_live_location_20260919.sql

-- 0. RUN THIS FIRST AND KEEP THE OUTPUT. Not part of the transaction below,
--    deliberately -- read it, save it, then run the rest.
--
--   select id, booking_id, shared_by_user_id, url, url_host,
--          created_at, updated_at, revoked_at
--     from public.booking_live_locations
--    order by created_at;
--
--    At the time of writing this returns 0 rows: the table does not exist
--    yet, and no member has shared a link.

begin;

-- 1. The trigger and its function.
drop trigger if exists booking_live_locations_guard_trg on public.booking_live_locations;
drop function if exists public.booking_live_locations_guard();

-- 2. The table, with its policies, grants, indexes and constraints.
drop table if exists public.booking_live_locations;

-- 3. The host allowlist helper. Dropped last: the CHECK and the trigger
--    above both reference it.
drop function if exists public.live_location_host(text);

commit;
