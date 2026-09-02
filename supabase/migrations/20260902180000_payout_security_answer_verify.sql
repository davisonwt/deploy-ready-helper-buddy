-- Wallet-hardening policy correction (2026-09-02): S2G doesn't use email at
-- all, so update-crypto-payout's owner notification can no longer be an
-- email -- see spec-payments.md. In its place, changing a payout address
-- now requires a correct answer to one of the member's own security
-- questions (same store as password-reset, public.user_security_questions),
-- in addition to current_password.
--
-- Deliberately narrower than verify_security_answers_and_issue_token:
-- password-reset requires all three answers, plus its own lockout, because
-- it's the ONLY factor for an unauthenticated recovery flow. This runs for
-- an already-authenticated, already-password-verified caller, so one
-- correct answer is proportionate, and update-crypto-payout's existing
-- RateLimitPresets.PAYMENT limiter already bounds guess attempts -- a
-- second, parallel lockout would be redundant.
CREATE OR REPLACE FUNCTION public.verify_own_security_answer(
  p_question_index int, p_answer text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  rec record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_question_index NOT IN (1, 2, 3) THEN
    RETURN false;
  END IF;

  SELECT * INTO rec FROM public.user_security_questions WHERE user_id = uid;
  IF rec IS NULL THEN
    RETURN false;
  END IF;

  RETURN CASE p_question_index
    WHEN 1 THEN rec.answer_1_hash = extensions.crypt(lower(trim(coalesce(p_answer, ''))), rec.answer_1_hash)
    WHEN 2 THEN rec.answer_2_hash = extensions.crypt(lower(trim(coalesce(p_answer, ''))), rec.answer_2_hash)
    WHEN 3 THEN rec.answer_3_hash = extensions.crypt(lower(trim(coalesce(p_answer, ''))), rec.answer_3_hash)
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_own_security_answer(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_own_security_answer(int, text) TO authenticated;
