-- Create storage bucket for music tracks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('music-tracks', 'music-tracks', false);

-- Create storage policies for music tracks
CREATE POLICY "DJs can upload music tracks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'music-tracks' 
  AND auth.uid() IN (
    SELECT user_id FROM radio_djs
  )
);

CREATE POLICY "DJs can view their own music tracks" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IN (
    SELECT user_id FROM radio_djs
  )
);

CREATE POLICY "DJs can delete their own music tracks" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'music-tracks' 
  AND auth.uid() IN (
    SELECT user_id FROM radio_djs
  )
);