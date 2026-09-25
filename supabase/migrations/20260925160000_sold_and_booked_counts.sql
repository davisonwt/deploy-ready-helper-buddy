-- 1. products.bestowal_count = completed product_bestowals, kept true.
--
--    Measured 2026-09-25: 0 on all 134 products, while four products had
--    2, 1, 1 and 4 completed bestowals; BulkSeedFeedPage and the "trending"
--    sort (src/api/products.ts) order by it, ProductsPage shows "N bestows".
--    Every reader treats it as "how many times this was bestowed", which is
--    exactly the invariant kept here:
--      bestowal_count = rows in product_bestowals with status 'completed'
--    A row becoming completed (insert, or update into it) adds one; a row
--    leaving completed (refunded, cancelled, anything else) or a completed
--    row being deleted takes one away; a completed row moved to another
--    product moves the one. A paid booking writes its own completed
--    product_bestowals row (_shared/paypal/capture.ts), so it counts too.
--    Plain row-level AFTER trigger, not deferred.
--    (s2g_library_items has its own bestowal_count; untouched.)
--
-- 2. my_listing_booked_counts(listing_ids): "Booked: N" on My Listings.
--    A booking counts once its payment has completed. The real capture
--    path marks that with bookings.status = 'paid' (payment_status is not
--    written there), and everything after it keeps the money:
--      status IN ('paid','in_progress','on_my_way','arrived','in_transit',
--                 'collected','delivered','completed','no_show')
--      AND payment_status IS DISTINCT FROM 'refunded'
--    Not counted: requested, accepted, declined, cancelled, expired, and
--    anything refunded. Owner-only, same ownership test as
--    seed_sold_counts: an id the caller does not own produces NO row. An
--    owned listing with no bookings produces a row with 0, so the UI can
--    show zero rather than hide it. One call covers a page (<= 200 ids).
-- Restore: scripts/studio/restore-sold-booked-counts-2026-09-25.sql

create or replace function public.trg_product_bestowals_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'completed';
  now_is boolean := tg_op in ('INSERT', 'UPDATE') and new.status = 'completed';
  moved boolean := tg_op = 'UPDATE' and old.product_id is distinct from new.product_id;
begin
  if was and (not now_is or moved) then
    update public.products set bestowal_count = bestowal_count - 1 where id = old.product_id;
  end if;
  if now_is and (not was or moved) then
    update public.products set bestowal_count = bestowal_count + 1 where id = new.product_id;
  end if;
  return null;
end;
$$;

revoke all on function public.trg_product_bestowals_count() from public, anon, authenticated;

drop trigger if exists product_bestowals_count on public.product_bestowals;
create trigger product_bestowals_count
  after insert or delete or update of status, product_id on public.product_bestowals
  for each row execute function public.trg_product_bestowals_count();

-- One-time backfill from the rows, so the trigger starts from truth.
update public.products p
   set bestowal_count = c.n
  from (select p2.id,
               (select count(*) from public.product_bestowals pb
                 where pb.product_id = p2.id and pb.status = 'completed')::bigint n
          from public.products p2) c
 where c.id = p.id and p.bestowal_count is distinct from c.n;

create or replace function public.my_listing_booked_counts(listing_ids uuid[])
returns table (listing_id uuid, booked integer)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select distinct unnest(listing_ids) as id limit 200
  ),
  owned as (
    select i.id from ids i
     where exists (
       select 1 from public.products p
         left join public.sowers s on s.id = p.sower_id
         left join public.companies c on c.id = p.company_id
       where p.id = i.id
         and (s.user_id = auth.uid() or c.owner_user_id = auth.uid()))
  )
  select o.id as listing_id,
         (select count(*) from public.bookings b
           where b.product_id = o.id
             and b.status in ('paid','in_progress','on_my_way','arrived','in_transit',
                              'collected','delivered','completed','no_show')
             and b.payment_status is distinct from 'refunded')::integer as booked
    from owned o;
$$;

revoke all on function public.my_listing_booked_counts(uuid[]) from public, anon;
grant execute on function public.my_listing_booked_counts(uuid[]) to authenticated;
