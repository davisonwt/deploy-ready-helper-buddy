-- Sleeping Wheels backfill verification. READ ONLY. Changes nothing.
--
-- The migration's RAISE NOTICE did not surface in the SQL Editor, so this
-- answers the same question as a result set you can export to CSV.
--
-- One row per products row with type='service' and kind='wheel', whether or
-- not the backfill reached it. A LEFT JOIN is deliberate: a listing with no
-- wheel_seed_details row is exactly the case we need to see.
--
-- Read `backfill_state` first:
--   mapped              - detail row exists, vehicle type carried across
--   MISSING (no price)  - skipped by design, the old row had no price
--   MISSING (has price) - should have been mapped and was not. Investigate.
--
-- And `mapping_check`:
--   ok                  - old value mapped to the expected new value
--   fell back to other  - old value was not in the known vocabulary
--   MISMATCH            - mapped to something the rules do not predict

select
  p.id                                             as product_id,
  p.title,
  p.type                                           as product_type,
  p.kind                                           as product_kind,
  p.status                                         as product_status,
  p.created_at                                     as listing_created_at,

  -- what was there before
  nullif(trim(p.service_details ->> 'vehicle_type'), '') as old_vehicle_type,
  p.price                                          as old_price,
  nullif(trim(p.service_details ->> 'rate_unit'), '')    as old_rate_unit,

  -- what the backfill produced
  d.vehicle_type::text                             as new_vehicle_type,
  d.currency,
  d.base_location,
  d.base_lat,
  d.base_lng,

  -- which rate columns actually got a value
  case when d.rate_per_trip is not null then 'yes' else '-' end as has_rate_per_trip,
  case when d.rate_hourly   is not null then 'yes' else '-' end as has_rate_hourly,
  case when d.rate_per_km   is not null then 'yes' else '-' end as has_rate_per_km,
  case when d.rate_daily    is not null then 'yes' else '-' end as has_rate_daily,
  case when d.rate_weekly   is not null then 'yes' else '-' end as has_rate_weekly,
  case when d.rate_monthly  is not null then 'yes' else '-' end as has_rate_monthly,

  -- the populated columns as one readable list
  coalesce(
    array_to_string(
      array_remove(array[
        case when d.rate_per_trip is not null then 'per_trip' end,
        case when d.rate_hourly   is not null then 'hourly'   end,
        case when d.rate_per_km   is not null then 'per_km'   end,
        case when d.rate_daily    is not null then 'daily'    end,
        case when d.rate_weekly   is not null then 'weekly'   end,
        case when d.rate_monthly  is not null then 'monthly'  end
      ], null),
      ', '
    ),
    '(none)'
  ) as rate_columns_populated,

  -- the actual amounts, so a wrong column is obvious
  d.rate_per_trip, d.rate_hourly, d.rate_per_km,
  d.rate_daily,    d.rate_weekly, d.rate_monthly,

  d.use_tags,
  d.driver_included,
  d.availability,
  d.operator_confirmed_licensed,

  -- verdicts
  case
    when d.product_id is not null then 'mapped'
    when p.price is null          then 'MISSING (no price)'
    else                               'MISSING (has price)'
  end as backfill_state,

  case
    when d.product_id is null then '(not mapped)'
    when lower(trim(coalesce(p.service_details ->> 'vehicle_type', ''))) = 'construction-vehicle'
         and d.vehicle_type::text = 'yellow_machine'  then 'ok'
    when lower(trim(coalesce(p.service_details ->> 'vehicle_type', ''))) = 'farm-vehicle'
         and d.vehicle_type::text = 'farming_vehicle' then 'ok'
    when lower(trim(coalesce(p.service_details ->> 'vehicle_type', '')))
         in ('sedan', 'bakkie', 'truck')
         and d.vehicle_type::text
             = lower(trim(p.service_details ->> 'vehicle_type'))            then 'ok'
    when lower(trim(coalesce(p.service_details ->> 'vehicle_type', '')))
         not in ('construction-vehicle', 'farm-vehicle', 'sedan', 'bakkie', 'truck')
         and d.vehicle_type::text = 'other'                                  then 'fell back to other'
    else 'MISMATCH'
  end as mapping_check,

  case
    when d.product_id is null then '(not mapped)'
    when coalesce(p.service_details ->> 'rate_unit', 'per_trip') = 'per_trip'
         and d.rate_per_trip is not distinct from p.price then 'ok'
    when p.service_details ->> 'rate_unit' = 'per_hour'
         and d.rate_hourly   is not distinct from p.price then 'ok'
    when p.service_details ->> 'rate_unit' = 'per_km'
         and d.rate_per_km   is not distinct from p.price then 'ok'
    when p.service_details ->> 'rate_unit' = 'per_day'
         and d.rate_daily    is not distinct from p.price then 'ok'
    else 'CHECK RATE'
  end as rate_check

from public.products p
left join public.wheel_seed_details d on d.product_id = p.id
-- Every Wheel listing, not only the type='service' ones. A row with
-- kind='wheel' but some other type is itself worth seeing.
where p.kind = 'wheel'
order by
  case
    when d.product_id is null and p.price is not null then 0  -- problems first
    when d.product_id is null                          then 1
    else                                                    2
  end,
  p.created_at desc;
