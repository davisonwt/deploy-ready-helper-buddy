-- General notify-on-message: every real (non-system) chat_messages insert
-- notifies every other active participant of that room, via the existing
-- notify_member() RPC (already SECURITY DEFINER, already used by
-- ShareSeedDialog.tsx for exactly this kind of cross-user
-- user_notifications insert under RLS) -- reused, not reimplemented.
--
-- Excluded: sender_id IS NULL (system messages have no sender) and the
-- known system message_types (belt-and-braces -- attachSeedReferenceIfFirstMessage
-- inserts 'seed_reference' directly into chat_messages, not through
-- send_chat_message, and its sender_id is not necessarily null).
--
-- notify_member raises if auth.uid() is null or the caller/recipient don't
-- share an active room -- neither should happen on a real user-sent
-- message, but a notification failure must NEVER block the message itself,
-- so it's wrapped and swallowed per-recipient.
--
-- Known, accepted limitation (Davison's explicit choice): this fires on
-- every message unconditionally. It cannot know the recipient already has
-- this exact room open in another tab -- that's client-side state, not
-- visible to a DB trigger. notify_member's own existing dedupe (skips an
-- identical unread notification) is the only spam guard in place.
--
-- 2026-09-19, same day, before this ever went live: Global Chat (one
-- room every member is auto-joined to) is excluded entirely -- a room with
-- every member would otherwise notify every member on every message. Not
-- "gosat announcements only" -- excluded outright, simpler and
-- unambiguous; badge/unread count via the existing realtime subscription
-- still works normally. General per-recipient mute
-- (chat_participants.notifications_muted) added in the same pass, since
-- it's a one-line addition to the same loop and Global Chat needs a mute
-- option somewhere -- column is generic (any room), but only Global
-- Chat's UI exposes a toggle for it in this pass.

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS notifications_muted boolean NOT NULL DEFAULT false;

-- Sentinel id, same convention as this codebase's other hardcoded pinned
-- ids (Scripture Study, Grove Station, Companions Village). Created by the
-- migration that runs after this one.
CREATE OR REPLACE FUNCTION public.notify_chat_message_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_name text;
  v_recipient uuid;
BEGIN
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.message_type IN (
    'bestowal_receipt', 'booking_request', 'booking_response',
    'booking_confirmed', 'seed_reference', 'purchase_delivery'
  ) THEN
    RETURN NEW;
  END IF;

  -- Global Chat: every member is a participant, so this trigger's normal
  -- "notify every other active participant" would notify the entire
  -- membership on every message. Excluded outright.
  IF NEW.room_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, first_name, username, 'Someone')
    INTO v_sender_name
  FROM public.profiles_public
  WHERE user_id = NEW.sender_id;

  FOR v_recipient IN
    SELECT cp.user_id
    FROM public.chat_participants cp
    WHERE cp.room_id = NEW.room_id
      AND cp.is_active = true
      AND cp.notifications_muted = false
      AND cp.user_id <> NEW.sender_id
  LOOP
    BEGIN
      PERFORM public.notify_member(
        v_recipient,
        'chat_message',
        COALESCE(v_sender_name, 'Someone') || ' sent you a message',
        left(COALESCE(NEW.content, ''), 140),
        '/conversations?c=' || NEW.room_id::text,
        NULL
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_notify_participants ON public.chat_messages;
CREATE TRIGGER chat_message_notify_participants
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message_participants();
