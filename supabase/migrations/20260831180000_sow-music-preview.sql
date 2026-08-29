-- Foundation for the new /sow/music form (spec-sowing-forms.md) and
-- spec-seed-protection.md Phase 1 (real preview generation), landing
-- together per spec-sowing-forms.md: "The 45-second preview for audio is
-- generated here, not in a later phase."
--
-- products.preview_url mirrors dj_music_tracks.preview_url (same column
-- name, same idea) -- products never had one; nothing has ever generated a
-- real preview object for a products-table seed until generate-preview.
ALTER TABLE public.products ADD COLUMN preview_url text;

-- Dedicated, public-read bucket for 45s preview clips only -- never the
-- full file. Public because a preview is deliberately the one piece of a
-- paid seed anyone may hear without buying it; the full file stays in the
-- private premium-room bucket, reachable only through get-seed-file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seed-previews',
  'seed-previews',
  true,
  5242880, -- 5MB -- a 45s clip at reasonable bitrates never approaches this
  ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']
)
ON CONFLICT (id) DO NOTHING;

-- No client-facing INSERT/UPDATE/DELETE policy: the only writer is
-- generate-preview, which uses the service-role key and bypasses RLS
-- entirely. A public bucket already serves reads with no policy needed.
