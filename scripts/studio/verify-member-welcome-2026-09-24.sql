-- VERIFICATION: the member welcome, run 2026-09-24 against live.
--
-- Records the checks behind migration 20260924100000_member_welcome.sql.
--
-- READ THIS FIRST -- the half that matters is not SQL. The welcome fires
-- from triggers on a real signup, so the run that proved it used the
-- PUBLIC auth endpoint to create two throwaway accounts, exactly as a
-- member would. Calling send_member_welcome() by hand proves the function
-- works; it does not prove the hook fires, which is the actual claim.
-- Only leg 3 below is runnable on its own.
--
--
-- LEG 1 -- a referred signup gets both messages.
--
--   POST https://zuwkgasbkpjlxzsjzumu.supabase.co/auth/v1/signup
--   { "email": "qa-welcome-a-<stamp>@example.com", "password": "...",
--     "data": { "username": "...", "first_name": "Ada",
--               "referral_code": "996B4CCE" } }     <- davisontest1's door
--
-- Result, measured:
--   Global : "🌱 Ada just joined S2G through davisontest1's tribe —
--             welcome to the Global Tribe! Say hi and help them find
--             their feet."
--   Private: "Welcome to Sow2Grow, Ada! You're now part of davisontest1's
--             tribe — and of S2G's Global Tribe. Start here: open your
--             door, sow your first seed, and wander the orchard. The
--             GoSats are in this room if you need anything — just reply."
--   Room "Welcome to S2G", 4 participants (the member + 3 gosats).
--   Both rows: sender_id NULL, system_metadata->>'sender_name' =
--   'S2G GoSats'. Rendered by the app as "S2G GoSats" with the robot
--   avatar -- ChatMessage.jsx already does this, so NO UI change shipped.
--
--
-- LEG 2 -- a test signup is silent in Global, welcomed in private.
--
--   Same call plus "is_test": true in data.
--   Result: member_welcomes.global_skipped = 'is_test', no Global row,
--   private welcome present, room again 4 participants.
--
--
-- LEG 3 -- idempotency, and the state assertions. Runnable, read-only
-- apart from the deliberate re-fires, which must change nothing.
--
--   select public.send_member_welcome('<qa-user>'::uuid, '<referrer>'::uuid);
--   select public.send_member_welcome('<qa-user>'::uuid);
--
-- After three extra fires across both paths the counts were unchanged:
-- one Global row, one private row, one member_welcomes row each.
--
-- The guarantee is the primary key, not a check: whoever wins the insert
-- into member_welcomes does the work and every other caller returns. Two
-- triggers firing inside one signup transaction is the normal case, not
-- an edge case.
do $$
declare
  n int;
begin
  -- The hook is in both places, and the profiles one MUST sort last so a
  -- referred member is welcomed by the referral trigger (which knows the
  -- tribe) before the fallback can claim them.
  select count(*) into n from pg_trigger
   where tgrelid = 'public.referral_circle'::regclass and tgname = 'member_welcome_on_referral';
  if n <> 1 then raise exception 'the referral-path welcome trigger is missing'; end if;

  select count(*) into n from pg_trigger
   where tgrelid = 'public.profiles'::regclass and tgname = 'zz_member_welcome_on_profile';
  if n <> 1 then raise exception 'the profile-path welcome trigger is missing'; end if;

  if (select min(tgname) from pg_trigger
        where tgrelid = 'public.profiles'::regclass and not tgisinternal
          and tgtype & 4 > 0 and tgname > 'zz_member_welcome_on_profile') is not null then
    raise exception 'another AFTER INSERT trigger on profiles now sorts after the welcome fallback';
  end if;

  -- One firing per member, enforced by the key itself.
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.member_welcomes'::regclass and contype = 'p'
       and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id)'
  ) then
    raise exception 'member_welcomes lost the primary key that makes it idempotent';
  end if;

  -- A member must never be able to post as S2G GoSats.
  if not exists (
    select 1 from pg_policies
     where tablename = 'chat_messages' and policyname = 'Users insert own non-system messages'
  ) then
    raise exception 'the policy that stops members forging system messages is gone';
  end if;

  -- Read: gosat only. Write: nobody from a client.
  select count(*) into n from information_schema.role_table_grants
   where table_name = 'member_welcomes' and grantee in ('authenticated','anon')
     and privilege_type <> 'SELECT';
  if n <> 0 then
    raise exception '% non-SELECT grant(s) on member_welcomes to authenticated/anon', n;
  end if;

  raise notice 'member welcome verification: all checks passed';
end $$;
