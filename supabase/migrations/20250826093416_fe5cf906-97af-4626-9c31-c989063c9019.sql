-- Create the music-tracks bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-tracks', 
  'music-tracks', 
  true, 
  104857600, -- 100MB limit
  ARRAY['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the music-tracks bucket
CREATE POLICY "Allow authenticated users to upload to music-tracks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow public access to music-tracks files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'music-tracks');

CREATE POLICY "Allow users to update their own files in music-tracks" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow users to delete their own files in music-tracks" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
);