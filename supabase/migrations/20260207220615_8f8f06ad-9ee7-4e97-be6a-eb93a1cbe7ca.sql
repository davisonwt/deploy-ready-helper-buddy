-- Create storage bucket for service provider portfolio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-provider-images', 'service-provider-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload service provider images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'service-provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their service provider images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'service-provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their service provider images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'service-provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access (images are public)
CREATE POLICY "Public can view service provider images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-provider-images');