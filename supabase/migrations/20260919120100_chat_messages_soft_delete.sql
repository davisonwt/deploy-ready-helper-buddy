-- Delete-for-everyone: a message is soft-deleted (placeholder shown to all
-- participants), and its media object is separately hard-removed from
-- storage by the delete-chat-message edge function (service role -- no
-- client-side DELETE policy exists on chat-media today).
--
-- The UPDATE half reuses the existing "Senders can update own messages"
-- RLS policy (sender_id = auth.uid()) -- no new chat_messages policy
-- needed here.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- chat-media had no server-side size limit at all (client-side 50MB check
-- only, trivially bypassed). 15MB matches the tightened in-app recording
-- caps (60s voice / 15s video) with headroom, and is defense-in-depth
-- alongside the client-side checks, not a replacement for them.
UPDATE storage.buckets SET file_size_limit = 15728640 WHERE id = 'chat-media';
