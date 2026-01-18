-- Add up to 3 images per book (store URLs; files live in Storage)
ALTER TABLE public.sower_books
ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];

-- Storage bucket for book images
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Book images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their book images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their book images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their book images" ON storage.objects;

-- Public read access
CREATE POLICY "Book images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-images');

-- Upload into folder: <user_id>/<file>
CREATE POLICY "Users can upload their book images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'book-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their book images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'book-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their book images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'book-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);