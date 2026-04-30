-- Private bucket for tribal hearts photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tribal-hearts-photos', 'tribal-hearts-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only access pattern: first folder = user id
CREATE POLICY "Hearts photos: read own"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tribal-hearts-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hearts photos: insert own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tribal-hearts-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hearts photos: update own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tribal-hearts-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hearts photos: delete own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tribal-hearts-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);