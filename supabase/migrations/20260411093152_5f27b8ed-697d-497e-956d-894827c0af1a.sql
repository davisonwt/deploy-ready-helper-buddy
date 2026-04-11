
-- Add additional_files column for multi-file studies
ALTER TABLE public.s2g_library_items
ADD COLUMN IF NOT EXISTS additional_files jsonb DEFAULT '[]'::jsonb;

-- Add study_id to memry_posts for linking feed posts to studies
ALTER TABLE public.memry_posts
ADD COLUMN IF NOT EXISTS study_id uuid REFERENCES public.s2g_library_items(id) ON DELETE SET NULL;

-- Create storage bucket for study uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-uploads', 'study-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for study-uploads bucket
CREATE POLICY "Study uploads are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-uploads');

CREATE POLICY "Authenticated users can upload study files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own study files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own study files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'study-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
