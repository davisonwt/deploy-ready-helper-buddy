-- Restore "S2G Electricians" (Davison's real hand listing) to available.
--
-- 2026-09-17: tests/live/my-listings.spec.ts test 4 clicks
--   getByRole('button', { name: 'Make unavailable' }).first()
-- on /my-listings. That was unambiguous when the owner account had exactly
-- one listing. It now has three, and "first" was the HAND listing, so the
-- spec toggled a real listing off instead of the test car. The spec has been
-- scoped to the car's own card so it cannot happen again.
--
-- Value before the test ran: availability = true (the listing was live and
-- visible in the Sleeping Hands hub). Nothing else on the row was touched --
-- the toggle only writes this one boolean.
--
-- Named by id, not by a WHERE that could match differently later.

begin;

update public.hand_seed_details
   set availability = true
 where product_id = 'a81857e8-b6b9-4f42-b4ae-17be0eecdd1d';

-- Expect: 1 row. The listing is Davison's "S2G Electricians".
select p.title, h.availability
  from public.hand_seed_details h
  join public.products p on p.id = h.product_id
 where h.product_id = 'a81857e8-b6b9-4f42-b4ae-17be0eecdd1d';

commit;
