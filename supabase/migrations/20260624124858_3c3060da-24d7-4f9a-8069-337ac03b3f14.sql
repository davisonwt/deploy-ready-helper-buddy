-- Hand-raise queue for live sessions
ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS hand_raised BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hand_raised_at TIMESTAMPTZ;

-- Task submissions + scoring (reuses live_session_media)
ALTER TABLE public.live_session_media
  ADD COLUMN IF NOT EXISTS submission_role TEXT NOT NULL DEFAULT 'attendee_task',
  ADD COLUMN IF NOT EXISTS score NUMERIC,
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS scored_by UUID,
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- Hosts can score / annotate any media in their session
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='live_session_media'
      AND policyname='Hosts can score session media'
  ) THEN
    CREATE POLICY "Hosts can score session media"
      ON public.live_session_media
      FOR UPDATE
      TO authenticated
      USING (public.user_is_host_or_cohost(session_id))
      WITH CHECK (public.user_is_host_or_cohost(session_id));
  END IF;
END $$;

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_media; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.live_session_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_session_messages REPLICA IDENTITY FULL;
ALTER TABLE public.live_session_media REPLICA IDENTITY FULL;