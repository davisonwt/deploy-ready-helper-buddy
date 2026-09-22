-- VERIFICATION: user_role_audit, run 2026-09-22 against live.
--
-- Records the checks behind migration 20260922160000_user_role_audit.sql
-- and commit 43ba225d. They were run at the time; this file was not in
-- the repo when they ran, which is the gap this commit closes.
--
-- READ THIS FIRST -- the important half of this verification is NOT SQL,
-- and cannot be. The whole point of the actor column is that it captures
-- auth.uid(), and auth.uid() is null on every connection the Management
-- API and psql give you. A grant and revoke run as SQL here would record
-- actor = null and would have proved nothing about the path members
-- actually use. So leg 1 and leg 2 go through PostgREST with real signed-in
-- sessions, and only leg 3 is SQL. Running just the SQL below re-checks
-- the recorded outcome; it does not re-perform the test.
--
--
-- LEG 1 -- INSERT and DELETE are both captured, with the right actor.
-- Through PostgREST as a signed-in gosat (davison.taljaard, 04754d57).
-- A scratch `courier` role on davisontest1 (de22c876, profiles.is_test
-- = true) -- never a real member's roles, and never a privileged role.
--
--   REF=zuwkgasbkpjlxzsjzumu
--   # sign in as the gosat; TEST_GOSAT_* come from the gitignored .env.test
--   JWT=$(curl -s "https://$REF.supabase.co/auth/v1/token?grant_type=password" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
--     -d "{\"email\":\"$TEST_GOSAT_EMAIL\",\"password\":\"$TEST_GOSAT_PASSWORD\"}" \
--     | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).access_token')
--
--   # grant
--   curl -s -X POST "https://$REF.supabase.co/rest/v1/user_roles" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $JWT" \
--     -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
--     -d '{"user_id":"de22c876-d477-4a5e-81a2-cd22091ce125","role":"courier"}'
--   # -> 201, user_roles.id 38687a91-eeaa-4091-ac32-0e86b3b31478
--
--   # revoke the row just created, by its own id -- never an unscoped filter
--   curl -s -X DELETE \
--     "https://$REF.supabase.co/rest/v1/user_roles?id=eq.38687a91-eeaa-4091-ac32-0e86b3b31478" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $JWT"
--   # -> 204
--
-- Result: exactly two audit rows, insert then delete, 324 ms apart, both
-- with actor = 04754d57. Asserted in leg 3 below.
--
--
-- LEG 2 -- a plain member reads nothing and cannot write.
-- Through PostgREST as TEST_USER (a plain member, no gosat, no admin).
-- RLS only applies to a member session, so this leg cannot be rehearsed
-- with `set local role` here and have the result mean anything.
--
--   curl -s "https://$REF.supabase.co/rest/v1/user_role_audit?select=*" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $MEMBER_JWT"
--   # -> []   (5 rows exist; the gosat-only SELECT policy hides all of them)
--
--   curl -s -X POST "https://$REF.supabase.co/rest/v1/user_role_audit" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $MEMBER_JWT" \
--     -H 'Content-Type: application/json' -d '{"action":"insert","user_id":"...","role":"gosat"}'
--   # -> 42501 "permission denied for table user_role_audit"
--
-- Note WHICH error that is: refused at the GRANT level, before RLS is
-- consulted at all. authenticated holds SELECT and nothing else, so there
-- is no client write path to hold a policy against. Asserted in leg 3.
--
--
-- LEG 3 -- SQL assertions over the outcome. Runnable now, read-only,
-- raises loudly on any mismatch rather than returning a row to be eyeballed.
do $$
declare
  n int;
  ins_actor uuid;
  del_actor uuid;
begin
  -- Leg 1: the scratch grant/revoke pair, both captured, both with the gosat as actor.
  select actor into ins_actor from public.user_role_audit
   where id = 'd93e855a-ec4b-4463-8f38-1984f86e54ba' and action = 'insert';
  select actor into del_actor from public.user_role_audit
   where id = '0bdf85b4-3c0b-43a5-a551-e775c7f8fa2f' and action = 'delete';

  if ins_actor is distinct from '04754d57-d41d-4ea7-93df-542047a6785b'::uuid then
    raise exception 'leg 1: insert row missing or wrong actor (got %)', ins_actor;
  end if;
  if del_actor is distinct from '04754d57-d41d-4ea7-93df-542047a6785b'::uuid then
    raise exception 'leg 1: DELETE row missing or wrong actor (got %) -- the whole point of the trigger', del_actor;
  end if;

  -- Leg 2: authenticated may read and may NOT write. anon may do neither.
  select count(*) into n from information_schema.role_table_grants
   where table_name = 'user_role_audit'
     and grantee in ('authenticated','anon')
     and privilege_type <> 'SELECT';
  if n <> 0 then
    raise exception 'leg 2: % non-SELECT grant(s) to authenticated/anon -- a client write path exists', n;
  end if;

  select count(*) into n from information_schema.role_table_grants
   where table_name = 'user_role_audit' and grantee = 'authenticated' and privilege_type = 'SELECT';
  if n <> 1 then
    raise exception 'leg 2: authenticated cannot SELECT; gosat would read nothing';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'user_role_audit'
       and policyname = 'Gosat can read the role audit' and cmd = 'SELECT'
  ) then
    raise exception 'leg 2: the gosat-only SELECT policy is gone';
  end if;

  -- The trigger still covers all three operations. A trigger narrowed back
  -- to INSERT OR UPDATE is exactly the hole this table was built to close.
  select count(*) into n from pg_trigger
   where tgrelid = 'public.user_roles'::regclass
     and tgname = 'audit_user_roles_trigger'
     and tgtype & 8 > 0    -- DELETE
     and tgtype & 4 > 0    -- INSERT
     and tgtype & 16 > 0;  -- UPDATE
  if n <> 1 then
    raise exception 'audit_user_roles_trigger does not cover INSERT, UPDATE and DELETE';
  end if;

  -- Backfill: three rows, one per revoked role row.
  select count(*) into n from public.user_role_audit
   where user_id = '432df4a7-07f1-4a5e-835c-a3c2806ce6c5' and action = 'delete';
  if n <> 3 then
    raise exception 'backfill: expected 3 amberwheeles revocation rows, found %', n;
  end if;

  -- Residue: the scratch courier role is gone from user_roles.
  -- Its two AUDIT rows stay for good -- deleting audit rows to tidy them
  -- would defeat the table -- and are annotated as the verification.
  select count(*) into n from public.user_roles
   where id = '38687a91-eeaa-4091-ac32-0e86b3b31478';
  if n <> 0 then
    raise exception 'residue: the scratch courier role row is still on davisontest1';
  end if;

  raise notice 'user_role_audit verification: all checks passed';
end $$;
