-- Prevent anonymous users from attributing radio feedback to arbitrary listeners.
DROP POLICY IF EXISTS "Everyone can submit feedback" ON public.radio_feedback;
CREATE POLICY "Authenticated listeners can submit their own feedback"
ON public.radio_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  listener_user_id IS NULL OR listener_user_id = auth.uid()
);

-- Deny unknown Realtime Broadcast/Presence topics by default while preserving known app channels.
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Chat room participants can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Chat room participants can send realtime" ON realtime.messages;

CREATE POLICY "Known realtime topics can be read by authorized users"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() ~ '^chat_room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^chat_room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^typing:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^typing:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^premium-room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.user_has_premium_room_access((substring(realtime.topic() from '^premium-room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^user:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(:.*)?$'
      THEN (substring(realtime.topic() from '^user:([0-9a-fA-F-]{36})')::uuid = auth.uid())
    WHEN realtime.topic() ~ '^user_calls_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN (substring(realtime.topic() from '^user_calls_([0-9a-fA-F-]{36})$')::uuid = auth.uid())
    WHEN realtime.topic() LIKE 'tribal-orchard:%'
      THEN auth.uid() IS NOT NULL
    WHEN realtime.topic() ~ '^liveroom:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN auth.uid() IS NOT NULL
    WHEN realtime.topic() ~ '^stage:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN auth.uid() IS NOT NULL
    ELSE false
  END
);

CREATE POLICY "Known realtime topics can be written by authorized users"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() ~ '^chat_room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^chat_room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^typing:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.is_chat_room_participant((substring(realtime.topic() from '^typing:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^premium-room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.user_has_premium_room_access((substring(realtime.topic() from '^premium-room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
    WHEN realtime.topic() ~ '^user:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(:.*)?$'
      THEN (substring(realtime.topic() from '^user:([0-9a-fA-F-]{36})')::uuid = auth.uid())
    WHEN realtime.topic() ~ '^user_calls_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN (
        substring(realtime.topic() from '^user_calls_([0-9a-fA-F-]{36})$')::uuid = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.call_sessions cs
          WHERE cs.caller_id = auth.uid()
            AND cs.receiver_id = substring(realtime.topic() from '^user_calls_([0-9a-fA-F-]{36})$')::uuid
            AND cs.status IN ('ringing', 'accepted', 'active')
        )
      )
    WHEN realtime.topic() LIKE 'tribal-orchard:%'
      THEN auth.uid() IS NOT NULL
    WHEN realtime.topic() ~ '^liveroom:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN auth.uid() IS NOT NULL
    WHEN realtime.topic() ~ '^stage:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN auth.uid() IS NOT NULL
    ELSE false
  END
);

-- Tighten overly broad public/authenticated insert policies.
DROP POLICY IF EXISTS "Edge function can insert content flags" ON public.content_flags;
CREATE POLICY "Users can flag content as themselves"
ON public.content_flags
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid()));

DROP POLICY IF EXISTS "Edge function can insert alerts" ON public.gosat_alerts;

DROP POLICY IF EXISTS "System can insert profile access logs" ON public.profile_access_logs;
CREATE POLICY "Users can log their own profile access"
ON public.profile_access_logs
FOR INSERT
TO authenticated
WITH CHECK (accessor_user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert stats" ON public.radio_stats;

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.stream_analytics;
CREATE POLICY "Signed-in viewers can create stream analytics"
ON public.stream_analytics
FOR INSERT
TO authenticated
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.whisperer_clicks;
CREATE POLICY "Visitors can record anonymous or own whisperer clicks"
ON public.whisperer_clicks
FOR INSERT
TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Remove unnecessary always-true service-role policies; service_role bypasses RLS already.
DROP POLICY IF EXISTS "Service role can create achievements" ON public.achievements;
DROP POLICY IF EXISTS "Service role can insert activity feed" ON public.activity_feed;
DROP POLICY IF EXISTS "audit_insert_service_only" ON public.chat_system_message_audit;
DROP POLICY IF EXISTS "Service role can create follower notifications" ON public.follower_notifications;
DROP POLICY IF EXISTS "Service role can insert invoices" ON public.payment_invoices;
DROP POLICY IF EXISTS "Service role can insert referral circles" ON public.referral_circle;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.skilldrop_session_subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.study_subscriptions;
DROP POLICY IF EXISTS "Service role can create user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role can update points" ON public.user_points;
DROP POLICY IF EXISTS "System can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "service_role_full_access" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can insert verification logs" ON public.user_verification_logs;
DROP POLICY IF EXISTS "Service role can insert conversions" ON public.whisperer_conversions;

-- Fix functions with mutable search_path.
ALTER FUNCTION public.calculate_booking_fees(numeric) SET search_path = public;
ALTER FUNCTION public.generate_ref_code() SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.update_call_timestamps() SET search_path = public;
ALTER FUNCTION public.update_clubhouse_gifts_updated_at() SET search_path = public;
ALTER FUNCTION public.update_courier_delivery_timestamp() SET search_path = public;
ALTER FUNCTION public.update_provider_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_wallet_balance_timestamp() SET search_path = public;

-- Stop anonymous visitors from directly executing SECURITY DEFINER functions.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;