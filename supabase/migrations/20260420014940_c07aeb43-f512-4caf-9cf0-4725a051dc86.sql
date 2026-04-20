-- Tribal Hearts v2: rich profiles (photos, voice note, seeking intent, about-seen)
ALTER TABLE public.tribal_hearts_profiles
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_note_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_note_duration_sec INTEGER,
  ADD COLUMN IF NOT EXISTS seeking_intent TEXT NOT NULL DEFAULT 'connection',
  ADD COLUMN IF NOT EXISTS about_seen_at TIMESTAMPTZ;

-- Constrain seeking_intent to allowed values
DO $$ BEGIN
  ALTER TABLE public.tribal_hearts_profiles
    ADD CONSTRAINT tribal_hearts_seeking_intent_check
    CHECK (seeking_intent IN ('friendship','courtship','connection'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow Ambassadors (active or with free pass) to discover OPPOSITE-gender active profiles.
-- Hides behind ambassador gating + only opposite gender + only 'active' status.
CREATE OR REPLACE FUNCTION public.is_tribal_hearts_member(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ambassador_applications
    WHERE user_id = _uid AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.s2g_agent_free_access WHERE user_id = _uid
  );
$$;

DROP POLICY IF EXISTS "hearts_profiles_ambassador_browse" ON public.tribal_hearts_profiles;
CREATE POLICY "hearts_profiles_ambassador_browse"
ON public.tribal_hearts_profiles
FOR SELECT
USING (
  status = 'active'
  AND public.is_tribal_hearts_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tribal_hearts_profiles me
    WHERE me.user_id = auth.uid()
      AND me.gender <> tribal_hearts_profiles.gender
  )
);

-- Storage bucket for hearts photos & voice notes (private; signed URLs only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tribal-hearts-media', 'tribal-hearts-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hearts_media_owner_all" ON storage.objects;
CREATE POLICY "hearts_media_owner_all"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'tribal-hearts-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'tribal-hearts-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "hearts_media_ambassador_read" ON storage.objects;
CREATE POLICY "hearts_media_ambassador_read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tribal-hearts-media'
  AND public.is_tribal_hearts_member(auth.uid())
);
