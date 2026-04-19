-- Trigger: when a new mentorship_pairing is suggested, insert activity_feed rows for both members
create or replace function public.notify_new_mentorship_pairing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mentor_profile_id uuid;
  mentee_profile_id uuid;
begin
  if (TG_OP = 'INSERT' and new.status = 'suggested') then
    select id into mentor_profile_id from public.profiles where user_id = new.mentor_id limit 1;
    select id into mentee_profile_id from public.profiles where user_id = new.mentee_id limit 1;

    -- Notify the mentee
    insert into public.activity_feed (user_id, actor_id, actor_profile_id, action_type, content, entity_type, entity_id, mode_type, metadata)
    values (
      new.mentee_id, new.mentor_id, mentor_profile_id,
      'mentorship_suggested',
      'Gentoo found you a mentor for ' || coalesce(new.focus_area, 'your journey'),
      'mentorship_pairing', new.id, 'mentorship',
      jsonb_build_object('focus_area', new.focus_area, 'role', 'mentee', 'match_score', new.match_score)
    );

    -- Notify the mentor
    insert into public.activity_feed (user_id, actor_id, actor_profile_id, action_type, content, entity_type, entity_id, mode_type, metadata)
    values (
      new.mentor_id, new.mentee_id, mentee_profile_id,
      'mentorship_suggested',
      'Gentoo paired you with a mentee on ' || coalesce(new.focus_area, 'their growth'),
      'mentorship_pairing', new.id, 'mentorship',
      jsonb_build_object('focus_area', new.focus_area, 'role', 'mentor', 'match_score', new.match_score)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_mentorship_pairing on public.mentorship_pairings;
create trigger trg_notify_new_mentorship_pairing
after insert on public.mentorship_pairings
for each row execute function public.notify_new_mentorship_pairing();


-- Trigger: when someone RSVPs to a tribal_event, notify the host (skip self-RSVPs)
create or replace function public.notify_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev record;
  rsvper_profile_id uuid;
begin
  select id, host_id, title, starts_at into ev from public.tribal_events where id = new.event_id;
  if ev.host_id is null or ev.host_id = new.user_id then
    return new;
  end if;

  select id into rsvper_profile_id from public.profiles where user_id = new.user_id limit 1;

  insert into public.activity_feed (user_id, actor_id, actor_profile_id, action_type, content, entity_type, entity_id, mode_type, metadata)
  values (
    ev.host_id, new.user_id, rsvper_profile_id,
    case new.status when 'going' then 'event_rsvp_going' when 'maybe' then 'event_rsvp_maybe' else 'event_rsvp_pass' end,
    'Someone is ' || new.status || ' to "' || ev.title || '"',
    'tribal_event', new.event_id, 'tribal_events',
    jsonb_build_object('rsvp_status', new.status, 'starts_at', ev.starts_at)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_event_rsvp on public.tribal_event_rsvps;
create trigger trg_notify_event_rsvp
after insert on public.tribal_event_rsvps
for each row execute function public.notify_event_rsvp();