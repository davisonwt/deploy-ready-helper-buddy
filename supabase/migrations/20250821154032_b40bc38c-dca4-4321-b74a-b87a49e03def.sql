-- Create storage bucket for DJ music files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-music',
  'dj-music',
  true,
  52428800, -- 50MB limit per file
  ARRAY['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/aac']
);

-- Create storage policies for DJ music bucket
CREATE POLICY "DJs can upload their own music files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dj-music' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.radio_djs 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "DJs can view their own music files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dj-music' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Allow public access to music files for playback
    true
  )
);

CREATE POLICY "DJs can update their own music files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'dj-music' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.radio_djs 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "DJs can delete their own music files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dj-music' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.radio_djs 
    WHERE user_id = auth.uid() AND is_active = true
  )
);