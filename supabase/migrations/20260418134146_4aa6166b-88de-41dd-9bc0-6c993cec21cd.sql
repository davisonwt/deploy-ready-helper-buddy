-- Storage bucket for Chatterbox TTS voiceovers (public-readable for use in <Audio> tags)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-voiceovers', 'ai-voiceovers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read so generated audio can be embedded in videos and the app
CREATE POLICY "Public can read AI voiceovers"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-voiceovers');

-- Authenticated users can upload their own voiceovers (file path: <user_id>/<filename>)
CREATE POLICY "Users can upload their own AI voiceovers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ai-voiceovers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own voiceovers
CREATE POLICY "Users can delete their own AI voiceovers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ai-voiceovers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);