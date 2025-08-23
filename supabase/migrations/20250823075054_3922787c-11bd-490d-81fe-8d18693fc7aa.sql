-- Ensure all orchard-related buckets are public and have appropriate file size limits
-- Create orchard-audio bucket for sound clips if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('orchard-audio', 'orchard-audio', true, 10485760)  -- 10MB limit for audio
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760;

-- Update orchard-images bucket to ensure it's public with reasonable limits
UPDATE storage.buckets 
SET public = true, file_size_limit = 20971520  -- 20MB for images
WHERE id = 'orchard-images';

-- Ensure comprehensive RLS policies for public access to orchard media
-- Policy for orchard images
CREATE POLICY IF NOT EXISTS "Public can view orchard images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

-- Policy for orchard videos  
CREATE POLICY IF NOT EXISTS "Public can view orchard videos"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-videos');

-- Policy for orchard audio
CREATE POLICY IF NOT EXISTS "Public can view orchard audio"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-audio');

-- Allow orchard creators to upload images
CREATE POLICY IF NOT EXISTS "Orchard creators can upload images"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'orchard-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow orchard creators to upload videos
CREATE POLICY IF NOT EXISTS "Orchard creators can upload videos"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'orchard-videos' 
  AND auth.uid() IS NOT NULL
);

-- Allow orchard creators to upload audio
CREATE POLICY IF NOT EXISTS "Orchard creators can upload audio"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'orchard-audio' 
  AND auth.uid() IS NOT NULL
);

-- Allow creators to manage their own uploads
CREATE POLICY IF NOT EXISTS "Users can manage their own orchard images"
ON storage.objects 
FOR ALL
USING (
  bucket_id = 'orchard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can manage their own orchard videos"
ON storage.objects 
FOR ALL
USING (
  bucket_id = 'orchard-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can manage their own orchard audio"
ON storage.objects 
FOR ALL
USING (
  bucket_id = 'orchard-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);