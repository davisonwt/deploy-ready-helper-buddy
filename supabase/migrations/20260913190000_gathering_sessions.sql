-- Gathering Room batch 1 (docs/GATHERING-ROOM.md #5): late-joiner state for
-- the Go-Live board. useLiveStage's stage:${seedId} broadcast channel stays
-- the low-latency path; this table is the durable "what's on the board
-- right now" a late joiner (or a host who refreshes) reads once on mount,
-- since a broadcast-only channel has nothing for anyone to catch up on.
-- queue_state/music_state columns are here now too (batch 2/4's own data,
-- same row) rather than three separate tables for what's all ephemeral
-- session state, not data anyone needs to query relationally later.

create table if not exists public.gathering_sessions (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  board_state jsonb not null default '{}'::jsonb,
  music_state jsonb not null default '{}'::jsonb,
  queue_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

-- One active (ended_at is null) row per seed at a time -- goLive()'s own
-- presence system already enforces "one live session per seed"; this
-- mirrors that instead of letting a stale row from a crashed session sit
-- around alongside a fresh one.
create unique index if not exists gathering_sessions_one_active_per_seed
  on public.gathering_sessions (seed_id)
  where ended_at is null;

create index if not exists gathering_sessions_seed_id_idx
  on public.gathering_sessions (seed_id);

alter table public.gathering_sessions enable row level security;

-- Host manages their own rows.
create policy gathering_sessions_insert on public.gathering_sessions
  for insert to authenticated
  with check (auth.uid() = host_id);

create policy gathering_sessions_update on public.gathering_sessions
  for update to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create policy gathering_sessions_delete on public.gathering_sessions
  for delete to authenticated
  using (auth.uid() = host_id);

-- Any signed-in viewer can read an active session (to hydrate the board on
-- join); a host can also read their own ended sessions (nothing needs this
-- yet, but no reason to hide it from its own owner).
create policy gathering_sessions_select on public.gathering_sessions
  for select to authenticated
  using (ended_at is null or auth.uid() = host_id);

create trigger gathering_sessions_set_updated_at
  before update on public.gathering_sessions
  for each row
  execute function public.update_updated_at_column();
