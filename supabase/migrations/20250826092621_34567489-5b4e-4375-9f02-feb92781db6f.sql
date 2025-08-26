-- Create the dj-music bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-music', 
  'dj-music', 
  true, 
  104857600, -- 100MB limit
  ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload to dj-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to dj-music files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files in dj-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files in dj-music" ON storage.objects;

-- Create RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload to dj-music" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow public access to dj-music files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'dj-music');

CREATE POLICY "Allow users to update their own files in dj-music" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow users to delete their own files in dj-music" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
);