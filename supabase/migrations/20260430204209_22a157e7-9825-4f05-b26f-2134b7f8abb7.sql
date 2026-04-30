-- Add spark message + voice columns to matches
ALTER TABLE public.tribal_hearts_matches
  ADD COLUMN IF NOT EXISTS spark_message TEXT,
  ADD COLUMN IF NOT EXISTS spark_voice_url TEXT;

-- Index to keep daily-count lookups fast
CREATE INDEX IF NOT EXISTS idx_tribal_hearts_matches_sender_day
  ON public.tribal_hearts_matches (member_a_id, created_at DESC);

-- RPC: send a Spark with daily limit + heterosexual + membership enforcement
CREATE OR REPLACE FUNCTION public.send_tribal_hearts_spark(
  _recipient_id UUID,
  _message TEXT DEFAULT NULL,
  _voice_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
  _sender_gender public.hearts_gender;
  _sender_seeking public.hearts_gender;
  _recipient_gender public.hearts_gender;
  _recipient_seeking public.hearts_gender;
  _today_count INT;
  _existing RECORD;
  _new_match RECORD;
  _is_mutual BOOLEAN := FALSE;
BEGIN
  IF _sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated', 'message', 'Please sign in to send a Spark.');
  END IF;

  IF _sender = _recipient_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'self', 'message', 'You cannot Spark yourself.');
  END IF;

  -- Membership + active status
  IF NOT public.is_tribal_hearts_member(_sender) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_member', 'message', 'Tribal Hearts is for verified Ambassadors only.');
  END IF;

  -- Pull both profiles
  SELECT gender, seeking INTO _sender_gender, _sender_seeking
  FROM public.tribal_hearts_profiles WHERE user_id = _sender AND status = 'active';

  SELECT gender, seeking INTO _recipient_gender, _recipient_seeking
  FROM public.tribal_hearts_profiles WHERE user_id = _recipient_id AND status = 'active';

  IF _sender_gender IS NULL OR _recipient_gender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'profile_missing', 'message', 'Both profiles must be active.');
  END IF;

  -- Strict heterosexual rule
  IF _sender_gender = _recipient_gender
     OR _sender_seeking <> _recipient_gender
     OR _recipient_seeking <> _sender_gender THEN
    RETURN jsonb_build_object('ok', false, 'code', 'orientation_mismatch', 'message', 'This connection is not available.');
  END IF;

  -- Daily limit: 8 sparks per sender per UTC day
  SELECT COUNT(*) INTO _today_count
  FROM public.tribal_hearts_matches
  WHERE member_a_id = _sender
    AND created_at >= date_trunc('day', now());

  IF _today_count >= 8 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'daily_limit',
      'message', 'Take your time. Real connections don''t rush. (8 Sparks sent today)',
      'sent_today', _today_count
    );
  END IF;

  -- Check for existing rows in either direction
  SELECT * INTO _existing
  FROM public.tribal_hearts_matches
  WHERE (member_a_id = _sender AND member_b_id = _recipient_id)
     OR (member_a_id = _recipient_id AND member_b_id = _sender)
  LIMIT 1;

  IF FOUND THEN
    -- If recipient already sparked sender -> mutual bond
    IF _existing.member_a_id = _recipient_id AND _existing.b_response = 'pending' THEN
      UPDATE public.tribal_hearts_matches
      SET b_response = 'accepted',
          status = 'mutual',
          updated_at = now()
      WHERE id = _existing.id
      RETURNING * INTO _new_match;
      _is_mutual := TRUE;
    ELSE
      RETURN jsonb_build_object('ok', false, 'code', 'duplicate', 'message', 'You have already Sparked this person.');
    END IF;
  ELSE
    INSERT INTO public.tribal_hearts_matches (
      member_a_id, member_b_id, a_response, b_response, status,
      spark_message, spark_voice_url
    ) VALUES (
      _sender, _recipient_id, 'accepted', 'pending', 'pending',
      NULLIF(trim(_message), ''), _voice_url
    )
    RETURNING * INTO _new_match;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mutual', _is_mutual,
    'match_id', _new_match.id,
    'sent_today', _today_count + 1,
    'remaining_today', 8 - (_today_count + 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_tribal_hearts_spark(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.send_tribal_hearts_spark(UUID, TEXT, TEXT) TO authenticated;

-- RPC: respond to an incoming Spark (Echo)
CREATE OR REPLACE FUNCTION public.respond_tribal_hearts_spark(
  _match_id UUID,
  _accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _m RECORD;
  _is_mutual BOOLEAN := FALSE;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO _m FROM public.tribal_hearts_matches WHERE id = _match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF _m.member_b_id <> _me THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_recipient');
  END IF;

  IF _accept THEN
    UPDATE public.tribal_hearts_matches
    SET b_response = 'accepted', status = 'mutual', updated_at = now()
    WHERE id = _match_id;
    _is_mutual := TRUE;
  ELSE
    UPDATE public.tribal_hearts_matches
    SET b_response = 'passed', status = 'declined', updated_at = now()
    WHERE id = _match_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'mutual', _is_mutual, 'match_id', _match_id);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_tribal_hearts_spark(UUID, BOOLEAN) FROM public;
GRANT EXECUTE ON FUNCTION public.respond_tribal_hearts_spark(UUID, BOOLEAN) TO authenticated;