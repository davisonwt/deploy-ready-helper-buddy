-- Add image and video columns to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.recipes.image_url IS 'URL to recipe image stored in Supabase storage';
COMMENT ON COLUMN public.recipes.video_url IS 'URL to short recipe video stored in Supabase storage';

-- Create storage bucket for recipe media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-media', 'recipe-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recipe media
CREATE POLICY "Users can upload their own recipe media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view all recipe media"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-media');

CREATE POLICY "Users can delete their own recipe media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recipe-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);