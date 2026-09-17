-- Call-out charging for Sleeping Hands.
--
-- Two columns, not one. A tradesman commonly charges a flat fee for coming
-- out AND a distance charge on top; merging them would force a lister to
-- drop one of the two prices they actually charge.
--
-- Deliberately NOT added to hand_at_least_one_rate. A listing must still
-- name a price for the work itself -- hourly, per job, daily, weekly or
-- monthly -- and a call-out fee is not a price for the work. These two are
-- additions to that rate, never a substitute for it, so that constraint is
-- left exactly as it stands.
--
-- hand_rates_non_negative IS extended: a negative travel charge is as wrong
-- as a negative hourly rate, and leaving the new columns out of it would be
-- the only unguarded numbers on the table.
--
-- No payment-split logic changes. The 85/15 split reads the booking total,
-- not individual rate columns.

alter table public.hand_seed_details
  add column if not exists rate_callout numeric,
  add column if not exists rate_per_km  numeric;

comment on column public.hand_seed_details.rate_callout is
  'Flat fee for coming out at all, in the listing''s own currency. '
  'Charged in addition to the work rate, never instead of it.';

comment on column public.hand_seed_details.rate_per_km is
  'Charge per kilometre travelled, in the listing''s own currency. '
  'Kilometres because the app stores every distance in metres and converts '
  'for display; a mile-preferring viewer sees this converted, not restated.';

-- Rewritten rather than amended: Postgres has no "add a term to an existing
-- CHECK". Dropping and re-adding revalidates every row, which is the point.
alter table public.hand_seed_details
  drop constraint if exists hand_rates_non_negative;

alter table public.hand_seed_details
  add constraint hand_rates_non_negative check (
        (rate_hourly  is null or rate_hourly  >= 0)
    and (rate_per_job is null or rate_per_job >= 0)
    and (rate_daily   is null or rate_daily   >= 0)
    and (rate_weekly  is null or rate_weekly  >= 0)
    and (rate_monthly is null or rate_monthly >= 0)
    and (rate_callout is null or rate_callout >= 0)
    and (rate_per_km  is null or rate_per_km  >= 0)
  );

-- Without this the two columns exist in Postgres but PostgREST keeps
-- rejecting them as unknown until it next reloads on its own.
notify pgrst, 'reload schema';
