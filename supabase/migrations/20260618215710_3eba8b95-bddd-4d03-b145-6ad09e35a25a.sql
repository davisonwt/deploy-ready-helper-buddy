ALTER TABLE public.dj_music_tracks
  ADD COLUMN IF NOT EXISTS radio_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS radio_opted_in_at timestamptz;

CREATE INDEX IF NOT EXISTS dj_music_tracks_radio_eligible_idx
  ON public.dj_music_tracks (radio_eligible) WHERE radio_eligible = true;

CREATE TABLE IF NOT EXISTS public.gosat_radio_roundup_sent (
  user_id uuid PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now(),
  track_count int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.gosat_radio_roundup_sent TO authenticated;
GRANT ALL ON public.gosat_radio_roundup_sent TO service_role;

ALTER TABLE public.gosat_radio_roundup_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read roundup log"
  ON public.gosat_radio_roundup_sent FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
