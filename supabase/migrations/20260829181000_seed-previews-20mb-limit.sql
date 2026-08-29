-- 45 seconds of uncompressed PCM at 48k/24-bit stereo is ~13MB -- the
-- 5MB limit set when this bucket was created (20260831180000) was sized
-- for typical 44.1k/16-bit content and rejected anything higher-resolution,
-- surfacing as preview_upload_failed on /sow/music (root-caused via
-- SESSION-STATE's WAV-preview investigation). trimWav() now also
-- downsamples 24/32-bit sources to 16-bit before upload (~9MB for the same
-- 48k/24-bit case), but the bucket limit is raised too so a legitimate
-- 45s/16-bit clip at unusually high sample rates still has headroom.
UPDATE storage.buckets
SET file_size_limit = 20971520 -- 20MB
WHERE id = 'seed-previews';
