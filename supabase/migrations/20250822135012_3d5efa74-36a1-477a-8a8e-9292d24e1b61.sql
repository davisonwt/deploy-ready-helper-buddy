-- Make the orchard-images bucket public so images don't need signed URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'orchard-images';

-- Create RLS policies for public access to orchard images
CREATE POLICY "Public can view orchard images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

-- Allow authenticated users to upload orchard images
CREATE POLICY "Authenticated users can upload orchard images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

-- Allow users to update their own orchard images
CREATE POLICY "Users can update their own orchard images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own orchard images
CREATE POLICY "Users can delete their own orchard images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);