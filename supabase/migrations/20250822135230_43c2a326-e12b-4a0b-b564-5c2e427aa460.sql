-- Simply make the orchard-images bucket public so images don't need signed URLs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'orchard-images';