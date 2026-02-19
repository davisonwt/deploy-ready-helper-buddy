-- Create storage bucket for segment documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('segment-documents', 'segment-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload segment documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'segment-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Segment documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'segment-documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own segment documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'segment-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add document columns to radio_slot_segments
ALTER TABLE public.radio_slot_segments
ADD COLUMN IF NOT EXISTS mapped_document_url TEXT,
ADD COLUMN IF NOT EXISTS mapped_document_name TEXT;