-- My Story's own profile photo. A new, dedicated column rather than
-- reusing profiles.avatar_url: that column is a base64 data: URI written
-- straight into the row (ProfilePage.jsx), not the real
-- upload -> moderate -> storage-object pipeline every other image in this
-- app uses (StallImageUpload.tsx, StallPdfUpload.tsx), and it is the
-- member's identity icon everywhere else (chat, seed cards, follower
-- lists) -- changing or removing a story photo must not also change or
-- remove their avatar app-wide. Same private "stalls" bucket and
-- moderateStorageUpload gate as the front/interior images and the story
-- PDF; a fixed filename + upsert (StoryPhotoUpload.tsx), same "replace in
-- place" shape story_pdf_path already uses, so re-uploading or removing
-- doesn't orphan the previous file.
ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS story_photo_path text;
