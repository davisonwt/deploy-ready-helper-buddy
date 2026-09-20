-- Animated store fronts, part 1 of 2: the `stalls` bucket's MIME
-- allowlist only ever permitted `image/webp` for images (set when every
-- upload into this bucket was assumed to already be canvas-re-encoded
-- WebP -- see 20260911020000_stall_story_pdf.sql's own comment). Adding
-- `image/gif` here is necessary but not sufficient on its own: the
-- client-side upload path (StallImageUpload.tsx) still needs to actually
-- send an animated file's ORIGINAL bytes instead of re-encoding through a
-- canvas first, which flattens animation regardless of what the bucket
-- allows. That client-side fix ships in the same commit as this
-- migration.
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'image/gif')
WHERE id = 'stalls' AND NOT ('image/gif' = ANY(allowed_mime_types));
