-- Sleeping Pillow: a listing holds many units.
--
-- A resort offers a room AND a chalet AND a dome, each sleeping a different
-- number of people at a different price. pillow_seed_details holds ONE
-- stay_type, ONE sleeps and one set of rates, so it cannot say that.
--
-- This adds a pillow_units child table, mirroring the wheel_seed_details /
-- hand_seed_references shape already in use, and CONVERTS every existing
-- listing: its current stay_type, sleeps and rates become its first unit.
-- Nothing is deleted and nothing is hidden. The one existing listing,
-- "Beautifull Geodesic Domes Surrounded with Mountains", is real member data
-- and has a restore script at
-- scripts/studio/restore-geodesic-domes-pre-units.sql taken before this ran,
-- as the snapshot rule in CLAUDE.md requires.
--
-- RATES LIVE ON UNITS, not on both. Two places holding a price is the
-- failure this is meant to end, so after the backfill below the columns on
-- pillow_seed_details are no longer the source of truth. They are NOT
-- dropped here on purpose: the live app must be reading units before the
-- old columns disappear, or a running tab writing the old shape fails. The
-- drop is a separate migration, 20260917120000_pillow_units_drop_legacy.sql,
-- to be run only once the app is confirmed on units.
--
-- products.price stays as the listing's headline number because the generic
-- product feed reads it, but a trigger keeps it equal to the cheapest unit
-- nightly rate so it cannot drift from what the units say.

-- --- the unit type -------------------------------------------------------
do $$ begin
  create type public.pillow_unit_type as enum (
    'room', 'chalet', 'geodesic_dome', 'tent', 'safari_tent',
    'cabin', 'cottage', 'apartment', 'other'
  );
exception when duplicate_object then null;
end $$;

-- --- the table -----------------------------------------------------------
create table if not exists public.pillow_units (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  unit_type     public.pillow_unit_type not null default 'room',
  -- The host's own label, e.g. "Family chalet". Not a category.
  name          text not null,
  sleeps        integer not null default 2,
  rate_nightly  numeric,
  rate_weekly   numeric,
  rate_monthly  numeric,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint pillow_unit_name_not_blank check (btrim(name) <> ''),
  constraint pillow_unit_sleeps_sane    check (sleeps >= 1 and sleeps <= 200),
  -- At least one rate, same rule the listing had.
  constraint pillow_unit_at_least_one_rate
    check (coalesce(rate_nightly, rate_weekly, rate_monthly) is not null),
  constraint pillow_unit_rates_non_negative check (
        (rate_nightly is null or rate_nightly >= 0)
    and (rate_weekly  is null or rate_weekly  >= 0)
    and (rate_monthly is null or rate_monthly >= 0)
  )
);

create index if not exists pillow_units_product_idx
  on public.pillow_units (product_id, sort_order);

comment on table public.pillow_units is
  'One bookable unit of a Sleeping Pillow listing. A spare room is a listing '
  'with exactly one unit. Rates and sleeps live here, not on '
  'pillow_seed_details, so there is one place a price can come from.';

-- --- RLS: mirrors pillow_seed_details ------------------------------------
alter table public.pillow_units enable row level security;

drop policy if exists "pillow units readable by all" on public.pillow_units;
create policy "pillow units readable by all"
  on public.pillow_units for select using (true);

drop policy if exists "owner inserts own pillow units" on public.pillow_units;
create policy "owner inserts own pillow units"
  on public.pillow_units for insert
  with check (exists (
    select 1 from public.products p join public.sowers s on s.id = p.sower_id
     where p.id = pillow_units.product_id and s.user_id = auth.uid()));

drop policy if exists "owner updates own pillow units" on public.pillow_units;
create policy "owner updates own pillow units"
  on public.pillow_units for update
  using (exists (
    select 1 from public.products p join public.sowers s on s.id = p.sower_id
     where p.id = pillow_units.product_id and s.user_id = auth.uid()));

drop policy if exists "owner deletes own pillow units" on public.pillow_units;
create policy "owner deletes own pillow units"
  on public.pillow_units for delete
  using (exists (
    select 1 from public.products p join public.sowers s on s.id = p.sower_id
     where p.id = pillow_units.product_id and s.user_id = auth.uid()));

-- --- keep products.price equal to the cheapest unit ----------------------
create or replace function public.pillow_sync_headline_price()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_product_id uuid;
  v_cheapest numeric;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  select min(coalesce(u.rate_nightly, u.rate_weekly, u.rate_monthly))
    into v_cheapest
    from public.pillow_units u
   where u.product_id = v_product_id;
  if v_cheapest is not null then
    update public.products set price = v_cheapest, updated_at = now()
     where id = v_product_id and coalesce(price, -1) <> v_cheapest;
  end if;
  return null;
end; $$;

drop trigger if exists trg_pillow_units_price on public.pillow_units;
create trigger trg_pillow_units_price
  after insert or update or delete on public.pillow_units
  for each row execute function public.pillow_sync_headline_price();

-- --- convert every existing listing into its first unit ------------------
-- Idempotent: a listing that already has units is left alone, so re-running
-- this cannot duplicate anyone's data.
insert into public.pillow_units
  (product_id, unit_type, name, sleeps, rate_nightly, rate_weekly, rate_monthly, sort_order)
select
  d.product_id,
  case d.stay_type::text
    when 'bush_camp'        then 'tent'
    when 'room_in_home'     then 'room'
    when 'guest_house'      then 'room'
    when 'hotel_motel_room' then 'room'
    when 'farm_stay'        then 'cottage'
    when 'whole_place'      then 'cottage'
    else 'other'
  end::public.pillow_unit_type,
  -- The host never typed a unit name, so use the listing's own title. They
  -- can rename it in the form; it is their label, not a generated code.
  coalesce(nullif(btrim(p.title), ''), 'Unit 1'),
  coalesce(d.sleeps, 2),
  d.rate_nightly, d.rate_weekly, d.rate_monthly,
  0
from public.pillow_seed_details d
join public.products p on p.id = d.product_id
where not exists (select 1 from public.pillow_units u where u.product_id = d.product_id)
  -- The unit CHECK needs a rate. A listing with none cannot be converted and
  -- is reported by the pre-flight query rather than silently skipped.
  and coalesce(d.rate_nightly, d.rate_weekly, d.rate_monthly) is not null;

-- --- booking targets a unit ---------------------------------------------
-- Nullable and additive. The split math is untouched: the booking still
-- carries amount / s2g_fee / total exactly as before, it just derives them
-- from the chosen unit's rate instead of the listing's single rate. A
-- booking made before units existed keeps a null here and still reads fine.
alter table public.bookings
  add column if not exists pillow_unit_id uuid
    references public.pillow_units(id) on delete set null;

comment on column public.bookings.pillow_unit_id is
  'Which unit of a Sleeping Pillow listing was booked. Null for bookings of '
  'other seed kinds, and for pillow bookings made before units existed.';

-- --- the hub query, now unit-aware ---------------------------------------
-- from_rate is the cheapest nightly-or-any rate across the listing's units.
-- max_sleeps lets the sleeps filter match ANY unit rather than the listing.
create or replace function public.sleeping_pillows_near(
  _lat numeric, _lng numeric, _radius_m integer default 50000,
  _stay_types text[] default null, _amenities text[] default null,
  _min_sleeps integer default null, _rate_periods text[] default null,
  _limit integer default 60, _offset integer default 0)
returns table(
  product_id uuid, title text, description text, cover_image_url text,
  front_image_url text, interior_image_url text, gallery_urls text[],
  sower_id uuid, sower_name text, stay_type text, sleeps integer,
  amenities text[], currency character, rate_nightly numeric,
  rate_weekly numeric, rate_monthly numeric, base_location text,
  base_lat numeric, base_lng numeric, availability boolean,
  distance_m numeric, created_at timestamptz,
  unit_count integer, from_rate numeric, max_sleeps integer, unit_types text[])
language sql stable set search_path to 'public' as $function$
  with viewer as (select radians(_lat) as rlat, radians(_lng) as rlng),
  agg as (
    select u.product_id,
           count(*)::int as unit_count,
           min(coalesce(u.rate_nightly, u.rate_weekly, u.rate_monthly)) as from_rate,
           max(u.sleeps)::int as max_sleeps,
           array_agg(distinct u.unit_type::text) as unit_types,
           bool_or(u.rate_nightly is not null) as has_nightly,
           bool_or(u.rate_weekly  is not null) as has_weekly,
           bool_or(u.rate_monthly is not null) as has_monthly
      from public.pillow_units u group by u.product_id
  ),
  scored as (
    select
      p.id, p.title, p.description, p.cover_image_url,
      d.front_image_url, d.interior_image_url, d.gallery_urls,
      p.sower_id, s.display_name as sower_name,
      d.stay_type::text as stay_type, d.sleeps, d.amenities, d.currency,
      d.rate_nightly, d.rate_weekly, d.rate_monthly,
      d.base_location, d.base_lat, d.base_lng, d.availability, p.created_at,
      coalesce(a.unit_count, 0) as unit_count,
      a.from_rate,
      coalesce(a.max_sleeps, d.sleeps) as max_sleeps,
      coalesce(a.unit_types, array[]::text[]) as unit_types,
      6371000.0 * acos(least(1.0, greatest(-1.0,
        sin(v.rlat) * sin(radians(d.base_lat))
        + cos(v.rlat) * cos(radians(d.base_lat))
          * cos(radians(d.base_lng) - v.rlng)))) as distance_m
    from public.pillow_seed_details d
    join public.products p on p.id = d.product_id
    join public.sowers   s on s.id = p.sower_id
    left join agg a on a.product_id = d.product_id
    cross join viewer v
    where p.kind = 'pillow'
      and coalesce(p.status, 'active') <> 'archived'
      and d.availability
      and d.base_lat is not null and d.base_lng is not null
      -- Stay type now matches any unit's type, falling back to the listing's
      -- own value for a row that has not been converted yet.
      and (_stay_types is null or cardinality(_stay_types) = 0
           or d.stay_type::text = any(_stay_types)
           or coalesce(a.unit_types, array[]::text[]) && _stay_types)
      and (_amenities is null or cardinality(_amenities) = 0
           or d.amenities @> _amenities)
      -- ANY unit big enough is a match.
      and (_min_sleeps is null
           or coalesce(a.max_sleeps, d.sleeps, 0) >= _min_sleeps)
      and (_rate_periods is null or cardinality(_rate_periods) = 0
           or ('nightly' = any(_rate_periods) and coalesce(a.has_nightly, d.rate_nightly is not null))
           or ('weekly'  = any(_rate_periods) and coalesce(a.has_weekly,  d.rate_weekly  is not null))
           or ('monthly' = any(_rate_periods) and coalesce(a.has_monthly, d.rate_monthly is not null)))
  )
  select
    id, title, description, cover_image_url,
    front_image_url, interior_image_url, gallery_urls,
    sower_id, sower_name, stay_type, sleeps, amenities, currency,
    rate_nightly, rate_weekly, rate_monthly,
    base_location, base_lat, base_lng, availability,
    round(distance_m::numeric, 0) as distance_m, created_at,
    unit_count, from_rate, max_sleeps, unit_types
  from scored
  where distance_m <= _radius_m
  order by distance_m asc, created_at desc
  limit greatest(1, least(coalesce(_limit, 60), 200))
  offset greatest(0, coalesce(_offset, 0));
$function$;

notify pgrst, 'reload schema';
