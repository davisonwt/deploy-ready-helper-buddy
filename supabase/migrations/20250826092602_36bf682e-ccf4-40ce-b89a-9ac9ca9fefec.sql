-- First, let's clean up any existing bucket
DELETE FROM storage.buckets WHERE id = 'dj-music';
DELETE FROM storage.buckets WHERE id = 'radio-music';

-- Create the dj-music bucket with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-music', 
  'dj-music', 
  true, 
  104857600, -- 100MB limit
  ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a']
);

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