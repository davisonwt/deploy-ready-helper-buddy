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

GRANT EXECUTE ON FUNCTION public.set_security_questions(text,text,text,text,text,text) TO authenticated;