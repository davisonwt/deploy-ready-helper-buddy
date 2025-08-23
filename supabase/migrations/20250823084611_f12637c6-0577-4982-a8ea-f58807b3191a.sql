-- Check if orchard-images bucket exists and create it if needed
INSERT INTO storage.buckets (id, name, public) 
VALUES ('orchard-images', 'orchard-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for orchard image uploads
CREATE POLICY "Authenticated users can upload orchard images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'orchard-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Orchard images are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

CREATE POLICY "Users can update their own orchard images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'orchard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own orchard images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'orchard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);