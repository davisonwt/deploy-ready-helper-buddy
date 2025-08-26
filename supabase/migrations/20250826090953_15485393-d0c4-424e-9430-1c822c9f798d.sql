-- Delete and recreate the bucket to ensure it's properly configured
DELETE FROM storage.buckets WHERE id = 'dj-music';

-- Create the bucket fresh
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-music', 
  'dj-music', 
  true, 
  104857600,
  ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac']
);

-- Ensure RLS policies exist for the bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload music" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to DJ music" ON storage.objects;
DROP POLICY IF EXISTS "Allow DJs to update their own music" ON storage.objects;
DROP POLICY IF EXISTS "Allow DJs to delete their own music" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload music" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow public access to DJ music" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'dj-music');

CREATE POLICY "Allow DJs to update their own music" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow DJs to delete their own music" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);