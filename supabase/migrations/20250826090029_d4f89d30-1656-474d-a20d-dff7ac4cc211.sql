-- Create the dj-music bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-music', 
  'dj-music', 
  true, 
  104857600, -- 100MB limit
  ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac'];

-- Create RLS policies for DJ music uploads
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
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow DJs to delete their own music" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dj-music' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);