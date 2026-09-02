-- Text-based abuse detection, app-wide. Same shape as
-- wh_detect_contact_info / send_wandering_hearts_message / the
-- wh_block_contact_info backstop trigger (20260901211500) -- extends that
-- idea rather than reinventing it: one shared SQL detector, a TS mirror
-- for instant client feedback, a backstop trigger so no insert path can
-- bypass it, and a minimal-data log table for gosat review. This does NOT
-- replace wh_detect_contact_info (contact-info sharing in Wandering
-- Hearts stays its own, separate concern) -- it runs alongside it.
--
-- Everything here flags for human review by default. Two categories are a
-- hard block instead (wallet-address substitution, credential/key
-- solicitation) because the harm is immediate, irreversible, and
-- financial -- by the time a gosat reviews a flag, the funds are already
-- gone. Every other category (harassment, sexual harassment, scam
-- phrasing, phishing, app-probing) stays visible and goes to the queue,
-- same principle as content_reports: acting is a human decision, not an
-- automatic one.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Severity ranking (shared ordering helper -- used by the detector's
--    return shape and by the queue's ORDER BY)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_severity_rank(_severity text)
RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _severity
    WHEN 'critical' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0
  END
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. The shared detector. Checked in priority order -- hard-block
--    categories first, since if content trips both a hard-block and a
--    soft rule, the hard block is what matters. Returns NULL row (all
--    fields null) when nothing matches, mirroring wh_detect_contact_info's
--    "NULL means clean" contract but as a composite instead of a bare
--    text, since callers need category/severity/hard_block too.
--
--    Word lists here are intentionally a starting set, not a claimed-
--    complete slur/threat dictionary -- tuned against
--    scripts/abuse-detection-tests.sql's ~40 positive / ~20 negative
--    cases, same disclaimer wh_detect_contact_info already carries about
--    not being bulletproof against determined evasion.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.detect_abuse(_content text)
RETURNS TABLE(rule text, category text, severity text, hard_block boolean)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw text := coalesce(_content, '');
  c text := lower(raw);
BEGIN
  IF trim(c) = '' THEN
    RETURN;
  END IF;

  -- ── 4. WALLET-ADDRESS SUBSTITUTION -- hard block ─────────────────────
  -- Solana (base58, 32-44 chars), Bitcoin (legacy 1.../3..., bech32
  -- bc1...), Ethereum (0x + 40 hex). Deliberately no context requirement
  -- (e.g. "only if near the word 'pay'") -- a bare address pasted into a
  -- chat, listing, bio, or orchard description has no legitimate use on
  -- this platform (checkout already shows the right address; nothing
  -- else on S2G needs a member posting one), so the net is wide on
  -- purpose. This DOES also catch someone quoting a scammer's address to
  -- warn others -- see scripts/abuse-detection-tests.sql for why that's
  -- an accepted tradeoff, not a bug: the detector can't tell "beware of"
  -- from "pay me" apart, and blocking-with-an-explanation-to-use-Report
  -- is safer than the alternative given real money is on the line.
  --
  -- Checked against raw (case-sensitive), not the lowercased c: base58
  -- (Bitcoin) is case-sensitive by construction -- lower() turns a valid
  -- uppercase 'L' into a lowercase 'l', which base58 excludes, silently
  -- breaking a real address mid-string (caught by
  -- scripts/abuse-detection-tests.sql, not by inspection). bc1/0x use ~*
  -- (case-insensitive) since bech32/hex don't have that same trap.
  IF raw ~ '\y[1-9A-HJ-NP-Za-km-z]{32,44}\y'
     OR raw ~ '\y1[a-km-zA-HJ-NP-Z1-9]{25,34}\y'
     OR raw ~ '\y3[a-km-zA-HJ-NP-Z1-9]{25,34}\y'
     OR raw ~* '\ybc1[a-z0-9]{25,90}\y'
     OR raw ~* '\y0x[a-f0-9]{40}\y'
  THEN
    RETURN QUERY SELECT 'wallet_address'::text, 'wallet_address_substitution'::text, 'critical'::text, true;
    RETURN;
  END IF;

  -- ── 6. Credential / key solicitation -- hard block ───────────────────
  IF c ~ '(what.?s|send|share|give|tell me) (your |me your |).?(password|passcode|seed phrase|recovery phrase|private key|secret key|otp|one.time (code|password)|2fa code|verification code|security code)'
     OR c ~ '(send|share|give) me (the |your |).?(otp|2fa|verification|security) code'
  THEN
    RETURN QUERY SELECT 'credential_request'::text, 'credential_solicitation'::text, 'critical'::text, true;
    RETURN;
  END IF;

  -- ── 5. Phishing -- flag, elevated severity per spec ──────────────────
  IF (c ~ '(https?://|www\.)\S+' OR c ~ '\y[a-z0-9-]+\.(com|net|org|co|io|me|link|xyz|app)\y')
     AND c ~ '(verify your account|confirm your login|confirm your identity|your account (has been|will be) (suspended|locked|limited)|unusual activity|click here to (verify|confirm|restore)|update your (payment|billing) (info|details))'
  THEN
    RETURN QUERY SELECT 'phishing_link'::text, 'phishing'::text, 'critical'::text, false;
    RETURN;
  END IF;

  -- ── 2. Sexual harassment -- flag ──────────────────────────────────────
  IF c ~ '(send (me |)(nudes|nude pics|nude photos|a nude)|send me (a |)(pic|picture|photo|video) of (you|yourself) (naked|nude))'
     OR c ~ '(want to (have sex|sleep with you)|are you (single and |)(down|dtf)|show me your (body|tits|dick|ass))'
  THEN
    RETURN QUERY SELECT 'unwanted_sexual_advance'::text, 'sexual_harassment'::text, 'high'::text, false;
    RETURN;
  END IF;

  -- ── 1. Harassment and abuse -- flag ───────────────────────────────────
  -- Threats and unambiguous hostility first (higher-confidence patterns);
  -- a broader slur/insult list belongs here too but isn't authored in
  -- this pass -- see the migration header note and SESSION-STATE.md.
  IF c ~ '(kill yourself|\ykys\y|i will (find|hurt|kill) you|i know where you live|you deserve to (die|suffer)|i.?m going to hurt you)'
     OR c ~ '\yyou.?re (a |an |)(worthless|pathetic|trash|scum|disgusting)\y'
  THEN
    RETURN QUERY SELECT 'threat_or_hostility'::text, 'harassment_abuse'::text, 'high'::text, false;
    RETURN;
  END IF;

  -- ── 3. Scam and fraud patterns -- flag ─────────────────────────────────
  IF c ~ '(send me \$?\d+|send (crypto|usdt|usdc|btc|eth|sol)) and i.?ll send (you |)back (more|double|\$?\d+)'
     OR c ~ '(pay a (small |)(fee|deposit) to (release|unlock|receive))'
     OR c ~ '(act now|limited time only|offer expires (today|soon)|last chance).{0,40}(pay|send|click|buy)'
     OR c ~ '\yi.?m (a |the |)(gosat|admin|moderator|s2g (support|staff|team))\y.{0,60}(send|pay|click|verify|confirm)'
     OR c ~ '(pay me directly|pay outside (the |)(app|platform)|skip the escrow|avoid the fee by paying)'
  THEN
    RETURN QUERY SELECT 'scam_pattern'::text, 'scam_fraud'::text, 'high'::text, false;
    RETURN;
  END IF;

  -- ── 7. Attempts to probe the app itself -- flag ───────────────────────
  IF c ~ '(''\s*or\s*''?1''?\s*=\s*''?1|union\s+select|drop\s+table|;\s*--|<script[\s>]|javascript:)'
     OR c ~ '(ignore (all |)(previous|prior) instructions|disregard (your |the |)(previous |prior |)instructions|you are now (dan|jailbroken)|reveal your system prompt)'
  THEN
    RETURN QUERY SELECT 'app_probe'::text, 'app_probing'::text, 'medium'::text, false;
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. abuse_flags -- the review queue. Minimal-data by design: for content
--    that's actually saved (a flag, not a block), content_id points at
--    the live row elsewhere (chat_messages/products/profiles/orchards) --
--    a gosat opens THAT to see it in context, nothing is duplicated here.
--    For a blocked attempt (nothing was ever saved), there's no row to
--    point at, so content_id is null and room_id (chat only) is the only
--    context offered -- same minimal choice wh_blocked_message_log
--    already made for the exact same reason.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('chat_message', 'listing_description', 'profile_bio', 'orchard_description')),
  content_id uuid,
  room_id uuid,
  author_id uuid NOT NULL,
  matched_rule text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  action_taken text NOT NULL CHECK (action_taken IN ('flagged', 'blocked')),
  repeat_offender boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed_allowed', 'reviewed_dismissed', 'reviewed_suspended')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX abuse_flags_author_created_idx ON public.abuse_flags (author_id, created_at DESC);
CREATE INDEX abuse_flags_status_idx ON public.abuse_flags (status) WHERE status = 'pending_review';

ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abuse_flags_gosat_select" ON public.abuse_flags
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "abuse_flags_gosat_update" ON public.abuse_flags
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()))
  WITH CHECK (public.is_admin_or_gosat(auth.uid()));

-- No INSERT policy for authenticated: every row is written by a
-- SECURITY DEFINER trigger function below, never directly by a client.

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Audit trail: every gosat view of a flag writes a row here. Written
--    by TrustSafetyQueue when it loads the abuse flags list (batch, one
--    row per flag shown) -- "who looked, at what, when," per spec.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.abuse_flag_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.abuse_flags(id) ON DELETE CASCADE,
  viewed_by uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abuse_flag_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abuse_flag_views_gosat_select" ON public.abuse_flag_views
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "abuse_flag_views_gosat_insert" ON public.abuse_flag_views
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gosat(auth.uid()) AND viewed_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Gosat/admin need to actually be able to open a flagged chat message
--    to review it in context -- the existing chat_messages SELECT policy
--    only lets a room PARTICIPANT read messages, so without this, a
--    flagged message in a room a gosat isn't part of is unreadable to
--    them (this was already silently true for
--    TrustSafetyQueue.suspendTargetUploader's existing chat_message
--    lookup too -- this closes that gap as a side effect). Additive only:
--    OR'd with the existing policy, doesn't narrow anything.
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "gosat_read_all_chat_messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Chat messages -- app-wide, every room type including
--    wandering_hearts (this is a different, broader concern than
--    wh_block_contact_info, which only handles contact-info sharing in
--    WH specifically; both triggers run independently on every insert).
--    A single BEFORE INSERT trigger on the table catches every insert
--    path regardless of which client code calls it -- no existing call
--    site needs to change FOR THE TRIGGER ITSELF to apply to it.
--
--    The trigger's hard-block branch, however, deliberately does NOT log
--    the attempt -- verified live: INSERT-then-RAISE EXCEPTION in the
--    same statement means Postgres aborts the whole transaction on the
--    exception, which rolls back the log write moments earlier too, so
--    it never actually persisted. This is exactly why
--    wh_block_contact_info_trigger's own backstop path already does no
--    logging (see its comment in 20260901211500) -- a log can only
--    survive if the enclosing call returns NORMALLY (no exception),
--    which only an RPC can do BEFORE it ever attempts the insert. So:
--    the trigger stays a pure backstop (hard fail, no log, for any
--    insert that bypasses the RPCs below); send_chat_message and
--    send_wandering_hearts_message below pre-check and log the hard-
--    block case themselves, returning a clean rejection instead of
--    ever attempting the insert. The trigger's SOFT-FLAG branch has no
--    such problem (nothing aborts) and is the sole soft-flag logger for
--    every insert path, RPC included -- the RPCs below intentionally do
--    NOT also log a soft flag, to avoid double-logging the same message.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_detect_chat_message_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match record;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW; -- system messages, or non-text (voice/video) rows
  END IF;

  SELECT * INTO _match FROM public.detect_abuse(NEW.content);
  IF _match.rule IS NULL THEN
    RETURN NEW;
  END IF;

  IF _match.hard_block THEN
    IF _match.category = 'wallet_address_substitution' THEN
      RAISE EXCEPTION 'For your safety, messages can''t include a wallet address here -- checkout always shows the correct one. If someone asked you to pay a different address, use the Report button instead.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'This message can''t be sent -- it looks like it''s asking for a password, seed phrase, or verification code. Sow2Grow (and real gosats) never ask for those. If someone did, use the Report button.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.abuse_flags (content_type, content_id, room_id, author_id, matched_rule, category, severity, action_taken)
  VALUES ('chat_message', NEW.id, NEW.room_id, NEW.sender_id, _match.rule, _match.category, _match.severity, 'flagged');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abuse_detect_chat_message ON public.chat_messages;
CREATE TRIGGER abuse_detect_chat_message
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.abuse_detect_chat_message_trigger();

-- ═══════════════════════════════════════════════════════════════════════
-- 6b. send_chat_message: pre-checks hard-block categories BEFORE the
--     insert (same shape send_wandering_hearts_message already uses for
--     contact-info), logs, and returns NULL cleanly -- no exception, so
--     the log survives. Return type stays public.chat_messages
--     (composite types can be NULL); useChat.jsx's sendMessage checks
--     for a null result and shows why, alongside this.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_room_id uuid,
  p_content text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_file_url text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_file_type public.file_type DEFAULT NULL,
  p_file_size integer DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.chat_messages;
  _match record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.is_active_participant(p_room_id, auth.uid()) OR public.is_room_creator(p_room_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed to send to this room' USING ERRCODE = '42501';
  END IF;

  IF p_content IS NOT NULL AND trim(p_content) <> '' THEN
    SELECT * INTO _match FROM public.detect_abuse(p_content);
    IF _match.hard_block THEN
      INSERT INTO public.abuse_flags (content_type, content_id, room_id, author_id, matched_rule, category, severity, action_taken)
      VALUES ('chat_message', NULL, p_room_id, auth.uid(), _match.rule, _match.category, _match.severity, 'blocked');
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.chat_messages (
    room_id, sender_id, content, message_type, file_url, file_name, file_type, file_size
  ) VALUES (
    p_room_id, auth.uid(), p_content, COALESCE(p_message_type, 'text'), p_file_url, p_file_name, p_file_type, p_file_size
  )
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(uuid, text, text, text, text, public.file_type, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text, text, text, public.file_type, integer) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 6c. send_wandering_hearts_message: same hard-block pre-check added,
--     alongside its existing wh_detect_contact_info check (unrelated,
--     unchanged) -- general abuse detection applies inside Wandering
--     Hearts too, per the spec ("chat messages app-wide, not just
--     Wandering Hearts"). Already returns jsonb with no exception on
--     its existing block path, so this slots in the same way.
-- ═══════════════════════════════════════════════════════════════════════
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
  _match record;
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

    SELECT * INTO _match FROM public.detect_abuse(_content);
    IF _match.hard_block THEN
      INSERT INTO public.abuse_flags (content_type, content_id, room_id, author_id, matched_rule, category, severity, action_taken)
      VALUES ('chat_message', NULL, _room_id, _me, _match.rule, _match.category, _match.severity, 'blocked');
      RETURN jsonb_build_object('ok', false, 'code', 'abuse_blocked', 'category', _match.category);
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

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Listing descriptions (products.description). sower_id is a FK to
--    sowers.id, not the seller's auth id -- same resolution TrustSafety-
--    Queue.resolveProductUploader already does client-side, mirrored here
--    in SQL. Only runs the detector when description actually changed on
--    UPDATE, so editing price/stock/etc. doesn't re-flag unchanged text.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_detect_product_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match record;
  _author_id uuid;
BEGIN
  IF NEW.description IS NULL OR trim(NEW.description) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _match FROM public.detect_abuse(NEW.description);
  IF _match.rule IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.user_id INTO _author_id FROM public.sowers s WHERE s.id = NEW.sower_id;
  IF _author_id IS NULL THEN
    RETURN NEW; -- can't resolve an uploader to attribute the flag to -- don't guess
  END IF;

  IF _match.hard_block THEN
    INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
    VALUES ('listing_description', NEW.id, _author_id, _match.rule, _match.category, _match.severity, 'blocked');
    IF _match.category = 'wallet_address_substitution' THEN
      RAISE EXCEPTION 'This listing can''t include a wallet address -- checkout always shows the correct one for a bestowal. Remove it and save again.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'This listing can''t ask for a password, seed phrase, or verification code. Remove that and save again.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
  VALUES ('listing_description', NEW.id, _author_id, _match.rule, _match.category, _match.severity, 'flagged');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abuse_detect_product ON public.products;
CREATE TRIGGER abuse_detect_product
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.abuse_detect_product_trigger();

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Profile bios (profiles.bio). user_id is the auth id directly.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_detect_profile_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match record;
BEGIN
  IF NEW.bio IS NULL OR trim(NEW.bio) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.bio IS NOT DISTINCT FROM OLD.bio THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _match FROM public.detect_abuse(NEW.bio);
  IF _match.rule IS NULL THEN
    RETURN NEW;
  END IF;

  IF _match.hard_block THEN
    INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
    VALUES ('profile_bio', NEW.id, NEW.user_id, _match.rule, _match.category, _match.severity, 'blocked');
    IF _match.category = 'wallet_address_substitution' THEN
      RAISE EXCEPTION 'Your bio can''t include a wallet address -- checkout always shows the correct one for a bestowal. Remove it and save again.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'Your bio can''t ask for a password, seed phrase, or verification code. Remove that and save again.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
  VALUES ('profile_bio', NEW.id, NEW.user_id, _match.rule, _match.category, _match.severity, 'flagged');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abuse_detect_profile ON public.profiles;
CREATE TRIGGER abuse_detect_profile
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.abuse_detect_profile_trigger();

-- ═══════════════════════════════════════════════════════════════════════
-- 9. Orchard descriptions (orchards.description). user_id is the auth id
--    directly.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_detect_orchard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match record;
BEGIN
  IF NEW.description IS NULL OR trim(NEW.description) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _match FROM public.detect_abuse(NEW.description);
  IF _match.rule IS NULL THEN
    RETURN NEW;
  END IF;

  IF _match.hard_block THEN
    INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
    VALUES ('orchard_description', NEW.id, NEW.user_id, _match.rule, _match.category, _match.severity, 'blocked');
    IF _match.category = 'wallet_address_substitution' THEN
      RAISE EXCEPTION 'This orchard description can''t include a wallet address -- checkout always shows the correct one for a bestowal. Remove it and save again.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'This orchard description can''t ask for a password, seed phrase, or verification code. Remove that and save again.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.abuse_flags (content_type, content_id, author_id, matched_rule, category, severity, action_taken)
  VALUES ('orchard_description', NEW.id, NEW.user_id, _match.rule, _match.category, _match.severity, 'flagged');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abuse_detect_orchard ON public.orchards;
CREATE TRIGGER abuse_detect_orchard
  BEFORE INSERT OR UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.abuse_detect_orchard_trigger();

-- ═══════════════════════════════════════════════════════════════════════
-- 10. Repeat-offender escalation: AFTER INSERT on abuse_flags itself, so
--     it applies uniformly to every content type and both flagged/blocked
--     rows above, no per-trigger duplication. Rolling 7-day window, N=3
--     (both tunable -- picked as a reasonable starting point, not a
--     spec-mandated number). Notifies gosats once per author per time
--     they FIRST cross the threshold (count = N exactly), not on every
--     flag after that, so gosats don't get spammed by one prolific
--     offender -- but severity is bumped to 'critical' and
--     repeat_offender=true on every row once the author is over the
--     threshold, so the queue's severity ordering keeps surfacing them.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abuse_repeat_offender_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_count int;
  _threshold CONSTANT int := 3;
  _gosats record;
BEGIN
  SELECT count(*) INTO _window_count
  FROM public.abuse_flags
  WHERE author_id = NEW.author_id
    AND created_at >= now() - interval '7 days';

  IF _window_count >= _threshold THEN
    UPDATE public.abuse_flags
    SET repeat_offender = true,
        severity = 'critical'
    WHERE id = NEW.id;
  END IF;

  IF _window_count = _threshold THEN
    FOR _gosats IN SELECT user_id FROM public.user_roles WHERE role = 'gosat' LOOP
      INSERT INTO public.user_notifications (user_id, type, title, message, action_url, is_read)
      VALUES (
        _gosats.user_id,
        'abuse_repeat_offender',
        'Repeat offender flagged',
        format('Member %s has tripped %s abuse flags in the last 7 days. Review in the moderation queue.', NEW.author_id, _window_count),
        '/admin/moderation',
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abuse_repeat_offender ON public.abuse_flags;
CREATE TRIGGER abuse_repeat_offender
  AFTER INSERT ON public.abuse_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.abuse_repeat_offender_check();
