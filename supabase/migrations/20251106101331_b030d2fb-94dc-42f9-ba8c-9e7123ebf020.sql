-- Fix Critical: Secure storage buckets containing sensitive user data
-- Make chat and session document buckets private

-- Update chat-files bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('chat-files', 'chat_files');

-- Update session-documents bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'session-documents';

-- Add RLS policies for chat-files bucket (only if they don't exist)
DO $$ 
BEGIN
  -- Users can view their own chat files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users access own chat files'
  ) THEN
    CREATE POLICY "Users access own chat files" 
    ON storage.objects
    FOR SELECT 
    USING (
      bucket_id = 'chat-files' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can upload their own chat files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users upload own chat files'
  ) THEN
    CREATE POLICY "Users upload own chat files" 
    ON storage.objects
    FOR INSERT 
    WITH CHECK (
      bucket_id = 'chat-files' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Session participants can view documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Session participants access documents'
  ) THEN
    CREATE POLICY "Session participants access documents" 
    ON storage.objects
    FOR SELECT 
    USING (
      bucket_id = 'session-documents' AND 
      EXISTS (
        SELECT 1 FROM live_session_participants lsp
        WHERE lsp.user_id = auth.uid()
        AND lsp.status = 'active'
        AND (storage.foldername(name))[1] = lsp.session_id::text
      )
    );
  END IF;

  -- Session hosts can upload documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Session hosts upload documents'
  ) THEN
    CREATE POLICY "Session hosts upload documents" 
    ON storage.objects
    FOR INSERT 
    WITH CHECK (
      bucket_id = 'session-documents' AND 
      EXISTS (
        SELECT 1 FROM live_session_participants lsp
        WHERE lsp.user_id = auth.uid()
        AND lsp.participant_type IN ('host', 'co_host')
        AND (storage.foldername(name))[1] = lsp.session_id::text
      )
    );
  END IF;
END $$;