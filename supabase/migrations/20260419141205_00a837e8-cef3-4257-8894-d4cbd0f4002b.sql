-- Phase 3.5: Tribal Events + Mentorship Circles

-- =========================================
-- 1. TRIBAL EVENTS
-- =========================================
create table if not exists public.tribal_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('virtual_market','seed_swap','harvest_celebration','prayer_circle','mentorship_session','custom')),
  title text not null,
  description text,
  host_id uuid not null,
  circle_id uuid references public.circles(id) on delete set null,
  category text,
  region text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  capacity integer default 50,
  jitsi_room_id text,
  is_auto_generated boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tribal_events_starts_at on public.tribal_events(starts_at);
create index if not exists idx_tribal_events_host on public.tribal_events(host_id);
create index if not exists idx_tribal_events_circle on public.tribal_events(circle_id);
create index if not exists idx_tribal_events_status on public.tribal_events(status);

alter table public.tribal_events enable row level security;

create policy "Anyone can view scheduled/live events"
  on public.tribal_events for select
  using (status in ('scheduled','live','completed'));

create policy "Authenticated users can create events"
  on public.tribal_events for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "Hosts can update their events"
  on public.tribal_events for update
  to authenticated
  using (auth.uid() = host_id);

create policy "Hosts can delete their events"
  on public.tribal_events for delete
  to authenticated
  using (auth.uid() = host_id);

create trigger trg_tribal_events_updated_at
  before update on public.tribal_events
  for each row execute function public.update_updated_at_column();

-- =========================================
-- 2. EVENT RSVPS
-- =========================================
create table if not exists public.tribal_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tribal_events(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'attending' check (status in ('attending','maybe','declined')),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create index if not exists idx_event_rsvps_event on public.tribal_event_rsvps(event_id);
create index if not exists idx_event_rsvps_user on public.tribal_event_rsvps(user_id);
create index if not exists idx_event_rsvps_reminder on public.tribal_event_rsvps(reminder_sent) where reminder_sent = false;

alter table public.tribal_event_rsvps enable row level security;

create policy "Users can view RSVPs for events they can see"
  on public.tribal_event_rsvps for select
  using (
    exists (select 1 from public.tribal_events e where e.id = event_id and e.status in ('scheduled','live','completed'))
  );

create policy "Users can RSVP for themselves"
  on public.tribal_event_rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own RSVP"
  on public.tribal_event_rsvps for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can remove their own RSVP"
  on public.tribal_event_rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

-- =========================================
-- 3. MENTORSHIP PAIRINGS
-- =========================================
create table if not exists public.mentorship_pairings (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null,
  mentee_id uuid not null,
  focus_area text not null,
  mentor_timezone text,
  mentee_timezone text,
  cadence text not null default 'weekly' check (cadence in ('weekly','biweekly','monthly','adhoc')),
  status text not null default 'suggested' check (status in ('suggested','accepted','declined','active','completed','paused')),
  match_score numeric(5,2),
  match_reasoning text,
  room_id uuid references public.chat_rooms(id) on delete set null,
  suggested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mentor_id, mentee_id, focus_area)
);

create index if not exists idx_mentorship_mentor on public.mentorship_pairings(mentor_id);
create index if not exists idx_mentorship_mentee on public.mentorship_pairings(mentee_id);
create index if not exists idx_mentorship_status on public.mentorship_pairings(status);

alter table public.mentorship_pairings enable row level security;

create policy "Participants can view their pairings"
  on public.mentorship_pairings for select
  to authenticated
  using (auth.uid() = mentor_id or auth.uid() = mentee_id);

create policy "Service can create pairings"
  on public.mentorship_pairings for insert
  to authenticated
  with check (auth.uid() = mentor_id or auth.uid() = mentee_id);

create policy "Participants can update their pairings"
  on public.mentorship_pairings for update
  to authenticated
  using (auth.uid() = mentor_id or auth.uid() = mentee_id);

create trigger trg_mentorship_pairings_updated_at
  before update on public.mentorship_pairings
  for each row execute function public.update_updated_at_column();

-- =========================================
-- 4. HELPER VIEW: Upcoming events for a user
-- =========================================
create or replace function public.get_upcoming_tribal_events(_limit integer default 5)
returns setof public.tribal_events
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.tribal_events
  where status = 'scheduled'
    and starts_at > now()
  order by starts_at asc
  limit _limit;
$$;