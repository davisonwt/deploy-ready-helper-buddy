
CREATE OR REPLACE FUNCTION public.set_security_questions(
  q1 text, a1 text,
  q2 text, a2 text,
  q3 text, a3 text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF length(trim(coalesce(a1,''))) < 2
     OR length(trim(coalesce(a2,''))) < 2
     OR length(trim(coalesce(a3,''))) < 2 THEN
    RAISE EXCEPTION 'answers too short';
  END IF;
  IF q1 = q2 OR q1 = q3 OR q2 = q3 THEN
    RAISE EXCEPTION 'questions must be distinct';
  END IF;

  INSERT INTO public.user_security_questions
    (user_id, question_1, answer_1_hash, question_2, answer_2_hash, question_3, answer_3_hash)
  VALUES (
    uid,
    q1, extensions.crypt(lower(trim(a1)), extensions.gen_salt('bf')),
    q2, extensions.crypt(lower(trim(a2)), extensions.gen_salt('bf')),
    q3, extensions.crypt(lower(trim(a3)), extensions.gen_salt('bf'))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    question_1 = EXCLUDED.question_1,
    answer_1_hash = EXCLUDED.answer_1_hash,
    question_2 = EXCLUDED.question_2,
    answer_2_hash = EXCLUDED.answer_2_hash,
    question_3 = EXCLUDED.question_3,
    answer_3_hash = EXCLUDED.answer_3_hash,
    updated_at = now();

  UPDATE public.profiles
     SET security_setup_complete = true,
         failed_recovery_attempts = 0,
         recovery_locked_until = NULL,
         updated_at = now()
   WHERE user_id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_security_answers_and_issue_token(
  p_email text, p_a1 text, p_a2 text, p_a3 text
) RETURNS TABLE (success boolean, token text, locked boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid;
  rec record;
  prof record;
  new_token text;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, false, 'Invalid credentials'::text; RETURN;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE user_id = uid;
  IF prof.recovery_locked_until IS NOT NULL AND prof.recovery_locked_until > now() THEN
    RETURN QUERY SELECT false, NULL::text, true,
      'Account locked. Contact support via in-app ChatApp.'::text;
    RETURN;
  END IF;

  SELECT * INTO rec FROM public.user_security_questions WHERE user_id = uid;
  IF rec IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, false, 'Invalid credentials'::text; RETURN;
  END IF;

  IF rec.answer_1_hash = extensions.crypt(lower(trim(p_a1)), rec.answer_1_hash)
     AND rec.answer_2_hash = extensions.crypt(lower(trim(p_a2)), rec.answer_2_hash)
     AND rec.answer_3_hash = extensions.crypt(lower(trim(p_a3)), rec.answer_3_hash) THEN
    new_token := encode(extensions.gen_random_bytes(32), 'hex');
    INSERT INTO public.password_reset_requests
      (email, status, requested_at, expires_at, created_at, token, user_id)
    VALUES
      (p_email, 'pending', now(), now() + interval '15 minutes', now(), new_token, uid);
    UPDATE public.profiles
       SET failed_recovery_attempts = 0, recovery_locked_until = NULL
     WHERE user_id = uid;
    RETURN QUERY SELECT true, new_token, false, 'ok'::text;
    RETURN;
  ELSE
    UPDATE public.profiles
       SET failed_recovery_attempts = COALESCE(failed_recovery_attempts,0) + 1,
           recovery_locked_until = CASE
             WHEN COALESCE(failed_recovery_attempts,0) + 1 >= 3
               THEN now() + interval '30 minutes'
             ELSE recovery_locked_until END
     WHERE user_id = uid;
    RETURN QUERY SELECT false, NULL::text,
      (SELECT (failed_recovery_attempts >= 3) FROM public.profiles WHERE user_id = uid),
      'Invalid credentials'::text;
    RETURN;
  END IF;
END;
$$;
