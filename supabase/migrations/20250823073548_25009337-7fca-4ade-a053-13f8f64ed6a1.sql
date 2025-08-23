-- Make chat-files bucket public and set file size limit
UPDATE storage.buckets 
SET public = true, file_size_limit = 31457280
WHERE id = 'chat-files';