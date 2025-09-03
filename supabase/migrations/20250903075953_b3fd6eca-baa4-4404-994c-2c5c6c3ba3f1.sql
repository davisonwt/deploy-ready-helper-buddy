-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "DJs can upload music tracks" ON storage.objects;
DROP POLICY IF EXISTS "DJs can view their own music tracks" ON storage.objects;
DROP POLICY IF EXISTS "DJs can delete their own music tracks" ON storage.objects;

-- Create storage policies for music tracks with proper authentication
CREATE POLICY "DJs can upload music tracks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM radio_djs 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "DJs can view their own music tracks" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM radio_djs 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "DJs can delete their own music tracks" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM radio_djs 
    WHERE user_id = auth.uid()
  )
);