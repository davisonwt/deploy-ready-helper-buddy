
CREATE OR REPLACE FUNCTION public.is_chat_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _user_id AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "System can insert invoices" ON public.payment_invoices;
CREATE POLICY "Service role can insert invoices"
ON public.payment_invoices FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create achievements" ON public.user_achievements;
CREATE POLICY "Service role can create user achievements"
ON public.user_achievements FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create achievements" ON public.achievements;
CREATE POLICY "Service role can create achievements"
ON public.achievements FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications"
ON public.user_notifications FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Users can insert own notifications"
ON public.user_notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create activity feed items" ON public.activity_feed;
CREATE POLICY "Service role can insert activity feed"
ON public.activity_feed FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Users can insert own activity"
ON public.activity_feed FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.follower_notifications;
CREATE POLICY "Service role can create follower notifications"
ON public.follower_notifications FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert conversions" ON public.whisperer_conversions;
CREATE POLICY "Service role can insert conversions"
ON public.whisperer_conversions FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert verification logs" ON public.user_verification_logs;
CREATE POLICY "Service role can insert verification logs"
ON public.user_verification_logs FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;

CREATE POLICY "Chat room participants can read realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'chat_room:%' THEN
      public.is_chat_room_participant(
        substring(realtime.topic() FROM 'chat_room:(.*)')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'user:%' THEN
      substring(realtime.topic() FROM 'user:(.*)')::uuid = auth.uid()
    ELSE auth.uid() IS NOT NULL
  END
);

CREATE POLICY "Chat room participants can send realtime"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'chat_room:%' THEN
      public.is_chat_room_participant(
        substring(realtime.topic() FROM 'chat_room:(.*)')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'user:%' THEN
      substring(realtime.topic() FROM 'user:(.*)')::uuid = auth.uid()
    ELSE auth.uid() IS NOT NULL
  END
);
