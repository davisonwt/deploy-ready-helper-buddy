-- ONE-OFF cleanup: remove the QA data my verification runs created.
--
-- Counts measured against live on 2026-09-16, immediately before writing:
--   products with a title starting 'QA ' ......... 11   <- NOT 6
--   their wheel_seed_details rows ................ 11   (cascade)
--   user_notifications 'QA notification probe%' ... 1
--   bookings pointing at a QA listing ............. 1   (cascade)
--   product_bestowals / basket_items / books_items  0   (nothing real attached)
--
-- All 11 belong to davisontest1. None carries money. Every foreign key into
-- products is ON DELETE CASCADE or SET NULL, so deleting the products rows
-- is sufficient and leaves nothing orphaned.
--
-- The one booking is also QA: it came from the Sleeping Wheels verification
-- run that proved the booking request works end to end. It disappears with
-- its listing.
--
-- NOT covered here: the uploaded cover images still sit in the premium-room
-- storage bucket under covers/<davisontest1 id>/. Storage objects are not
-- reachable from SQL in a way that is safe to script, so remove those from
-- the dashboard's Storage browser if you want them gone.
--
-- Safe to re-run: after the first run every count is zero.

-- --- BEFORE -----------------------------------------------------------------
select 'BEFORE' as stage,
  (select count(*) from products where title like 'QA %')                       as qa_products,
  (select count(*) from wheel_seed_details d join products p on p.id = d.product_id
    where p.title like 'QA %')                                                  as qa_detail_rows,
  (select count(*) from bookings b join products p on p.id = b.product_id
    where p.title like 'QA %')                                                  as qa_bookings,
  (select count(*) from user_notifications
    where message like 'QA notification probe%')                                as qa_notifications;

-- --- WHAT IS ABOUT TO GO ----------------------------------------------------
select p.id, p.title, p.kind, s.display_name as owner, p.created_at
from public.products p
left join public.sowers s on s.id = p.sower_id
where p.title like 'QA %'
order by p.created_at;

-- --- DELETE -----------------------------------------------------------------
-- The detail rows would cascade anyway. Removing them explicitly first keeps
-- the row count visible rather than silent.
delete from public.wheel_seed_details d
using public.products p
where p.id = d.product_id
  and p.title like 'QA %';

delete from public.products
where title like 'QA %';

delete from public.user_notifications
where message like 'QA notification probe%';

-- --- AFTER ------------------------------------------------------------------
-- Every number here should be 0.
select 'AFTER' as stage,
  (select count(*) from products where title like 'QA %')                       as qa_products,
  (select count(*) from wheel_seed_details d join products p on p.id = d.product_id
    where p.title like 'QA %')                                                  as qa_detail_rows,
  (select count(*) from bookings b join products p on p.id = b.product_id
    where p.title like 'QA %')                                                  as qa_bookings,
  (select count(*) from user_notifications
    where message like 'QA notification probe%')                                as qa_notifications;

-- --- WHAT REMAINS -----------------------------------------------------------
-- Every real Wheel listing that should still be live after the cleanup.
select p.id, p.title, s.display_name as owner, d.availability, d.base_location
from public.products p
left join public.sowers s on s.id = p.sower_id
left join public.wheel_seed_details d on d.product_id = p.id
where p.kind = 'wheel'
order by p.created_at desc;
