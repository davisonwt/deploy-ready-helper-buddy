-- Gathering Room batch 1/2 added PDF-with-sync (already allowed), short
-- clips (video/*) and voice notes (audio/*) uploaded into the same public
-- "stalls" bucket under `${userId}/gathering/...`, but the bucket's
-- allowed_mime_types was never widened past the original image/webp +
-- application/pdf front/interior-art list. Every clip and voice-note
-- upload was silently rejected by storage ("mime type ... is not
-- supported") -- confirmed live during the batch 1/2 pre-flight.
update storage.buckets
set allowed_mime_types = array[
  'image/webp', 'application/pdf',
  'audio/webm', 'audio/mp4', 'audio/mpeg',
  'video/mp4', 'video/webm', 'video/quicktime'
]
where id = 'stalls';
