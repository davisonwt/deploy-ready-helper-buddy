-- Host owns their folder
CREATE POLICY "Hosts read own radio session assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'radio-session-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts upload own radio session assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'radio-session-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts update own radio session assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'radio-session-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts delete own radio session assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'radio-session-assets' AND auth.uid()::text = (storage.foldername(name))[1]);