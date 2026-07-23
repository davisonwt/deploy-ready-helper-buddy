
DROP POLICY IF EXISTS "Auth users can upload prescriptions" ON storage.objects;
CREATE POLICY "Auth users can upload prescriptions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND owner = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sowers s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.seller_template = 'regulated_business'
    )
  );

DROP POLICY IF EXISTS "Public can view active radio DJs" ON public.radio_djs;
DROP POLICY IF EXISTS "Authenticated users can view active DJs" ON public.radio_djs;

DROP POLICY IF EXISTS "Known realtime topics can be read by authorized users" ON realtime.messages;
DROP POLICY IF EXISTS "Known realtime topics can be written by authorized users" ON realtime.messages;

CREATE POLICY "Known realtime topics can be read by authorized users"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() ~ '^chat_room:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^chat_room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^room:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^typing:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^typing:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^premium-room:[0-9a-fA-F-]{36}$'
        THEN public.user_has_premium_room_access((substring(realtime.topic(), '^premium-room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^user:[0-9a-fA-F-]{36}(:.*)?$'
        THEN (substring(realtime.topic(), '^user:([0-9a-fA-F-]{36})'))::uuid = auth.uid()
      WHEN realtime.topic() ~ '^user_calls_[0-9a-fA-F-]{36}$'
        THEN (substring(realtime.topic(), '^user_calls_([0-9a-fA-F-]{36})$'))::uuid = auth.uid()
      WHEN realtime.topic() ~ '^liveroom:[0-9a-fA-F-]{36}$'
        THEN EXISTS (SELECT 1 FROM public.live_room_participants p WHERE p.user_id = auth.uid() AND p.room_id = (substring(realtime.topic(), '^liveroom:([0-9a-fA-F-]{36})$'))::uuid)
      WHEN realtime.topic() ~ '^stage:[0-9a-fA-F-]{36}$'
        THEN EXISTS (SELECT 1 FROM public.live_room_participants p WHERE p.user_id = auth.uid() AND p.room_id = (substring(realtime.topic(), '^stage:([0-9a-fA-F-]{36})$'))::uuid)
      WHEN realtime.topic() ~ '^tribal-orchard:[0-9a-fA-F-]{36}$'
        THEN EXISTS (
          SELECT 1 FROM public.orchards o
          WHERE o.id = (substring(realtime.topic(), '^tribal-orchard:([0-9a-fA-F-]{36})$'))::uuid
            AND (o.user_id = auth.uid()
                 OR EXISTS (SELECT 1 FROM public.bestowals b WHERE b.orchard_id = o.id AND b.bestower_id = auth.uid()))
        )
      ELSE false
    END
  );

CREATE POLICY "Known realtime topics can be written by authorized users"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() ~ '^chat_room:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^chat_room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^room:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^typing:[0-9a-fA-F-]{36}$'
        THEN public.is_chat_room_participant((substring(realtime.topic(), '^typing:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^premium-room:[0-9a-fA-F-]{36}$'
        THEN public.user_has_premium_room_access((substring(realtime.topic(), '^premium-room:([0-9a-fA-F-]{36})$'))::uuid, auth.uid())
      WHEN realtime.topic() ~ '^user:[0-9a-fA-F-]{36}(:.*)?$'
        THEN (substring(realtime.topic(), '^user:([0-9a-fA-F-]{36})'))::uuid = auth.uid()
      WHEN realtime.topic() ~ '^user_calls_[0-9a-fA-F-]{36}$'
        THEN (substring(realtime.topic(), '^user_calls_([0-9a-fA-F-]{36})$'))::uuid = auth.uid()
      WHEN realtime.topic() ~ '^liveroom:[0-9a-fA-F-]{36}$'
        THEN EXISTS (SELECT 1 FROM public.live_room_participants p WHERE p.user_id = auth.uid() AND p.room_id = (substring(realtime.topic(), '^liveroom:([0-9a-fA-F-]{36})$'))::uuid)
      WHEN realtime.topic() ~ '^stage:[0-9a-fA-F-]{36}$'
        THEN EXISTS (SELECT 1 FROM public.live_room_participants p WHERE p.user_id = auth.uid() AND p.room_id = (substring(realtime.topic(), '^stage:([0-9a-fA-F-]{36})$'))::uuid)
      WHEN realtime.topic() ~ '^tribal-orchard:[0-9a-fA-F-]{36}$'
        THEN EXISTS (
          SELECT 1 FROM public.orchards o
          WHERE o.id = (substring(realtime.topic(), '^tribal-orchard:([0-9a-fA-F-]{36})$'))::uuid
            AND (o.user_id = auth.uid()
                 OR EXISTS (SELECT 1 FROM public.bestowals b WHERE b.orchard_id = o.id AND b.bestower_id = auth.uid()))
        )
      ELSE false
    END
  );
