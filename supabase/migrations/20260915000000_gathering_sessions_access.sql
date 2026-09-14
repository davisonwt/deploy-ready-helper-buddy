-- "Live Now" directory (urgent, 2026-09-15): real users could not find each
-- other's live sessions without a shared link. Adds the access-type column
-- a live session needs to be either publicly joinable ('open', the
-- default -- matches every existing session's implicit behavior today) or
-- invite-only ('restricted' -- set explicitly by the host, not listed as
-- directly joinable).

alter table public.gathering_sessions
  add column if not exists access text not null default 'open';

alter table public.gathering_sessions
  drop constraint if exists gathering_sessions_access_check;
alter table public.gathering_sessions
  add constraint gathering_sessions_access_check check (access in ('open', 'restricted'));
