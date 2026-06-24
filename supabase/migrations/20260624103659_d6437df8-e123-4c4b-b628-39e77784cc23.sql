-- Parent session table
CREATE TABLE public.radio_prerecorded_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled')),
  total_duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.radio_prerecorded_sessions TO authenticated;
GRANT ALL ON public.radio_prerecorded_sessions TO service_role;

ALTER TABLE public.radio_prerecorded_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage own sessions"
  ON public.radio_prerecorded_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Authenticated can view scheduled sessions"
  ON public.radio_prerecorded_sessions
  FOR SELECT
  TO authenticated
  USING (status = 'scheduled');

-- Slots table
CREATE TABLE public.radio_prerecorded_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.radio_prerecorded_sessions(id) ON DELETE CASCADE,
  position integer NOT NULL,
  slot_type text NOT NULL CHECK (slot_type IN ('live_talk','voice_note','song','advert','qa','custom')),
  label text,
  notes text,
  duration_seconds integer NOT NULL DEFAULT 0,
  music_track_id uuid REFERENCES public.dj_music_tracks(id) ON DELETE SET NULL,
  asset_url text,
  asset_name text,
  asset_mime text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, position)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.radio_prerecorded_slots TO authenticated;
GRANT ALL ON public.radio_prerecorded_slots TO service_role;

ALTER TABLE public.radio_prerecorded_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage slots of own sessions"
  ON public.radio_prerecorded_slots
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.radio_prerecorded_sessions s
    WHERE s.id = session_id AND s.host_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.radio_prerecorded_sessions s
    WHERE s.id = session_id AND s.host_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated can view slots of scheduled sessions"
  ON public.radio_prerecorded_slots
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.radio_prerecorded_sessions s
    WHERE s.id = session_id AND s.status = 'scheduled'
  ));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_radio_prerecorded_sessions_updated
  BEFORE UPDATE ON public.radio_prerecorded_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_radio_prerecorded_slots_updated
  BEFORE UPDATE ON public.radio_prerecorded_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_radio_prerec_sessions_host ON public.radio_prerecorded_sessions(host_user_id);
CREATE INDEX idx_radio_prerec_slots_session ON public.radio_prerecorded_slots(session_id, position);