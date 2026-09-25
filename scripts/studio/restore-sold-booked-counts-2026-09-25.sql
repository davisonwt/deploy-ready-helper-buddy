-- SNAPSHOT + RESTORE, captured 2026-09-25 BEFORE
--   supabase/migrations/20260925160000_sold_and_booked_counts.sql
--
-- Before it ran, products.bestowal_count was 0 on all 134 products. The
-- backfill changed exactly these four (stored -> completed bestowals):
--   34f10a7b-d7ae-4ea9-9227-bc26a3415d13  Not the blood                                    0 -> 2
--   5e85b7c2-32f3-431e-85b9-5f57c9f5d73c  The Psalms Project (VOL 1) The Shira Collective   0 -> 1
--   2fd05388-0adf-4d37-a4b6-5026f1ac4c69  visions, dreams and riddles                      0 -> 1
--   5fdbcc66-988b-497c-a40f-464c4321041b  You, I love.                                     0 -> 4
-- Rows named explicitly; nothing is matched by a WHERE that could drift.

begin;
drop trigger if exists product_bestowals_count on public.product_bestowals;
drop function if exists public.trg_product_bestowals_count();
drop function if exists public.my_listing_booked_counts(uuid[]);

update public.products set bestowal_count = 0 where id in (
  '34f10a7b-d7ae-4ea9-9227-bc26a3415d13',
  '5e85b7c2-32f3-431e-85b9-5f57c9f5d73c',
  '2fd05388-0adf-4d37-a4b6-5026f1ac4c69',
  '5fdbcc66-988b-497c-a40f-464c4321041b'
);
commit;
