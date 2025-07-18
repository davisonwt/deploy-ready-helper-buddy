-- Update storage buckets to allow 30MB file uploads
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
WHERE id IN ('orchard-videos', 'videos', 'sow2grow-1b');

-- Also update any existing policies to ensure they don't restrict file size
-- Create or replace policy for video uploads with size limit
CREATE OR REPLACE POLICY "Allow video uploads up to 30MB" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('orchard-videos', 'videos') AND
  (octet_length(decode(encode(content, 'base64'), 'base64')) <= 31457280 OR content IS NULL)
);