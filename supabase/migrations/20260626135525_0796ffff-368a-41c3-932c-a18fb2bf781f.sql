-- Whisperer portfolio bucket access
DROP POLICY IF EXISTS "Whisperer owners can upload to own folder" ON storage.objects;
CREATE POLICY "Whisperer owners can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whisperer-portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Whisperer owners can update own folder" ON storage.objects;
CREATE POLICY "Whisperer owners can update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'whisperer-portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Whisperer owners can delete own folder" ON storage.objects;
CREATE POLICY "Whisperer owners can delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'whisperer-portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone signed in can view whisperer portfolios" ON storage.objects;
CREATE POLICY "Anyone signed in can view whisperer portfolios"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whisperer-portfolios');