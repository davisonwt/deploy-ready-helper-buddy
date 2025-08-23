-- Make orchard-videos bucket public for video visibility
UPDATE storage.buckets 
SET public = true, file_size_limit = 104857600
WHERE id = 'orchard-videos';