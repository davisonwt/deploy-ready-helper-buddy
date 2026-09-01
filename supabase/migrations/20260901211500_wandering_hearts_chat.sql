-- Wandering Hearts messaging, Phase 1 (spec-payments.md-adjacent decision
-- record: SESSION-STATE.md "Wandering Hearts", decided 2026-09-01).
-- Calling is explicitly out of scope for this migration.

-- ---------------------------------------------------------------------------
-- Shared contact-detail detector. ONE function, used by both the send RPC
-- (soft rejection + logging) and the backstop trigger (hard rejection for
-- anything that bypasses the RPC). Not bulletproof against determined
-- evasion (no regex-only filter is) -- tuned against
-- scripts/wh-contact-detection-tests.sql's ~30 positive / ~15 negative
-- examples, not claimed to be complete.
CREATE OR REPLACE FUNCTION public.wh_detect_contact_info(_content text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  c text := lower(coalesce(_content, ''));
BEGIN
  IF c = '' THEN
    RETURN NULL;
  END IF;

  -- Email address.
  IF c ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RETURN 'email';
  END IF;

  -- URL / link, with or without protocol.
  IF c ~ '(https?://|www\.)\S+' THEN
    RETURN 'url';
  END IF;
  IF c ~ '\y[a-z0-9-]+\.(com|net|org|co|io|me|link|app|za)\y' THEN
    RETURN 'url';
  END IF;

  -- @handle.
  IF c ~ '(^|[^a-z0-9_.])@[a-z0-9_.]{2,30}\y' THEN
    RETURN 'handle';
  END IF;

  -- Social/messaging platform names -- flagged on their own, not only when
  -- followed by a username: naming the platform is itself the "let's move
  -- off-app" signal this exists to catch.
  IF c ~ '\y(instagram|insta|tiktok|snapchat|snap|facebook|whatsapp|telegram|signal|discord|linkedin|twitter)\y' THEN
    RETURN 'social_platform';
  END IF;

  -- Explicit contact-request phrasing.
  IF c ~ '(my number is|call me (on|at)|text me (on|at)|email me (at)|reach me (on|at)|add me on|contact me (on|at)|here.?s my number|whatsapp me|dm me)' THEN
    RETURN 'contact_phrase';
  END IF;

  -- Digit-form phone number: a run with at least 7 real digits, allowing
  -- spaces/dots/dashes/parens/plus as separators (comma is deliberately
  -- NOT a separator, so a comma-grouped number like "1,234,567" isn't
  -- mistaken for a phone number).
  IF EXISTS (
    SELECT 1
    FROM regexp_matches(c, '(\+?\(?\d[\d\s.\-()]{5,}\d)', 'g') AS m
    WHERE length(regexp_replace(m[1], '[^0-9]', '', 'g')) >= 7
  ) THEN
    RETURN 'phone_digits';
  END IF;

  -- Spelled-out digits: 5+ consecutive number-words. A lone "one" or "two"
  -- in a normal sentence never matches this -- it takes a real run.
  IF c ~ '(\y(zero|one|two|three|four|five|six|seven|eight|nine|oh)\y[\s-]*){5,}' THEN
    RETURN 'phone_spelled';
  END IF;

  -- Mixed digit + spelled-out digit fused with no space (e.g. "08two").
  IF c ~ '\d(zero|one|two|three|four|five|six|seven|eight|nine)|(zero|one|two|three|four|five|six|seven|eight|nine)\d' THEN
    RETURN 'phone_mixed';
  END IF;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Blocked-attempt log for gosat review. Never the message text -- only who,
-- where, when, and which rule matched. Written only by
-- send_wandering_hearts_message (SECURITY DEFINER) -- no direct-insert
-- policy for regular users.
CREATE TABLE public.wh_blocked_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid NOT NULL,
  matched_rule text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wh_blocked_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_blocked_log_gosat_select" ON public.wh_blocked_message_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gosat'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------------------------------------------------------------------------
-- Backstop trigger: hard-rejects any contact-info message in a
-- wandering_hearts room regardless of insert path (RLS already lets a
-- participant insert into chat_messages directly via PostgREST -- this
-- catches that path too, not just the intended RPC below). No logging
-- here on purpose: the intended path (the RPC) logs; anyone hitting this
-- trigger instead went around the normal send path entirely, which is
-- its own signal, and a hard failure (transaction rollback) is the
-- correct response to that, not a soft one.
CREATE OR REPLACE FUNCTION public.wh_block_contact_info_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_type public.chat_room_type;
  _rule text;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.content IS NULL THEN
    RETURN NEW; -- system messages, or non-text (voice/video) rows
  END IF;

  SELECT room_type INTO _room_type FROM public.chat_rooms WHERE id = NEW.room_id;
  IF _room_type = 'wandering_hearts' THEN
    _rule := public.wh_detect_contact_info(NEW.content);
    IF _rule IS NOT NULL THEN
      RAISE EXCEPTION 'Wandering Hearts keeps contact details private (rule: %)', _rule;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wh_block_contact_info ON public.chat_messages;
CREATE TRIGGER wh_block_contact_info
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.wh_block_contact_info_trigger();

-- ---------------------------------------------------------------------------
-- Room creation: same shape as get_or_create_direct_room, deliberately NOT
-- reused -- reusing it would find/create a plain 'direct' room, which (a)
-- isn't tagged wandering_hearts so the contact-info trigger above wouldn't
-- even apply to it, and (b) could collide with an unrelated marketplace
-- chat the same two people already have (e.g. a past buyer/sower
-- relationship), which must never be the same room as their WH
-- conversation. Only callable by one of the two members; only succeeds for
-- a genuinely status='mutual' pair.
CREATE OR REPLACE FUNCTION public.get_or_create_wandering_hearts_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL OR (_caller <> user1_id AND _caller <> user2_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tribal_hearts_matches
    WHERE status = 'mutual'
      AND ((member_a_id = user1_id AND member_b_id = user2_id)
        OR (member_a_id = user2_id AND member_b_id = user1_id))
  ) THEN
    RAISE EXCEPTION 'no mutual match between these users';
  END IF;

  SELECT cr.id INTO v_room_id
  FROM public.chat_rooms cr
  WHERE cr.room_type = 'wandering_hearts'
    AND cr.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp1
      WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND cp1.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp2
      WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND cp2.is_active = true
    )
  LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  INSERT INTO public.chat_rooms (name, room_type, created_by, is_system_room, is_active)
  VALUES ('Wandering Hearts', 'wandering_hearts', _caller, false, true)
  RETURNING id INTO v_room_id;

  INSERT INTO public.chat_participants (room_id, user_id, is_active)
  VALUES (v_room_id, user1_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  INSERT INTO public.chat_participants (room_id, user_id, is_active)
  VALUES (v_room_id, user2_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  RETURN v_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_wandering_hearts_room(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_wandering_hearts_room(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- The only path the client UI uses to send a WH message. Checks the room is
-- actually a WH room, the caller is an active participant, and (for text)
-- runs the shared detector -- on a match, logs the attempt (never the
-- text) and returns ok:false instead of inserting, so the client gets a
-- clean rejection to show a toast for rather than a thrown Postgres error.
CREATE OR REPLACE FUNCTION public.send_wandering_hearts_message(
  _room_id uuid,
  _content text DEFAULT NULL,
  _message_type text DEFAULT 'text',
  _file_url text DEFAULT NULL,
  _file_duration_sec int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _room_type public.chat_room_type;
  _rule text;
  _msg_id uuid;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT room_type INTO _room_type FROM public.chat_rooms WHERE id = _room_id;
  IF _room_type IS DISTINCT FROM 'wandering_hearts' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_a_wh_room');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _me AND is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_a_participant');
  END IF;

  IF _content IS NOT NULL AND trim(_content) <> '' THEN
    _rule := public.wh_detect_contact_info(_content);
    IF _rule IS NOT NULL THEN
      INSERT INTO public.wh_blocked_message_log (user_id, room_id, matched_rule)
      VALUES (_me, _room_id, _rule);
      RETURN jsonb_build_object('ok', false, 'code', 'contact_info_blocked', 'rule', _rule);
    END IF;
  END IF;

  INSERT INTO public.chat_messages (room_id, sender_id, content, message_type, file_url)
  VALUES (_room_id, _me, NULLIF(trim(coalesce(_content, '')), ''), _message_type, _file_url)
  RETURNING id INTO _msg_id;

  IF _file_duration_sec IS NOT NULL THEN
    UPDATE public.chat_messages
    SET system_metadata = jsonb_build_object('duration_sec', _file_duration_sec)
    WHERE id = _msg_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'message_id', _msg_id);
END;
$$;

REVOKE ALL ON FUNCTION public.send_wandering_hearts_message(uuid, text, text, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.send_wandering_hearts_message(uuid, text, text, text, int) TO authenticated;
