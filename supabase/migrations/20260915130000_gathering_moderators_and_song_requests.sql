-- Gathering Room: persistent per-host moderators + visitor song requests.
--
-- Idempotent -- safe to run multiple times. Postgres has no
-- "create policy if not exists", so every policy is dropped first; tables/
-- indexes already used "if not exists"/"if not exists" and RLS-enable is
-- already idempotent on its own. Added 2026-09-15 after a real re-run
-- failed with "policy already exists" (the moderator-scope revision below
-- had already partially applied from an earlier attempt).
--
-- gathering_moderators: host-appointed, PERSISTENT per host (2026-09-15
-- revision -- originally session_id-scoped; that version was never applied
-- to production, so this replaces it outright rather than migrating data).
-- A moderator a host appoints stays a moderator for every room that host
-- ever runs, across sessions, until the host explicitly removes them --
-- only host_id + user_id identify the relationship now, no session_id at
-- all. Any moderation action (mute/remove a participant, delete a chat
-- message, advance/skip the raise-hand queue) is allowed for a room's host
-- OR anyone listed here for that host_id -- enforced client-side in
-- useGatheringModerators.ts / useLiveStage.ts, same trust model every
-- other broadcast-driven action in this engine already uses (raise-hand,
-- spotlight, mute) -- there's no stronger per-action DB check for those
-- today either.
create table if not exists public.gathering_moderators (
  host_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (host_id, user_id)
);

alter table public.gathering_moderators enable row level security;

drop policy if exists gathering_moderators_select on public.gathering_moderators;
-- Not sensitive -- every viewer already sees who's on stage; knowing who
-- else can moderate is the same category of information.
create policy gathering_moderators_select on public.gathering_moderators
  for select to authenticated
  using (true);

drop policy if exists gathering_moderators_insert on public.gathering_moderators;
-- Host-only: appointing/removing a moderator is the host's own call, per
-- spec ("Once a HOST makes someone a moderator... until the host
-- explicitly removes mod status") -- a moderator cannot appoint another.
create policy gathering_moderators_insert on public.gathering_moderators
  for insert to authenticated
  with check (added_by = auth.uid() and host_id = auth.uid());

drop policy if exists gathering_moderators_delete on public.gathering_moderators;
create policy gathering_moderators_delete on public.gathering_moderators
  for delete to authenticated
  using (host_id = auth.uid());

-- gathering_song_requests: a visitor picks a track from the real S2G music
-- library (dj_music_tracks) and it lands in the host/mod's request queue,
-- pending until one of them taps Play or Skip -- never auto-plays. Still
-- scoped per gathering_sessions row (a request belongs to one specific
-- live, not to the host generally) -- only gathering_moderators itself
-- became host-scoped, not this table.
create table if not exists public.gathering_song_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.gathering_sessions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.dj_music_tracks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'played', 'skipped')),
  requested_at timestamptz not null default now()
);

create index if not exists gathering_song_requests_session_status_idx
  on public.gathering_song_requests (session_id, status);

alter table public.gathering_song_requests enable row level security;

drop policy if exists gathering_song_requests_select on public.gathering_song_requests;
-- Visible to: whoever requested it, the session's host, or any of that
-- host's (persistent) moderators -- never every other visitor's own
-- requests. Resolves the session's host_id via gathering_sessions since
-- gathering_moderators no longer carries session_id itself.
create policy gathering_song_requests_select on public.gathering_song_requests
  for select to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.gathering_sessions s
      where s.id = gathering_song_requests.session_id
        and (
          s.host_id = auth.uid()
          or exists (select 1 from public.gathering_moderators m where m.host_id = s.host_id and m.user_id = auth.uid())
        )
    )
  );

drop policy if exists gathering_song_requests_insert on public.gathering_song_requests;
create policy gathering_song_requests_insert on public.gathering_song_requests
  for insert to authenticated
  with check (requested_by = auth.uid());

drop policy if exists gathering_song_requests_update on public.gathering_song_requests;
-- Play/Skip: host or moderator only.
create policy gathering_song_requests_update on public.gathering_song_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.gathering_sessions s
      where s.id = gathering_song_requests.session_id
        and (
          s.host_id = auth.uid()
          or exists (select 1 from public.gathering_moderators m where m.host_id = s.host_id and m.user_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from public.gathering_sessions s
      where s.id = gathering_song_requests.session_id
        and (
          s.host_id = auth.uid()
          or exists (select 1 from public.gathering_moderators m where m.host_id = s.host_id and m.user_id = auth.uid())
        )
    )
  );
