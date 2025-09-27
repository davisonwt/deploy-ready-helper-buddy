-- Create storage bucket for radio live comments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('radio-live-comments', 'radio-live-comments', false, 10485760, ARRAY['text/plain', 'application/json'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for radio live comments bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload comments data'
    ) THEN
        CREATE POLICY "Authenticated users can upload comments data"
        ON storage.objects FOR INSERT 
        TO authenticated
        WITH CHECK (bucket_id = 'radio-live-comments');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can view their own comment files'
    ) THEN
        CREATE POLICY "Users can view their own comment files"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'radio-live-comments' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

-- Enable realtime for live_session_messages table
ALTER TABLE public.live_session_messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.live_session_messages;