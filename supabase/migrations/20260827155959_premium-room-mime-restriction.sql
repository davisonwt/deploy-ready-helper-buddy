-- Restrict the premium-room bucket to known content types + a size cap,
-- matching the pattern already used on dj-music / music-tracks.
--
-- premium-room is shared by several upload flows (music-seed audio/cover
-- uploads in UploadForm.tsx, classroom voice notes and media in
-- useClassroomLive.ts, session launch materials in CreateSessionForm.tsx),
-- so the allow-list covers every MIME type actually present in the bucket
-- today (confirmed via a live query), not just audio. This only affects
-- new uploads — allowed_mime_types/file_size_limit are enforced by the
-- Storage API at upload time and do not touch existing objects.
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100MB
  allowed_mime_types = ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a',
    'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm',
    'image/png', 'image/jpeg',
    'video/mp4', 'video/quicktime',
    'application/pdf', 'application/json'
  ]
WHERE id = 'premium-room';
