-- How many of each seed have sold -- for the SOWER, and nobody else.
--
-- ALREADY APPLIED on 2026-09-24 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- SOLD means the money completed. The status vocabulary is NOT the same in
-- every table, so this is spelled out per source rather than assumed:
--
--   product_bestowals.status        = 'completed'
--   content_purchases.payment_status= 'completed'   (check: pending,
--                                      processing, completed, failed, refunded)
--   music_purchases.payment_status  = 'completed'
--   book_orders.payment_status      IN ('paid','shipped','delivered')
--
-- That last one is the one to notice: book_orders has NO 'completed' state
-- at all. Its check constraint is
--   ('pending','paid','shipped','delivered','cancelled','refunded')
-- so 'paid' is where the money is captured and 'shipped'/'delivered' are
-- later states of a book that is already sold. Counting only 'completed'
-- there would have silently returned 0 for every book ever sold.
--
-- Excluded everywhere, as asked: pending, processing, failed, refunded,
-- cancelled.
--
-- The three seed sources are the ones lib/stalls/shelfSeeds.ts unions, and
-- ownership is resolved per source:
--   products          -> sowers.user_id, or companies.owner_user_id
--   sower_books       -> sower_books.user_id
--   dj_music_tracks   -> radio_djs.user_id via dj_music_tracks.dj_id
--
-- NOT products.bestowal_count. That column exists and is dead: measured
-- 2026-09-24 it reads 0 for every product that has completed bestowals
-- (four products with 1, 1, 2 and 4 real completed rows all show 0).
-- BulkSeedFeedPage still sorts by it, which is a separate problem.
--
-- VISIBILITY. A caller gets counts only for seeds they own. Not "gets them
-- and the UI hides them" -- a seed the caller does not own produces NO ROW,
-- so there is nothing to read off the wire. Logged out, auth.uid() is null,
-- nothing matches, and the result is empty.

create or replace function public.seed_sold_counts(seed_ids uuid[])
returns table (seed_id uuid, sold integer)
language sql
security definer
stable
set search_path to 'public'
as $function$
  with ids as (
    -- Bounded: one call covers a sheet or a list, not a scrape.
    select distinct unnest(seed_ids) as id limit 200
  ),
  owned as (
    select i.id from ids i
     where exists (
       select 1 from public.products p
         left join public.sowers s on s.id = p.sower_id
         left join public.companies c on c.id = p.company_id
       where p.id = i.id
         and (s.user_id = auth.uid() or c.owner_user_id = auth.uid()))
    union
    select i.id from ids i
     where exists (
       select 1 from public.sower_books b
       where b.id = i.id and b.user_id = auth.uid())
    union
    select i.id from ids i
     where exists (
       select 1 from public.dj_music_tracks t
         join public.radio_djs d on d.id = t.dj_id
       where t.id = i.id and d.user_id = auth.uid())
  )
  select
    o.id as seed_id,
    (
      (select count(*) from public.product_bestowals pb
        where pb.product_id = o.id and pb.status = 'completed')
    + (select count(*) from public.book_orders bo
        where bo.book_id = o.id and bo.payment_status in ('paid','shipped','delivered'))
    + (select count(*) from public.music_purchases mp
        where mp.track_id = o.id and mp.payment_status = 'completed')
    + (select count(*) from public.content_purchases cp
        where cp.content_id = o.id and cp.payment_status = 'completed')
    )::integer as sold
  from owned o;
$function$;

comment on function public.seed_sold_counts(uuid[]) is
  'Completed-sale counts for seeds the CALLER owns. Returns no row for a seed the caller does not own.';

revoke all on function public.seed_sold_counts(uuid[]) from public, anon;
grant execute on function public.seed_sold_counts(uuid[]) to authenticated;
