-- 1. Classroom session: attendance policy + live window
ALTER TABLE public.classroom_sessions
  ADD COLUMN IF NOT EXISTS attendance_mode TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS require_camera BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classroom_sessions_attendance_mode_check'
  ) THEN
    ALTER TABLE public.classroom_sessions
      ADD CONSTRAINT classroom_sessions_attendance_mode_check
      CHECK (attendance_mode IN ('relaxed','standard','strict'));
  END IF;
END $$;

-- 2. Live participant presence + check-in tracking
ALTER TABLE public.live_session_participants
  ADD COLUMN IF NOT EXISTS presence_status TEXT NOT NULL DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_active_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_away_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_in_required_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS missed_check_ins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hands_raised_count INTEGER NOT NULL DEFAULT 0;

-- 3. Classroom invites
CREATE TABLE IF NOT EXISTS public.classroom_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined')),
  message TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, invitee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_invites TO authenticated;
GRANT ALL ON public.classroom_invites TO service_role;
ALTER TABLE public.classroom_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classroom_invites' AND policyname='Inviter or invitee can view') THEN
    CREATE POLICY "Inviter or invitee can view" ON public.classroom_invites
      FOR SELECT TO authenticated
      USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classroom_invites' AND policyname='Instructor can invite') THEN
    CREATE POLICY "Instructor can invite" ON public.classroom_invites
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = inviter_id AND
        EXISTS (SELECT 1 FROM public.classroom_sessions s WHERE s.id = session_id AND s.instructor_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classroom_invites' AND policyname='Invitee can respond') THEN
    CREATE POLICY "Invitee can respond" ON public.classroom_invites
      FOR UPDATE TO authenticated
      USING (auth.uid() = invitee_id) WITH CHECK (auth.uid() = invitee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classroom_invites' AND policyname='Inviter can manage') THEN
    CREATE POLICY "Inviter can manage" ON public.classroom_invites
      FOR UPDATE TO authenticated
      USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classroom_invites' AND policyname='Inviter can revoke') THEN
    CREATE POLICY "Inviter can revoke" ON public.classroom_invites
      FOR DELETE TO authenticated
      USING (auth.uid() = inviter_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_classroom_invites_updated_at'
  ) THEN
    CREATE TRIGGER update_classroom_invites_updated_at
      BEFORE UPDATE ON public.classroom_invites
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4. Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_invites; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.classroom_invites REPLICA IDENTITY FULL;