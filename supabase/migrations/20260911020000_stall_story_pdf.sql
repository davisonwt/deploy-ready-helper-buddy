-- Farm-Stalls: lets a stall owner upload a PDF for their MY STORY sheet
-- instead of (or alongside) the plain-text stalls.story field
-- (20260911010000_stall_story.sql) -- StallHotspotSheet prefers the PDF
-- when both are set (src/components/stalls/StallHotspotSheet.tsx).

ALTER TABLE public.stalls
  ADD COLUMN IF NOT EXISTS story_pdf_path text;

-- The "stalls" bucket (20260910220000_farm_stalls.sql) has no
-- allowed_mime_types/file_size_limit today -- effectively unrestricted,
-- which already permits a PDF upload under storage.objects' existing
-- owner-write RLS policies (INSERT/UPDATE/DELETE only check bucket_id +
-- auth.uid() = the folder's first path segment, not content-type). This
-- makes the allowlist explicit rather than relying on "unrestricted
-- happens to include PDF": every current upload into this bucket is
-- image/webp (StallImageUpload.tsx always re-encodes via canvas
-- .toBlob(..., 'image/webp', ...) regardless of the source file's own
-- type -- confirmed the only writer of this bucket in the codebase), so
-- adding 'application/pdf' alongside it, plus a 20MB cap, tightens
-- nothing that's in real use today.
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/webp', 'application/pdf'],
       file_size_limit = 20971520 -- 20 MB, in bytes
 WHERE id = 'stalls';

-- --- Proof --------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stalls' AND column_name = 'story_pdf_path'
  ) AS story_pdf_path_column_exists,
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'stalls') AS stalls_allowed_mime_types,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'stalls') AS stalls_file_size_limit_bytes;
