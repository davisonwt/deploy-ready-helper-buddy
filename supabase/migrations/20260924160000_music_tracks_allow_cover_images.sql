-- music-tracks must accept the cover images the app already tries to put
-- there.
--
-- ALREADY APPLIED on 2026-09-24 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- useDirectMusicUpload.jsx uploads a track's cover to
--   music-tracks/<user id>/covers/<ts>-<uuid>.<ext>
-- and EditTrackModal.tsx uploads an artist image to
--   music-tracks/<user id>/artist-images/<file>
-- but the bucket's allowed_mime_types was audio only. Probed 2026-09-24:
-- a PNG upload returns 415 invalid_mime_type, "mime type image/png is not
-- supported". So every member who attached a cover while sowing a track
-- hit that error -- which is also why not one dj_music_tracks row has a
-- cover that lives in this bucket today.
--
-- Adding png/jpeg/webp only. The audio list is untouched.

update storage.buckets
   set allowed_mime_types = allowed_mime_types || array['image/png', 'image/jpeg', 'image/webp']
 where id = 'music-tracks'
   and not (allowed_mime_types @> array['image/png']);
