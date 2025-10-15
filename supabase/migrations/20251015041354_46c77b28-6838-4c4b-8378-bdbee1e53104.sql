-- RLS policies for radio-show-files bucket (bucket already exists)

-- Drop existing policies if any
DROP POLICY IF EXISTS "DJs can upload their own show files" ON storage.objects;
DROP POLICY IF EXISTS "DJs can update their own show files" ON storage.objects;
DROP POLICY IF EXISTS "DJs can delete their own show files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view radio show files" ON storage.objects;

-- Create fresh policies
CREATE POLICY "DJs can upload their own show files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'radio-show-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "DJs can update their own show files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'radio-show-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "DJs can delete their own show files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'radio-show-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view radio show files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'radio-show-files');