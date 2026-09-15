-- Gathering Room: per-session moderators + visitor song requests.
--
-- gathering_moderators: host-appointed, per-session only (no persistence
-- across sessions -- cascades away with the session row itself, nothing
-- to separately expire). Any moderation action (mute/remove a
-- participant, delete a chat message, advance/skip the raise-hand queue)
-- is allowed for the session's host OR anyone listed here for that same
-- session_id -- enforced client-side in useGatheringModerators.ts /
-- useLiveStage.ts, same trust model every other broadcast-driven action
-- in this engine already uses (raise-hand, spotlight, mute) -- there's no
-- stronger per-action DB check for those today either.
create table if not exists public.gathering_moderators (
  session_id uuid not null references public.gathering_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.gathering_moderators enable row level security;

-- Not sensitive -- every viewer already sees who's on stage; knowing who
-- else can moderate is the same category of information.
create policy gathering_moderators_select on public.gathering_moderators
  for select to authenticated
  using (true);

create policy gathering_moderators_insert on public.gathering_moderators
  for insert to authenticated
  with check (
    added_by = auth.uid()
    and exists (select 1 from public.gathering_sessions s where s.id = session_id and s.host_id = auth.uid())
  );

create policy gathering_moderators_delete on public.gathering_moderators
  for delete to authenticated
  using (
    exists (select 1 from public.gathering_sessions s where s.id = session_id and s.host_id = auth.uid())
  );

-- gathering_song_requests: a visitor picks a track from the real S2G music
-- library (dj_music_tracks) and it lands in the host/mod's request queue,
-- pending until one of them taps Play or Skip -- never auto-plays.
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

-- Visible to: whoever requested it, the session's host, or any of that
-- session's moderators -- never every other visitor's own requests.
create policy gathering_song_requests_select on public.gathering_song_requests
  for select to authenticated
  using (
    requested_by = auth.uid()
    or exists (select 1 from public.gathering_sessions s where s.id = session_id and s.host_id = auth.uid())
    or exists (
      select 1 from public.gathering_moderators m
      where m.session_id = gathering_song_requests.session_id and m.user_id = auth.uid()
    )
  );

create policy gathering_song_requests_insert on public.gathering_song_requests
  for insert to authenticated
  with check (requested_by = auth.uid());

-- Play/Skip: host or moderator only.
create policy gathering_song_requests_update on public.gathering_song_requests
  for update to authenticated
  using (
    exists (select 1 from public.gathering_sessions s where s.id = session_id and s.host_id = auth.uid())
    or exists (
      select 1 from public.gathering_moderators m
      where m.session_id = gathering_song_requests.session_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.gathering_sessions s where s.id = session_id and s.host_id = auth.uid())
    or exists (
      select 1 from public.gathering_moderators m
      where m.session_id = gathering_song_requests.session_id and m.user_id = auth.uid()
    )
  );
