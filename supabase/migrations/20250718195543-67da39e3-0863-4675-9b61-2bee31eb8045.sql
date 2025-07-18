-- Update storage buckets to allow 30MB file uploads for video buckets
UPDATE storage.buckets 
SET 
  file_size_limit = 31457280, -- 30MB in bytes
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/mpeg',
    'video/quicktime', 
    'video/x-msvideo',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
WHERE id IN ('orchard-videos', 'videos');