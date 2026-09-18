-- SNAPSHOT / RESTORE -- public.bookings, taken 2026-09-19 BEFORE
-- supabase/migrations/20260919090000_booking_status_flow.sql
--
-- STATE AT SNAPSHOT TIME, measured not assumed:
--   public.bookings row count ............ 0
--   status CHECK ......................... requested, accepted, declined,
--                                          expired, paid, cancelled
--   columns .............................. id, product_id, grower_user_id,
--     sower_user_id, company_id, status, starts_at, ends_at, quantity,
--     rate_unit, amount, s2g_fee, total, note, created_at, updated_at,
--     expires_at, provider, provider_order_id, payment_reference,
--     processor_fee, pillow_unit_id, currency
--
-- The table is EMPTY, so there is no member content to lose -- this exists
-- because the rule has no exceptions, and because the forward migration
-- widens a CHECK constraint and adds columns, both of which need an exact
-- way back. It restores the constraint and drops what the migration added.
--
-- If bookings rows exist by the time this is run, the DELETE below is
-- deliberately NOT included: rows written under the new flow are real
-- bookings and are not this script's to destroy. Narrow the constraint by
-- hand after deciding what to do with them.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/restore_bookings_status_20260919.sql

begin;

-- 1. Put the original status CHECK back.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status = any (array['requested','accepted','declined','expired','paid','cancelled']));

-- 2. Drop everything the forward migration added. `if exists` throughout so
--    this is safe to run whether or not the migration ever applied.
alter table public.bookings
  drop column if exists booking_kind,
  drop column if exists payment_status,
  drop column if exists accepted_at,
  drop column if exists declined_at,
  drop column if exists cancelled_at,
  drop column if exists started_at,
  drop column if exists on_my_way_at,
  drop column if exists arrived_at,
  drop column if exists in_transit_at,
  drop column if exists collected_at,
  drop column if exists completed_at,
  drop column if exists no_show_at,
  drop column if exists eta_minutes,
  drop column if exists eta_given_at,
  drop column if exists no_show_fee,
  drop column if exists provider_nudged_at;

drop table if exists public.booking_ratings;
drop function if exists public.expire_stale_booking_requests();
drop function if exists public.booking_no_show_claimable(uuid);

commit;

select 'bookings restored' as result,
       (select count(*) from public.bookings) as rows,
       (select pg_get_constraintdef(c.oid) from pg_constraint c
        join pg_class r on r.oid = c.conrelid
        where r.relname = 'bookings' and c.conname = 'bookings_status_check') as status_check;
