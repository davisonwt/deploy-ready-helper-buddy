-- Convert all existing signed URLs to direct public URLs in the orchards images array
UPDATE orchards 
SET images = array(
  SELECT CASE 
    WHEN image_url LIKE '%/storage/v1/object/sign/%' THEN
      -- Convert signed URL to direct public URL
      REPLACE(
        SUBSTRING(image_url FROM 'https://[^/]+/storage/v1/object/sign/([^?]+)'),
        '/storage/v1/object/sign/',
        '/storage/v1/object/public/'
      )
    ELSE image_url
  END
  FROM unnest(images) AS image_url
)
WHERE images IS NOT NULL 
AND array_length(images, 1) > 0;