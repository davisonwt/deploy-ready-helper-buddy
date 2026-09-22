-- SNAPSHOT + RESTORE: wheel_seed_details for "Silver Hyundai Venue"
-- (davison.taljaard), taken 2026-09-22 before flipping availability back
-- to true.
--
-- Why this row needed restoring at all: tests/live/my-listings.spec.ts
-- test 4 clicks "Make unavailable" on this REAL listing and re-enables it
-- two assertions later. On 2026-09-22 it failed in between (line 173,
-- 'Hidden from Sleeping Seeds'), so the re-enable never ran, and the
-- file's afterAll safety net found no "Make available" button, did
-- nothing and logged nothing. The listing vanished from
-- /sleeping?tab=wheels because sleeping_wheels_near requires
-- `and d.availability`. The same spec did this once before, on
-- 2026-09-17.
--
-- State captured here is the DAMAGED state (availability = false), so
-- running this script puts the row back exactly as it was found today,
-- should the restore itself need undoing. The pre-damage value is
-- independently confirmed by C:\Users\Ezra\S2G-backups\
-- s2g-dump-2026-09-22.sql (07:03 local, pre-suite), where this row reads
-- availability = t and differs in NO other column.
--
-- Named row only, never a WHERE that could match differently later.
update public.wheel_seed_details set
  vehicle_type                = 'sedan',
  use_tags                    = '{parcels,passengers,deliveries}',
  driver_included             = true,
  rate_per_trip               = null,
  rate_hourly                 = null,
  rate_per_km                 = 14.99,
  rate_daily                  = null,
  rate_weekly                 = null,
  rate_monthly                = null,
  currency                    = 'ZAR',
  base_location               = 'Mossel Bay',
  base_lat                    = -34.1832022,
  base_lng                    = 22.1536248,
  availability                = false,   -- the damaged value, as found
  operator_confirmed_licensed = true,
  operator_confirmed_at       = '2026-09-16 17:18:48.452637+00',
  updated_at                  = '2026-09-22 09:12:48.155+00'
where product_id = '819a5b71-48a4-40c5-9fc7-f516aa82c348';
