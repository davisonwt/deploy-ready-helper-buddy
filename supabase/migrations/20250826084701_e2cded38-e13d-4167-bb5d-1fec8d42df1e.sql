-- Create storage buckets for DJ music uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('dj-music', 'dj-music', false);

-- Create RLS policies for DJ music bucket
CREATE POLICY "DJs can upload their own music" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'dj-music' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (SELECT 1 FROM radio_djs WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "DJs can view their own music" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'dj-music' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "DJs can update their own music" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'dj-music' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "DJs can delete their own music" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dj-music' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);