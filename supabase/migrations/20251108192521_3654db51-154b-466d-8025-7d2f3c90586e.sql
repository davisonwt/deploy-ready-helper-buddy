-- ============================================
-- CHAT SECURITY: File Deletion Policies & Storage Cleanup
-- ============================================

-- 1. Allow users to delete their own chat files
CREATE POLICY "Users can delete their own uploaded files"
ON chat_files
FOR DELETE
USING (auth.uid() = uploader_id);

-- 2. Allow users to delete documents they uploaded (if they're moderators/creators)
CREATE POLICY "Uploaders can delete their own documents"
ON chat_room_documents
FOR DELETE
USING (auth.uid() = uploader_id);

-- 3. Create function to delete files from storage when chat_files row is deleted
CREATE OR REPLACE FUNCTION delete_chat_file_from_storage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the actual file from Supabase storage
  -- Extract bucket and path from the file_path
  PERFORM storage.delete_object('chat-files', OLD.file_path);
  
  -- Also delete thumbnail if exists
  IF OLD.thumbnail_url IS NOT NULL THEN
    PERFORM storage.delete_object('chat-files', OLD.thumbnail_url);
  END IF;
  
  RETURN OLD;
END;
$$;

-- 4. Create trigger for chat_files deletion
DROP TRIGGER IF EXISTS on_chat_file_deleted ON chat_files;
CREATE TRIGGER on_chat_file_deleted
  BEFORE DELETE ON chat_files
  FOR EACH ROW
  EXECUTE FUNCTION delete_chat_file_from_storage();

-- 5. Create function to delete documents from storage
CREATE OR REPLACE FUNCTION delete_chat_document_from_storage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the actual document from Supabase storage
  PERFORM storage.delete_object('chat-documents', OLD.file_path);
  
  RETURN OLD;
END;
$$;

-- 6. Create trigger for chat_room_documents deletion
DROP TRIGGER IF EXISTS on_chat_document_deleted ON chat_room_documents;
CREATE TRIGGER on_chat_document_deleted
  BEFORE DELETE ON chat_room_documents
  FOR EACH ROW
  EXECUTE FUNCTION delete_chat_document_from_storage();

-- 7. Create function to clean up room files when room is deleted
CREATE OR REPLACE FUNCTION cleanup_room_files_on_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all files associated with this room
  -- The triggers above will handle storage deletion
  DELETE FROM chat_files WHERE room_id = OLD.id;
  DELETE FROM chat_room_documents WHERE room_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- 8. Create trigger to clean up all room files when room is deleted
DROP TRIGGER IF EXISTS on_chat_room_deleted ON chat_rooms;
CREATE TRIGGER on_chat_room_deleted
  BEFORE DELETE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_room_files_on_deletion();

-- 9. Add policy for gosats to delete any files (for moderation)
CREATE POLICY "Gosats can delete any chat files"
ON chat_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'
  )
);

CREATE POLICY "Gosats can delete any documents"
ON chat_room_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'
  )
);

-- ============================================
-- Comments for clarity
-- ============================================
COMMENT ON POLICY "Users can delete their own uploaded files" ON chat_files IS 
'Users can permanently delete files they uploaded to chat rooms';

COMMENT ON POLICY "Uploaders can delete their own documents" ON chat_room_documents IS 
'Document uploaders can permanently delete their uploaded documents';

COMMENT ON FUNCTION delete_chat_file_from_storage() IS 
'Automatically deletes physical files from Supabase storage when chat_files record is deleted';

COMMENT ON FUNCTION delete_chat_document_from_storage() IS 
'Automatically deletes physical documents from Supabase storage when chat_room_documents record is deleted';

COMMENT ON FUNCTION cleanup_room_files_on_deletion() IS 
'Automatically deletes all files and documents when a chat room is deleted';