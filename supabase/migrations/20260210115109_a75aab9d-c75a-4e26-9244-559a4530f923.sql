-- Create journal-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-media', 'journal-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for journal-media bucket
CREATE POLICY "Users can upload their own journal media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own journal media"
ON storage.objects FOR SELECT
USING (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own journal media"
ON storage.objects FOR DELETE
USING (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add recipes column to journal_entries
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS recipes jsonb DEFAULT '[]'::jsonb;