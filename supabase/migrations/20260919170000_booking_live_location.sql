-- Live location on a Wheels booking: a LINK, not a tracker.
--
-- S2G does not track anyone and stores no position. A browser PWA stops
-- updating the moment the driver locks his phone, so a built-in tracker
-- would show the passenger a frozen dot and call it live. Instead the driver
-- shares from the OS -- Google Maps, Apple Maps, WhatsApp -- which keeps
-- running because the OS owns it, and S2G holds only the resulting URL.
--
-- Snapshot first, per the rule:
--   scripts/studio/restore_booking_live_location_20260919.sql
--   (creates new objects only; public.bookings is not touched)
--
-- A link to where someone is RIGHT NOW is the most sensitive thing in this
-- app, so the window it is visible in is enforced by RLS rather than by the
-- UI remembering to hide it:
--
--   who   : the two parties to that booking, nobody else, not anon
--   when  : booking_kind ride or delivery, status on_my_way / arrived /
--           in_transit, and not revoked
--   after : completed, delivered, no_show, cancelled, expired -- the SELECT
--           policy stops matching, so the row is gone for BOTH sides. Not
--           hidden by the client. Unreadable.

begin;

-- 1. THE HOST ALLOWLIST.
--
-- Returns the hostname when the URL is one a driver could plausibly have
-- got from a "share my location" action, and NULL for everything else. The
-- passenger is going to tap this, so an arbitrary URL pasted by the other
-- party is a phishing primitive -- the allowlist is the whole point.
--
-- Rejected on purpose:
--   * anything but https
--   * userinfo (https://maps.app.goo.gl@evil.example/) -- the classic way to
--     make a hostile host read as a friendly one
--   * backslashes, whitespace and control characters, which browsers
--     normalise in ways a naive parser does not
--   * bare google.com -- /url?q= is an open redirect, so Google is allowed
--     only on its maps hosts and paths
create or replace function public.live_location_host(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  v_rest text;
  v_auth text;
  v_path text;
  v_host text;
begin
  if p_url is null or length(p_url) > 2048 then
    return null;
  end if;

  -- No whitespace or control characters anywhere in the URL.
  if p_url ~ '[[:space:][:cntrl:]]' then
    return null;
  end if;

  if lower(left(p_url, 8)) <> 'https://' then
    return null;
  end if;

  v_rest := substring(p_url from 9);

  -- Authority ends at the first / \ ? or #. Treat \ as / the way browsers do.
  v_auth := split_part(split_part(split_part(split_part(v_rest, '/', 1), '\', 1), '?', 1), '#', 1);
  v_path := substring(v_rest from length(v_auth) + 1);

  -- Any userinfo at all, and we are done.
  if position('@' in v_auth) > 0 then
    return null;
  end if;

  v_host := lower(split_part(v_auth, ':', 1));

  if v_host = '' or v_host !~ '^[a-z0-9.-]+$' then
    return null;
  end if;

  -- Google, only where the path is a map.
  if v_host in ('www.google.com', 'google.com', 'maps.google.com') then
    if v_path like '/maps%' then
      return v_host;
    end if;
    return null;
  end if;

  if v_host in (
    'maps.app.goo.gl',   -- Google Maps "Share location" short link
    'maps.apple.com',    -- Apple Maps
    'wa.me',             -- WhatsApp
    'api.whatsapp.com'
  ) then
    return v_host;
  end if;

  return null;
end;
$$;

comment on function public.live_location_host(text) is
  'Hostname of a permitted live-location link, or NULL. The passenger taps '
  'whatever the driver pasted, so this is an allowlist, never a blocklist.';

grant execute on function public.live_location_host(text) to authenticated, service_role;

-- 2. THE LINK.
--
-- One per booking. Re-pasting replaces it; revoking hides it without
-- destroying the record of it having existed.
create table if not exists public.booking_live_locations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  url_host text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint booking_live_locations_url_host_check
    check (url_host = public.live_location_host(url))
);

comment on table public.booking_live_locations is
  'A native OS live-location link shared by a driver. S2G stores the link '
  'and never a position -- no geolocation API, no background tracking.';

alter table public.booking_live_locations enable row level security;

-- 3. WHO AND WHEN.

-- Both parties, during the ride, while not revoked. Note there is no anon
-- grant and no anon policy: this is never public, unlike a rating.
drop policy if exists booking_live_locations_read on public.booking_live_locations;
create policy booking_live_locations_read on public.booking_live_locations for select
  using (
    revoked_at is null
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.grower_user_id = auth.uid() or b.sower_user_id = auth.uid())
        and b.booking_kind in ('ride','delivery')
        and b.status in ('on_my_way','arrived','in_transit')
    )
  );

-- Only the driver, and only once he has actually tapped "On my way".
-- Sharing before that would be sharing his home.
drop policy if exists booking_live_locations_insert on public.booking_live_locations;
create policy booking_live_locations_insert on public.booking_live_locations for insert
  with check (
    shared_by_user_id = auth.uid()
    and revoked_at is null
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.sower_user_id = auth.uid()
        and b.booking_kind in ('ride','delivery')
        and b.status in ('on_my_way','arrived','in_transit')
    )
  );

-- Replace or revoke, driver only, same window. The passenger cannot revoke
-- and cannot edit -- it is not their link.
drop policy if exists booking_live_locations_update on public.booking_live_locations;
create policy booking_live_locations_update on public.booking_live_locations for update
  using (
    shared_by_user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.sower_user_id = auth.uid()
        and b.booking_kind in ('ride','delivery')
        and b.status in ('on_my_way','arrived','in_transit')
    )
  )
  with check (
    shared_by_user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.sower_user_id = auth.uid()
        and b.booking_kind in ('ride','delivery')
        and b.status in ('on_my_way','arrived','in_transit')
    )
  );

-- No DELETE policy, deliberately: with RLS on, an operation with no policy
-- is denied. Revoking is a flag, so "he shared a link at 14:03" survives a
-- later argument about whether he ever did.

-- 4. Grants. The column list on UPDATE is the real boundary -- RLS has no
--    column granularity, so without it a driver could rewrite booking_id.
revoke all on public.booking_live_locations from anon, authenticated;
grant select on public.booking_live_locations to authenticated;
grant insert on public.booking_live_locations to authenticated;
grant update (url, revoked_at) on public.booking_live_locations to authenticated;

-- 5. The guard. Validates the host, owns the timestamps, and backs up the
--    column grant so the rule survives anyone loosening it.
create or replace function public.booking_live_locations_guard()
returns trigger
language plpgsql
as $$
declare
  v_host text;
begin
  if tg_op = 'UPDATE' then
    if new.booking_id is distinct from old.booking_id
       or new.shared_by_user_id is distinct from old.shared_by_user_id then
      raise exception 'a live location link cannot be moved to another booking or another person';
    end if;
    -- Pasting a new link un-revokes: "revoke, then share a different one"
    -- is the same gesture as "replace", and a driver should not have to
    -- know the difference.
    if new.url is distinct from old.url then
      new.revoked_at := null;
    end if;
  else
    new.created_at := now();
  end if;

  v_host := public.live_location_host(new.url);
  if v_host is null then
    raise exception 'That link is not a live-location link. Use "Share live location" in Google Maps, Apple Maps or WhatsApp and paste the link it gives you -- it must start with https:// and come from one of those.'
      using errcode = 'check_violation';
  end if;

  new.url_host := v_host;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists booking_live_locations_guard_trg on public.booking_live_locations;
create trigger booking_live_locations_guard_trg
  before insert or update on public.booking_live_locations
  for each row execute function public.booking_live_locations_guard();

commit;
