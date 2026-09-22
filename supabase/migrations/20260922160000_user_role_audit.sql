-- An independent record of every user_roles change, DELETE included.
--
-- ALREADY APPLIED on 2026-09-22 via the Management API; this file
-- records it, because this project's migration ledger is drifted.
--
-- Why: on 2026-09-22 three privileged roles (gosat, admin, radio_admin)
-- were revoked from a dormant duplicate account and NOTHING recorded it.
-- user_roles carried two triggers, validate_role_changes_trigger and
-- update_user_roles_updated_at, and both are BEFORE INSERT OR UPDATE --
-- neither fires on DELETE. validate_role_changes does write a
-- 'role_change:<role>' line into billing_access_logs, so grants leave a
-- trace, but revocations left none at all. A privileged role could be
-- taken off an account with no independent evidence of who did it.
--
-- AFTER, not BEFORE: this records what actually committed, not what was
-- attempted. SECURITY DEFINER so the insert does not depend on the
-- caller's own rights.
--
-- actor is auth.uid() AT THE TIME and is deliberately nullable: a change
-- made through PostgREST with a member session records that member,
-- while one made with the service role or through the Management API
-- records NULL. A null actor is itself the signal that a change came
-- from outside the app.

create table if not exists public.user_role_audit (
  id         uuid primary key default gen_random_uuid(),
  action     text not null check (action in ('insert','update','delete')),
  user_id    uuid not null,              -- subject of the role row
  role       text not null,
  granted_by uuid,
  actor      uuid,                       -- auth.uid(), null for server-side changes
  old_row    jsonb,
  new_row    jsonb,
  note       text,                       -- provenance for backfilled rows
  at         timestamptz not null default now()
);

create index if not exists user_role_audit_user_id_at_idx
  on public.user_role_audit (user_id, at desc);

create or replace function public.audit_user_role_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if TG_OP = 'DELETE' then
    insert into public.user_role_audit (action, user_id, role, granted_by, actor, old_row, new_row)
    values ('delete', OLD.user_id, OLD.role::text, OLD.granted_by, auth.uid(), to_jsonb(OLD), null);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    insert into public.user_role_audit (action, user_id, role, granted_by, actor, old_row, new_row)
    values ('update', NEW.user_id, NEW.role::text, NEW.granted_by, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  else
    insert into public.user_role_audit (action, user_id, role, granted_by, actor, old_row, new_row)
    values ('insert', NEW.user_id, NEW.role::text, NEW.granted_by, auth.uid(), null, to_jsonb(NEW));
    return NEW;
  end if;
end;
$function$;

drop trigger if exists audit_user_roles_trigger on public.user_roles;
create trigger audit_user_roles_trigger
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_user_role_change();

-- Read: gosat only. Write: nobody from a client. The trigger runs as the
-- function owner and so is unaffected by both.
alter table public.user_role_audit enable row level security;

drop policy if exists "Gosat can read the role audit" on public.user_role_audit;
create policy "Gosat can read the role audit"
  on public.user_role_audit for select
  to authenticated
  using (public.is_admin_or_gosat(auth.uid()));

revoke all on public.user_role_audit from authenticated, anon;
grant select on public.user_role_audit to authenticated;
