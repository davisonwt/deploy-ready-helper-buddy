-- Sleeping Pillows - structured stay listings for the /sleeping hub.
--
-- Deliberately a mirror of 20260916150000_sleeping_wheels.sql. Same shape,
-- same guarantees, same naming, so there is ONE pattern for service seeds
-- rather than two that drift.
--
-- Pillow seeds REMAIN rows in public.products (type='service', kind='pillow').
-- This file does not touch products' shared queries, feeds or RLS.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Stay type vocabulary
-- ---------------------------------------------------------------------------
do $sp_enum$
begin
  if not exists (select 1 from pg_type where typname = 'pillow_stay_type') then
    create type public.pillow_stay_type as enum
      ('room_in_home', 'whole_place', 'guest_house', 'hotel_motel_room',
       'farm_stay', 'bush_camp', 'other');
  end if;
end
$sp_enum$;

-- ---------------------------------------------------------------------------
-- 2. pillow_seed_details - one row per products row with kind='pillow'
--
--    Photos: front_image_url and interior_image_url are the agreed Pillow
--    pattern (you see the place from outside, then inside). gallery_urls
--    carries the rest. All three live in the private premium-room bucket and
--    are rendered through SignedImg.
-- ---------------------------------------------------------------------------
create table if not exists public.pillow_seed_details (
  product_id              uuid primary key
                          references public.products(id) on delete cascade,
  stay_type               public.pillow_stay_type not null,
  sleeps                  integer,
  amenities               text[] not null default '{}',
  rate_nightly            numeric(12,2),
  rate_weekly             numeric(12,2),
  rate_monthly            numeric(12,2),
  currency                char(3) not null,
  base_location           text,
  base_lat                numeric,
  base_lng                numeric,
  availability            boolean not null default true,
  front_image_url         text,
  interior_image_url      text,
  gallery_urls            text[] not null default '{}',
  operator_confirmed_legal boolean not null,
  operator_confirmed_at   timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- The letting confirmation is required. A row cannot exist without it.
alter table public.pillow_seed_details
  drop constraint if exists pillow_host_must_confirm;
alter table public.pillow_seed_details
  add constraint pillow_host_must_confirm check (operator_confirmed_legal);

-- At least one rate must be set.
alter table public.pillow_seed_details
  drop constraint if exists pillow_at_least_one_rate;
alter table public.pillow_seed_details
  add constraint pillow_at_least_one_rate check (
    coalesce(rate_nightly, rate_weekly, rate_monthly) is not null
  );

alter table public.pillow_seed_details
  drop constraint if exists pillow_rates_non_negative;
alter table public.pillow_seed_details
  add constraint pillow_rates_non_negative check (
    (rate_nightly is null or rate_nightly >= 0)
    and (rate_weekly  is null or rate_weekly  >= 0)
    and (rate_monthly is null or rate_monthly >= 0)
  );

alter table public.pillow_seed_details
  drop constraint if exists pillow_sleeps_sane;
alter table public.pillow_seed_details
  add constraint pillow_sleeps_sane check (sleeps is null or (sleeps >= 1 and sleeps <= 200));

alter table public.pillow_seed_details
  drop constraint if exists pillow_currency_iso4217;
alter table public.pillow_seed_details
  add constraint pillow_currency_iso4217 check (currency ~ '^[A-Z]{3}$');

alter table public.pillow_seed_details
  drop constraint if exists pillow_amenities_vocabulary;
alter table public.pillow_seed_details
  add constraint pillow_amenities_vocabulary check (
    amenities <@ array['own_bathroom','kitchen_access','wifi','parking','breakfast',
                       'pets_allowed','wheelchair_access','braai','pool']::text[]
  );

alter table public.pillow_seed_details
  drop constraint if exists pillow_base_coords_valid;
alter table public.pillow_seed_details
  add constraint pillow_base_coords_valid check (
    (base_lat is null or (base_lat >= -90  and base_lat <= 90))
    and (base_lng is null or (base_lng >= -180 and base_lng <= 180))
  );

create index if not exists pillow_seed_details_stay_type_idx
  on public.pillow_seed_details (stay_type);
create index if not exists pillow_seed_details_availability_idx
  on public.pillow_seed_details (availability);
create index if not exists pillow_seed_details_coords_idx
  on public.pillow_seed_details (base_lat, base_lng);
create index if not exists pillow_seed_details_sleeps_idx
  on public.pillow_seed_details (sleeps);
create index if not exists pillow_seed_details_amenities_idx
  on public.pillow_seed_details using gin (amenities);

comment on table public.pillow_seed_details is
  'Structured detail for a Pillow service seed. One row per products row with kind=pillow. Rates are stored in the listing currency and are never converted.';

-- ---------------------------------------------------------------------------
-- 3. RLS - owner writes, everyone reads
--    products.sower_id -> sowers.id -> sowers.user_id = auth.uid()
-- ---------------------------------------------------------------------------
alter table public.pillow_seed_details enable row level security;

drop policy if exists "pillow details readable by all" on public.pillow_seed_details;
create policy "pillow details readable by all"
  on public.pillow_seed_details for select using (true);

drop policy if exists "owner inserts own pillow details" on public.pillow_seed_details;
create policy "owner inserts own pillow details"
  on public.pillow_seed_details for insert
  with check (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = pillow_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner updates own pillow details" on public.pillow_seed_details;
create policy "owner updates own pillow details"
  on public.pillow_seed_details for update
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = pillow_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner deletes own pillow details" on public.pillow_seed_details;
create policy "owner deletes own pillow details"
  on public.pillow_seed_details for delete
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = pillow_seed_details.product_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Backfill from products.service_details
--
--    stay_type: room -> room_in_home, guest-house -> guest_house,
--               farm -> farm_stay, motel/hotel -> hotel_motel_room,
--               bush-camp -> bush_camp, anything else -> other.
--               No row is orphaned.
--    rates:     the old single price + rate_unit maps into its column.
--               per_night -> rate_nightly, per_week -> rate_weekly.
--               A missing unit is treated as per_night, the form's default.
--
--    There were ZERO pillow listings when this was written, so this is
--    expected to touch 0 rows. Section 5 reports the real number.
-- ---------------------------------------------------------------------------
insert into public.pillow_seed_details (
  product_id, stay_type, sleeps, amenities,
  rate_nightly, rate_weekly,
  currency, base_location, base_lat, base_lng, availability,
  front_image_url, interior_image_url, gallery_urls,
  operator_confirmed_legal, operator_confirmed_at
)
select
  p.id,
  (case lower(trim(coalesce(p.service_details->>'property_type', '')))
     when 'room'        then 'room_in_home'
     when 'guest-house' then 'guest_house'
     when 'farm'        then 'farm_stay'
     when 'motel'       then 'hotel_motel_room'
     when 'hotel'       then 'hotel_motel_room'
     when 'bush-camp'   then 'bush_camp'
     else 'other'
   end)::public.pillow_stay_type,
  nullif(trim(p.service_details->>'sleeps'), '')::integer,
  -- Only carry across amenity values the new vocabulary actually has.
  coalesce((
    select array_agg(a)
    from jsonb_array_elements_text(
      case when jsonb_typeof(p.service_details->'amenities') = 'array'
           then p.service_details->'amenities' else '[]'::jsonb end) as a
    where a in ('own_bathroom','kitchen_access','wifi','parking','breakfast',
                'pets_allowed','wheelchair_access','braai','pool')
  ), '{}'::text[]),
  case when coalesce(p.service_details->>'rate_unit', 'per_night') = 'per_night'
       then p.price end,
  case when p.service_details->>'rate_unit' = 'per_week' then p.price end,
  upper(coalesce(
    nullif(trim(pr.preferred_currency), ''),
    cc_alpha.currency_code,
    cc_name.currency_code,
    'USD'
  ))::char(3),
  coalesce(
    nullif(trim(p.service_details->>'location'), ''),
    nullif(trim(p.service_details->>'base_town'), ''),
    wr.base_town
  ),
  wr.lat,
  wr.lng,
  true,
  p.cover_image_url,
  (p.image_urls)[2],
  coalesce(p.image_urls[3:], '{}'::text[]),
  true,
  coalesce(p.created_at, now())
from public.products p
join public.sowers s              on s.id = p.sower_id
left join public.profiles pr      on pr.user_id = s.user_id
left join public.wandering_roles wr
       on wr.user_id = s.user_id and wr.role = 'pillow'
left join public.country_currency cc_alpha
       on cc_alpha.alpha2 = upper(nullif(trim(pr.country), ''))
left join public.country_currency cc_name
       on lower(cc_name.country_name) = lower(nullif(trim(pr.country), ''))
where p.kind = 'pillow'
  and p.price is not null
on conflict (product_id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Backfill report - raises a NOTICE, changes nothing
-- ---------------------------------------------------------------------------
do $sp_report$
declare
  v_total   integer;
  v_filled  integer;
  v_skipped integer;
begin
  select count(*) into v_total   from public.products where kind = 'pillow';
  select count(*) into v_filled  from public.pillow_seed_details;
  select count(*) into v_skipped
    from public.products where kind = 'pillow' and price is null;
  raise notice 'Sleeping Pillows backfill: % pillow products, % detail rows, % skipped for a null price',
    v_total, v_filled, v_skipped;
end
$sp_report$;

-- ---------------------------------------------------------------------------
-- 6. Proximity search
--
--    Same contract as sleeping_wheels_near: distance is METRES, results are
--    always bounded by _radius_m, and there is deliberately no worldwide mode.
-- ---------------------------------------------------------------------------
create or replace function public.sleeping_pillows_near(
  _lat          numeric,
  _lng          numeric,
  _radius_m     integer default 50000,
  _stay_types   text[]  default null,
  _amenities    text[]  default null,
  _min_sleeps   integer default null,
  _rate_periods text[]  default null,
  _limit        integer default 60,
  _offset       integer default 0
)
returns table (
  product_id         uuid,
  title              text,
  description        text,
  cover_image_url    text,
  front_image_url    text,
  interior_image_url text,
  gallery_urls       text[],
  sower_id           uuid,
  sower_name         text,
  stay_type          text,
  sleeps             integer,
  amenities          text[],
  currency           char(3),
  rate_nightly       numeric,
  rate_weekly        numeric,
  rate_monthly       numeric,
  base_location      text,
  base_lat           numeric,
  base_lng           numeric,
  availability       boolean,
  distance_m         numeric,
  created_at         timestamptz
)
language sql
stable
security invoker
set search_path = public
as $sp_near$
  with viewer as (
    select radians(_lat) as rlat, radians(_lng) as rlng
  ),
  scored as (
    select
      p.id,
      p.title,
      p.description,
      p.cover_image_url,
      d.front_image_url,
      d.interior_image_url,
      d.gallery_urls,
      p.sower_id,
      s.display_name as sower_name,
      d.stay_type::text as stay_type,
      d.sleeps,
      d.amenities,
      d.currency,
      d.rate_nightly, d.rate_weekly, d.rate_monthly,
      d.base_location, d.base_lat, d.base_lng,
      d.availability,
      p.created_at,
      6371000.0 * acos(
        least(1.0, greatest(-1.0,
          sin(v.rlat) * sin(radians(d.base_lat))
          + cos(v.rlat) * cos(radians(d.base_lat))
            * cos(radians(d.base_lng) - v.rlng)
        ))
      ) as distance_m
    from public.pillow_seed_details d
    join public.products p on p.id = d.product_id
    join public.sowers   s on s.id = p.sower_id
    cross join viewer v
    where p.kind = 'pillow'
      and coalesce(p.status, 'active') <> 'archived'
      and d.availability
      and d.base_lat is not null
      and d.base_lng is not null
      and (_stay_types is null or cardinality(_stay_types) = 0
           or d.stay_type::text = any(_stay_types))
      and (_amenities is null or cardinality(_amenities) = 0
           or d.amenities @> _amenities)
      and (_min_sleeps is null or (d.sleeps is not null and d.sleeps >= _min_sleeps))
      and (_rate_periods is null or cardinality(_rate_periods) = 0
           or (('nightly' = any(_rate_periods) and d.rate_nightly is not null)
            or ('weekly'  = any(_rate_periods) and d.rate_weekly  is not null)
            or ('monthly' = any(_rate_periods) and d.rate_monthly is not null)))
  )
  select
    id, title, description, cover_image_url,
    front_image_url, interior_image_url, gallery_urls,
    sower_id, sower_name, stay_type, sleeps, amenities, currency,
    rate_nightly, rate_weekly, rate_monthly,
    base_location, base_lat, base_lng, availability,
    round(distance_m::numeric, 0) as distance_m,
    created_at
  from scored
  where distance_m <= _radius_m
  order by distance_m asc, created_at desc
  limit greatest(1, least(coalesce(_limit, 60), 200))
  offset greatest(0, coalesce(_offset, 0));
$sp_near$;

comment on function public.sleeping_pillows_near is
  'Pillow listings within _radius_m metres of a point, nearest first. Distance is metres. Amenities match is AND (must have all selected). There is no worldwide mode by design.';

grant execute on function public.sleeping_pillows_near(
  numeric, numeric, integer, text[], text[], integer, text[], integer, integer
) to anon, authenticated;
