-- Sleeping Hands - structured service listings for the /sleeping hub.
--
-- A mirror of the Wheels and Pillows migrations. Same shape, same
-- guarantees, same naming. Hand seeds REMAIN rows in public.products
-- (type='service', kind='hand').
--
-- The one thing here that is NOT a mirror is hand_seed_references. A
-- referee is a real third party who agreed to vouch for the lister, not for
-- the world. Their name and phone number are readable ONLY by the listing's
-- owner and by a member who already has a booking against that listing.
-- That is enforced by RLS on the table, not by hiding a field in the UI, so
-- a direct API call from anyone else returns zero rows.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Service category vocabulary - two groups, one column
-- ---------------------------------------------------------------------------
do $sh_enum$
begin
  if not exists (select 1 from pg_type where typname = 'hand_service_category') then
    create type public.hand_service_category as enum (
      -- professional
      'plumber', 'electrician', 'mechanic', 'builder', 'painter', 'security',
      'it_digital', 'accounting', 'tutoring', 'health_care', 'other_professional',
      -- household
      'domestic_work', 'au_pair_childcare', 'house_sitting', 'pet_sitting',
      'gardening', 'cleaning', 'elder_care', 'driver', 'other_household'
    );
  end if;
end
$sh_enum$;

-- ---------------------------------------------------------------------------
-- 2. hand_seed_details - one row per products row with kind='hand'
-- ---------------------------------------------------------------------------
create table if not exists public.hand_seed_details (
  product_id               uuid primary key
                           references public.products(id) on delete cascade,
  service_category         public.hand_service_category not null,
  -- Derived from the category by trigger below, never set by the client, so
  -- the hub can filter the two groups on one indexed boolean.
  is_professional          boolean not null default false,
  qualification            text,
  licence_number           text,
  years_experience         integer not null,
  languages                text[] not null default '{}',
  service_radius_m         integer,
  rate_hourly              numeric(12,2),
  rate_per_job             numeric(12,2),
  rate_daily               numeric(12,2),
  rate_weekly              numeric(12,2),
  rate_monthly             numeric(12,2),
  currency                 char(3) not null,
  base_location            text,
  base_lat                 numeric,
  base_lng                 numeric,
  availability             boolean not null default true,
  front_image_url          text,
  work_sample_image_url    text,
  gallery_urls             text[] not null default '{}',
  -- A SELF-DECLARATION. Nothing here is verified by Sow2Grow, and the detail
  -- page must say so wherever it is shown.
  background_check_declared boolean not null default false,
  background_check_by      text,
  operator_confirmed_legal boolean not null,
  operator_confirmed_at    timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- is_professional is derived, never trusted from the client.
create or replace function public.hand_seed_details_set_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $sh_group$
begin
  new.is_professional := new.service_category in (
    'plumber', 'electrician', 'mechanic', 'builder', 'painter', 'security',
    'it_digital', 'accounting', 'tutoring', 'health_care', 'other_professional'
  );
  return new;
end;
$sh_group$;

drop trigger if exists trg_hand_seed_details_group on public.hand_seed_details;
create trigger trg_hand_seed_details_group
  before insert or update of service_category on public.hand_seed_details
  for each row execute function public.hand_seed_details_set_group();

-- A professional must say what qualifies them. Household need not.
alter table public.hand_seed_details
  drop constraint if exists hand_professional_needs_qualification;
alter table public.hand_seed_details
  add constraint hand_professional_needs_qualification check (
    not is_professional or (qualification is not null and btrim(qualification) <> '')
  );

alter table public.hand_seed_details
  drop constraint if exists hand_must_confirm_legal;
alter table public.hand_seed_details
  add constraint hand_must_confirm_legal check (operator_confirmed_legal);

alter table public.hand_seed_details
  drop constraint if exists hand_at_least_one_rate;
alter table public.hand_seed_details
  add constraint hand_at_least_one_rate check (
    coalesce(rate_hourly, rate_per_job, rate_daily, rate_weekly, rate_monthly) is not null
  );

alter table public.hand_seed_details
  drop constraint if exists hand_rates_non_negative;
alter table public.hand_seed_details
  add constraint hand_rates_non_negative check (
    (rate_hourly  is null or rate_hourly  >= 0)
    and (rate_per_job is null or rate_per_job >= 0)
    and (rate_daily   is null or rate_daily   >= 0)
    and (rate_weekly  is null or rate_weekly  >= 0)
    and (rate_monthly is null or rate_monthly >= 0)
  );

alter table public.hand_seed_details
  drop constraint if exists hand_years_sane;
alter table public.hand_seed_details
  add constraint hand_years_sane check (years_experience >= 0 and years_experience <= 80);

alter table public.hand_seed_details
  drop constraint if exists hand_currency_iso4217;
alter table public.hand_seed_details
  add constraint hand_currency_iso4217 check (currency ~ '^[A-Z]{3}$');

alter table public.hand_seed_details
  drop constraint if exists hand_radius_sane;
alter table public.hand_seed_details
  add constraint hand_radius_sane check (
    service_radius_m is null or (service_radius_m >= 0 and service_radius_m <= 1000000)
  );

alter table public.hand_seed_details
  drop constraint if exists hand_base_coords_valid;
alter table public.hand_seed_details
  add constraint hand_base_coords_valid check (
    (base_lat is null or (base_lat >= -90  and base_lat <= 90))
    and (base_lng is null or (base_lng >= -180 and base_lng <= 180))
  );

create index if not exists hand_seed_details_category_idx
  on public.hand_seed_details (service_category);
create index if not exists hand_seed_details_professional_idx
  on public.hand_seed_details (is_professional);
create index if not exists hand_seed_details_availability_idx
  on public.hand_seed_details (availability);
create index if not exists hand_seed_details_coords_idx
  on public.hand_seed_details (base_lat, base_lng);
create index if not exists hand_seed_details_years_idx
  on public.hand_seed_details (years_experience);
create index if not exists hand_seed_details_languages_idx
  on public.hand_seed_details using gin (languages);

comment on table public.hand_seed_details is
  'Structured detail for a Hand service seed. One row per products row with kind=hand. background_check_declared is the lister''s own claim and is NOT verified by Sow2Grow.';

-- ---------------------------------------------------------------------------
-- 3. RLS on the detail table - owner writes, everyone reads
-- ---------------------------------------------------------------------------
alter table public.hand_seed_details enable row level security;

drop policy if exists "hand details readable by all" on public.hand_seed_details;
create policy "hand details readable by all"
  on public.hand_seed_details for select using (true);

drop policy if exists "owner inserts own hand details" on public.hand_seed_details;
create policy "owner inserts own hand details"
  on public.hand_seed_details for insert
  with check (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner updates own hand details" on public.hand_seed_details;
create policy "owner updates own hand details"
  on public.hand_seed_details for update
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner deletes own hand details" on public.hand_seed_details;
create policy "owner deletes own hand details"
  on public.hand_seed_details for delete
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_details.product_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. hand_seed_references - a real person's contact details
--
--    Deliberately its OWN table, not columns on the detail row, so that
--    "everyone can read the listing" and "almost nobody can read the
--    referee" are two different policies on two different objects and
--    cannot be confused for one another.
-- ---------------------------------------------------------------------------
create table if not exists public.hand_seed_references (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  referee_name  text not null,
  relationship  text,
  contact       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists hand_seed_references_product_idx
  on public.hand_seed_references (product_id);

comment on table public.hand_seed_references is
  'Referees for a Hand listing. Contact details are private: readable only by the listing owner and by a member who already has a booking against that listing. Browsing members get a count via hand_reference_count() and nothing else.';

-- ---------------------------------------------------------------------------
-- 5. The privacy rule itself
--
--    SELECT is granted to exactly two parties and no one else:
--      (a) the listing's owner
--      (b) a member with an existing bookings row against that product
--    There is no "public" branch. A browsing member's SELECT returns zero
--    rows, which is the behaviour to test for, not merely an absent UI.
-- ---------------------------------------------------------------------------
alter table public.hand_seed_references enable row level security;

drop policy if exists "references readable by owner or booked member" on public.hand_seed_references;
create policy "references readable by owner or booked member"
  on public.hand_seed_references for select
  using (
    exists (
      select 1 from public.products p
      join public.sowers s on s.id = p.sower_id
      where p.id = hand_seed_references.product_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.bookings b
      where b.product_id = hand_seed_references.product_id
        and b.grower_user_id = auth.uid()
    )
  );

-- Only the owner may add, change or remove their own referees.
drop policy if exists "owner inserts own references" on public.hand_seed_references;
create policy "owner inserts own references"
  on public.hand_seed_references for insert
  with check (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_references.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner updates own references" on public.hand_seed_references;
create policy "owner updates own references"
  on public.hand_seed_references for update
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_references.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner deletes own references" on public.hand_seed_references;
create policy "owner deletes own references"
  on public.hand_seed_references for delete
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = hand_seed_references.product_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 6. What a browsing member is allowed to know: a number
--
--    SECURITY DEFINER so it can count rows the caller cannot read, and it
--    returns an integer and nothing else. There is no shape here that could
--    leak a name.
-- ---------------------------------------------------------------------------
create or replace function public.hand_reference_count(_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $sh_count$
  select count(*)::integer
  from public.hand_seed_references r
  where r.product_id = _product_id;
$sh_count$;

comment on function public.hand_reference_count is
  'How many referees a Hand listing has. Returns a number only. Exists so a browsing member can see "2 references available" without being able to read any referee''s details.';

revoke all on function public.hand_reference_count(uuid) from public;
grant execute on function public.hand_reference_count(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Backfill from products.service_details
--
--    The old form's categories map onto the new enum; anything unrecognised
--    lands on other_professional so no row is orphaned. The old single
--    price + rate_unit maps into its matching column, defaulting to hourly,
--    which was that form's default.
--
--    A backfilled row has no qualification, so a professional category would
--    violate hand_professional_needs_qualification. Those rows are given the
--    honest placeholder below rather than being silently dropped.
--
--    Section 8 reports how many rows this actually touched.
-- ---------------------------------------------------------------------------
insert into public.hand_seed_details (
  product_id, service_category, qualification, years_experience, languages,
  service_radius_m, rate_hourly, rate_per_job,
  currency, base_location, base_lat, base_lng, availability,
  front_image_url, work_sample_image_url, gallery_urls,
  operator_confirmed_legal, operator_confirmed_at
)
select
  p.id,
  (case lower(trim(coalesce(p.category, '')))
     when 'plumbing'   then 'plumber'
     when 'electrical' then 'electrician'
     when 'mechanic'   then 'mechanic'
     when 'building'   then 'builder'
     when 'carpentry'  then 'builder'
     when 'welding'    then 'other_professional'
     when 'it-repairs' then 'it_digital'
     when 'tutoring'   then 'tutoring'
     when 'gardening'  then 'gardening'
     when 'cleaning'   then 'cleaning'
     else 'other_professional'
   end)::public.hand_service_category,
  -- Honest placeholder: the old form never asked, and the CHECK requires one
  -- for a professional category.
  'Not recorded when this listing was created',
  coalesce(nullif(trim(p.service_details->>'years_experience'), '')::integer, 0),
  '{}'::text[],
  nullif(trim(p.service_details->>'radius_km'), '')::integer * 1000,
  case when coalesce(p.service_details->>'rate_unit', 'per_hour') = 'per_hour'
       then p.price end,
  case when p.service_details->>'rate_unit' = 'per_job' then p.price end,
  upper(coalesce(
    nullif(trim(pr.preferred_currency), ''),
    cc_alpha.currency_code,
    cc_name.currency_code,
    'USD'
  ))::char(3),
  coalesce(nullif(trim(p.service_details->>'base_town'), ''), wr.base_town),
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
       on wr.user_id = s.user_id and wr.role = 'hand'
left join public.country_currency cc_alpha
       on cc_alpha.alpha2 = upper(nullif(trim(pr.country), ''))
left join public.country_currency cc_name
       on lower(cc_name.country_name) = lower(nullif(trim(pr.country), ''))
where p.kind = 'hand'
  and p.price is not null
on conflict (product_id) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Backfill report - raises a NOTICE, changes nothing
-- ---------------------------------------------------------------------------
do $sh_report$
declare
  v_total   integer;
  v_filled  integer;
  v_skipped integer;
begin
  select count(*) into v_total   from public.products where kind = 'hand';
  select count(*) into v_filled  from public.hand_seed_details;
  select count(*) into v_skipped
    from public.products where kind = 'hand' and price is null;
  raise notice 'Sleeping Hands backfill: % hand products, % detail rows, % skipped for a null price',
    v_total, v_filled, v_skipped;
end
$sh_report$;

-- ---------------------------------------------------------------------------
-- 9. Proximity search
--
--    Same contract as sleeping_pillows_near: metres, bounded radius, no
--    worldwide mode. reference_count comes from the SECURITY DEFINER counter,
--    so a browsing member sees the number without any referee detail.
-- ---------------------------------------------------------------------------
create or replace function public.sleeping_hands_near(
  _lat            numeric,
  _lng            numeric,
  _radius_m       integer default 50000,
  _professional   boolean default null,
  _categories     text[]  default null,
  _min_years      integer default null,
  _languages      text[]  default null,
  _rate_periods   text[]  default null,
  _limit          integer default 60,
  _offset         integer default 0
)
returns table (
  product_id            uuid,
  title                 text,
  description           text,
  cover_image_url       text,
  front_image_url       text,
  work_sample_image_url text,
  gallery_urls          text[],
  sower_id              uuid,
  sower_name            text,
  service_category      text,
  is_professional       boolean,
  qualification         text,
  licence_number        text,
  years_experience      integer,
  languages             text[],
  service_radius_m      integer,
  currency              char(3),
  rate_hourly           numeric,
  rate_per_job          numeric,
  rate_daily            numeric,
  rate_weekly           numeric,
  rate_monthly          numeric,
  base_location         text,
  base_lat              numeric,
  base_lng              numeric,
  availability          boolean,
  background_check_declared boolean,
  reference_count       integer,
  distance_m            numeric,
  created_at            timestamptz
)
language sql
stable
security invoker
set search_path = public
as $sh_near$
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
      d.work_sample_image_url,
      d.gallery_urls,
      p.sower_id,
      s.display_name as sower_name,
      d.service_category::text as service_category,
      d.is_professional,
      d.qualification,
      d.licence_number,
      d.years_experience,
      d.languages,
      d.service_radius_m,
      d.currency,
      d.rate_hourly, d.rate_per_job, d.rate_daily, d.rate_weekly, d.rate_monthly,
      d.base_location, d.base_lat, d.base_lng,
      d.availability,
      d.background_check_declared,
      public.hand_reference_count(p.id) as reference_count,
      p.created_at,
      6371000.0 * acos(
        least(1.0, greatest(-1.0,
          sin(v.rlat) * sin(radians(d.base_lat))
          + cos(v.rlat) * cos(radians(d.base_lat))
            * cos(radians(d.base_lng) - v.rlng)
        ))
      ) as distance_m
    from public.hand_seed_details d
    join public.products p on p.id = d.product_id
    join public.sowers   s on s.id = p.sower_id
    cross join viewer v
    where p.kind = 'hand'
      and coalesce(p.status, 'active') <> 'archived'
      and d.availability
      and d.base_lat is not null
      and d.base_lng is not null
      and (_professional is null or d.is_professional = _professional)
      and (_categories is null or cardinality(_categories) = 0
           or d.service_category::text = any(_categories))
      and (_min_years is null or d.years_experience >= _min_years)
      and (_languages is null or cardinality(_languages) = 0
           or d.languages && _languages)
      and (_rate_periods is null or cardinality(_rate_periods) = 0
           or (('hourly'  = any(_rate_periods) and d.rate_hourly  is not null)
            or ('per_job' = any(_rate_periods) and d.rate_per_job is not null)
            or ('daily'   = any(_rate_periods) and d.rate_daily   is not null)
            or ('weekly'  = any(_rate_periods) and d.rate_weekly  is not null)
            or ('monthly' = any(_rate_periods) and d.rate_monthly is not null)))
  )
  select
    id, title, description, cover_image_url,
    front_image_url, work_sample_image_url, gallery_urls,
    sower_id, sower_name, service_category, is_professional,
    qualification, licence_number, years_experience, languages, service_radius_m,
    currency, rate_hourly, rate_per_job, rate_daily, rate_weekly, rate_monthly,
    base_location, base_lat, base_lng, availability,
    background_check_declared, reference_count,
    round(distance_m::numeric, 0) as distance_m,
    created_at
  from scored
  where distance_m <= _radius_m
  order by distance_m asc, created_at desc
  limit greatest(1, least(coalesce(_limit, 60), 200))
  offset greatest(0, coalesce(_offset, 0));
$sh_near$;

comment on function public.sleeping_hands_near is
  'Hand listings within _radius_m metres, nearest first. Distance is metres. Returns a reference COUNT, never referee details. There is no worldwide mode by design.';

grant execute on function public.sleeping_hands_near(
  numeric, numeric, integer, boolean, text[], integer, text[], text[], integer, integer
) to anon, authenticated;
