-- /sow/hand build (spec-service-seeds.md §5).
--
-- type CHECK gains 'service' — Hand rows are type='service', kind='hand'
-- (kind already allowed 'hand' from the earlier service-seeds migration).
alter table public.products drop constraint products_type_check;
alter table public.products add constraint products_type_check
  check (type = any (array[
    'music', 'file', 'art', 'ebook', 'book', 'produce', 'product', 'service'
  ]));

-- My Garden's kind filter row needs to tell a Hand seed apart from every
-- other product and show its rate, not a price — get_my_dashboard_content()
-- didn't select kind/price/service_details at all. Return-type change
-- requires drop + recreate, not a bare CREATE OR REPLACE.
drop function if exists public.get_my_dashboard_content();

create or replace function public.get_my_dashboard_content()
 returns table(source text, id uuid, title text, description text, category text, images text[], video_url text, cover_image_url text, image_urls text[], file_url text, music_genre text, music_mood text, artist_name text, created_at timestamp with time zone, kind text, price numeric, service_details jsonb)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with scope as (
    select user_id from public.get_my_account_scope()
  ), scoped_sowers as (
    select id from public.sowers where user_id in (select user_id from scope)
  )
  select
    'seed'::text,
    s.id,
    s.title,
    s.description,
    s.category,
    s.images,
    s.video_url,
    null::text,
    null::text[],
    null::text,
    s.music_genre,
    s.music_mood,
    null::text,
    s.created_at,
    null::text,
    null::numeric,
    null::jsonb
  from public.seeds s
  where s.gifter_id in (select user_id from scope)

  union all

  select
    ('product:' || coalesce(nullif(p.type, ''), 'product'))::text,
    p.id,
    p.title,
    p.description,
    coalesce(p.category, p.type),
    coalesce(p.image_urls, case when p.cover_image_url is not null then array[p.cover_image_url] else array[]::text[] end),
    null::text,
    p.cover_image_url,
    p.image_urls,
    p.file_url,
    p.music_genre,
    p.music_mood,
    p.artist_name,
    p.created_at,
    p.kind,
    p.price,
    p.service_details
  from public.products p
  where p.sower_id in (select id from scoped_sowers)
    and coalesce(p.status, 'active') <> 'archived'

  union all

  select
    'product:book'::text,
    b.id,
    b.title,
    b.description,
    coalesce(b.genre, b.category, 'book'),
    coalesce(b.image_urls, case when b.cover_image_url is not null then array[b.cover_image_url] else array[]::text[] end),
    null::text,
    b.cover_image_url,
    b.image_urls,
    null::text,
    null::text,
    null::text,
    null::text,
    b.created_at,
    null::text,
    null::numeric,
    null::jsonb
  from public.sower_books b
  where b.user_id in (select user_id from scope)
    and coalesce(b.status, 'active') <> 'archived'
  order by created_at desc nulls last
  limit 120
$function$;
