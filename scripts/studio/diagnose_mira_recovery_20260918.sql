-- READ-ONLY diagnosis: why earthangels638284 (Mira Torres) cannot recover.
--
-- user_id 34b37520-9907-4fe6-bb35-f50e5222d683
--
-- Changes nothing. Deliberately never selects an answer hash in full -- only
-- its shape (bcrypt / 64-char hex / other) and length, which is all that is
-- needed to tell the formats apart. Question TEXT is printed; answers are not
-- stored in the clear anywhere and are not recoverable.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/diagnose_mira_recovery_20260918.sql

\echo '=== 1. the auth.users row (note the email the function matches on) ==='
select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  u.created_at,
  u.last_sign_in_at,
  u.banned_until
from auth.users u
where u.id = '34b37520-9907-4fe6-bb35-f50e5222d683';

\echo '=== 2. her three questions, and the SHAPE of each stored hash ==='
select
  q.user_id,
  q.question_1,
  q.question_2,
  q.question_3,
  case when q.answer_1_hash like '$2%' then 'bcrypt'
       when q.answer_1_hash ~ '^[0-9a-f]{64}$' then 'hex-sha256'
       when q.answer_1_hash is null then 'NULL'
       else 'other' end as a1_format,
  length(q.answer_1_hash) as a1_len,
  case when q.answer_2_hash like '$2%' then 'bcrypt'
       when q.answer_2_hash ~ '^[0-9a-f]{64}$' then 'hex-sha256'
       when q.answer_2_hash is null then 'NULL'
       else 'other' end as a2_format,
  length(q.answer_2_hash) as a2_len,
  case when q.answer_3_hash like '$2%' then 'bcrypt'
       when q.answer_3_hash ~ '^[0-9a-f]{64}$' then 'hex-sha256'
       when q.answer_3_hash is null then 'NULL'
       else 'other' end as a3_format,
  length(q.answer_3_hash) as a3_len,
  q.created_at,
  q.updated_at
from public.user_security_questions q
where q.user_id = '34b37520-9907-4fe6-bb35-f50e5222d683';

\echo '=== 3. lockout counters on her profile ==='
select
  p.user_id,
  p.username,
  p.failed_recovery_attempts,
  p.recovery_locked_until,
  p.recovery_locked_until > now() as locked_right_now,
  p.updated_at
from public.profiles p
where p.user_id = '34b37520-9907-4fe6-bb35-f50e5222d683';

\echo '=== 4. her reset requests over the last 3 days (a row = a SUCCESSFUL verify) ==='
select id, email, status, requested_at, expires_at, used_at
from public.password_reset_requests
where user_id = '34b37520-9907-4fe6-bb35-f50e5222d683'
   or lower(email) in (
     select lower(email) from auth.users
     where id = '34b37520-9907-4fe6-bb35-f50e5222d683')
order by requested_at desc
limit 20;

\echo '=== 5. is the SHA-256 fallback actually live? (function shape, not the migration file) ==='
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('security_answer_check', 'verify_security_answers_and_issue_token')
order by p.proname;

\echo '=== 6. does the live verify function body contain the sha256 fallback? ==='
select
  p.proname,
  position('digest' in pg_get_functiondef(p.oid)) > 0 as mentions_digest,
  position('unverifiable' in pg_get_functiondef(p.oid)) > 0 as has_unverifiable_path,
  position('gen_salt' in pg_get_functiondef(p.oid)) > 0 as rehashes_to_bcrypt
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('security_answer_check', 'verify_security_answers_and_issue_token')
order by p.proname;

\echo '=== 7. EXECUTE grants on the verify function (an anonymous caller must be able to run it) ==='
select
  p.proname,
  coalesce(array_to_string(p.proacl::text[], ' | '), '(default: PUBLIC)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('security_answer_check', 'verify_security_answers_and_issue_token');

\echo '=== 8. how many members still hold a non-bcrypt hash (the original 21) ==='
select
  count(*) filter (where answer_1_hash not like '$2%'
                      or answer_2_hash not like '$2%'
                      or answer_3_hash not like '$2%') as still_legacy,
  count(*) as total_rows
from public.user_security_questions;

\echo '=== 9. is her email unique, or does a near-miss address exist? (typo check) ==='
select id, email, created_at
from auth.users
where lower(email) like 'earthangel%'
   or lower(split_part(email, '@', 1)) in (
     select lower(split_part(email, '@', 1)) from auth.users
     where id = '34b37520-9907-4fe6-bb35-f50e5222d683')
order by created_at;
