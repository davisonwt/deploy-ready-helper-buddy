CREATE POLICY "Users can view their own AI voiceovers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ai-voiceovers'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);