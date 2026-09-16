-- Sleeping Wheels - structured vehicle listings for the /sleeping hub.
-- Phase 1 of 3. Tracking is Phase 2, design polish is Phase 3.
--
-- Wheel seeds REMAIN rows in public.products (type='service', kind='wheel').
-- This file does not touch products' shared queries, feeds or RLS.
-- It adds: a 1:1 detail table, a worldwide country->currency default table,
-- a geocode cache, and one proximity search function.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Vehicle type vocabulary
-- ---------------------------------------------------------------------------
do $sw_enum$
begin
  if not exists (select 1 from pg_type where typname = 'wheel_vehicle_type') then
    create type public.wheel_vehicle_type as enum
      ('sedan', 'bakkie', 'truck', 'yellow_machine', 'farming_vehicle', 'other');
  end if;
end
$sw_enum$;

-- ---------------------------------------------------------------------------
-- 2. Country -> default currency (ISO 3166-1 alpha-2 -> ISO 4217)
--    Used ONLY to pre-fill a new listing's currency. Always editable.
--    No country is privileged and none acts as a global fallback.
-- ---------------------------------------------------------------------------
create table if not exists public.country_currency (
  alpha2        char(2) primary key,
  country_name  text not null,
  currency_code char(3) not null
);

insert into public.country_currency (alpha2, country_name, currency_code) values
('AD','Andorra','EUR'),('AE','United Arab Emirates','AED'),('AF','Afghanistan','AFN'),
('AG','Antigua and Barbuda','XCD'),('AL','Albania','ALL'),('AM','Armenia','AMD'),
('AO','Angola','AOA'),('AR','Argentina','ARS'),('AT','Austria','EUR'),
('AU','Australia','AUD'),('AZ','Azerbaijan','AZN'),('BA','Bosnia and Herzegovina','BAM'),
('BB','Barbados','BBD'),('BD','Bangladesh','BDT'),('BE','Belgium','EUR'),
('BF','Burkina Faso','XOF'),('BG','Bulgaria','BGN'),('BH','Bahrain','BHD'),
('BI','Burundi','BIF'),('BJ','Benin','XOF'),('BN','Brunei','BND'),
('BO','Bolivia','BOB'),('BR','Brazil','BRL'),('BS','Bahamas','BSD'),
('BT','Bhutan','BTN'),('BW','Botswana','BWP'),('BY','Belarus','BYN'),
('BZ','Belize','BZD'),('CA','Canada','CAD'),('CD','Congo Kinshasa','CDF'),
('CF','Central African Republic','XAF'),('CG','Congo Brazzaville','XAF'),
('CH','Switzerland','CHF'),('CI','Cote dIvoire','XOF'),('CL','Chile','CLP'),
('CM','Cameroon','XAF'),('CN','China','CNY'),('CO','Colombia','COP'),
('CR','Costa Rica','CRC'),('CU','Cuba','CUP'),('CV','Cabo Verde','CVE'),
('CY','Cyprus','EUR'),('CZ','Czechia','CZK'),('DE','Germany','EUR'),
('DJ','Djibouti','DJF'),('DK','Denmark','DKK'),('DM','Dominica','XCD'),
('DO','Dominican Republic','DOP'),('DZ','Algeria','DZD'),('EC','Ecuador','USD'),
('EE','Estonia','EUR'),('EG','Egypt','EGP'),('ER','Eritrea','ERN'),
('ES','Spain','EUR'),('ET','Ethiopia','ETB'),('FI','Finland','EUR'),
('FJ','Fiji','FJD'),('FM','Micronesia','USD'),('FR','France','EUR'),
('GA','Gabon','XAF'),('GB','United Kingdom','GBP'),('GD','Grenada','XCD'),
('GE','Georgia','GEL'),('GH','Ghana','GHS'),('GM','Gambia','GMD'),
('GN','Guinea','GNF'),('GQ','Equatorial Guinea','XAF'),('GR','Greece','EUR'),
('GT','Guatemala','GTQ'),('GW','Guinea-Bissau','XOF'),('GY','Guyana','GYD'),
('HN','Honduras','HNL'),('HR','Croatia','EUR'),('HT','Haiti','HTG'),
('HU','Hungary','HUF'),('ID','Indonesia','IDR'),('IE','Ireland','EUR'),
('IL','Israel','ILS'),('IN','India','INR'),('IQ','Iraq','IQD'),
('IR','Iran','IRR'),('IS','Iceland','ISK'),('IT','Italy','EUR'),
('JM','Jamaica','JMD'),('JO','Jordan','JOD'),('JP','Japan','JPY'),
('KE','Kenya','KES'),('KG','Kyrgyzstan','KGS'),('KH','Cambodia','KHR'),
('KI','Kiribati','AUD'),('KM','Comoros','KMF'),('KN','Saint Kitts and Nevis','XCD'),
('KP','North Korea','KPW'),('KR','South Korea','KRW'),('KW','Kuwait','KWD'),
('KZ','Kazakhstan','KZT'),('LA','Laos','LAK'),('LB','Lebanon','LBP'),
('LC','Saint Lucia','XCD'),('LI','Liechtenstein','CHF'),('LK','Sri Lanka','LKR'),
('LR','Liberia','LRD'),('LS','Lesotho','LSL'),('LT','Lithuania','EUR'),
('LU','Luxembourg','EUR'),('LV','Latvia','EUR'),('LY','Libya','LYD'),
('MA','Morocco','MAD'),('MC','Monaco','EUR'),('MD','Moldova','MDL'),
('ME','Montenegro','EUR'),('MG','Madagascar','MGA'),('MH','Marshall Islands','USD'),
('MK','North Macedonia','MKD'),('ML','Mali','XOF'),('MM','Myanmar','MMK'),
('MN','Mongolia','MNT'),('MR','Mauritania','MRU'),('MT','Malta','EUR'),
('MU','Mauritius','MUR'),('MV','Maldives','MVR'),('MW','Malawi','MWK'),
('MX','Mexico','MXN'),('MY','Malaysia','MYR'),('MZ','Mozambique','MZN'),
('NA','Namibia','NAD'),('NE','Niger','XOF'),('NG','Nigeria','NGN'),
('NI','Nicaragua','NIO'),('NL','Netherlands','EUR'),('NO','Norway','NOK'),
('NP','Nepal','NPR'),('NR','Nauru','AUD'),('NZ','New Zealand','NZD'),
('OM','Oman','OMR'),('PA','Panama','PAB'),('PE','Peru','PEN'),
('PG','Papua New Guinea','PGK'),('PH','Philippines','PHP'),('PK','Pakistan','PKR'),
('PL','Poland','PLN'),('PT','Portugal','EUR'),('PW','Palau','USD'),
('PY','Paraguay','PYG'),('QA','Qatar','QAR'),('RO','Romania','RON'),
('RS','Serbia','RSD'),('RU','Russia','RUB'),('RW','Rwanda','RWF'),
('SA','Saudi Arabia','SAR'),('SB','Solomon Islands','SBD'),('SC','Seychelles','SCR'),
('SD','Sudan','SDG'),('SE','Sweden','SEK'),('SG','Singapore','SGD'),
('SI','Slovenia','EUR'),('SK','Slovakia','EUR'),('SL','Sierra Leone','SLE'),
('SM','San Marino','EUR'),('SN','Senegal','XOF'),('SO','Somalia','SOS'),
('SR','Suriname','SRD'),('SS','South Sudan','SSP'),('ST','Sao Tome and Principe','STN'),
('SV','El Salvador','USD'),('SY','Syria','SYP'),('SZ','Eswatini','SZL'),
('TD','Chad','XAF'),('TG','Togo','XOF'),('TH','Thailand','THB'),
('TJ','Tajikistan','TJS'),('TL','Timor-Leste','USD'),('TM','Turkmenistan','TMT'),
('TN','Tunisia','TND'),('TO','Tonga','TOP'),('TR','Turkiye','TRY'),
('TT','Trinidad and Tobago','TTD'),('TV','Tuvalu','AUD'),('TZ','Tanzania','TZS'),
('UA','Ukraine','UAH'),('UG','Uganda','UGX'),('US','United States','USD'),
('UY','Uruguay','UYU'),('UZ','Uzbekistan','UZS'),('VA','Holy See','EUR'),
('VC','Saint Vincent and the Grenadines','XCD'),('VE','Venezuela','VES'),
('VN','Vietnam','VND'),('VU','Vanuatu','VUV'),('WS','Samoa','WST'),
('YE','Yemen','YER'),('ZA','South Africa','ZAR'),('ZM','Zambia','ZMW'),
('ZW','Zimbabwe','ZWG')
on conflict (alpha2) do nothing;

alter table public.country_currency enable row level security;

drop policy if exists "country_currency readable by all" on public.country_currency;
create policy "country_currency readable by all"
  on public.country_currency for select using (true);

-- ---------------------------------------------------------------------------
-- 3. wheel_seed_details - one row per products row with kind='wheel'
-- ---------------------------------------------------------------------------
create table if not exists public.wheel_seed_details (
  product_id                  uuid primary key
                              references public.products(id) on delete cascade,
  vehicle_type                public.wheel_vehicle_type not null,
  use_tags                    text[] not null default '{}',
  driver_included             boolean not null default true,
  rate_per_trip               numeric(12,2),
  rate_hourly                 numeric(12,2),
  rate_per_km                 numeric(12,2),
  rate_daily                  numeric(12,2),
  rate_weekly                 numeric(12,2),
  rate_monthly                numeric(12,2),
  currency                    char(3) not null,
  base_location               text,
  base_lat                    numeric,
  base_lng                    numeric,
  availability                boolean not null default true,
  operator_confirmed_licensed boolean not null,
  operator_confirmed_at       timestamptz not null default now(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Driver-with-vehicle only. Never a self-drive rental.
alter table public.wheel_seed_details
  drop constraint if exists wheel_driver_always_included;
alter table public.wheel_seed_details
  add constraint wheel_driver_always_included check (driver_included);

-- The licensing confirmation is required. A row cannot exist without it.
alter table public.wheel_seed_details
  drop constraint if exists wheel_operator_must_confirm;
alter table public.wheel_seed_details
  add constraint wheel_operator_must_confirm check (operator_confirmed_licensed);

-- At least one rate must be set.
alter table public.wheel_seed_details
  drop constraint if exists wheel_at_least_one_rate;
alter table public.wheel_seed_details
  add constraint wheel_at_least_one_rate check (
    coalesce(rate_per_trip, rate_hourly, rate_per_km,
             rate_daily, rate_weekly, rate_monthly) is not null
  );

-- No negative rates.
alter table public.wheel_seed_details
  drop constraint if exists wheel_rates_non_negative;
alter table public.wheel_seed_details
  add constraint wheel_rates_non_negative check (
    (rate_per_trip is null or rate_per_trip >= 0)
    and (rate_hourly  is null or rate_hourly  >= 0)
    and (rate_per_km  is null or rate_per_km  >= 0)
    and (rate_daily   is null or rate_daily   >= 0)
    and (rate_weekly  is null or rate_weekly  >= 0)
    and (rate_monthly is null or rate_monthly >= 0)
  );

alter table public.wheel_seed_details
  drop constraint if exists wheel_currency_iso4217;
alter table public.wheel_seed_details
  add constraint wheel_currency_iso4217 check (currency ~ '^[A-Z]{3}$');

alter table public.wheel_seed_details
  drop constraint if exists wheel_use_tags_vocabulary;
alter table public.wheel_seed_details
  add constraint wheel_use_tags_vocabulary check (
    use_tags <@ array['parcels','passengers','deliveries','sand','stone',
                      'garden_waste','furniture_moving','livestock',
                      'construction','farming','other']::text[]
  );

alter table public.wheel_seed_details
  drop constraint if exists wheel_base_coords_valid;
alter table public.wheel_seed_details
  add constraint wheel_base_coords_valid check (
    (base_lat is null or (base_lat >= -90  and base_lat <= 90))
    and (base_lng is null or (base_lng >= -180 and base_lng <= 180))
  );

create index if not exists wheel_seed_details_vehicle_type_idx
  on public.wheel_seed_details (vehicle_type);
create index if not exists wheel_seed_details_availability_idx
  on public.wheel_seed_details (availability);
create index if not exists wheel_seed_details_coords_idx
  on public.wheel_seed_details (base_lat, base_lng);
create index if not exists wheel_seed_details_use_tags_idx
  on public.wheel_seed_details using gin (use_tags);

comment on table public.wheel_seed_details is
  'Structured detail for a Wheel service seed. One row per products row with kind=wheel. Rates are stored in the listing currency and are never converted.';

-- ---------------------------------------------------------------------------
-- 4. RLS - owner writes, everyone reads
--    products.sower_id -> sowers.id -> sowers.user_id = auth.uid()
-- ---------------------------------------------------------------------------
alter table public.wheel_seed_details enable row level security;

drop policy if exists "wheel details readable by all" on public.wheel_seed_details;
create policy "wheel details readable by all"
  on public.wheel_seed_details for select using (true);

drop policy if exists "owner inserts own wheel details" on public.wheel_seed_details;
create policy "owner inserts own wheel details"
  on public.wheel_seed_details for insert
  with check (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = wheel_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner updates own wheel details" on public.wheel_seed_details;
create policy "owner updates own wheel details"
  on public.wheel_seed_details for update
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = wheel_seed_details.product_id and s.user_id = auth.uid()
  ));

drop policy if exists "owner deletes own wheel details" on public.wheel_seed_details;
create policy "owner deletes own wheel details"
  on public.wheel_seed_details for delete
  using (exists (
    select 1 from public.products p
    join public.sowers s on s.id = p.sower_id
    where p.id = wheel_seed_details.product_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 5. Backfill existing Wheel seeds from products.service_details
--
--    vehicle_type: construction-vehicle -> yellow_machine
--                  farm-vehicle         -> farming_vehicle
--                  sedan/bakkie/truck   -> unchanged
--                  anything else        -> other        (no row is orphaned)
--
--    rates: the old single price + rate_unit maps into its matching column.
--           per_trip -> rate_per_trip, per_hour -> rate_hourly,
--           per_km   -> rate_per_km,   per_day  -> rate_daily.
--           A missing unit is treated as per_trip, which was the form default.
--
--    Rows with no price cannot satisfy "at least one rate" and are skipped
--    rather than given a fabricated 0. They stay invisible to the hub until
--    their owner edits them. Section 6 reports how many were skipped.
-- ---------------------------------------------------------------------------
insert into public.wheel_seed_details (
  product_id, vehicle_type, use_tags, driver_included,
  rate_per_trip, rate_hourly, rate_per_km, rate_daily,
  currency, base_location, base_lat, base_lng, availability,
  operator_confirmed_licensed, operator_confirmed_at
)
select
  p.id,
  (case lower(trim(coalesce(p.service_details->>'vehicle_type', '')))
     when 'construction-vehicle' then 'yellow_machine'
     when 'farm-vehicle'         then 'farming_vehicle'
     when 'sedan'                then 'sedan'
     when 'bakkie'               then 'bakkie'
     when 'truck'                then 'truck'
     else 'other'
   end)::public.wheel_vehicle_type,
  '{}'::text[],
  true,
  case when coalesce(p.service_details->>'rate_unit', 'per_trip') = 'per_trip'
       then p.price end,
  case when p.service_details->>'rate_unit' = 'per_hour' then p.price end,
  case when p.service_details->>'rate_unit' = 'per_km'   then p.price end,
  case when p.service_details->>'rate_unit' = 'per_day'  then p.price end,
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
  true,
  coalesce(p.created_at, now())
from public.products p
join public.sowers s              on s.id = p.sower_id
left join public.profiles pr      on pr.user_id = s.user_id
left join public.wandering_roles wr
       on wr.user_id = s.user_id and wr.role = 'wheel'
left join public.country_currency cc_alpha
       on cc_alpha.alpha2 = upper(nullif(trim(pr.country), ''))
left join public.country_currency cc_name
       on lower(cc_name.country_name) = lower(nullif(trim(pr.country), ''))
where p.kind = 'wheel'
  and p.price is not null
on conflict (product_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Backfill report - raises a NOTICE, changes nothing
-- ---------------------------------------------------------------------------
do $sw_report$
declare
  v_total   integer;
  v_filled  integer;
  v_skipped integer;
begin
  select count(*) into v_total   from public.products where kind = 'wheel';
  select count(*) into v_filled  from public.wheel_seed_details;
  select count(*) into v_skipped
    from public.products where kind = 'wheel' and price is null;
  raise notice 'Sleeping Wheels backfill: % wheel products, % detail rows, % skipped for a null price',
    v_total, v_filled, v_skipped;
end
$sw_report$;

-- ---------------------------------------------------------------------------
-- 7. Geocode cache - Nominatim answers, kept server-side
--    Written only by the geocode-place edge function (service role).
--    No client-side policy: RLS is on and no SELECT policy exists, so
--    anon and authenticated cannot read or write it.
-- ---------------------------------------------------------------------------
create table if not exists public.geocode_cache (
  query_norm   text primary key,
  lat          numeric not null,
  lng          numeric not null,
  display_name text,
  provider     text not null default 'nominatim',
  hit_count    integer not null default 1,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;

create index if not exists geocode_cache_last_used_idx
  on public.geocode_cache (last_used_at);

comment on table public.geocode_cache is
  'Server-side cache of Nominatim geocoding answers. Written by the geocode-place edge function only. No client policy by design.';

-- ---------------------------------------------------------------------------
-- 8. Proximity search
--
--    Distance is the great-circle distance in METRES. Metres are the only
--    unit stored or returned anywhere; miles are a display choice the client
--    makes from the viewer's locale.
--
--    Results are always bounded by _radius_m. There is deliberately no
--    worldwide mode.
-- ---------------------------------------------------------------------------
create or replace function public.sleeping_wheels_near(
  _lat            numeric,
  _lng            numeric,
  _radius_m       integer default 50000,
  _vehicle_types  text[]  default null,
  _use_tags       text[]  default null,
  _rate_periods   text[]  default null,
  _limit          integer default 60,
  _offset         integer default 0
)
returns table (
  product_id      uuid,
  title           text,
  description     text,
  cover_image_url text,
  image_urls      text[],
  sower_id        uuid,
  sower_name      text,
  vehicle_type    text,
  use_tags        text[],
  currency        char(3),
  rate_per_trip   numeric,
  rate_hourly     numeric,
  rate_per_km     numeric,
  rate_daily      numeric,
  rate_weekly     numeric,
  rate_monthly    numeric,
  base_location   text,
  base_lat        numeric,
  base_lng        numeric,
  availability    boolean,
  distance_m      numeric,
  created_at      timestamptz
)
language sql
stable
security invoker
set search_path = public
as $sw_near$
  with viewer as (
    select
      radians(_lat) as rlat,
      radians(_lng) as rlng
  ),
  scored as (
    select
      p.id,
      p.title,
      p.description,
      p.cover_image_url,
      p.image_urls,
      p.sower_id,
      s.display_name as sower_name,
      d.vehicle_type::text as vehicle_type,
      d.use_tags,
      d.currency,
      d.rate_per_trip, d.rate_hourly, d.rate_per_km,
      d.rate_daily,    d.rate_weekly, d.rate_monthly,
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
    from public.wheel_seed_details d
    join public.products p on p.id = d.product_id
    join public.sowers   s on s.id = p.sower_id
    cross join viewer v
    where p.kind = 'wheel'
      and coalesce(p.status, 'active') <> 'archived'
      and d.availability
      and d.base_lat is not null
      and d.base_lng is not null
      and (_vehicle_types is null or cardinality(_vehicle_types) = 0
           or d.vehicle_type::text = any(_vehicle_types))
      and (_use_tags is null or cardinality(_use_tags) = 0
           or d.use_tags && _use_tags)
      and (_rate_periods is null or cardinality(_rate_periods) = 0
           or (('per_trip' = any(_rate_periods) and d.rate_per_trip is not null)
            or ('hourly'   = any(_rate_periods) and d.rate_hourly   is not null)
            or ('per_km'   = any(_rate_periods) and d.rate_per_km   is not null)
            or ('daily'    = any(_rate_periods) and d.rate_daily    is not null)
            or ('weekly'   = any(_rate_periods) and d.rate_weekly   is not null)
            or ('monthly'  = any(_rate_periods) and d.rate_monthly  is not null)))
  )
  select
    id, title, description, cover_image_url, image_urls,
    sower_id, sower_name, vehicle_type, use_tags, currency,
    rate_per_trip, rate_hourly, rate_per_km,
    rate_daily, rate_weekly, rate_monthly,
    base_location, base_lat, base_lng, availability,
    round(distance_m::numeric, 0) as distance_m,
    created_at
  from scored
  where distance_m <= _radius_m
  order by distance_m asc, created_at desc
  limit greatest(1, least(coalesce(_limit, 60), 200))
  offset greatest(0, coalesce(_offset, 0));
$sw_near$;

comment on function public.sleeping_wheels_near is
  'Wheel listings within _radius_m metres of a point, nearest first. Distance is metres. There is no worldwide mode by design.';

grant execute on function public.sleeping_wheels_near(
  numeric, numeric, integer, text[], text[], text[], integer, integer
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Proximity search for the other two Sleeping tabs
--
--    Pillows and Hands have no structured detail table yet (Wheels is the
--    one this phase models). Their position comes from the owner's
--    wandering_roles row, which already carries lat/lng and base_town.
--
--    Same contract as sleeping_wheels_near: metres, bounded radius, no
--    worldwide mode. A listing whose owner has no coordinates simply does
--    not appear, which is correct for a proximity directory.
-- ---------------------------------------------------------------------------
create or replace function public.sleeping_services_near(
  _kind     text,
  _lat      numeric,
  _lng      numeric,
  _radius_m integer default 50000,
  _limit    integer default 60,
  _offset   integer default 0
)
returns table (
  product_id      uuid,
  title           text,
  description     text,
  cover_image_url text,
  image_urls      text[],
  sower_id        uuid,
  sower_name      text,
  price           numeric,
  base_location   text,
  distance_m      numeric,
  created_at      timestamptz
)
language sql
stable
security invoker
set search_path = public
as $sv_near$
  with viewer as (
    select radians(_lat) as rlat, radians(_lng) as rlng
  ),
  scored as (
    select
      p.id,
      p.title,
      p.description,
      p.cover_image_url,
      p.image_urls,
      p.sower_id,
      s.display_name as sower_name,
      p.price,
      wr.base_town as base_location,
      p.created_at,
      6371000.0 * acos(
        least(1.0, greatest(-1.0,
          sin(v.rlat) * sin(radians(wr.lat))
          + cos(v.rlat) * cos(radians(wr.lat))
            * cos(radians(wr.lng) - v.rlng)
        ))
      ) as distance_m
    from public.products p
    join public.sowers s on s.id = p.sower_id
    join public.wandering_roles wr
      on wr.user_id = s.user_id
     and wr.role = _kind
     and wr.status = 'active'
    cross join viewer v
    where p.kind = _kind
      and coalesce(p.status, 'active') <> 'archived'
      and wr.lat is not null
      and wr.lng is not null
  )
  select
    id, title, description, cover_image_url, image_urls,
    sower_id, sower_name, price, base_location,
    round(distance_m::numeric, 0) as distance_m,
    created_at
  from scored
  where distance_m <= _radius_m
  order by distance_m asc, created_at desc
  limit greatest(1, least(coalesce(_limit, 60), 200))
  offset greatest(0, coalesce(_offset, 0));
$sv_near$;

comment on function public.sleeping_services_near is
  'Hand or Pillow listings within _radius_m metres, nearest first, positioned by the owner wandering_roles row. Distance is metres.';

grant execute on function public.sleeping_services_near(
  text, numeric, numeric, integer, integer, integer
) to anon, authenticated;
