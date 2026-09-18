-- Let the 21 members whose answers predate bcrypt reset their password again,
-- and stop telling anyone they are wrong when we could not check.
--
-- WHAT BROKE. Security answers were originally hashed in the browser:
-- SecurityQuestionsSetup.tsx (commit 74c48cd7, 2026-02-07) did
-- `answer.trim().toLowerCase()` -> UTF-8 -> SHA-256 -> lowercase hex, and
-- wrote that 64-char digest straight into answer_N_hash. The current RPCs
-- compare with bcrypt via extensions.crypt(). crypt() cannot reproduce a hex
-- digest from a hex "salt", so for those rows EVERY answer is rejected, no
-- matter what the member types.
--
-- Measured on production before writing this:
--   26 rows  bcrypt  ($2a$06$, 60 chars)  set 2026-02-07 .. 2026-09-17
--   21 rows  sha256  (64 hex chars)       set 2026-02-07 .. 2026-04-20
--   0 rows mixed formats within one row
-- Two of the 21 share an identical answer_1_hash for the same question, which
-- is what an UNSALTED digest looks like -- and is why these must not linger.
--
-- The input form was taken from that original source, not guessed, and
-- encode(digest(lower(btrim(a)),'sha256'),'hex') was checked to reproduce the
-- JS output exactly, including surrounding whitespace.
--
-- WHAT THIS DOES.
--   1. security_answer_check() classifies a stored hash and compares:
--      'match' | 'mismatch' | 'unverifiable'. bcrypt first, sha256 fallback,
--      and anything in neither format is UNVERIFIABLE -- never a mismatch.
--   2. On a fully successful verify, every legacy answer that was matched is
--      immediately re-hashed to bcrypt. A member's weak digest disappears the
--      first time they use it; both formats are not left live side by side.
--   3. "We could not check" stops being reported as "you are wrong". The
--      member is not told they misremembered their own life because our
--      storage is inconsistent, and an unverifiable state does NOT count as
--      a failed attempt or move anyone towards a lockout.
--
-- verify_own_security_answer (the crypto-payout gate) had the same bcrypt-only
-- comparison, so the same 21 members could not change a payout address either.
-- It gets the same fallback and the same re-hash.
--
-- Snapshot rule: scripts/studio/restore_security_answer_hashes_20260918.sql
-- holds all 21 rows verbatim. The re-hash overwrites the old digest, so that
-- file is the only copy once a member recovers. Written BEFORE this migration.

-- ---------------------------------------------------------------------------
-- 1. One place that knows how an answer is stored.
-- ---------------------------------------------------------------------------
create or replace function public.security_answer_check(p_hash text, p_answer text)
returns text
language plpgsql
immutable
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_norm text := lower(btrim(coalesce(p_answer, '')));
begin
  if p_hash is null or btrim(p_hash) = '' then
    return 'unverifiable';
  end if;

  -- Current format.
  if p_hash like '$2%' then
    return case when p_hash = extensions.crypt(v_norm, p_hash) then 'match' else 'mismatch' end;
  end if;

  -- Legacy browser-side format: unsalted SHA-256 hex of trim+lowercase.
  if p_hash ~ '^[0-9a-f]{64}$' then
    return case
      when p_hash = encode(extensions.digest(v_norm, 'sha256'), 'hex') then 'match'
      else 'mismatch'
    end;
  end if;

  -- Neither. We cannot perform the comparison, so we must not claim a result.
  return 'unverifiable';
end;
$$;

comment on function public.security_answer_check(text, text) is
  'Compares a security answer against a stored hash in either supported '
  'format. Returns match / mismatch / unverifiable. "unverifiable" means the '
  'stored value is in no format we can check -- it is never a wrong answer, '
  'and callers must not report it as one.';

revoke all on function public.security_answer_check(text, text) from public;

-- ---------------------------------------------------------------------------
-- 2. Password reset. Return shape gains `reason`, so the client can tell a
--    real mismatch from a broken stored hash instead of hardcoding
--    "Incorrect answers" for every outcome (ForgotPasswordPage.tsx did).
--    Adding a column means DROP, not CREATE OR REPLACE (42P13), and a dropped
--    function loses its grants -- both restored explicitly at the end.
-- ---------------------------------------------------------------------------
drop function if exists public.verify_security_answers_and_issue_token(text, text, text, text);

create function public.verify_security_answers_and_issue_token(
  p_email text, p_a1 text, p_a2 text, p_a3 text
)
returns table(success boolean, token text, locked boolean, message text, reason text)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  uid uuid;
  rec record;
  prof record;
  new_token text;
  c1 text; c2 text; c3 text;
begin
  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then
    return query select false, null::text, false, 'Invalid credentials'::text, 'invalid_credentials'::text; return;
  end if;

  select * into prof from public.profiles where user_id = uid;
  if prof.recovery_locked_until is not null and prof.recovery_locked_until > now() then
    return query select false, null::text, true,
      'Account locked. Contact support via in-app ChatApp.'::text, 'locked'::text;
    return;
  end if;

  select * into rec from public.user_security_questions where user_id = uid;
  if rec is null then
    return query select false, null::text, false, 'Invalid credentials'::text, 'invalid_credentials'::text; return;
  end if;

  c1 := public.security_answer_check(rec.answer_1_hash, p_a1);
  c2 := public.security_answer_check(rec.answer_2_hash, p_a2);
  c3 := public.security_answer_check(rec.answer_3_hash, p_a3);

  -- We could not perform the comparison. Say that, and charge the member
  -- nothing for it: no failed attempt, no step towards a lockout.
  if 'unverifiable' in (c1, c2, c3) then
    return query select false, null::text, false,
      'We could not check your answers -- something is wrong on our side, not with what you entered. Please contact support via the in-app ChatApp.'::text,
      'unverifiable'::text;
    return;
  end if;

  if c1 = 'match' and c2 = 'match' and c3 = 'match' then
    -- Retire any legacy digest the moment it is proven. Only the answers just
    -- verified are rewritten, and only where the stored value is not already
    -- bcrypt, so a re-run is a no-op.
    update public.user_security_questions
       set answer_1_hash = case when answer_1_hash like '$2%' then answer_1_hash
             else extensions.crypt(lower(btrim(coalesce(p_a1,''))), extensions.gen_salt('bf')) end,
           answer_2_hash = case when answer_2_hash like '$2%' then answer_2_hash
             else extensions.crypt(lower(btrim(coalesce(p_a2,''))), extensions.gen_salt('bf')) end,
           answer_3_hash = case when answer_3_hash like '$2%' then answer_3_hash
             else extensions.crypt(lower(btrim(coalesce(p_a3,''))), extensions.gen_salt('bf')) end,
           updated_at = now()
     where user_id = uid
       and (answer_1_hash not like '$2%' or answer_2_hash not like '$2%' or answer_3_hash not like '$2%');

    new_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.password_reset_requests
      (email, status, requested_at, expires_at, created_at, token, user_id)
    values
      (p_email, 'pending', now(), now() + interval '15 minutes', now(), new_token, uid);
    update public.profiles
       set failed_recovery_attempts = 0, recovery_locked_until = null
     where user_id = uid;
    return query select true, new_token, false, 'ok'::text, 'ok'::text;
    return;
  end if;

  -- A genuine mismatch: we checked, and the answers do not match.
  update public.profiles
     set failed_recovery_attempts = coalesce(failed_recovery_attempts,0) + 1,
         recovery_locked_until = case
           when coalesce(failed_recovery_attempts,0) + 1 >= 3
             then now() + interval '30 minutes'
           else recovery_locked_until end
   where user_id = uid;
  return query select false, null::text,
    (select (failed_recovery_attempts >= 3) from public.profiles where user_id = uid),
    'Invalid credentials'::text, 'mismatch'::text;
  return;
end;
$$;

comment on function public.verify_security_answers_and_issue_token(text, text, text, text) is
  'Verifies all three security answers and issues a reset token. Accepts both '
  'the current bcrypt hashes and the legacy unsalted SHA-256 hex written by '
  'the browser before 2026-04-20, and re-hashes any legacy answer to bcrypt on '
  'the first successful verify. `reason` distinguishes a real mismatch from a '
  'stored hash we cannot check at all -- a member is never told they are wrong '
  'when the comparison did not happen.';

-- The drop took the grants with it. Restored exactly as they were.
grant execute on function public.verify_security_answers_and_issue_token(text, text, text, text)
  to public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. The crypto-payout gate. Same two formats, same re-hash. Boolean return is
--    unchanged, so this one only needs CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
create or replace function public.verify_own_security_answer(p_question_index integer, p_answer text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  uid uuid := auth.uid();
  rec record;
  v_hash text;
  v_result text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_question_index not in (1, 2, 3) then
    return false;
  end if;

  select * into rec from public.user_security_questions where user_id = uid;
  if rec is null then
    return false;
  end if;

  v_hash := case p_question_index
    when 1 then rec.answer_1_hash
    when 2 then rec.answer_2_hash
    when 3 then rec.answer_3_hash end;

  v_result := public.security_answer_check(v_hash, p_answer);

  -- An unverifiable hash is not a correct answer, so this still returns false
  -- and the payout address stays protected. The caller's own copy explains
  -- the difference; this signature has nowhere to carry it.
  if v_result <> 'match' then
    return false;
  end if;

  if v_hash not like '$2%' then
    update public.user_security_questions
       set answer_1_hash = case when p_question_index = 1
             then extensions.crypt(lower(btrim(coalesce(p_answer,''))), extensions.gen_salt('bf'))
             else answer_1_hash end,
           answer_2_hash = case when p_question_index = 2
             then extensions.crypt(lower(btrim(coalesce(p_answer,''))), extensions.gen_salt('bf'))
             else answer_2_hash end,
           answer_3_hash = case when p_question_index = 3
             then extensions.crypt(lower(btrim(coalesce(p_answer,''))), extensions.gen_salt('bf'))
             else answer_3_hash end,
           updated_at = now()
     where user_id = uid;
  end if;

  return true;
end;
$$;

grant execute on function public.verify_own_security_answer(integer, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';
