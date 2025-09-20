-- Create storage bucket for orchard images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orchard-images', 
  'orchard-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for orchard images
CREATE POLICY "Authenticated users can upload orchard images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'orchard-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view orchard images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

CREATE POLICY "Users can update their own uploaded images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'orchard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploaded images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'orchard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);