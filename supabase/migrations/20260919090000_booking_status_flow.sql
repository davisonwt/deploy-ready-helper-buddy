-- Booking status flow: a request that can actually be answered.
--
-- Today a booking is requested and then nothing happens -- the host cannot
-- respond and the guest learns nothing. This adds the states, the timestamps
-- behind each one, and the two guards that carry money: no-show and expiry.
--
-- Snapshot first, per the rule:
--   scripts/studio/restore_bookings_status_20260919.sql
--   (public.bookings held 0 rows when this was written)
--
-- FOUR FLOWS, not three. The kind is chosen BY THE GUEST at booking time and
-- stored -- not inferred from wheel_seed_details.use_tags, because a bakkie
-- tagged both 'passengers' and 'deliveries' does both, and only the guest
-- knows which one they are asking for.
--
--   stay / hand : requested -> accepted -> in_progress -> completed
--                 (against starts_at/ends_at, not "on my way now")
--   ride        : requested -> accepted -> on_my_way -> arrived
--                            -> in_transit -> completed   (or no_show)
--   delivery    : requested -> accepted -> collected -> on_my_way -> delivered
--
-- Any of them may end at declined / cancelled / expired.

begin;

-- 1. The kind, chosen by the guest.
alter table public.bookings
  add column if not exists booking_kind text;

alter table public.bookings drop constraint if exists bookings_booking_kind_check;
alter table public.bookings add constraint bookings_booking_kind_check
  check (booking_kind is null or booking_kind = any (array['stay','hand','ride','delivery']));

-- 2. The wider status set.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status = any (array[
    -- shared
    'requested','accepted','declined','cancelled','expired','paid',
    -- stay / hand
    'in_progress','completed',
    -- ride
    'on_my_way','arrived','in_transit','no_show',
    -- delivery
    'collected','delivered'
  ]));

-- 3. One timestamp per step. Every transition is recorded, so "he never
--    left" is answerable from the row rather than from an argument.
alter table public.bookings
  add column if not exists accepted_at    timestamptz,
  add column if not exists declined_at    timestamptz,
  add column if not exists cancelled_at   timestamptz,
  add column if not exists started_at     timestamptz,
  add column if not exists on_my_way_at   timestamptz,
  add column if not exists arrived_at     timestamptz,
  add column if not exists in_transit_at  timestamptz,
  add column if not exists collected_at   timestamptz,
  add column if not exists completed_at   timestamptz,
  add column if not exists no_show_at     timestamptz;

-- 4. ETA -- wheels only, set when the driver taps "On my way". The guest is
--    shown both the estimate AND when it was given, because a 15-minute ETA
--    quoted 40 minutes ago is not a 15-minute ETA.
alter table public.bookings
  add column if not exists eta_minutes  integer,
  add column if not exists eta_given_at timestamptz;

alter table public.bookings drop constraint if exists bookings_eta_minutes_check;
alter table public.bookings add constraint bookings_eta_minutes_check
  check (eta_minutes is null or (eta_minutes > 0 and eta_minutes <= 480));

-- 5. Money.
--
-- 'pending' is the crypto case: a Solana transfer is atomic and
-- irreversible -- there is no authorise, no hold, no void -- so the guest
-- signs only AFTER the host accepts. PayPal authorises at request and
-- captures at accept, so it moves pending -> authorized -> captured.
alter table public.bookings
  add column if not exists payment_status text not null default 'none',
  add column if not exists no_show_fee    numeric;

alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status = any (array['none','pending','authorized','captured','refunded','failed']));

-- 6. Expiry nudge bookkeeping (see expire_stale_booking_requests below).
alter table public.bookings
  add column if not exists provider_nudged_at timestamptz;

commit;

-- 7. THE NO-SHOW GUARD.
--
-- A no-show charges the guest, so it must not be claimable by a driver who
-- never left. All four conditions have to hold, and they are all read from
-- timestamps the driver's own taps wrote:
--
--   * the booking is a ride (not a delivery, not a stay)
--   * he actually tapped "On my way"  -> on_my_way_at is set
--   * he actually tapped "Arrived"    -> arrived_at is set
--   * he left before he arrived       -> on_my_way_at <= arrived_at
--   * the full 10 minutes elapsed     -> now() >= arrived_at + 10 min
--
-- Returns false rather than raising, so a UI can grey the button out without
-- handling an exception.
create or replace function public.booking_no_show_claimable(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select b.booking_kind = 'ride'
        and b.status = 'arrived'
        and b.on_my_way_at is not null
        and b.arrived_at is not null
        and b.on_my_way_at <= b.arrived_at
        and now() >= b.arrived_at + interval '10 minutes'
     from public.bookings b
     where b.id = p_booking_id),
    false);
$$;

revoke all on function public.booking_no_show_claimable(uuid) from public;
grant execute on function public.booking_no_show_claimable(uuid) to authenticated, service_role;

comment on function public.booking_no_show_claimable(uuid) is
  'True only when a RIDE driver genuinely drove out and waited the full 10 '
  'minutes: on_my_way and arrived both tapped, in that order, and 10 minutes '
  'elapsed since arrival. Guards a charge to the guest, so it is deliberately '
  'strict -- a driver who never tapped "On my way" can never claim one.';

-- 8. A REQUEST MUST NOT SIT FOREVER.
--
-- Chosen: a TTL per kind, plus one nudge at the halfway mark. A guest
-- waiting three days with their money in limbo is its own failure, and so is
-- a ride request answered two hours after the guest needed the lift.
--
--   ride      30 minutes  -- someone wants a lift NOW
--   delivery   2 hours    -- same day, less urgent
--   hand      24 hours    -- a scheduled job
--   stay      48 hours    -- booked well ahead, hosts check in less often
--
-- Never past the slot itself: a request for a 9am slot expires at 9am
-- whatever the TTL says, because accepting it afterwards is meaningless.
--
-- Expiry releases the money by definition -- PayPal authorisations are voided
-- rather than captured, and a crypto booking was never paid (payment_status
-- 'pending'), so an expired request costs the guest nothing. That is the
-- same promise as a decline.
create or replace function public.expire_stale_booking_requests()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_expired integer := 0;
  r record;
begin
  -- Nudge at the halfway mark, once.
  for r in
    select b.id, b.sower_user_id, b.booking_kind
    from public.bookings b
    where b.status = 'requested'
      and b.provider_nudged_at is null
      and now() >= b.created_at + (case b.booking_kind
            when 'ride' then interval '15 minutes'
            when 'delivery' then interval '1 hour'
            when 'hand' then interval '12 hours'
            else interval '24 hours' end)
  loop
    perform public.notify_member(
      r.sower_user_id,
      'booking_nudge',
      'Someone is still waiting',
      'A booking request is waiting on your answer. If you cannot take it, decline it so they can ask someone else.',
      '/bookings/' || r.id::text,
      jsonb_build_object('booking_id', r.id, 'kind', r.booking_kind));
    update public.bookings set provider_nudged_at = now() where id = r.id;
  end loop;

  -- Expire, and tell BOTH sides. Silence is what this exists to end.
  for r in
    select b.id, b.sower_user_id, b.grower_user_id, b.booking_kind
    from public.bookings b
    where b.status = 'requested'
      and (
        now() >= b.created_at + (case b.booking_kind
              when 'ride' then interval '30 minutes'
              when 'delivery' then interval '2 hours'
              when 'hand' then interval '24 hours'
              else interval '48 hours' end)
        or (b.starts_at is not null and now() >= b.starts_at)
      )
  loop
    update public.bookings
       set status = 'expired', updated_at = now()
     where id = r.id;

    perform public.notify_member(
      r.grower_user_id, 'booking_expired', 'Your request expired',
      'Nobody answered in time, so your request has expired. You have not been charged.',
      '/bookings/' || r.id::text,
      jsonb_build_object('booking_id', r.id));
    perform public.notify_member(
      r.sower_user_id, 'booking_expired', 'A request expired',
      'A booking request expired before you answered it.',
      '/bookings/' || r.id::text,
      jsonb_build_object('booking_id', r.id));

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

revoke all on function public.expire_stale_booking_requests() from public;
grant execute on function public.expire_stale_booking_requests() to service_role;

-- 9. RATINGS.
--
-- Five stars, one per booking, guest rates provider, only on a finished
-- booking. The provider gets one public reply -- the cheapest protection
-- against an unfair review -- and cannot delete or edit the rating itself.
create table if not exists public.booking_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rater_user_id uuid not null references auth.users(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (comment is null or length(comment) <= 500),
  provider_reply text check (provider_reply is null or length(provider_reply) <= 500),
  provider_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One rating per booking. A booking is a single transaction; rating it
  -- twice would let one guest move an average twice.
  unique (booking_id)
);

create index if not exists booking_ratings_provider_idx
  on public.booking_ratings (provider_user_id, created_at desc);

alter table public.booking_ratings enable row level security;

-- Public to read: a rating nobody can see protects nobody.
drop policy if exists booking_ratings_read on public.booking_ratings;
create policy booking_ratings_read on public.booking_ratings for select using (true);

-- Only the guest on a COMPLETED booking may write one, and only for
-- themselves. 'completed' and 'delivered' are both finished states.
drop policy if exists booking_ratings_insert on public.booking_ratings;
create policy booking_ratings_insert on public.booking_ratings for insert
  with check (
    rater_user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.grower_user_id = auth.uid()
        and b.sower_user_id = provider_user_id
        and b.status in ('completed','delivered')
    )
    -- The reply is the PROVIDER's column. Nothing stopped a guest from
    -- supplying it in the same INSERT as their own 1-star review -- the
    -- INSERT grant covers every column, and the guard trigger below only
    -- ran on UPDATE. A guest could have published words in the provider's
    -- name. The reply is written later, by its author, or not at all.
    and provider_reply is null
    and provider_replied_at is null
  );

-- The provider may add a reply and NOTHING ELSE.
--
-- The RLS policy alone was not enough and this is worth spelling out: an
-- UPDATE policy scoped to `provider_user_id = auth.uid()` restricts WHICH
-- ROWS a provider may touch, not WHICH COLUMNS. As first written, a provider
-- could have rewritten the guest's `stars` and `comment` on their own
-- rating -- turning a 1-star review into a 5-star one. RLS has no column
-- granularity, so the column restriction is a GRANT, and a trigger backs it
-- up so the rule survives anyone later loosening the grant.
drop policy if exists booking_ratings_provider_reply on public.booking_ratings;
create policy booking_ratings_provider_reply on public.booking_ratings for update
  using (provider_user_id = auth.uid())
  with check (provider_user_id = auth.uid());

-- No DELETE policy exists, deliberately: with RLS enabled, an operation with
-- no policy is denied. Nobody -- guest, provider or stranger -- can delete a
-- rating. A reputation you can erase is not a reputation.

-- Baseline table privileges. Explicit rather than relying on whatever the
-- default grants happen to be, because the column list below is the actual
-- security boundary for a provider reply.
revoke all on public.booking_ratings from anon, authenticated;
grant select on public.booking_ratings to anon, authenticated;
grant insert on public.booking_ratings to authenticated;
grant update (provider_reply, provider_replied_at) on public.booking_ratings to authenticated;

-- Belt and braces: reject any attempt to change the guest's own words, or to
-- move a rating onto a different booking/person, whoever is asking.
create or replace function public.booking_ratings_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Backs up the INSERT policy above, so the rule survives anyone later
    -- loosening that policy or the grants.
    if new.provider_reply is not null or new.provider_replied_at is not null then
      raise exception 'a provider reply cannot be written by whoever creates the rating';
    end if;
    -- created_at orders the public list; the client does not get to choose it.
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.stars is distinct from old.stars
     or new.comment is distinct from old.comment
     or new.booking_id is distinct from old.booking_id
     or new.rater_user_id is distinct from old.rater_user_id
     or new.provider_user_id is distinct from old.provider_user_id then
    raise exception 'a rating''s stars, comment and parties cannot be changed once written';
  end if;
  -- One reply, not an ongoing argument.
  if old.provider_reply is not null and new.provider_reply is distinct from old.provider_reply then
    raise exception 'a provider reply can only be written once';
  end if;
  if new.provider_reply is distinct from old.provider_reply then
    new.provider_replied_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists booking_ratings_guard_update_trg on public.booking_ratings;
drop trigger if exists booking_ratings_guard_trg on public.booking_ratings;
drop function if exists public.booking_ratings_guard_update();

create trigger booking_ratings_guard_trg
  before insert or update on public.booking_ratings
  for each row execute function public.booking_ratings_guard();

-- 10. What a listing shows.
--
-- NO AVERAGE UNTIL 3 RATINGS. One bad night must not end a new member's
-- income before it starts, and a single 1-star "average" is not a
-- reputation -- it is one person's afternoon. Below the threshold the
-- listing says "New" and shows the count instead.
-- security_invoker: a view runs with the DEFINER's rights by default, which
-- would read booking_ratings straight past RLS. Reads are public here, so
-- nothing leaks either way -- but a view that quietly bypasses RLS is the
-- kind of thing that becomes a leak the day someone narrows the read policy.
create or replace view public.provider_rating_v
with (security_invoker = true) as
select
  r.provider_user_id,
  count(*)::int                               as rating_count,
  round(avg(r.stars)::numeric, 2)             as raw_average,
  case when count(*) >= 3
       then round(avg(r.stars)::numeric, 2)
       else null end                          as public_average,
  count(*) < 3                                as is_new_provider
from public.booking_ratings r
group by r.provider_user_id;

comment on view public.provider_rating_v is
  'public_average is NULL until a provider has 3 ratings -- surfaces as a '
  '"New" badge rather than an average built on one opinion.';
