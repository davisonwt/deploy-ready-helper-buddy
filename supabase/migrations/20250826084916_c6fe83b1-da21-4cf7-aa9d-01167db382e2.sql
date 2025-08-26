-- Update the dj-music bucket to be public so tracks can be accessed via public URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'dj-music';